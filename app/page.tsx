import { FileTranscription } from "@/components/file-transcription"
import { LiveTranscription } from "@/components/live-transcription"
import { Stethoscope } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-8 w-8 text-zinc-900" />
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">
                AWS Transcribe Medical
              </h1>
              <p className="text-sm text-zinc-600">
                Medical transcription proof of concept
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <LiveTranscription />
          <FileTranscription />
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Features
          </h2>
          <ul className="space-y-2 text-sm text-zinc-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
              Real-time voice stream transcription with medical terminology
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
              Audio file transcription for recorded consultations
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
              Multi-speaker identification and differentiation
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
              HIPAA-compliant medical transcription service
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
