"use client"

import { useState, useRef } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function LiveTranscription() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [partialTranscript, setPartialTranscript] = useState("")
  const [error, setError] = useState("")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioChunksRef = useRef<Float32Array[]>([])

  const startRecording = async () => {
    try {
      setError("")
      setTranscript("")
      setPartialTranscript("")
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Use 16kHz for better compatibility
        },
      })
      streamRef.current = stream

      // Create AudioContext for processing
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        audioChunksRef.current.push(new Float32Array(inputData))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsRecording(true)
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.")
      console.error(err)
    }
  }

  const stopRecording = async () => {
    if (isRecording) {
      setIsRecording(false)

      // Stop processor
      if (processorRef.current) {
        processorRef.current.disconnect()
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Close audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close()
      }

      // Convert to WAV and send
      setTimeout(() => {
        convertToWavAndSend()
      }, 100)
    }
  }

  const convertToWavAndSend = async () => {
    try {
      setPartialTranscript("Converting audio...")

      // Combine all chunks
      const totalLength = audioChunksRef.current.reduce(
        (acc, chunk) => acc + chunk.length,
        0
      )
      const combinedData = new Float32Array(totalLength)
      let offset = 0
      for (const chunk of audioChunksRef.current) {
        combinedData.set(chunk, offset)
        offset += chunk.length
      }

      // Convert to 16-bit PCM
      const pcmData = new Int16Array(combinedData.length)
      for (let i = 0; i < combinedData.length; i++) {
        const s = Math.max(-1, Math.min(1, combinedData[i]))
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }

      // Create WAV file
      const wavBuffer = createWavFile(pcmData, 16000)
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" })

      console.log("WAV file created, size:", wavBlob.size)
      await sendAudioToAPI(wavBlob)
    } catch (err) {
      setError("Failed to process audio")
      console.error(err)
      setPartialTranscript("")
    }
  }

  const createWavFile = (samples: Int16Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true) // fmt chunk size
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true) // byte rate
    view.setUint16(32, 2, true) // block align
    view.setUint16(34, 16, true) // bits per sample
    writeString(36, "data")
    view.setUint32(40, samples.length * 2, true)

    // Write PCM samples
    const offset = 44
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + i * 2, samples[i], true)
    }

    return buffer
  }

  const sendAudioToAPI = async (audioBlob: Blob) => {
    try {
      setPartialTranscript("Uploading and transcribing...")

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.wav")

      console.log("Sending audio to API, size:", audioBlob.size)

      const response = await fetch("/api/transcribe/live", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      console.log("Live transcription response:", data)

      if (!response.ok) {
        throw new Error(data.error || "Transcription failed")
      }

      setPartialTranscript("")
      setTranscript(data.transcript || "No speech detected")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to transcribe audio. Please try again."
      )
      console.error(err)
      setPartialTranscript("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Voice Transcription</CardTitle>
        <CardDescription>
          Record your voice in real-time for medical transcription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            className="w-full max-w-xs"
          >
            {isRecording ? (
              <>
                <MicOff className="h-5 w-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Start Recording
              </>
            )}
          </Button>
        </div>

        {isRecording && (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Recording in progress...
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="live-transcript"
            className="block text-sm font-medium text-zinc-700"
          >
            Transcript:
          </label>
          <textarea
            id="live-transcript"
            value={transcript + (partialTranscript ? ` ${partialTranscript}` : "")}
            readOnly
            placeholder="Start recording to see live transcription..."
            className="w-full min-h-[200px] rounded-md border border-zinc-300 bg-white p-4 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          {partialTranscript && (
            <p className="text-xs text-zinc-500 italic">
              Partial result (still processing...)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
