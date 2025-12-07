"use client"

import { useState, useRef } from "react"
import { Upload, FileAudio, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function FileTranscription() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      console.log("File transcription response:", data)
      setTranscript(data.transcript || "No transcript returned")
    } catch (err) {
      setError("Failed to transcribe audio file. Please try again.")
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio File Transcription</CardTitle>
        <CardDescription>
          Upload an audio recording for medical transcription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            size="lg"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full max-w-xs"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Select Audio File
              </>
            )}
          </Button>

          {fileName && !isProcessing && (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <FileAudio className="h-4 w-4" />
              {fileName}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="file-transcript" className="block text-sm font-medium text-zinc-700">
            Transcript:
          </label>
          <textarea
            id="file-transcript"
            value={transcript}
            readOnly
            placeholder="Transcript will appear here after processing..."
            className="w-full min-h-[200px] rounded-md border border-zinc-300 bg-white p-4 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
      </CardContent>
    </Card>
  )
}
