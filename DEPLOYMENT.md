# SAAYA (साया) — Production Deployment Guide

This guide covers everything needed to deploy SAAYA securely and safely to cloud production environments (Render, Railway, Docker, Fly.io, or VPS).

---

## 1. Pre-Deployment Security & Architecture Checklist

- [x] **Zero Secret Leakage**: The `INWORLD_API_KEY` is loaded strictly on the Node.js backend. It is never exposed in client bundles or HTML.
- [x] **Zero Database Dependency**: All listening rooms run entirely in volatile memory (`Map<string, Room>`). Empty rooms are garbage-collected immediately with zero persistent storage.
- [x] **Baseline Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [x] **Payload Size Limits**: TTS and playlist import payloads are strictly capped to prevent Denial of Service (DoS) memory spikes.
- [x] **Static Asset Caching**: Hashed assets in `/assets/` have `Cache-Control: public, max-age=31536000, immutable`, while `index.html` has `no-cache`.
- [x] **SPA Fallback Routing**: Deep links (such as `/?room=SAAYA-XXXX`) resolve correctly to `index.html`.
- [x] **Liveness Health Check**: Available at `GET /api/health`.

---

## 2. Environment Variables

Configure these variables in your hosting provider's dashboard:

| Variable | Required | Where | Description |
| :--- | :--- | :--- | :--- |
| `INWORLD_API_KEY` | **Yes** | Backend Server | Inworld API Key used for server-side AI voice synthesis. |
| `PORT` | Optional | Backend Server | Port to listen on (automatically injected by Render/Railway, defaults to `3000`). |
| `NODE_ENV` | Optional | Backend Server | Set to `production`. |
| `GEMINI_API_KEY` | Optional | Client/Backend | Fallback Google Gemini key if users do not enter their own in Settings. |
| `OPENAI_API_KEY` | Optional | Client/Backend | Fallback OpenAI key if users configure OpenAI in Settings. |

---

## 3. Deployment Options

### Option A: Render (Recommended - Free / Low Cost)

1. Create a **New Web Service** connected to your Git repository.
2. Configure settings:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
3. Add Environment Variables:
   - `INWORLD_API_KEY`: *(Your key)*
   - `NODE_ENV`: `production`
4. Set **Health Check Path**: `/api/health`
5. Click **Deploy**. Render will build the Vite assets and start the standalone server with full WebSocket support automatically.

---

### Option B: Railway (1-Click Deployment)

1. Create a **New Project** $\to$ **Deploy from GitHub repo**.
2. Railway detects the `Dockerfile` automatically (or Node.js environment).
3. Under **Variables**, add:
   - `INWORLD_API_KEY`: *(Your key)*
4. Railway provides a secure HTTPS URL with automatic WebSocket `wss://` termination.

---

### Option C: Docker Container (Any Cloud / VPS / AWS / Fly.io)

Build and run the multi-stage Docker container:

```bash
# 1. Build the production Docker image
docker build -t saaya:latest .

# 2. Run the container
docker run -d \
  --name saaya-app \
  -p 3000:3000 \
  -e INWORLD_API_KEY="your_inworld_key_here" \
  saaya:latest
```

Check health:
```bash
curl http://localhost:3000/api/health
```

---

### Option D: Ubuntu / Debian VPS with PM2

```bash
# 1. Clone and install
git clone <your-repo-url>
cd saaya
npm install

# 2. Build frontend bundle
npm run build

# 3. Start with PM2
npm install -g pm2
INWORLD_API_KEY="your_key" PORT=3000 pm2 start server/server.js --name "saaya"

# 4. Save PM2 startup
pm2 save
pm2 startup
```

Nginx reverse proxy snippet for WebSockets:
```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 4. Post-Deployment Verification Checklist

1. **Verify Health**: Visit `https://your-domain.com/api/health` — must return:
   ```json
   {
     "status": "healthy",
     "service": "saaya-personal-radio",
     "uptime": 12,
     "activeRooms": 0
   }
   ```
2. **Verify Audio & Speech**:
   - Paste a playlist link (e.g. Spotify or YouTube).
   - Ensure the AI DJ speaks with Inworld TTS audio.
3. **Verify Listening Rooms over HTTPS/WSS**:
   - Open `Rooms` $\to$ Create Room.
   - Copy invite link and open in an incognito window.
   - Verify real-time playback synchronization and drift alignment.
