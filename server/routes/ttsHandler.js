import { InworldService } from '../services/inworld.js';
import { VOICES, SUPPORTED_LANGUAGES } from '../config/voices.js';
import { personalityMap } from '../config/personalityMap.js';

export async function handleTtsRequest(req, res) {
  if (req.method === 'GET' && req.url === '/api/voices') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        voices: VOICES,
        languages: SUPPORTED_LANGUAGES,
        personalities: personalityMap
      })
    );
    return;
  }

  if (req.method === 'POST' && (req.url === '/api/tts' || req.url === '/api/tts/')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 65536) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: 'Request payload exceeds limit.' }));
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        let parsedPayload = {};
        if (body) {
          try {
            parsedPayload = JSON.parse(body);
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload.' }));
            return;
          }
        }

        const { buffer, contentType } = await InworldService.synthesize({
          text: parsedPayload.text,
          voiceId: parsedPayload.voiceId,
          language: parsedPayload.language,
          speakingRate: parsedPayload.speakingRate,
          deliveryMode: parsedPayload.deliveryMode,
          personality: parsedPayload.personality
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-store');
        res.end(buffer);
      } catch (err) {
        const statusCode = err.statusCode || 500;
        const errorCode = err.code || 'INTERNAL_ERROR';
        const message = err.message || 'An unexpected error occurred.';

        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: errorCode,
            message: message
          })
        );
      }
    });
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Endpoint not found.' }));
}
