import { NextRequest, NextResponse } from "next/server"
import {
  TranscribeClient,
  StartMedicalTranscriptionJobCommand,
  GetMedicalTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"

const transcribeClient = new TranscribeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

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

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const fileName = `medical-audio-${Date.now()}.${audioFile.name.split(".").pop()}`
    const bucketName = process.env.AWS_S3_BUCKET || ""

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: audioFile.type,
      })
    )

    // Start transcription job
    const jobName = `medical-transcription-${Date.now()}`
    await transcribeClient.send(
      new StartMedicalTranscriptionJobCommand({
        MedicalTranscriptionJobName: jobName,
        LanguageCode: "en-US",
        MediaFormat: audioFile.name.split(".").pop() as any,
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

    // Poll for completion
    let jobStatus = "IN_PROGRESS"
    let transcript = ""

    while (jobStatus === "IN_PROGRESS") {
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const jobResult = await transcribeClient.send(
        new GetMedicalTranscriptionJobCommand({
          MedicalTranscriptionJobName: jobName,
        })
      )

      jobStatus = jobResult.MedicalTranscriptionJob?.TranscriptionJobStatus || ""

      if (jobStatus === "COMPLETED") {
        const transcriptUri =
          jobResult.MedicalTranscriptionJob?.Transcript?.TranscriptFileUri

        if (transcriptUri) {
          console.log("Fetching transcript from:", transcriptUri)
          
          // Extract key from the URI
          let transcriptKey = ""
          
          if (transcriptUri.startsWith("s3://")) {
            const parts = transcriptUri.replace("s3://", "").split("/")
            transcriptKey = parts.slice(1).join("/")
          } else if (transcriptUri.includes("amazonaws.com")) {
            const url = new URL(transcriptUri)
            transcriptKey = url.pathname.substring(1)
            if (transcriptKey.startsWith(bucketName + "/")) {
              transcriptKey = transcriptKey.substring(bucketName.length + 1)
            }
          }
          
          console.log("Fetching transcript from S3:", bucketName, transcriptKey)
          
          // Use S3 SDK to fetch the transcript with proper credentials
          const s3Response = await s3Client.send(
            new GetObjectCommand({
              Bucket: bucketName,
              Key: transcriptKey,
            })
          )
          
          const responseText = await s3Response.Body?.transformToString()
          
          if (responseText) {
            const transcriptData = JSON.parse(responseText)
            transcript = transcriptData.results.transcripts[0].transcript
          }
        }
      } else if (jobStatus === "FAILED") {
        const failureReason = jobResult.MedicalTranscriptionJob?.FailureReason
        console.error("Transcription job failed:", failureReason)
        throw new Error(`Transcription job failed: ${failureReason}`)
      }
    }

    return NextResponse.json({ transcript })
  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    )
  }
}
