import { handleMusicRequest } from '../server/routes/musicHandler.js';
import { handleTtsRequest } from '../server/routes/ttsHandler.js';
import { handleRoomHttpRequest } from '../server/routes/wsRoomHandler.js';

export default async function handler(req, res) {
  // Baseline security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/health' || pathname === '/api/health/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'saaya-personal-radio',
        platform: 'vercel-serverless',
        timestamp: Date.now()
      })
    );
    return;
  }

  if (pathname.startsWith('/api/tracks') || pathname.startsWith('/api/playlist')) {
    return handleMusicRequest(req, res);
  }

  if (pathname.startsWith('/api/tts') || pathname.startsWith('/api/voices')) {
    return handleTtsRequest(req, res);
  }

  if (pathname.startsWith('/api/rooms')) {
    return handleRoomHttpRequest(req, res);
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'API endpoint not found.' }));
}
