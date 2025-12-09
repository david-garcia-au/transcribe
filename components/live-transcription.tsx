"use client"

import { useState, useRef } from "react"
import Container from "@cloudscape-design/components/container"
import Header from "@cloudscape-design/components/header"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Button from "@cloudscape-design/components/button"
import Textarea from "@cloudscape-design/components/textarea"
import Alert from "@cloudscape-design/components/alert"
import Spinner from "@cloudscape-design/components/spinner"
import Box from "@cloudscape-design/components/box"

export function LiveTranscription() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [partialTranscript, setPartialTranscript] = useState("")
  const [error, setError] = useState("")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioChunksRef = useRef<Int16Array[]>([])
  const isStreamingRef = useRef(false)

  const startRecording = async () => {
    try {
      setError("")
      setTranscript("")
      setPartialTranscript("")
      audioChunksRef.current = []
      isStreamingRef.current = true

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      })
      streamRef.current = stream

      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      setIsRecording(true)

      processor.onaudioprocess = (e) => {
        if (isStreamingRef.current) {
          const inputData = e.inputBuffer.getChannelData(0)
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
          }
          audioChunksRef.current.push(pcmData)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.")
      console.error(err)
      isStreamingRef.current = false
    }
  }

  const stopRecording = async () => {
    if (isRecording) {
      isStreamingRef.current = false
      setIsRecording(false)

      if (processorRef.current) {
        processorRef.current.disconnect()
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (audioContextRef.current) {
        await audioContextRef.current.close()
      }

      setTimeout(() => {
        convertToWavAndSend()
      }, 100)
    }
  }

  const convertToWavAndSend = async () => {
    try {
      setPartialTranscript("Converting audio...")

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

      const pcmData = new Int16Array(combinedData.length)
      for (let i = 0; i < combinedData.length; i++) {
        const s = Math.max(-1, Math.min(1, combinedData[i]))
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }

      const wavBuffer = createWavFile(pcmData, 16000)
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" })

      await sendAudioToAPI(wavBlob)
    } catch (err) {
      setError("Failed to process audio")
      console.error(err)
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

  const sendAudioToAPI = async (audioBlob: Blob) => {
    try {
      setPartialTranscript("Uploading and transcribing...")

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.wav")

      const response = await fetch("/api/transcribe/live", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

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
    <Container
      header={
        <Header
          variant="h2"
          description="Record your voice in real-time for medical transcription"
        >
          Live Voice Transcription
        </Header>
      }
    >
      <SpaceBetween size="m">
        <Button
          variant={isRecording ? "normal" : "primary"}
          iconName={isRecording ? "microphone-off" : "microphone"}
          onClick={isRecording ? stopRecording : startRecording}
          fullWidth
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </Button>

        {isRecording && (
          <Box textAlign="center">
            <SpaceBetween size="xs" direction="horizontal" alignItems="center">
              <Spinner />
              <Box variant="span">Recording in progress...</Box>
            </SpaceBetween>
          </Box>
        )}

        {error && <Alert type="error">{error}</Alert>}

        <SpaceBetween size="xs">
          <Box variant="awsui-key-label">Transcript:</Box>
          <Textarea
            value={
              transcript + (partialTranscript ? ` ${partialTranscript}` : "")
            }
            readOnly
            placeholder="Start recording to see live transcription..."
            rows={10}
          />
          {partialTranscript && (
            <Box variant="small" color="text-status-info">
              Partial result (still processing...)
            </Box>
          )}
        </SpaceBetween>
      </SpaceBetween>
    </Container>
  )
}
