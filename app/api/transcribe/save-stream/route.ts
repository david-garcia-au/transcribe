import { NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const transcript = formData.get("transcript") as string
    const sessionId = formData.get("sessionId") as string

    if (!audioFile || !transcript || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const bucketName = process.env.AWS_S3_BUCKET || ""

    if (!bucketName) {
      return NextResponse.json(
        { error: "S3 bucket not configured" },
        { status: 500 }
      )
    }

    const timestamp = Date.now()
    const audioKey = `stream-audio-${timestamp}.wav`
    const transcriptKey = `medical/stream-transcription-${timestamp}.json`

    // Upload audio file
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: "audio/wav",
      })
    )

    console.log(`Uploaded audio to S3: ${audioKey}`)

    // Create transcript JSON in AWS Transcribe format
    const transcriptData = {
      jobName: `stream-transcription-${timestamp}`,
      accountId: "streaming",
      results: {
        transcripts: [
          {
            transcript: transcript,
          },
        ],
        items: [],
      },
      status: "COMPLETED",
    }

    // Upload transcript file
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: transcriptKey,
        Body: JSON.stringify(transcriptData, null, 2),
        ContentType: "application/json",
      })
    )

    console.log(`Uploaded transcript to S3: ${transcriptKey}`)

    return NextResponse.json({
      success: true,
      audioKey,
      transcriptKey,
    })
  } catch (error) {
    console.error("Failed to save stream to S3:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save to S3",
      },
      { status: 500 }
    )
  }
}
