import { NextRequest } from "next/server"
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from "@aws-sdk/client-transcribe-streaming"

const client = new TranscribeStreamingClient({
  region: process.env.TRANSCRIBE_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.TRANSCRIBE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.TRANSCRIBE_SECRET_ACCESS_KEY || "",
  },
})

async function* audioStreamGenerator(
  audioChunks: AsyncIterableIterator<Uint8Array>
) {
  for await (const chunk of audioChunks) {
    yield {
      AudioEvent: {
        AudioChunk: chunk,
      },
    }
  }
}

export async function GET(request: NextRequest) {
  const { socket, response } = await (request as any).socket

  if (!socket) {
    return new Response("WebSocket upgrade required", { status: 426 })
  }

  // This is a WebSocket upgrade request
  // Note: Next.js doesn't natively support WebSockets in the App Router
  // We'll use a different approach with Server-Sent Events

  return new Response("WebSocket not supported in this configuration", {
    status: 501,
  })
}

// Alternative: Use POST with streaming response
export async function POST(request: NextRequest) {
  try {
    const audioBuffer = await request.arrayBuffer()
    const audioData = new Uint8Array(audioBuffer)

    console.log("Received audio data, size:", audioData.length)

    // Create async generator for audio stream
    async function* audioStream() {
      const chunkSize = 1024 * 8
      for (let i = 0; i < audioData.length; i += chunkSize) {
        yield {
          AudioEvent: {
            AudioChunk: audioData.slice(i, i + chunkSize),
          },
        }
      }
    }

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: "en-US",
      MediaSampleRateHertz: 16000,
      MediaEncoding: "pcm",
      AudioStream: audioStream(),
    })

    const response = await client.send(command)
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (response.TranscriptResultStream) {
            for await (const event of response.TranscriptResultStream) {
              if (event.TranscriptEvent?.Transcript?.Results) {
                for (const result of event.TranscriptEvent.Transcript.Results) {
                  if (result.Alternatives && result.Alternatives[0]) {
                    const data = {
                      transcript: result.Alternatives[0].Transcript,
                      isPartial: result.IsPartial,
                    }
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                    )
                  }
                }
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          console.error("Streaming error:", error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Stream transcription error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Streaming failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
