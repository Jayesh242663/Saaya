import fs from 'fs';
import path from 'path';
import { getVoiceById, isLanguageSupported } from '../config/voices.js';
import { personalityMap } from '../config/personalityMap.js';

export class InworldService {
  static getApiKey() {
    if (process.env.INWORLD_API_KEY && process.env.INWORLD_API_KEY.trim()) {
      return process.env.INWORLD_API_KEY.trim();
    }
    if (process.env.VITE_INWORLD_API_KEY && process.env.VITE_INWORLD_API_KEY.trim()) {
      return process.env.VITE_INWORLD_API_KEY.trim();
    }

    // Read dynamically from .env so modifications take effect immediately
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/^(?:VITE_)?INWORLD_API_KEY\s*=\s*(.*)$/m);
        if (match && match[1]) {
          const val = match[1].trim().replace(/^["']|["']$/g, '');
          if (val) {
            process.env.INWORLD_API_KEY = val;
            return val;
          }
        }
      }
    } catch {
      // Safe fallback
    }

    return undefined;
  }

  static async synthesize(request = {}) {
    const text = (request.text || '').trim();
    if (!text) {
      const error = new Error('Text parameter is required.');
      error.code = 'EMPTY_TEXT';
      error.statusCode = 400;
      throw error;
    }

    if (text.length > 2000) {
      const error = new Error('Text length exceeds maximum allowed limit (2000 characters).');
      error.code = 'TEXT_TOO_LONG';
      error.statusCode = 400;
      throw error;
    }

    // Normalize language codes (e.g. 'hindi' -> 'hi-IN', 'marathi' -> 'mr-IN')
    let language = request.language || 'en-US';
    const langLower = String(language).toLowerCase();
    if (langLower.includes('hi') || langLower === 'hindi') {
      language = 'hi-IN';
    } else if (langLower.includes('mr') || langLower === 'marathi') {
      language = 'mr-IN';
    } else if (langLower.includes('en') || langLower === 'english') {
      language = 'en-US';
    }

    // Auto-detect Devanagari script in text (Hindi/Marathi)
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    if (hasDevanagari && language === 'en-US') {
      language = 'hi-IN';
    }

    // Resolve voice: use Meher for Hindi/Marathi, or user's requested voice
    let requestedVoice = request.voiceId;
    if (!requestedVoice || language === 'hi-IN' || language === 'mr-IN') {
      requestedVoice = (language === 'hi-IN' || language === 'mr-IN') ? 'Meher' : (requestedVoice || 'Meher');
    }

    const voice = getVoiceById(requestedVoice);
    const inworldVoiceId = voice ? voice.inworldVoiceName : 'Meher';

    // Resolve personality & pacing modulation
    const personality = request.personality || (voice ? voice.defaultPersonality : 'calm');
    const personalityConfig = personalityMap[personality] || personalityMap['calm'];

    const baseRate = typeof request.speakingRate === 'number' && request.speakingRate > 0 ? request.speakingRate : 1.0;
    const finalSpeakingRate = Math.max(0.5, Math.min(2.0, baseRate * (personalityConfig.rateModifier || 1.0)));
    const deliveryMode = request.deliveryMode || voice.defaultDeliveryMode || 'BALANCED';

    const apiKey = this.getApiKey();
    if (!apiKey) {
      const error = new Error('Inworld API key is not configured on the server. Please set INWORLD_API_KEY in your .env file.');
      error.code = 'SERVER_CONFIG_MISSING';
      error.statusCode = 503;
      throw error;
    }

    // Format Authorization header safely (e.g. Basic <api-key>)
    const cleanedKey = apiKey.trim();
    const authHeader = cleanedKey.startsWith('Basic ') || cleanedKey.startsWith('Bearer ')
      ? cleanedKey
      : `Basic ${cleanedKey}`;

    const payload = {
      text,
      voiceId: inworldVoiceId,
      modelId: 'inworld-tts-2',
      timestampType: 'WORD',
      audioConfig: {
        speakingRate: Number(finalSpeakingRate.toFixed(2))
      },
      deliveryMode: deliveryMode,
      language: language
    };

    console.log(`[Inworld TTS] Synthesizing speech with voiceId: "${payload.voiceId}", modelId: "${payload.modelId}", deliveryMode: "${payload.deliveryMode}", language: "${payload.language}", rate: ${payload.audioConfig.speakingRate}`);

    let response;
    try {
      response = await fetch('https://api.inworld.ai/tts/v1/voice', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (networkErr) {
      console.error('[Inworld TTS] Network error communicating with Inworld API:', networkErr);
      const error = new Error('Unable to communicate with Inworld TTS API.');
      error.code = 'NETWORK_ERROR';
      error.statusCode = 502;
      throw error;
    }

    if (!response.ok) {
      let errorDetail = 'Inworld TTS synthesis failed.';
      try {
        const errorJson = await response.json();
        console.error('[Inworld TTS Error Response]', response.status, errorJson);
        if (errorJson && (errorJson.message || errorJson.error)) {
          errorDetail = errorJson.message || errorJson.error;
        }
      } catch {
        console.error('[Inworld TTS Error]', response.status, response.statusText);
      }

      if (response.status === 401 || response.status === 403) {
        const error = new Error('Authentication with Inworld API failed. Please verify INWORLD_API_KEY in .env.');
        error.code = 'AUTHENTICATION_FAILED';
        error.statusCode = 401;
        throw error;
      }

      if (response.status === 429) {
        const error = new Error('Inworld rate limit exceeded.');
        error.code = 'RATE_LIMITED';
        error.statusCode = 429;
        throw error;
      }

      const error = new Error(errorDetail);
      error.code = 'TTS_ENGINE_ERROR';
      error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 500;
      throw error;
    }

    // Inworld non-streaming API returns { audioContent: "<base64-mp3>", ... }
    const data = await response.json();
    if (!data || !data.audioContent) {
      console.error('[Inworld TTS] Invalid response payload from Inworld:', data);
      const error = new Error('Inworld API response did not contain audioContent.');
      error.code = 'INVALID_TTS_RESPONSE';
      error.statusCode = 502;
      throw error;
    }

    const buffer = Buffer.from(data.audioContent, 'base64');
    const contentType = 'audio/mpeg';

    console.log(`[Inworld TTS] Successfully generated audio for ${payload.voiceId} (${buffer.length} bytes)`);
    return { buffer, contentType };
  }
}
