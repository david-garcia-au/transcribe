import type { Metadata } from "next"
import "@cloudscape-design/global-styles/index.css"
import "./globals.css"

export const metadata: Metadata = {
  title: "AWS Transcribe Medical - POC",
  description:
    "Medical transcription proof of concept using AWS Transcribe Medical",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
