/**
 * SAAYA Translation & Script Optimization Service for Text-to-Speech
 * Translates and phonetically adapts radio commentaries into native script
 * (Hindi Devanagari, Marathi Devanagari, etc.) BEFORE feeding to Inworld TTS,
 * ensuring flawless phonetic pronunciation, rhythm, and cadence.
 */

import { apiConfig } from '../config/apiConfig.js';
import { proceduralCommentary } from './proceduralCommentary.js';

// Clean text to avoid TTS speech artifacts while preserving emotional gaps as real prosodic pauses
export function sanitizeForTts(text) {
  if (!text) return '';
  return text
    .replace(/[*#_~`"«»“”]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b([0-9]{1,2}):([0-9]{2})\s*(AM|am)\b/g, '$1 बजके $2 मिनट सुबह')
    .replace(/\b([0-9]{1,2}):([0-9]{2})\s*(PM|pm)\b/g, '$1 बजके $2 मिनट शाम')
    .replace(/\b([0-9]+)°C\b/g, '$1 डिग्री सेल्सियस')
    .replace(/\bSAAYA\b/gi, 'साया')
    .replace(/\bMidnight FM\b/gi, 'मिडनाइट एफएम')
    .trim();
}

export const translationService = {
  /**
   * Main Translation & Script Prep Pipeline
   */
  async prepareScriptForTts({ rawScript, targetLanguage, track, weather }) {
    if (!rawScript) return '';

    const lang = (targetLanguage || track?.languageCode || 'en-US').toLowerCase();
    const trackLang = (track?.language || '').toLowerCase();

    const isHindi = lang.includes('hi') || trackLang === 'hindi';
    const isMarathi = lang.includes('mr') || trackLang === 'marathi';

    // 1. If Hindi is targeted
    if (isHindi) {
      const outsideBrackets = rawScript.replace(/\[.*?\]/g, '');
      const hasEnglishWordsOutside = /[a-zA-Z]{2,}/.test(outsideBrackets);

      // If already in 100% Devanagari outside brackets, clean and optimize
      if (/[\u0900-\u097F]/.test(rawScript) && !hasEnglishWordsOutside) {
        return sanitizeForTts(rawScript);
      }

      // If has English or Romanized words, translate to 100% broadcast Devanagari Hindi
      try {
        const translated = await this.translateViaLlm(
          rawScript,
          'Hindi',
          'Translate and transliterate this radio script into 100% authentic Devanagari Hindi. CRITICAL: Do NOT leave ANY song title, artist name, station name, or word in English Latin script. The ONLY things that must remain in English are the emotional delivery cues inside brackets [] (e.g. [Warm, welcoming, smiling], [pause], [dramatic pause], [soft, atmospheric]). Transliterate all artist names and song titles into Devanagari (e.g. "Midnight FM" -> "मिडनाइट एफएम", "SAAYA" -> "साया", "RJ Meher" -> "आरजे मेहेर", "playlist" -> "प्लेलिस्ट"). Output ONLY the final script.'
        );
        if (translated && /[\u0900-\u097F]/.test(translated)) {
          return sanitizeForTts(translated);
        }
      } catch (err) {
        console.warn('[TranslationService] Hindi LLM translation fallback:', err.message);
      }

      // Procedural Hindi fallback
      return sanitizeForTts(proceduralCommentary.generateHindiIntro(weather, track));
    }

    // 2. If Marathi is targeted
    if (isMarathi) {
      const outsideBrackets = rawScript.replace(/\[.*?\]/g, '');
      const hasEnglishWordsOutside = /[a-zA-Z]{2,}/.test(outsideBrackets);

      // If already in 100% Devanagari outside brackets, clean and optimize
      if (/[\u0900-\u097F]/.test(rawScript) && !hasEnglishWordsOutside) {
        return sanitizeForTts(rawScript);
      }

      try {
        const translated = await this.translateViaLlm(
          rawScript,
          'Marathi',
          'Translate and transliterate this radio script into 100% authentic Devanagari Marathi. CRITICAL: Do NOT leave ANY song title, artist name, station name, or word in English Latin script. The ONLY things that must remain in English are the emotional delivery cues inside brackets [] (e.g. [Warm, welcoming, smiling], [pause], [dramatic pause], [soft, atmospheric]). Transliterate all artist names and song titles into Devanagari (e.g. "Swapnil Bandodkar" -> "स्वप्निल बांदोडकर", "Midnight FM" -> "मिडनाइट एफएम", "SAAYA" -> "साया", "RJ Meher" -> "आरजे मेहेर", "playlist" -> "प्लेलिस्ट"). Output ONLY the final script.'
        );
        if (translated && /[\u0900-\u097F]/.test(translated)) {
          return sanitizeForTts(translated);
        }
      } catch (err) {
        console.warn('[TranslationService] Marathi LLM translation fallback:', err.message);
      }

      // Procedural Marathi fallback
      return sanitizeForTts(proceduralCommentary.generateMarathiIntro(weather, track));
    }

    // 3. For English or other Latin languages, clean special chars
    return rawScript
      .replace(/[*#_~`"«»“”]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Fast LLM Translation specifically optimized for TTS scripts
   */
  async translateViaLlm(text, targetLanguageName, promptInstructions) {
    const provider = (apiConfig.getLlmProvider() || 'gemini').toLowerCase();
    const modelName = apiConfig.getLlmModelName();

    if (provider === 'openai') {
      const apiKey = apiConfig.getOpenAiKey();
      if (!apiKey) throw new Error('No OpenAI API key');

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName && modelName.includes('gpt') ? modelName : 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a radio script translator for Text-to-Speech. Output only spoken plain text in the requested native script without explanations, quotes, or markdown.'
            },
            {
              role: 'user',
              content: `${promptInstructions}\n\nOriginal Text:\n${text}`
            }
          ],
          temperature: 0.3,
          max_tokens: 220
        })
      });

      if (!res.ok) throw new Error(`OpenAI translation HTTP ${res.status}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim();
    }

    // Default: Gemini
    const apiKey = apiConfig.getGeminiKey();
    if (!apiKey) throw new Error('No Gemini API key');

    const validModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];
    const model = modelName && validModels.includes(modelName) ? modelName : 'gemini-3.5-flash-lite';

    const fullPrompt = `${promptInstructions}\n\nDo NOT include markdown, asterisks, brackets, or translator notes. Output ONLY the translation.\n\nOriginal Text:\n${text}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 220
          }
        })
      }
    );

    if (!res.ok) throw new Error(`Gemini translation HTTP ${res.status}`);
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return raw.replace(/^(?:Translation|अनुवाद):\s*/i, '').trim();
  }
};
