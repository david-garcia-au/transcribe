import { FileTranscription } from "@/components/file-transcription"
import { LiveTranscription } from "@/components/live-transcription"
import { StreamingTranscription } from "@/components/streaming-transcription"
import { Navigation } from "@/components/navigation"

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3 md:grid-cols-2">
          <LiveTranscription />
          <FileTranscription />
          <StreamingTranscription />
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Transcription Methods
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="mb-2 font-medium text-zinc-900">
                Live Voice (S3)
              </h3>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Records locally, processes via S3
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Medical terminology support
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Speaker identification
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-zinc-900">
                Audio File Upload
              </h3>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Upload pre-recorded files
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Medical terminology support
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Speaker identification
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-zinc-900">
                Real-Time Streaming
              </h3>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Direct streaming (no S3)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  General transcription
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Near real-time results
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
