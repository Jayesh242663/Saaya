import { ttsClient } from './ttsClient.js';
import { preferenceService } from './preferenceService.js';
import { voiceResolverService } from './voiceResolverService.js';

class InworldService {
  constructor() {
    this.currentAudio = null;
    this.fallbackTimeout = null;
    this.gapTimeout = null;
    this.isCancelled = false;
  }

  /**
   * Parse commentary into thought segments separated by prosodic pauses and contextual moods
   */
  parseSpeechSegments(rawText) {
    if (!rawText) return [];

    // Split on pause markers or paragraph breaks
    const rawTokens = rawText.split(
      /(\[(?:dramatic pause|longer dramatic pause|long dramatic pause|short pause|pause|music transition)\]|\n\n+)/gi
    );
    const segments = [];
    let pendingGap = 0;

    for (let i = 0; i < rawTokens.length; i++) {
      const token = (rawTokens[i] || '').trim();
      if (!token) continue;

      if (/\[(?:dramatic pause|longer dramatic pause|long dramatic pause)\]/i.test(token)) {
        pendingGap = 260; // small, natural dramatic breath
      } else if (/\[(?:short pause|pause)\]/i.test(token) || /\n\n/.test(token)) {
        pendingGap = 180; // natural tight breath
      } else if (/\[music transition\]/i.test(token)) {
        pendingGap = 200;
      } else {
        // Extract tone cues if present at the start of this segment (e.g. [warm, smiling])
        let tone = null;
        const toneMatch = token.match(/^\[(.*?)\]/);
        if (toneMatch) {
          tone = toneMatch[1].toLowerCase();
        }

        // Clean out bracket markers and markdown artifacts for clean, spoken audio
        const cleanText = token
          .replace(/\[.*?\]/g, '')
          .replace(/[*#_~`"«»“”]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanText) {
          segments.push({
            text: cleanText,
            gapAfter: pendingGap,
            tone: tone
          });
          pendingGap = 0;
        }
      }
    }

    if (segments.length === 0 && rawText.trim()) {
      const clean = rawText
        .replace(/\[.*?\]/g, '')
        .replace(/[*#_~`"«»“”]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (clean) segments.push({ text: clean, gapAfter: 0, tone: null });
    }

    return segments;
  }

  /**
   * Pre-synthesize speech audio in parallel and keep on standby in memory
   */
  async preSynthesize(text, context = {}) {
    try {
      const prefs = preferenceService.getPreferences();
      let targetLanguage = 'en-US';
      if (prefs.language && prefs.language !== 'AUTO') {
        targetLanguage = prefs.language;
      } else if (context.language) {
        targetLanguage = context.language;
      }

      const hasDevanagari = /[\u0900-\u097F]/.test(text || '');
      if (hasDevanagari || targetLanguage === 'hi-IN' || targetLanguage === 'mr-IN') {
        if (targetLanguage === 'en-US' || !targetLanguage) targetLanguage = 'hi-IN';
      }

      let targetVoice = context.voiceId || prefs.voiceId;
      if (!targetVoice || targetVoice.toLowerCase() === 'auto') {
        targetVoice = voiceResolverService.resolveVoice('Auto', context.tracks || [], targetLanguage);
      }
      if (targetLanguage === 'hi-IN' || targetLanguage === 'mr-IN' || hasDevanagari) {
        targetVoice = 'Meher';
      }

      const segments = this.parseSpeechSegments(text);
      if (segments.length === 0) return null;

      const synthesisPromises = segments.map((seg) => {
        let segmentPersonality = prefs.personality || 'late-night';
        let segmentDeliveryMode = prefs.deliveryMode || 'CREATIVE';

        if (seg.tone) {
          if (/warm|welcoming|friendly|smiling/i.test(seg.tone)) {
            segmentPersonality = 'warm';
            segmentDeliveryMode = 'CREATIVE';
          } else if (/upbeat|high energy|playful|laugh|bright/i.test(seg.tone)) {
            segmentPersonality = 'energetic';
            segmentDeliveryMode = 'CREATIVE';
          } else if (/soft|atmospheric|intimate|late-night/i.test(seg.tone)) {
            segmentPersonality = 'late-night';
            segmentDeliveryMode = 'CREATIVE';
          } else if (/calm|soothing|relaxed/i.test(seg.tone)) {
            segmentPersonality = 'calm';
            segmentDeliveryMode = 'STABLE';
          }
        }

        return ttsClient.synthesizeSpeech({
          text: seg.text,
          voiceId: targetVoice,
          language: targetLanguage,
          personality: segmentPersonality,
          speakingRate: 1.0,
          deliveryMode: segmentDeliveryMode
        });
      });

      const audioUrls = await Promise.all(synthesisPromises);
      return {
        segments,
        audioUrls
      };
    } catch (err) {
      console.warn('[Inworld Service] Pre-synthesis note:', err);
      return null;
    }
  }

  /**
   * Play pre-synthesized audio standby with small, tight radio breath gaps
   */
  async playPreloaded(preloaded, onStart, onEnd) {
    this.stop();
    this.isCancelled = false;

    if (!preloaded || !preloaded.audioUrls || preloaded.audioUrls.length === 0) {
      if (onEnd) onEnd();
      return;
    }

    if (onStart) onStart();

    const { segments, audioUrls } = preloaded;
    try {
      for (let i = 0; i < audioUrls.length; i++) {
        if (this.isCancelled) break;
        const url = audioUrls[i];
        if (url) {
          await this.playAudioUrl(url);
        }
        if (this.isCancelled) break;

        const gap = segments[i]?.gapAfter > 0 ? Math.min(260, segments[i].gapAfter) : (i < audioUrls.length - 1 ? 160 : 0);
        if (gap > 0 && i < audioUrls.length - 1) {
          await new Promise((resolve) => {
            this.gapTimeout = setTimeout(() => {
              this.gapTimeout = null;
              resolve();
            }, gap);
          });
        }
      }

      if (!this.isCancelled && onEnd) {
        onEnd();
      }
    } catch (err) {
      console.warn('[Inworld Service] Preloaded playback notice:', err);
      if (onEnd) onEnd();
    }
  }

  // Synthesize and play speech with parallel pre-fetching & small, tight gaps
  async speak(text, onStart, onEnd, context = {}) {
    this.stop();
    this.isCancelled = false;

    const prefs = preferenceService.getPreferences();

    let targetLanguage = 'en-US';
    if (prefs.language && prefs.language !== 'AUTO') {
      targetLanguage = prefs.language;
    } else if (context.language) {
      targetLanguage = context.language;
    }

    const hasDevanagari = /[\u0900-\u097F]/.test(text || '');
    if (hasDevanagari || targetLanguage === 'hi-IN' || targetLanguage === 'mr-IN') {
      if (targetLanguage === 'en-US' || !targetLanguage) {
        targetLanguage = 'hi-IN';
      }
    }

    let targetVoice = context.voiceId || prefs.voiceId;
    if (!targetVoice || targetVoice.toLowerCase() === 'auto') {
      targetVoice = voiceResolverService.resolveVoice('Auto', context.tracks || [], targetLanguage);
    }
    if (targetLanguage === 'hi-IN' || targetLanguage === 'mr-IN' || hasDevanagari) {
      targetVoice = 'Meher';
    }

    const segments = this.parseSpeechSegments(text);
    if (segments.length === 0) {
      if (onEnd) onEnd();
      return;
    }

    try {
      // Synthesize all segments in parallel upfront so there is zero network delay between phrases
      const synthesisPromises = segments.map(async (seg) => {
        let segmentPersonality = prefs.personality || 'late-night';
        let segmentDeliveryMode = prefs.deliveryMode || 'CREATIVE';

        if (seg.tone) {
          if (/warm|welcoming|friendly|smiling/i.test(seg.tone)) {
            segmentPersonality = 'warm';
            segmentDeliveryMode = 'CREATIVE';
          } else if (/upbeat|high energy|playful|laugh|bright/i.test(seg.tone)) {
            segmentPersonality = 'energetic';
            segmentDeliveryMode = 'CREATIVE';
          } else if (/soft|atmospheric|intimate|late-night/i.test(seg.tone)) {
            segmentPersonality = 'late-night';
            segmentDeliveryMode = 'CREATIVE';
          } else if (/calm|soothing|relaxed/i.test(seg.tone)) {
            segmentPersonality = 'calm';
            segmentDeliveryMode = 'STABLE';
          }
        }

        return ttsClient.synthesizeSpeech({
          text: seg.text,
          voiceId: targetVoice,
          language: targetLanguage,
          personality: segmentPersonality,
          speakingRate: 1.0,
          deliveryMode: segmentDeliveryMode
        });
      });

      const audioUrls = await Promise.all(synthesisPromises);
      const validUrls = audioUrls.filter(Boolean);

      if (validUrls.length === 0) {
        throw new Error('TTS synthesis failed to generate audio stream');
      }

      if (this.isCancelled) return;

      // Broadcast begins now that audio is ready in memory
      if (onStart) onStart();

      for (let i = 0; i < validUrls.length; i++) {
        if (this.isCancelled) break;
        const url = validUrls[i];
        if (url) {
          await this.playAudioUrl(url);
        }
        if (this.isCancelled) break;

        // Small, natural, crisp radio breath gap
        const gap = segments[i]?.gapAfter > 0 ? Math.min(260, segments[i].gapAfter) : (i < validUrls.length - 1 ? 160 : 0);
        if (gap > 0 && i < validUrls.length - 1) {
          await new Promise((resolve) => {
            this.gapTimeout = setTimeout(() => {
              this.gapTimeout = null;
              resolve();
            }, gap);
          });
        }
      }

      if (!this.isCancelled && onEnd) {
        onEnd();
      }
    } catch (err) {
      console.warn('[Inworld Service] TTS playback failure:', err.message || err);
      throw err;
    }
  }

  playAudioUrl(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        reject(new Error('Audio playback error'));
      };

      audio.play().catch((err) => {
        console.warn('[Inworld Service] Audio element playback interrupted:', err.message || err);
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        reject(err);
      });
    });
  }

  stop() {
    this.isCancelled = true;
    if (this.gapTimeout) {
      clearTimeout(this.gapTimeout);
      this.gapTimeout = null;
    }
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
