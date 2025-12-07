# AWS Transcribe Medical - Proof of Concept

A professional medical transcription application demonstrating AWS Transcribe Medical capabilities, including real-time voice streaming and audio file transcription with multi-speaker identification.

## Features

- **Live Voice Transcription (S3)**: Record and transcribe medical conversations via S3 storage
- **Audio File Transcription**: Upload and transcribe pre-recorded medical audio files
- **Real-Time Streaming**: Direct streaming transcription without S3 storage
- **Multi-Speaker Identification**: Automatically identify and differentiate between multiple speakers (Medical transcription only)
- **Transcription History**: View all saved transcriptions with audio playback
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

### Live Transcription (S3 Storage)
1. Click "Start Recording" to begin capturing audio
2. Speak into your microphone (audio is recorded locally)
3. Click "Stop Recording" to end recording and send for transcription
4. Wait a few seconds for AWS to process the audio
5. View the transcribed text with speaker labels

Note: This method uses AWS Transcribe Medical with S3 storage. Processing typically takes 5-15 seconds depending on audio length.

### File Transcription
1. Click "Select Audio File" to choose an audio file
2. Upload supported formats (MP3, WAV, FLAC, etc.)
3. Wait for processing to complete
4. View the transcribed text with speaker identification

### Real-Time Streaming
1. Click "Start Streaming" to begin live transcription
2. Speak into your microphone
3. See transcription appear in near real-time (updates every 2 seconds)
4. Click "Stop Streaming" to end the session

Note: This method uses AWS Transcribe Streaming (not Medical) and sends audio directly without S3 storage. Results appear faster but without medical terminology optimization.

### My Transcriptions
1. Click "My Transcriptions" in the navigation menu
2. View all saved transcriptions from S3
3. Click "Play Audio" to listen to the original recording (if available)
4. Read the full transcript for each recording
5. Click "Refresh" to update the list

## AWS Requirements

- AWS account with Transcribe and Transcribe Medical enabled
- S3 bucket for temporary audio storage (for Live and File transcription)
- IAM user with appropriate permissions:
  - `transcribe:StartStreamTranscription` (for Real-Time Streaming)
  - `transcribe:StartMedicalTranscriptionJob` (for Live and File)
  - `transcribe:GetMedicalTranscriptionJob` (for Live and File)
  - `s3:PutObject` (for Live and File)
  - `s3:GetObject` (for Live and File)

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