import { ttsClient } from './ttsClient.js';
import { preferenceService } from './preferenceService.js';

class InworldService {
  constructor() {
    this.currentAudio = null;
    this.fallbackTimeout = null;
  }

  // Synthesize speech exclusively via Inworld TTS API (POST /api/tts)
  async speak(text, onStart, onEnd, context = {}) {
    this.stop();

    const prefs = preferenceService.getPreferences();

    // Resolve language and voice
    let targetLanguage = context.language || prefs.language || 'en-US';
    let targetVoice = prefs.voiceId || 'Meher';

    // Auto-detect Hindi/Marathi from text or context
    const hasDevanagari = /[\u0900-\u097F]/.test(text || '');
    if (hasDevanagari || targetLanguage === 'hi-IN' || targetLanguage === 'mr-IN') {
      targetVoice = 'Meher';
      if (targetLanguage === 'en-US' || !targetLanguage) {
        targetLanguage = 'hi-IN';
      }
    }

    try {
      // Request audio stream from backend endpoint (POST /api/tts)
      const audioUrl = await ttsClient.synthesizeSpeech({
        text,
        voiceId: targetVoice,
        language: targetLanguage,
        personality: prefs.personality || 'calm',
        speakingRate: 1.0,
        deliveryMode: 'BALANCED'
      });

      if (audioUrl) {
        await this.playAudioUrl(audioUrl, onStart, onEnd);
        return;
      }
    } catch (err) {
      console.warn('[Inworld Service] TTS audio could not be synthesized:', err.message || err);
      // When TTS is waiting for key or network, still show the spoken subtitles on screen
      // and give the listener time to read the commentary before smoothly transitioning
      if (onStart) onStart();
      const readDuration = Math.max(3500, Math.min(8000, (text || '').split(' ').length * 280));
      this.fallbackTimeout = setTimeout(() => {
        this.fallbackTimeout = null;
        if (onEnd) onEnd();
      }, readDuration);
    }
  }

  playAudioUrl(url, onStart, onEnd) {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        if (onEnd) onEnd();
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = () => {
        if (onEnd) onEnd();
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        resolve();
      };

      audio.play().catch((err) => {
        console.warn('Audio playback error:', err);
        if (onEnd) onEnd();
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        resolve();
      });
    });
  }

  stop() {
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }
  }
}

export const inworldService = new InworldService();
