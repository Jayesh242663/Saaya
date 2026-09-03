import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { handleTtsRequest } from './server/routes/ttsHandler.js';
import { handleMusicRequest } from './server/routes/musicHandler.js';
import { initRoomWebSocketServer, handleRoomHttpRequest } from './server/routes/wsRoomHandler.js';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Populate server-side process.env strictly for Node.js backend
  if (env.INWORLD_API_KEY) {
    process.env.INWORLD_API_KEY = env.INWORLD_API_KEY;
  }

  return {
    plugins: [
      react(),
      {
        name: 'saaya-backend-engine',
        configureServer(server) {
          if (server.httpServer) {
            initRoomWebSocketServer(server.httpServer);
          }

          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/api/health')) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'healthy', timestamp: Date.now() }));
            } else if (req.url?.startsWith('/api/tracks') || req.url?.startsWith('/api/playlist')) {
              handleMusicRequest(req, res);
            } else if (req.url?.startsWith('/api/tts') || req.url?.startsWith('/api/voices')) {
              handleTtsRequest(req, res);
            } else if (req.url?.startsWith('/api/rooms')) {
              handleRoomHttpRequest(req, res);
            } else {
              next();
            }
          });
        },
        configurePreviewServer(server) {
          if (server.httpServer) {
            initRoomWebSocketServer(server.httpServer);
          }

          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/api/health')) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'healthy', timestamp: Date.now() }));
            } else if (req.url?.startsWith('/api/tracks') || req.url?.startsWith('/api/playlist')) {
              handleMusicRequest(req, res);
            } else if (req.url?.startsWith('/api/tts') || req.url?.startsWith('/api/voices')) {
              handleTtsRequest(req, res);
            } else if (req.url?.startsWith('/api/rooms')) {
              handleRoomHttpRequest(req, res);
            } else {
              next();
            }
          });
        }
      }
    ],
    // Only safe client-side environment prefixes (NEVER expose INWORLD_ to browser)
    envPrefix: ['VITE_', 'LLM_', 'GEMINI_', 'OPENAI_']
  };
});
