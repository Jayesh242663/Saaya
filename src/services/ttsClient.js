import { preferenceService } from './preferenceService.js';

let previewAudioInstance = null;

export const ttsClient = {
  async fetchVoices() {
    try {
      const response = await fetch('/api/voices');
      if (!response.ok) throw new Error('Failed to fetch voices');
      return await response.json();
    } catch {
      return {
        voices: [
          {
            id: 'Meher',
            name: 'Meher (Hindi / Marathi / English)',
            gender: 'FEMALE',
            supportedLanguages: ['hi-IN', 'mr-IN', 'en-US'],
            defaultPersonality: 'calm',
            description: 'Inworld TTS-2 Indian Voice for Hindi, Marathi & English (Warm & Articulate).'
          },
          {
            id: 'Sarah',
            name: 'Sarah (Nocturnal Host)',
            gender: 'FEMALE',
            supportedLanguages: ['en-US', 'hi-IN', 'mr-IN', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
            defaultPersonality: 'calm',
            description: 'Inworld TTS-2 Female Voice (Stable & Velvety).'
          },
          {
            id: 'Blake',
            name: 'Blake (Expressive Host)',
            gender: 'MALE',
            supportedLanguages: ['en-US', 'hi-IN', 'mr-IN', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
            defaultPersonality: 'late-night',
            description: 'Inworld TTS-2 Male Voice (Expressive & Deep).'
          }
        ],
        languages: {
          'en-US': 'English (United States)',
          'hi-IN': 'Hindi (हिंदी)',
          'mr-IN': 'Marathi (मराठी)',
          'es-ES': 'Spanish (Español)',
          'fr-FR': 'French (Français)',
          'de-DE': 'German (Deutsch)',
          'ja-JP': 'Japanese (日本語)'
        }
      };
    }
  },

  async synthesizeSpeech(params = {}) {
    const prefs = preferenceService.getPreferences();

    const payload = {
      text: params.text,
      voiceId: params.voiceId || prefs.voiceId || 'Meher',
      language: params.language || prefs.language || 'en-US',
      speakingRate: params.speakingRate || prefs.speakingRate || 1.0,
      deliveryMode: params.deliveryMode || prefs.deliveryMode || 'BALANCED',
      personality: params.personality || prefs.personality || 'calm'
    };

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = 'Inworld TTS synthesis failed.';
      try {
        const errorJson = await response.json();
        if (errorJson?.message) {
          errorMsg = errorJson.message;
        }
      } catch {
        // Safe fallback
      }
      throw new Error(errorMsg);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  async previewVoice(params = {}, onStart, onEnd) {
    if (previewAudioInstance) {
      previewAudioInstance.pause();
      previewAudioInstance = null;
    }

    const audioUrl = await this.synthesizeSpeech(params);
    const audio = new Audio(audioUrl);
    previewAudioInstance = audio;

    return new Promise((resolve, reject) => {
      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        if (onEnd) onEnd();
        URL.revokeObjectURL(audioUrl);
        previewAudioInstance = null;
        resolve();
      };

      audio.onerror = () => {
        if (onEnd) onEnd();
        URL.revokeObjectURL(audioUrl);
        previewAudioInstance = null;
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch((err) => {
        if (onEnd) onEnd();
        URL.revokeObjectURL(audioUrl);
        previewAudioInstance = null;
        reject(err);
      });
    });
  }
};
