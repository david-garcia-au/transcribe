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
  const wsRef = useRef<WebSocket | null>(null)

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

      // Connect to WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/transcribe/stream`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("WebSocket connected")
        setIsStreaming(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.error) {
            setError(data.error)
            stopStreaming()
          } else if (data.transcript) {
            if (data.isPartial) {
              setPartialTranscript(data.transcript)
            } else {
              setTranscript((prev) => prev + " " + data.transcript)
              setPartialTranscript("")
            }
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err)
        }
      }

      ws.onerror = (err) => {
        console.error("WebSocket error:", err)
        setError("Connection error. Please try again.")
        stopStreaming()
      }

      ws.onclose = () => {
        console.log("WebSocket closed")
        if (isStreaming) {
          setIsStreaming(false)
        }
      }

      // Process audio and send to WebSocket
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)
          
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
          }
          
          // Send as binary
          ws.send(pcmData.buffer)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.")
      console.error(err)
    }
  }

  const stopStreaming = () => {
    setIsStreaming(false)

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
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
      audioContextRef.current.close()
      audioContextRef.current = null
    }
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
