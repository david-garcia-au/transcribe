"use client"

import { FileTranscription } from "@/components/file-transcription"
import { LiveTranscription } from "@/components/live-transcription"
import { StreamingTranscription } from "@/components/streaming-transcription"
import { Navigation } from "@/components/navigation"
import AppLayout from "@cloudscape-design/components/app-layout"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Header from "@cloudscape-design/components/header"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Grid from "@cloudscape-design/components/grid"
import Container from "@cloudscape-design/components/container"
import Box from "@cloudscape-design/components/box"

export default function Home() {
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
                description="Medical transcription proof of concept"
              >
                Transcription Methods
              </Header>
            }
          >
            <SpaceBetween size="l">
              {/* Desktop: 12-column grid, 4 columns each (3 cards)
                  Tablet: 8-column grid, 4 columns each (2 cards per row)
                  Mobile: 4-column grid, full width (1 card per row) */}
              <Grid
                gridDefinition={[
                  { colspan: { default: 12, xxs: 4, xs: 4, s: 8, m: 4, l: 4, xl: 4 } },
                  { colspan: { default: 12, xxs: 4, xs: 4, s: 8, m: 4, l: 4, xl: 4 } },
                  { colspan: { default: 12, xxs: 4, xs: 4, s: 8, m: 4, l: 4, xl: 4 } },
                ]}
              >
                <LiveTranscription />
                <FileTranscription />
                <StreamingTranscription />
              </Grid>

              {/* About section */}
              <Container
                header={
                  <Header variant="h2">About Transcription Methods</Header>
                }
              >
                <Grid
                  gridDefinition={[
                    { colspan: { default: 12, xxs: 4, xs: 4, s: 8, m: 4, l: 4, xl: 4 } },
                    { colspan: { default: 12, xxs: 4, xs: 4, s: 8, m: 4, l: 4, xl: 4 } },
                    { colspan: { default: 12, xxs: 4, xs: 4, s: 8, m: 4, l: 4, xl: 4 } },
                  ]}
                >
                  <Box>
                    <SpaceBetween size="s">
                      <Box variant="h3">Live Voice (S3)</Box>
                      <Box variant="p" color="text-body-secondary">
                        Records locally, processes via S3
                      </Box>
                      <Box variant="p" color="text-body-secondary">
                        Medical terminology support
                      </Box>
                      <Box variant="p" color="text-body-secondary">
                        Speaker identification
                      </Box>
                    </SpaceBetween>
                  </Box>
                  <Box>
                    <SpaceBetween size="s">
                      <Box variant="h3">Audio File Upload</Box>
                      <Box variant="p" color="text-body-secondary">
                        Upload pre-recorded files
                      </Box>
                      <Box variant="p" color="text-body-secondary">
                        Medical terminology support
                      </Box>
                      <Box variant="p" color="text-body-secondary">
                        Speaker identification
                      </Box>
                    </SpaceBetween>
                  </Box>
                  <Box>
                    <SpaceBetween size="s">
                      <Box variant="h3">Real-Time Streaming</Box>
                      <Box variant="p" color="text-body-secondary">
                        Direct streaming (no S3)
                      </Box>
                      <Box variant="p" color="text-body-secondary">
                        General transcription
                      </Box>
                      <Box variant="p" color="text-body-secondary">
                        Near real-time results
                      </Box>
                    </SpaceBetween>
                  </Box>
                </Grid>
              </Container>
            </SpaceBetween>
          </ContentLayout>
        }
      />
    </>
  )
}
