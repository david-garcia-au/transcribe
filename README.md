# AWS Transcribe Medical - Proof of Concept

A professional medical transcription application demonstrating AWS Transcribe Medical capabilities, including real-time voice streaming and audio file transcription with multi-speaker identification.

## Features

- **Live Voice Transcription**: Record and transcribe medical conversations in real-time
- **Audio File Transcription**: Upload and transcribe pre-recorded medical audio files
- **Multi-Speaker Identification**: Automatically identify and differentiate between multiple speakers
- **Professional UI**: Clean, minimal interface built with Tailwind CSS and Shadcn UI components
- **HIPAA-Compliant**: Uses AWS Transcribe Medical for secure medical transcription

## Tech Stack

- Next.js 16.0.7 (App Router)
- React 19.2.0
- TypeScript 5
- Tailwind CSS v4
- AWS SDK (Transcribe Streaming, S3)
- Shadcn UI components

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure AWS credentials:
   - Copy `.env.example` to `.env.local`
   - Add your AWS credentials and S3 bucket name
   - Ensure your AWS account has permissions for:
     - AWS Transcribe Medical
     - S3 bucket access

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=your_s3_bucket_name
```

## Usage

### Live Transcription
1. Click "Start Recording" to begin capturing audio
2. Speak into your microphone (audio is recorded locally)
3. Click "Stop Recording" to end recording and send for transcription
4. Wait a few seconds for AWS to process the audio
5. View the transcribed text with speaker labels

Note: Due to AWS Transcribe Medical API limitations, the "live" transcription processes the entire recording after you stop, rather than streaming word-by-word. Processing typically takes 5-15 seconds depending on audio length.

### File Transcription
1. Click "Select Audio File" to choose an audio file
2. Upload supported formats (MP3, WAV, FLAC, etc.)
3. Wait for processing to complete
4. View the transcribed text with speaker identification

## AWS Requirements

- AWS account with Transcribe Medical enabled
- S3 bucket for temporary audio storage
- IAM user with appropriate permissions:
  - `transcribe:StartMedicalStreamTranscription`
  - `transcribe:StartMedicalTranscriptionJob`
  - `transcribe:GetMedicalTranscriptionJob`
  - `s3:PutObject`
  - `s3:GetObject`

## Project Structure

```
/app
  /api/transcribe
    /live          # Real-time streaming API
    /file          # File upload API
  layout.tsx       # Root layout
  page.tsx         # Main page
/components
  /ui              # Shadcn UI components
  file-transcription.tsx
  live-transcription.tsx
/lib
  utils.ts         # Utility functions
```