import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleMusicRequest } from './routes/musicHandler.js';
import { handleTtsRequest } from './routes/ttsHandler.js';
import { initRoomWebSocketServer, handleRoomHttpRequest } from './routes/wsRoomHandler.js';
import { roomManager } from './services/roomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

// Load .env file if running standalone in Node
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch (err) {
    console.warn('[Server] Could not read .env file:', err.message);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Apply baseline security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // 1. Health Check Endpoint for Cloud Monitors (Render, AWS, Railway, K8s)
  if (pathname === '/api/health' || pathname === '/api/health/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'saaya-personal-radio',
        uptime: Math.floor(process.uptime()),
        timestamp: Date.now(),
        activeRooms: roomManager.rooms.size
      })
    );
    return;
  }

  // 2. API Routes
  if (pathname.startsWith('/api/tracks') || pathname.startsWith('/api/playlist')) {
    handleMusicRequest(req, res);
    return;
  }

  if (pathname.startsWith('/api/tts') || pathname.startsWith('/api/voices')) {
    handleTtsRequest(req, res);
    return;
  }

  if (pathname.startsWith('/api/rooms')) {
    handleRoomHttpRequest(req, res);
    return;
  }

  // 3. Static Assets & SPA Fallback
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath);

  // If path is root or directory, point to index.html
  if (pathname === '/' || !path.extname(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: serve index.html for client-side routing & deep links
      const indexPath = path.join(DIST_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.end('404: SAAYA client build not found. Please run "npm run build" first.');
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Cache policy: Hashed build assets get 1 year; index.html gets no-cache
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  });
});

// Initialize WebSocket server on the HTTP server
initRoomWebSocketServer(server);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`\n------------------------------------------------------`);
  console.log(`[SAAYA PRODUCTION SERVER] ONLINE`);
  console.log(`Address:     http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`WebSocket:   ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/ws/rooms`);
  console.log(`Healthcheck: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/health`);
  console.log(`------------------------------------------------------\n`);
});

// Graceful shutdown
const handleShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP and WebSocket connections closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
