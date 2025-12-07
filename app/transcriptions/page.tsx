"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Play, FileText, Clock } from "lucide-react"

interface Transcription {
  id: string
  timestamp: number
  date: string
  type: "live" | "file"
  audioUrl?: string
  transcript?: string
}

export default function TranscriptionsPage() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  useEffect(() => {
    fetchTranscriptions()
  }, [])

  const fetchTranscriptions = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch("/api/transcriptions")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch transcriptions")
      }

      setTranscriptions(data.transcriptions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transcriptions")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayAudio = (audioUrl: string, id: string) => {
    if (playingAudio === id) {
      setPlayingAudio(null)
    } else {
      setPlayingAudio(id)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">
              My Transcriptions
            </h2>
            <p className="text-sm text-zinc-600">
              View all your saved transcriptions
            </p>
          </div>
          <Button onClick={fetchTranscriptions} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && transcriptions.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-zinc-400" />
              <p className="text-center text-zinc-600">
                No transcriptions found. Start by creating a transcription.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && transcriptions.length > 0 && (
          <div className="space-y-4">
            {transcriptions.map((transcription) => (
              <Card key={transcription.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {transcription.type === "live"
                          ? "Live Recording"
                          : "File Upload"}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
                        <Clock className="h-4 w-4" />
                        {transcription.date}
                      </div>
                    </div>
                    {transcription.audioUrl && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handlePlayAudio(
                              transcription.audioUrl!,
                              transcription.id
                            )
                          }
                        >
                          <Play className="h-4 w-4" />
                          {playingAudio === transcription.id
                            ? "Playing"
                            : "Play Audio"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {playingAudio === transcription.id &&
                    transcription.audioUrl && (
                      <audio
                        controls
                        autoPlay
                        className="w-full"
                        onEnded={() => setPlayingAudio(null)}
                      >
                        <source src={transcription.audioUrl} />
                        Your browser does not support the audio element.
                      </audio>
                    )}

                  <div>
                    <h4 className="mb-2 text-sm font-medium text-zinc-700">
                      Transcript:
                    </h4>
                    <div className="rounded-md bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-900">
                      {transcription.transcript || "No transcript available"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
