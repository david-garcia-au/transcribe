"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import AppLayout from "@cloudscape-design/components/app-layout"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Header from "@cloudscape-design/components/header"
import Container from "@cloudscape-design/components/container"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Button from "@cloudscape-design/components/button"
import Spinner from "@cloudscape-design/components/spinner"
import Alert from "@cloudscape-design/components/alert"
import Box from "@cloudscape-design/components/box"
import Badge from "@cloudscape-design/components/badge"
import Grid from "@cloudscape-design/components/grid"

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
      setError(
        err instanceof Error ? err.message : "Failed to load transcriptions"
      )
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
    <>
      <Navigation />
      <AppLayout
        navigationHide
        toolsHide
        contentType="default"
        content={
          <ContentLayout
            header={
              <Header
                variant="h1"
                description="View all your saved transcriptions"
                actions={
                  <Button onClick={fetchTranscriptions} iconName="refresh">
                    Refresh
                  </Button>
                }
              >
                My Transcriptions
              </Header>
            }
          >
            {loading && (
              <Box textAlign="center" padding={{ vertical: "xxl" }}>
                <Spinner size="large" />
              </Box>
            )}

            {error && <Alert type="error">{error}</Alert>}

            {!loading && !error && transcriptions.length === 0 && (
              <Container>
                <Box textAlign="center" padding={{ vertical: "xxl" }}>
                  <SpaceBetween size="m">
                    <Box variant="h2" color="text-status-inactive">
                      📄
                    </Box>
                    <Box variant="p" color="text-body-secondary">
                      No transcriptions found. Start by creating a
                      transcription.
                    </Box>
                  </SpaceBetween>
                </Box>
              </Container>
            )}

            {!loading && !error && transcriptions.length > 0 && (
              <SpaceBetween size="l">
                {transcriptions.map((transcription) => (
                  <Container
                    key={transcription.id}
                    header={
                      <Grid
                        gridDefinition={[
                          {
                            colspan: {
                              default: 12,
                              xxs: 4,
                              xs: 4,
                              s: 6,
                              m: 8,
                              l: 8,
                              xl: 8,
                            },
                          },
                          {
                            colspan: {
                              default: 12,
                              xxs: 4,
                              xs: 4,
                              s: 2,
                              m: 4,
                              l: 4,
                              xl: 4,
                            },
                          },
                        ]}
                      >
                        <Header variant="h2">
                          <SpaceBetween
                            size="xs"
                            direction="horizontal"
                            alignItems="center"
                          >
                            <Box>
                              {transcription.type === "live"
                                ? "Live Recording"
                                : "File Upload"}
                            </Box>
                            <Badge color="blue">{transcription.date}</Badge>
                          </SpaceBetween>
                        </Header>
                        <Box textAlign="right">
                          {transcription.audioUrl && (
                            <Button
                              iconName="play"
                              onClick={() =>
                                handlePlayAudio(
                                  transcription.audioUrl!,
                                  transcription.id
                                )
                              }
                            >
                              {playingAudio === transcription.id
                                ? "Playing"
                                : "Play Audio"}
                            </Button>
                          )}
                        </Box>
                      </Grid>
                    }
                  >
                    <SpaceBetween size="m">
                      {playingAudio === transcription.id &&
                        transcription.audioUrl && (
                          <Box>
                            <audio
                              controls
                              autoPlay
                              style={{ width: "100%", maxWidth: "100%" }}
                              onEnded={() => setPlayingAudio(null)}
                            >
                              <source src={transcription.audioUrl} />
                              Your browser does not support the audio element.
                            </audio>
                          </Box>
                        )}

                      <div>
                        <Box
                          variant="awsui-key-label"
                          padding={{ bottom: "xs" }}
                        >
                          Transcript:
                        </Box>
                        <div
                          className="transcript-content"
                          style={{
                            padding: "var(--space-m)",
                            backgroundColor: "var(--color-background-container-content)",
                            borderRadius: "var(--border-radius-container)",
                            fontSize: "var(--font-body-m-size)",
                            lineHeight: "var(--font-body-m-line-height)",
                            color: "var(--color-text-body-default)",
                          }}
                        >
                          {transcription.transcript ||
                            "No transcript available"}
                        </div>
                      </div>
                    </SpaceBetween>
                  </Container>
                ))}
              </SpaceBetween>
            )}
          </ContentLayout>
        }
      />
    </>
  )
}
