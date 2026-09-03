import { apiConfig } from '../config/apiConfig';
import { preferenceService } from './preferenceService';
import { proceduralCommentary } from './proceduralCommentary';
import { commentaryContextService } from './commentaryContextService';

function resolveTargetLanguage(prefs, track) {
  if (prefs?.language && prefs.language !== 'en-US' && prefs.language !== 'AUTO') {
    return prefs.language;
  }
  const trackLang = (track?.language || '').toLowerCase();
  const trackCode = (track?.languageCode || '').toLowerCase();
  if (trackLang === 'hindi' || trackCode === 'hi-in') return 'hi-IN';
  if (trackLang === 'marathi' || trackCode === 'mr-in') return 'mr-IN';
  return prefs?.language || 'en-US';
}

const PERSONALITY_PROMPTS = {
  'late-night':
    'Personality: Late Night Companion. Speak with intimate nocturnal warmth, poetic stillness, and gentle reflective empathy. Acknowledge the late hour, quiet streets, and emotional solace of the music.',
  'warm':
    'Personality: Warm & Heartfelt. Speak like a cherished, sincere friend welcoming the listener with genuine warmth, conversational optimism, and infectious human kindness.',
  'calm':
    'Personality: Tranquil & Meditative. Speak with peaceful composure, mindful presence, and soothing serenity. Avoid rush, hype, or loud enthusiasm; create a comforting acoustic sanctuary.',
  'energetic':
    'Personality: Vibrant & Dynamic. Speak with electric passion, witty charm, and vibrant musical excitement, celebrating the rhythm, beat, and groove of the track.',
  'elegant':
    'Personality: Refined & Cultured. Speak with sophisticated eloquence, poetic lyricism, and deep reverence for musical artistry, heritage, and recording lore.'
};

function buildBehaviorInstructions(prefs, targetLang = 'en-US') {
  const instructions = [];
  const personalityKey = prefs.personality || 'late-night';
  instructions.push(PERSONALITY_PROMPTS[personalityKey] || PERSONALITY_PROMPTS['late-night']);
  instructions.push(`Energy level: ${prefs.energy || 'mellow'}.`);

  if (targetLang === 'hi-IN') {
    instructions.push('Language: Speak in authentic, warm, and poetic Hindi strictly in DEVANAGARI SCRIPT (हिंदी लिपि). Do not use Latin/English letters so Text-To-Speech pronounces it fluently.');
  } else if (targetLang === 'mr-IN') {
    instructions.push('Language: Speak in eloquent, warm, and natural Marathi strictly in DEVANAGARI SCRIPT (मराठी). Do not use Latin/English letters.');
  } else if (targetLang && targetLang !== 'en-US') {
    instructions.push(`Language: Output naturally in ${targetLang} (or natural bilingual radio style).`);
  }

  if (prefs.mentionSongArtist) {
    instructions.push('Mention the song title and artist naturally.');
  } else {
    instructions.push('Focus on the emotional sensation, mood, and musical atmosphere.');
  }

  if (prefs.explainTransitions) {
    instructions.push('Briefly acknowledge the mood, cultural shift, or genre change between the songs.');
  }

  if (prefs.musicFacts) {
    instructions.push('Weave in an authentic backstory, recording trivia, or lore about the song.');
  }

  if (prefs.moodReactions) {
    instructions.push('Express an authentic personal reaction to the soundscape.');
  }

  if (prefs.storytelling) {
    instructions.push('Connect the music to the city scene, current time of day, and weather outside.');
  }

  return instructions.join(' ');
}

async function callLlmApi(prompt) {
  const provider = (apiConfig.getLlmProvider() || 'gemini').toLowerCase();
  const modelName = apiConfig.getLlmModelName();

  if (provider === 'openai') {
    const apiKey = apiConfig.getOpenAiKey();
    if (!apiKey) throw new Error('No OpenAI API key provided');

    const model = modelName && modelName.includes('gpt') ? modelName : 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content:
              'You are Meher, the professional multilingual radio DJ for SAAYA. Output only spoken plain speech text without markdown, asterisks, emojis, quotes, sound effect annotations, or speaker prefixes.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.75,
        max_tokens: 180
      })
    });

    if (!res.ok) throw new Error(`OpenAI API status ${res.status}`);
    const data = await res.json();
    return cleanSpeechText(data.choices?.[0]?.message?.content);
  }

  // Default: Gemini
  const apiKey = apiConfig.getGeminiKey();
  if (!apiKey) throw new Error('No Gemini API key provided');

  const validModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];
  const model = modelName && validModels.includes(modelName) ? modelName : 'gemini-3.5-flash-lite';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 180
        }
      })
    }
  );

  if (!res.ok) throw new Error(`Gemini API status ${res.status}`);
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return cleanSpeechText(rawText);
}

function cleanSpeechText(text) {
  if (!text) return '';
  return text
    .replace(/^(?:Meher|Kaya|DJ|Host):\s*/i, '')
    .replace(/[*#_~`"«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const geminiService = {
  /**
   * Generate 24-hour time-dynamic authentic intro monologue with multilingual support
   */
  async generateIntro(weatherContext, firstTrack, customPrefs = null) {
    const prefs = customPrefs || preferenceService.getPreferences();
    const targetLang = resolveTargetLanguage(prefs, firstTrack);

    const city = weatherContext?.city || (targetLang === 'hi-IN' ? 'Mumbai' : targetLang === 'mr-IN' ? 'Pune' : 'Tokyo');
    const temp = weatherContext?.tempC !== undefined ? `${weatherContext.tempC}°C` : 'mild';
    const weatherSummary = weatherContext?.summary || 'Clear';
    const weatherDesc = weatherContext?.description || 'calm skies';
    const program = weatherContext?.program || {
      id: 'after-dark',
      showTitle: 'SAAYA After Dark',
      greeting: 'Welcome to SAAYA',
      clockTime: 'Midnight Hour'
    };

    const behaviorRules = buildBehaviorInstructions(prefs, targetLang);
    const genreProfile = commentaryContextService.getGenreProfile(firstTrack);
    const songLore = commentaryContextService.getTrackLore(firstTrack);
    const cityVignette = commentaryContextService.getCityVignette(city, program.id);

    const prompt = `You are "Meher", the authentic radio host for "${program.showTitle}" on SAAYA radio.
Current broadcast time: ${program.clockTime} in ${city}.
Live weather: ${temp}, ${weatherSummary} (${weatherDesc}).
City scene: ${cityVignette}.
Opening track: "${firstTrack.title}" by ${firstTrack.artist} (${firstTrack.meta || genreProfile.descriptor}).
Song backstory & lore: "${songLore}".
Host persona & guidelines: Tone is ${program.tone}. ${behaviorRules}

Write a natural 50 to 75 word radio opening monologue.
1. Welcome listeners to "${program.showTitle}" and mention the current local time (${program.clockTime}) and weather in ${city}.
2. Make a warm, relatable observation about the city and what listeners might be doing at this hour (${program.label}).
3. Share the authentic backstory lore about "${firstTrack.title}" by ${firstTrack.artist}.
4. Cue the track with a smooth radio sign-off before the music starts.
DO NOT use markdown, asterisks, emojis, quotes, or speaker prefixes. Output ONLY the exact spoken speech.`;

    try {
      const text = await callLlmApi(prompt);
      if (text) return text;
    } catch (err) {
      console.warn('[GeminiService] LLM intro generation note (using procedural monologue engine):', err.message);
    }

    return proceduralCommentary.generateIntro(weatherContext, firstTrack, targetLang);
  },

  /**
   * Generate dynamic transition between tracks with multilingual support
   */
  async generateTransition(currentTrack, nextTrack, weatherContext, customPrefs = null) {
    const prefs = customPrefs || preferenceService.getPreferences();
    const targetLang = resolveTargetLanguage(prefs, nextTrack);

    if (prefs.commentaryLevel === 'subtle' && Math.random() > 0.5) {
      if (targetLang === 'hi-IN') return `Aap sun rahe hain SAAYA. Agla gaana hai ${nextTrack.artist} ka "${nextTrack.title}".`;
      if (targetLang === 'mr-IN') return `Tumhi aikhat aahat SAAYA. Pudhil geet aahe ${nextTrack.artist} yanche "${nextTrack.title}".`;
      return `On SAAYA. Up next, "${nextTrack.title}" by ${nextTrack.artist}.`;
    }

    const city = weatherContext?.city || (targetLang === 'hi-IN' ? 'Mumbai' : targetLang === 'mr-IN' ? 'Pune' : 'Tokyo');
    const temp = weatherContext?.tempC !== undefined ? `${weatherContext.tempC}°C` : 'mild';
    const weatherDesc = weatherContext?.description || 'peaceful air';
    const program = weatherContext?.program || {
      id: 'after-dark',
      showTitle: 'SAAYA After Dark',
      clockTime: 'On Air'
    };

    const transitionAnalysis = commentaryContextService.analyzeTransition(currentTrack, nextTrack);
    const nextSongLore = commentaryContextService.getTrackLore(nextTrack);
    const behaviorRules = buildBehaviorInstructions(prefs, targetLang);

    const prompt = `You are "Meher", the radio DJ for "${program.showTitle}" on SAAYA.
Write a smooth, conversational radio transition between two songs (35 to 45 words).
Backdrop: ${city} at ${program.clockTime} (${temp}, ${weatherDesc}).
Finished song: "${currentTrack.title}" by ${currentTrack.artist} (${currentTrack.meta || 'Indie'}).
Upcoming song: "${nextTrack.title}" by ${nextTrack.artist} (${nextTrack.meta || 'Indie'}).
Upcoming song lore: "${nextSongLore}".
Musical transition: Moving from ${transitionAnalysis.fromProfile.descriptor} into ${transitionAnalysis.toProfile.descriptor}.
Behavior guidelines: ${behaviorRules}
CRITICAL UNIQUENESS RULE:
- NEVER use formulaic repetitive openings like "That was X, now here is Y", "वो था X, अब Y", or "हे होते X, आता Y".
- Make every transition distinctly unique: cycle between intimate reflection on the finished melody, energetic tempo tease, late night or weather atmosphere, playful listener banter, or deep musical lore.
- Keep the language natural, authentic, and emotionally alive.
DO NOT use markdown, asterisks, emojis, quotes, or speaker prefixes. Output ONLY the exact spoken speech.`;

    try {
      const text = await callLlmApi(prompt);
      if (text) return text;
    } catch (err) {
      console.warn('[GeminiService] LLM transition note (using procedural transition engine):', err.message);
    }

    return proceduralCommentary.generateTransition(currentTrack, nextTrack, weatherContext, targetLang);
  }
};
