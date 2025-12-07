import { NextResponse } from "next/server"
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

interface Transcription {
  id: string
  timestamp: number
  date: string
  type: "live" | "file"
  audioUrl?: string
  transcriptUrl?: string
  transcript?: string
}

export async function GET() {
  try {
    const bucketName = process.env.AWS_S3_BUCKET || ""

    if (!bucketName) {
      return NextResponse.json(
        { error: "S3 bucket not configured" },
        { status: 500 }
      )
    }

    // List all objects in the bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
    })

    const listResponse = await s3Client.send(listCommand)
    const objects = listResponse.Contents || []

    console.log(`Found ${objects.length} objects in S3`)

    // First pass: collect audio files and transcript files separately
    const audioFiles: { key: string; timestamp: number; type: "live" | "file" }[] = []
    const transcriptFiles: string[] = []

    console.log("All S3 objects:")
    for (const obj of objects) {
      if (!obj.Key) continue
      console.log(`  - ${obj.Key}`)

      if (obj.Key.startsWith("live-audio-")) {
        const match = obj.Key.match(/live-audio-(\d+)\./)
        if (match) {
          const timestamp = parseInt(match[1])
          console.log(`    -> Matched as live audio, timestamp: ${timestamp}`)
          audioFiles.push({
            key: obj.Key,
            timestamp,
            type: "live",
          })
        }
      } else if (obj.Key.startsWith("stream-audio-")) {
        const match = obj.Key.match(/stream-audio-(\d+)\./)
        if (match) {
          const timestamp = parseInt(match[1])
          console.log(`    -> Matched as stream audio, timestamp: ${timestamp}`)
          audioFiles.push({
            key: obj.Key,
            timestamp,
            type: "live", // Treat as "live" type for display
          })
        }
      } else if (obj.Key.startsWith("medical-audio-")) {
        const match = obj.Key.match(/medical-audio-(\d+)\./)
        if (match) {
          const timestamp = parseInt(match[1])
          console.log(`    -> Matched as file audio, timestamp: ${timestamp}`)
          audioFiles.push({
            key: obj.Key,
            timestamp,
            type: "file",
          })
        }
      } else if (obj.Key.endsWith(".json") && obj.Key.includes("transcription")) {
        console.log(`    -> Matched as transcript file`)
        transcriptFiles.push(obj.Key)
      }
    }

    console.log(`Found ${audioFiles.length} audio files and ${transcriptFiles.length} transcript files`)

    // Second pass: match transcripts to audio files by reading the job name from transcript
    const transcriptionMap = new Map<string, Transcription>()

    // Process audio files first
    for (const audioFile of audioFiles) {
      const jobId = `${audioFile.type}-${audioFile.timestamp}`
      transcriptionMap.set(jobId, {
        id: jobId,
        timestamp: audioFile.timestamp,
        date: new Date(audioFile.timestamp).toLocaleString(),
        type: audioFile.type,
      })

      // Generate presigned URL for audio file
      const audioCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: audioFile.key,
      })
      const audioUrl = await getSignedUrl(s3Client, audioCommand, {
        expiresIn: 3600,
      })
      transcriptionMap.get(jobId)!.audioUrl = audioUrl
    }

    // Process transcript files and match them to audio files
    // Since timestamps don't match exactly, we need to match by proximity (within 5 seconds)
    for (const transcriptKey of transcriptFiles) {
      console.log(`Processing transcript: ${transcriptKey}`)
      
      // Extract job name from transcript filename
      const liveMatch = transcriptKey.match(/live-transcription-(\d+)\.json/)
      const streamMatch = transcriptKey.match(/stream-transcription-(\d+)\.json/)
      const fileMatch = transcriptKey.match(/medical-transcription-(\d+)\.json/)

      let transcriptTimestamp = 0
      let type: "live" | "file" = "file"

      if (liveMatch) {
        transcriptTimestamp = parseInt(liveMatch[1])
        type = "live"
        console.log(`  -> Matched as live transcript, timestamp: ${transcriptTimestamp}`)
      } else if (streamMatch) {
        transcriptTimestamp = parseInt(streamMatch[1])
        type = "live"
        console.log(`  -> Matched as stream transcript, timestamp: ${transcriptTimestamp}`)
      } else if (fileMatch) {
        transcriptTimestamp = parseInt(fileMatch[1])
        type = "file"
        console.log(`  -> Matched as file transcript, timestamp: ${transcriptTimestamp}`)
      }

      if (!transcriptTimestamp) {
        console.log(`  -> No match found, skipping`)
        continue
      }

      // Find matching audio file by type and proximity (within 5 seconds = 5000ms)
      let matchedJobId: string | null = null
      let minTimeDiff = Infinity

      for (const [jobId, transcription] of transcriptionMap.entries()) {
        if (transcription.type === type && !transcription.transcriptUrl) {
          const timeDiff = Math.abs(transcription.timestamp - transcriptTimestamp)
          console.log(`  -> Checking ${jobId}: time diff = ${timeDiff}ms`)
          
          // Match if within 5 seconds and closest match
          if (timeDiff < 5000 && timeDiff < minTimeDiff) {
            matchedJobId = jobId
            minTimeDiff = timeDiff
          }
        }
      }

      if (matchedJobId) {
        console.log(`  -> Matched to existing audio entry: ${matchedJobId} (diff: ${minTimeDiff}ms)`)
        transcriptionMap.get(matchedJobId)!.transcriptUrl = transcriptKey
      } else {
        // No matching audio found, create standalone transcript entry
        const jobId = `${type}-${transcriptTimestamp}`
        console.log(`  -> No matching audio found, creating standalone entry: ${jobId}`)
        transcriptionMap.set(jobId, {
          id: jobId,
          timestamp: transcriptTimestamp,
          date: new Date(transcriptTimestamp).toLocaleString(),
          type,
          transcriptUrl: transcriptKey,
        })
      }
    }

    console.log(`Final transcription map has ${transcriptionMap.size} entries:`)
    for (const [key, value] of transcriptionMap.entries()) {
      console.log(`  ${key}: audio=${!!value.audioUrl}, transcript=${!!value.transcriptUrl}`)
    }

    // Fetch transcript content for each transcription
    const transcriptions: Transcription[] = []

    for (const transcription of transcriptionMap.values()) {
      if (transcription.transcriptUrl) {
        try {
          const transcriptCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: transcription.transcriptUrl,
          })

          const transcriptResponse = await s3Client.send(transcriptCommand)
          const transcriptText = await transcriptResponse.Body?.transformToString()

          if (transcriptText) {
            const transcriptData = JSON.parse(transcriptText)
            transcription.transcript =
              transcriptData.results?.transcripts?.[0]?.transcript || "No transcript available"
          }
        } catch (err) {
          console.error(`Failed to fetch transcript for ${transcription.id}:`, err)
          transcription.transcript = "Error loading transcript"
        }
      }

      transcriptions.push(transcription)
    }

    // Sort by timestamp (newest first)
    transcriptions.sort((a, b) => b.timestamp - a.timestamp)

    console.log(`Returning ${transcriptions.length} transcriptions`)

    return NextResponse.json({ transcriptions })
  } catch (error) {
    console.error("Failed to list transcriptions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list transcriptions" },
      { status: 500 }
    )
  }
}
