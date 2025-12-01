# Vexa Client

A real-time transcription assistant built on top of the [Vexa API](https://github.com/Vexa-ai/vexa), designed to provide seamless meeting transcription with a clean, modern interface.

## Overview

This project is an example assistant built on top of the [Vexa API](https://github.com/Vexa-ai/vexa), showcasing how to integrate real-time meeting transcription into a web application. It provides a user-friendly interface for transcribing meetings across multiple platforms, with support for multiple languages and real-time updates.

## Demo

Check out our demo video:

[![Vexa Client Demo](https://img.youtube.com/vi/bA_4DVDO_KM/0.jpg)](https://www.youtube.com/watch?v=bA_4DVDO_KM)

## Features

- **Real-time Transcription**: Capture meeting content as it happens with minimal latency
- **Multi-language Support**: Transcribe in 99+ languages with a searchable language selector
- **Live Translation**: Switch languages during an ongoing meeting
- **Clean UI**: Modern, responsive interface with collapsible sidebar
- **Transcript Management**: Copy, download as text, or export as CSV
- **Keyboard Shortcuts**: Copy transcripts easily with Ctrl+C
- **Meeting History**: View and manage previous meeting transcriptions

## Getting Started

### Prerequisites

- Node.js 18+
- NPM or Yarn
- A Vexa API key (get one at [vexa.ai](https://vexa.ai))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Vexa-ai/vexa_example_client
   cd vexa_example_client
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_VEXA_API_URL=https://gateway.dev.vexa.ai
   NEXT_PUBLIC_VEXA_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Start a New Meeting**: Click "New Meeting" in the sidebar and enter your meeting URL
2. **View Live Transcription**: The transcription will start automatically and update in real-time
3. **Change Language**: Use the language selector to switch between languages during the meeting
4. **Download or Copy**: Use the dropdown to copy text or download in your preferred format
5. **Access History**: View previous meeting transcripts through the sidebar

## Technology Stack

- **Next.js**: React framework for the frontend
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible UI components
- **Vexa API**: Real-time transcription service

## Configuration

### Mock Mode

For development without connecting to the Vexa API, set `MOCK_MODE=true` in `/lib/config.ts`. This will use simulated transcription data.

### API Configuration

The application uses the Vexa API for transcription services. You'll need a valid API key from [vexa.ai](https://vexa.ai) to use this application with real meetings.

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## Acknowledgments

- Built on the [Vexa API](https://github.com/Vexa-ai/vexa)
- Uses [shadcn/ui](https://ui.shadcn.com/) for UI components 