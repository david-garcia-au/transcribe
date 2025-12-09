import { NextRequest, NextResponse } from "next/server"
import {
  TranscribeClient,
  StartMedicalTranscriptionJobCommand,
  GetMedicalTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"

const transcribeClient = new TranscribeClient({
  region: process.env.TRANSCRIBE_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.TRANSCRIBE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.TRANSCRIBE_SECRET_ACCESS_KEY || "",
  },
})

const s3Client = new S3Client({
  region: process.env.TRANSCRIBE_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.TRANSCRIBE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.TRANSCRIBE_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    console.log("Received audio file:", audioFile.name, audioFile.type, audioFile.size)

    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const fileName = `live-audio-${Date.now()}.wav`
    const bucketName = process.env.TRANSCRIBE_S3_BUCKET || ""

    if (!bucketName) {
      return NextResponse.json(
        { error: "S3 bucket not configured" },
        { status: 500 }
      )
    }

    // Upload to S3
    console.log("Uploading to S3...")
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: "audio/wav",
      })
    )

    // Start transcription job
    const jobName = `live-transcription-${Date.now()}`
    console.log("Starting transcription job:", jobName)

    await transcribeClient.send(
      new StartMedicalTranscriptionJobCommand({
        MedicalTranscriptionJobName: jobName,
        LanguageCode: "en-US",
        MediaFormat: "wav",
        Media: {
          MediaFileUri: `s3://${bucketName}/${fileName}`,
        },
        OutputBucketName: bucketName,
        Specialty: "PRIMARYCARE",
        Type: "CONVERSATION",
        Settings: {
          ShowSpeakerLabels: true,
          MaxSpeakerLabels: 10,
        },
      })
    )

    // Poll for completion with faster intervals
    let jobStatus = "IN_PROGRESS"
    let transcript = ""
    let attempts = 0
    const maxAttempts = 60 // 60 seconds max

    while (jobStatus === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Check every second
      attempts++

      const jobResult = await transcribeClient.send(
        new GetMedicalTranscriptionJobCommand({
          MedicalTranscriptionJobName: jobName,
        })
      )

      jobStatus = jobResult.MedicalTranscriptionJob?.TranscriptionJobStatus || ""
      console.log(`Job status (attempt ${attempts}):`, jobStatus)
      
      // Log more details on first check
      if (attempts === 1) {
        console.log("Job details:", {
          status: jobStatus,
          creationTime: jobResult.MedicalTranscriptionJob?.CreationTime,
          mediaFormat: jobResult.MedicalTranscriptionJob?.MediaFormat,
          mediaSampleRateHertz: jobResult.MedicalTranscriptionJob?.MediaSampleRateHertz,
        })
      }
      
      // If failed, log immediately
      if (jobStatus === "FAILED") {
        console.error("Job failure details:", {
          failureReason: jobResult.MedicalTranscriptionJob?.FailureReason,
          jobName: jobName,
        })
      }

      if (jobStatus === "COMPLETED") {
        const transcriptUri =
          jobResult.MedicalTranscriptionJob?.Transcript?.TranscriptFileUri

        if (transcriptUri) {
          console.log("Fetching transcript from:", transcriptUri)
          
          // Extract bucket and key from the URI
          // Format: https://s3.region.amazonaws.com/bucket/key or s3://bucket/key
          let transcriptKey = ""
          
          if (transcriptUri.startsWith("s3://")) {
            // Format: s3://bucket/key
            const parts = transcriptUri.replace("s3://", "").split("/")
            transcriptKey = parts.slice(1).join("/")
          } else if (transcriptUri.includes("amazonaws.com")) {
            // Format: https://s3.region.amazonaws.com/bucket/key
            const url = new URL(transcriptUri)
            transcriptKey = url.pathname.substring(1) // Remove leading /
            // If bucket is in path (not subdomain), extract it
            if (transcriptKey.startsWith(bucketName + "/")) {
              transcriptKey = transcriptKey.substring(bucketName.length + 1)
            }
          }
          
          console.log("Fetching transcript from S3:", bucketName, transcriptKey)
          
          try {
            // Use S3 SDK to fetch the transcript with proper credentials
            const s3Response = await s3Client.send(
              new GetObjectCommand({
                Bucket: bucketName,
                Key: transcriptKey,
              })
            )
            
            // Convert stream to string
            const responseText = await s3Response.Body?.transformToString()
            
            if (!responseText) {
              throw new Error("Empty transcript response")
            }
            
            console.log("Transcript response (first 500 chars):", responseText.substring(0, 500))
            
            const transcriptData = JSON.parse(responseText)
            
            // Extract transcript with speaker labels
            if (transcriptData.results?.transcripts?.[0]?.transcript) {
              transcript = transcriptData.results.transcripts[0].transcript
            }
            
            // Also get speaker segments if available
            if (transcriptData.results?.speaker_labels?.segments) {
              console.log("Speaker segments found:", transcriptData.results.speaker_labels.segments.length)
            }
          } catch (fetchError) {
            console.error("Failed to fetch transcript from S3:", fetchError)
            throw new Error("Failed to fetch transcript from S3")
          }
        }
      } else if (jobStatus === "FAILED") {
        const failureReason = jobResult.MedicalTranscriptionJob?.FailureReason
        console.error("Transcription job failed:", failureReason)
        throw new Error(`Transcription job failed: ${failureReason}`)
      }
    }

    if (jobStatus === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Transcription timed out" },
        { status: 408 }
      )
    }

    console.log("Final transcript:", transcript)
    return NextResponse.json({ transcript: transcript || "No speech detected" })
  } catch (error) {
    console.error("Live transcription error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to transcribe audio" },
      { status: 500 }
    )
  }
}
