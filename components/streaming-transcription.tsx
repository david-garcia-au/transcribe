"use client"

import { useState, useRef, useEffect } from "react"
import { Radio, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function StreamingTranscription() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [partialTranscript, setPartialTranscript] = useState("")
  const [error, setError] = useState("")
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioChunksRef = useRef<Int16Array[]>([])
  const allAudioChunksRef = useRef<Int16Array[]>([])
  const isStreamingRef = useRef(false)
  const sessionIdRef = useRef<string>("")

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopStreaming()
    }
  }, [])

  const startStreaming = async () => {
    try {
      setError("")
      setTranscript("")
      setPartialTranscript("")
      audioChunksRef.current = []
      allAudioChunksRef.current = []
      isStreamingRef.current = true
      sessionIdRef.current = `stream-${Date.now()}`

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      // Create AudioContext
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      setIsStreaming(true)

      // Collect audio chunks
      processor.onaudioprocess = (e) => {
        if (isStreamingRef.current) {
          const inputData = e.inputBuffer.getChannelData(0)

          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
          }

          audioChunksRef.current.push(pcmData)
          allAudioChunksRef.current.push(new Int16Array(pcmData))
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      // Send chunks periodically (every 2 seconds)
      const intervalId = setInterval(async () => {
        if (audioChunksRef.current.length > 0 && isStreamingRef.current) {
          await sendAudioChunks()
        }
      }, 2000)

      // Store interval ID for cleanup
      ;(processor as any).intervalId = intervalId
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.")
      console.error(err)
      isStreamingRef.current = false
    }
  }

  const sendAudioChunks = async () => {
    if (audioChunksRef.current.length === 0) return

    try {
      // Combine chunks
      const totalLength = audioChunksRef.current.reduce(
        (acc, chunk) => acc + chunk.length,
        0
      )
      const combinedData = new Int16Array(totalLength)
      let offset = 0
      for (const chunk of audioChunksRef.current) {
        combinedData.set(chunk, offset)
        offset += chunk.length
      }

      // Clear chunks
      audioChunksRef.current = []

      console.log("Sending audio chunk, size:", combinedData.length)

      // Send to API
      const response = await fetch("/api/transcribe/stream", {
        method: "POST",
        body: combinedData.buffer,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      })

      if (!response.ok) {
        throw new Error("Streaming failed")
      }

      if (!response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") break

            try {
              const parsed = JSON.parse(data)
              if (parsed.error) {
                setError(parsed.error)
              } else if (parsed.transcript) {
                if (parsed.isPartial) {
                  setPartialTranscript(parsed.transcript)
                } else {
                  setTranscript((prev) =>
                    prev ? prev + " " + parsed.transcript : parsed.transcript
                  )
                  setPartialTranscript("")
                }
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e)
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to send audio chunks:", err)
    }
  }

  const stopStreaming = async () => {
    isStreamingRef.current = false
    setIsStreaming(false)

    // Send any remaining chunks
    if (audioChunksRef.current.length > 0) {
      await sendAudioChunks()
    }

    // Clear interval
    if (processorRef.current && (processorRef.current as any).intervalId) {
      clearInterval((processorRef.current as any).intervalId)
    }

    // Stop processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Save to S3
    await saveToS3()
  }

  const saveToS3 = async () => {
    if (allAudioChunksRef.current.length === 0 || !transcript) {
      console.log("No audio or transcript to save")
      return
    }

    try {
      setPartialTranscript("Saving to S3...")

      // Combine all audio chunks
      const totalLength = allAudioChunksRef.current.reduce(
        (acc, chunk) => acc + chunk.length,
        0
      )
      const combinedData = new Int16Array(totalLength)
      let offset = 0
      for (const chunk of allAudioChunksRef.current) {
        combinedData.set(chunk, offset)
        offset += chunk.length
      }

      // Create WAV file
      const wavBuffer = createWavFile(combinedData, 16000)
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" })

      // Send to save API
      const formData = new FormData()
      formData.append("audio", wavBlob, `${sessionIdRef.current}.wav`)
      formData.append("transcript", transcript)
      formData.append("sessionId", sessionIdRef.current)

      const response = await fetch("/api/transcribe/save-stream", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to save to S3")
      }

      console.log("Saved to S3 successfully")
      setPartialTranscript("")
    } catch (err) {
      console.error("Failed to save to S3:", err)
      setPartialTranscript("")
    }
  }

  const createWavFile = (
    samples: Int16Array,
    sampleRate: number
  ): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, "data")
    view.setUint32(40, samples.length * 2, true)

    const offset = 44
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + i * 2, samples[i], true)
    }

    return buffer
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-Time Streaming</CardTitle>
        <CardDescription>
          Stream audio directly to AWS Transcribe (no S3 storage)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <Button
            size="lg"
            variant={isStreaming ? "destructive" : "default"}
            onClick={isStreaming ? stopStreaming : startStreaming}
            className="w-full max-w-xs"
          >
            {isStreaming ? (
              <>
                <Square className="h-5 w-5" />
                Stop Streaming
              </>
            ) : (
              <>
                <Radio className="h-5 w-5" />
                Start Streaming
              </>
            )}
          </Button>
        </div>

        {isStreaming && (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Streaming in real-time...
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="stream-transcript"
            className="block text-sm font-medium text-zinc-700"
          >
            Live Transcript:
          </label>
          <textarea
            id="stream-transcript"
            value={
              transcript + (partialTranscript ? ` ${partialTranscript}` : "")
            }
            readOnly
            placeholder="Start streaming to see live transcription..."
            className="w-full min-h-[200px] rounded-md border border-zinc-300 bg-white p-4 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          {partialTranscript && (
            <p className="text-xs text-zinc-500 italic">
              Gray text shows partial results (still processing...)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
