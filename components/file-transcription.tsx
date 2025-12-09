"use client"

import { useState, useRef } from "react"
import Container from "@cloudscape-design/components/container"
import Header from "@cloudscape-design/components/header"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Button from "@cloudscape-design/components/button"
import Textarea from "@cloudscape-design/components/textarea"
import Alert from "@cloudscape-design/components/alert"
import Box from "@cloudscape-design/components/box"

export function FileTranscription() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setError("")
    setTranscript("")
    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append("audio", file)

      const response = await fetch("/api/transcribe/file", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Transcription failed")
      }

      const data = await response.json()
      setTranscript(data.transcript || "No transcript returned")
    } catch (err) {
      setError("Failed to transcribe audio file. Please try again.")
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Upload an audio recording for medical transcription"
        >
          Audio File Transcription
        </Header>
      }
    >
      <SpaceBetween size="m">
        <SpaceBetween size="s">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <Button
            variant="primary"
            iconName="upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            loading={isProcessing}
            fullWidth
          >
            {isProcessing ? "Processing..." : "Select Audio File"}
          </Button>

          {fileName && !isProcessing && (
            <Box textAlign="center" variant="small" color="text-body-secondary">
              📄 {fileName}
            </Box>
          )}
        </SpaceBetween>

        {error && <Alert type="error">{error}</Alert>}

        <SpaceBetween size="xs">
          <Box variant="awsui-key-label">Transcript:</Box>
          <Textarea
            value={transcript}
            readOnly
            placeholder="Transcript will appear here after processing..."
            rows={10}
          />
        </SpaceBetween>
      </SpaceBetween>
    </Container>
  )
}
