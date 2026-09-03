# SAAYA (साया)

> *Radio in the dark.* An atmospheric ambient music station featuring an intelligent AI host, universal playlist curation, and synchronized ephemeral listening rooms.

---

## Overview

**SAAYA** transforms ordinary music playlists into a continuous, nocturnal radio broadcast. Combining speech synthesis with real-time audio ducking, the AI host introduces tracks, delivers localized weather musings, and guides listeners through late-night frequencies.

---

## Features

- **Autonomous AI Radio Host**: Fluid track introductions, transition commentary, and broadcast-grade volume ducking powered by Inworld TTS and Google Gemini.
- **Universal Playlist Ingestion**: Paste public playlist links from YouTube, YouTube Music, Spotify, Apple Music, or JioSaavn to curate an on-the-fly station.
- **Synchronized Listening Rooms**: Create ephemeral listening sessions with shareable invite codes (`SAAYA-XXXX`). Features micro-seek drift correction and automatic zero-storage garbage collection when sessions end.
- **Atmospheric Design**: Obsidian void aesthetic with spatial turntable carousel, dynamic backdrop glow extraction, and minimalist typography (`Space Grotesk` & `DM Mono`).
- **Production-Ready Core**: Standalone Node.js server with health checks (`GET /api/health`), baseline security headers, and multi-stage Docker support.

---

## Quick Start

### 1. Installation

```bash
git clone https://github.com/your-username/saaya.git
cd saaya
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
# Server-side TTS synthesis (never exposed to browser)
INWORLD_API_KEY=your_inworld_api_key_here

# Optional LLM configuration (or configure directly in app Settings)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Locally

```bash
# Development server (frontend + backend middleware)
npm run dev

# Production build and standalone server
npm run build
npm start
```

---

## Deployment

SAAYA is container-ready and deploys to cloud hosts like Render, Railway, Fly.io, or VPS with a single command.

```bash
docker build -t saaya:latest .
docker run -p 3000:3000 -e INWORLD_API_KEY="your_key" saaya:latest
```

Detailed deployment workflows and Nginx reverse proxy configs can be found in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## License

MIT License © 2026 SAAYA.
