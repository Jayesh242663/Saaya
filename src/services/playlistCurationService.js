/**
 * SAAYA Dynamic Playlist Curation & LLM Script Service
 * Analyzes an ingested playlist upfront and generates a cohesive, atmospheric
 * broadcast script (Intro + Inter-Song Transitions) strictly tailored to:
 * - Local weather, time of day, and city
 * - Detected dominant language of the playlist (e.g. Marathi, Hindi, English)
 * - Rich emotional delivery states in brackets []
 * - 100% Devanagari translation for Marathi/Hindi with zero English outside brackets
 * - 100% unique, non-repeating transitions between songs
 */

import { apiConfig } from '../config/apiConfig.js';
import { proceduralCommentary } from './proceduralCommentary.js';
import { voiceResolverService } from './voiceResolverService.js';

export const playlistCurationService = {
  /**
   * Fetch and extract tracks from any playlist URL (Spotify, Apple Music, JioSaavn, YouTube)
   */
  async fetchPlaylist(url) {
    const res = await fetch('/api/playlist/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to extract playlist (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data;
  },

  /**
   * Curate the entire broadcast script upfront with LLM (with procedural fallback)
   */
  async curateBroadcastScript({ playlist, weather }) {
    const dominantLang = playlist.dominantLanguage || 'en-US';
    const isHindi = dominantLang === 'hi-IN' || playlist.dominantLanguageName === 'Hindi';
    const isMarathi = dominantLang === 'mr-IN' || playlist.dominantLanguageName === 'Marathi';

    const city = weather?.city || (isHindi ? 'Mumbai' : isMarathi ? 'Pune' : 'Tokyo');
    const clockTime = weather?.clockTime || 'On Air';
    const temp = weather?.tempC !== undefined ? `${weather.tempC}°C` : 'pleasant';
    const showTitle = weather?.showTitle || 'SAAYA Radio';

    const autoVoice = voiceResolverService.resolveAutoVoice(playlist.tracks, dominantLang);
    const djVoice = autoVoice;
    const targetScript = isHindi
      ? 'Hindi in pure Devanagari script'
      : isMarathi
      ? 'Marathi in pure Devanagari script'
      : 'English';

    // Summary of songs (limit to first 20 for prompt size)
    const songSummary = playlist.tracks.slice(0, 20).map((t, idx) => `${idx + 1}. "${t.title}" by ${t.artist}`).join('\n');

    const prompt = `You are "${djVoice}", the soul-stirring radio jockey (RJ) on "${showTitle}".
Broadcast Context: Local time is ${clockTime} in ${city}, weather is ${temp}.
Playlist Title: "${playlist.title}" (${playlist.trackCount} songs).
Target Language: ${targetScript}.
Song List:
${songSummary}

CRITICAL RULES FOR RADIO SOUL, EMOTIONAL GAPS & 100% NATIVE TRANSLATION:
1. Write the entire broadcast script in ${targetScript}.
2. ZERO ENGLISH OUTSIDE BRACKETS RULE:
   - When the target language is Marathi (मराठी) or Hindi (हिंदी), TRANSLATE AND TRANSLITERATE ABSOLUTELY EVERYTHING into 100% pure Devanagari script.
   - DO NOT leave ANY song titles, artist names, radio station names, city names, numbers, or English words in Latin characters.
   - The ONLY things that must remain in English are the emotional delivery cues inside brackets [] (e.g. [Warm, welcoming, smiling], [pause], [short pause], [dramatic pause], [soft, atmospheric], [smiling], [bright, confident], [energetic], [upbeat], [playful], [light laugh], [high energy], [warm, slower], [music transition]).
   - Everything outside brackets [] MUST be in 100% Devanagari script!
   - All artist names MUST be phonetically transliterated into Devanagari (e.g. "Swapnil Bandodkar" -> "स्वप्निल बांदोडकर", "Ajay-Atul" -> "अजय-अतुल", "Anuv Jain" -> "अनुव जैन", "Sonalee Kulkarni" -> "सोनाली कुलकर्णी", "Olivia Rodrigo" -> "ऑलिव्हिया रॉड्रिगो").
   - All song titles MUST be phonetically transliterated into Devanagari (e.g. "Deh Petude" -> "देह पेटुडे", "Ambabai Gondhalala Ye" -> "अंबाबाई गोंधळाला ये", "Raja Aala" -> "राजा आला", "Radha Hi Bawari" -> "राधा ही बावरी").
   - Station branding & radio terms MUST be in Devanagari: "Midnight FM" -> "मिडनाइट एफएम", "SAAYA" -> "साया", "RJ Meher" -> "आरजे मेहेर", "playlist" -> "प्लेलिस्ट", "radio" -> "रेडिओ".
   - Spoken clock times and temperatures MUST be in Devanagari words: "पहाटेचे पाच वाजलेत", "बावीस अंश सेल्सिअस".
3. A great radio show is defined by its SOUL, its EMOTIONAL GAPS, its THEATRICAL PACING, and the emotional delivery cues in brackets [].
4. INTRO: Write a full, atmospheric, captivating radio show opening monologue.
   - Include emotional delivery cues in brackets: [Warm, welcoming, smiling], [pause], [short pause], [soft, atmospheric], [dramatic pause], [smiling], [bright, confident], [energetic], [upbeat], [playful], [light laugh], [high energy], [warm, slower], [music transition].
   - Use ellipses (...) for natural conversational breath, suspense, and emotional pauses.
   - Build the journey: warm greeting -> noticing the city, time and rain/weather -> deep musical reflection -> [dramatic pause] -> shifting the energy -> playful teasing with the listener -> [light laugh] -> call to sip coffee/tea and turn up the volume -> [high energy] station punchline -> needle drop into the first song!
5. ZERO REPETITION IN TRANSITIONS (CRITICAL):
   - Every single transition MUST be completely UNIQUE in tone, emotion, structure, and phrasing.
   - NEVER repeat opening phrases across transitions (do NOT start multiple transitions with "That was", "वो था", or "हे होते").
   - Alternate through diverse styles across song pairs:
     * Transition 1: Intimate reflection on the soul of the melody that just finished.
     * Transition 2: High energy tempo shift & exciting beat drop.
     * Transition 3: Weather, rain, or night breeze connection with the music.
     * Transition 4: Playful humor and banter with the listener about singing along or sipping tea.
     * Transition 5: Deep poetic bridge connecting the themes of the two songs.
   - Alternate emotional bracket tags across every transition: [soft, atmospheric], [energetic], [playful], [warm, slower], [light laugh], [upbeat], [dramatic pause].
6. Provide transitions for the first 10 songs only. Keep each transition between 1-2 concise, punchy lines.
7. Output MUST BE strictly valid, complete JSON in this exact structure:
{
  "detectedLanguage": "Marathi",
  "languageCode": "mr-IN",
  "intro": "full emotional intro monologue with [] tags and ... pauses",
  "transitions": [
    "transition from song 1 to 2 with emotional tags",
    "transition from song 2 to 3 with emotional tags"
  ]
}`;

    try {
      const llmResult = await this.callLlm(prompt);
      if (llmResult && llmResult.intro) {
        const finalLangCode =
          llmResult.languageCode ||
          (llmResult.detectedLanguage?.toLowerCase().includes('marathi')
            ? 'mr-IN'
            : llmResult.detectedLanguage?.toLowerCase().includes('hindi')
            ? 'hi-IN'
            : dominantLang);
        const finalLangName = llmResult.detectedLanguage || playlist.dominantLanguageName;
        const voice = finalLangCode === 'hi-IN' || finalLangCode === 'mr-IN' ? 'Meher' : djVoice;

        return {
          playlistTitle: playlist.title,
          dominantLanguage: finalLangCode,
          dominantLanguageName: finalLangName,
          djVoice: voice,
          intro: this.cleanScript(llmResult.intro),
          transitions: (llmResult.transitions || []).map((t) => this.cleanScript(t))
        };
      }
    } catch (err) {
      console.warn('[PlaylistCuration] LLM curation fallback to procedural:', err.message);
    }

    // Procedural Fallback
    return this.generateProceduralBroadcast({ playlist, weather, dominantLang, djVoice });
  },

  cleanScript(text) {
    if (!text) return '';
    return text
      // Preserve emotional bracket tags like [warm, smiling] and [dramatic pause]!
      .replace(/[*#_~`"«»“”]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  safeParseLlmJson(raw) {
    if (!raw) return {};
    let text = raw.trim();
    if (text.startsWith('```json')) text = text.slice(7);
    else if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);
    text = text.trim();

    try {
      return JSON.parse(text);
    } catch (err) {
      console.warn('[PlaylistCuration] Attempting JSON repair on:', err.message);
      try {
        let repaired = text;
        const quoteMatches = repaired.match(/(?<!\\)"/g);
        if (quoteMatches && quoteMatches.length % 2 !== 0) {
          repaired += '"';
        }
        if (repaired.includes('"transitions":') && !repaired.includes(']')) {
          repaired += ']';
        }
        if (!repaired.trim().endsWith('}')) {
          repaired += '}';
        }
        return JSON.parse(repaired);
      } catch (repairErr) {
        throw err;
      }
    }
  },

  async callLlm(prompt) {
    const provider = (apiConfig.getLlmProvider() || 'gemini').toLowerCase();
    const modelName = apiConfig.getLlmModelName();

    if (provider === 'openai') {
      const apiKey = apiConfig.getOpenAiKey();
      if (!apiKey) throw new Error('No OpenAI API key');

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelName && modelName.includes('gpt') ? modelName : 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2500
        })
      });

      if (!res.ok) throw new Error(`OpenAI error status ${res.status}`);
      const data = await res.json();
      return this.safeParseLlmJson(data.choices?.[0]?.message?.content || '{}');
    }

    // Default: Gemini
    const apiKey = apiConfig.getGeminiKey();
    if (!apiKey) throw new Error('No Gemini API key');

    const validModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];
    const model = modelName && validModels.includes(modelName) ? modelName : 'gemini-3.5-flash-lite';

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}\nRespond in valid JSON only.` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 2500
          }
        })
      }
    );

    if (!res.ok) throw new Error(`Gemini error status ${res.status}`);
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return this.safeParseLlmJson(raw || '{}');
  },

  /**
   * High-quality procedural fallback strictly adhering to length constraints and ZERO repetition
   */
  generateProceduralBroadcast({ playlist, weather, dominantLang, djVoice }) {
    const isHindi = dominantLang === 'hi-IN' || playlist.dominantLanguageName === 'Hindi';
    const isMarathi = dominantLang === 'mr-IN' || playlist.dominantLanguageName === 'Marathi';

    const city = weather?.city || (isHindi ? 'Mumbai' : isMarathi ? 'Pune' : 'Tokyo');
    const clockTime = weather?.clockTime || 'is waqt';
    const temp = weather?.tempC !== undefined ? `${weather.tempC}°C` : 'suhana mausam';
    const showTitle = weather?.showTitle || 'SAAYA';
    const firstSong = playlist.tracks[0];

    let intro = '';
    const transitions = [];

    if (isHindi) {
      intro = `[Warm, welcoming, smiling]
नमस्ते मेरे प्यारे दोस्तों... और ${showTitle} के सभी श्रोताओं को... ढेर सारा प्यार! [pause]
उम्मीद है आप सभी का वक्त बेहद खूबसूरत बीत रहा होगा। [warm, friendly]
घड़ी में ${clockTime} हो रहे हैं... [short pause]
${city} में इस वक्त तापमान ${temp} है... बाहर की हवा में एक अलग ही सुकून है... [soft, atmospheric]
तो फिर... इस खूबसूरत वक्त की शुरुआत क्यों न की जाए कुछ बेहद दिलकश सुरों के साथ? [smiling]
आप सुन रहे हैं... ${showTitle}! [bright, confident]
[dramatic pause]
अब वक्त है... थोड़ा-सा मूड बदलने का! थोड़ी एनर्जी बढ़ाते हैं... [upbeat]
तैयार हो जाइए... अपनी चाय या कॉफी का एक मस्त घूंट लीजिए... [playful] [light laugh]
और आवाज़ थोड़ी-सी बढ़ा दीजिए! [high energy]
शुरू करते हैं ${firstSong.artist} का दिल को छू लेने वाला नगमा... "${firstSong.title}"! [music transition]`;
    } else if (isMarathi) {
      intro = `[Warm, welcoming, smiling]
नमस्कार मित्रांनो... आणि ${showTitle}च्या माझ्या सगळ्या लाडक्या श्रोत्यांना... मनापासून नमस्कार! [pause]
उमेद आहे... तुमच्या दिवसाची सुरुवात आज एका सुंदर हसण्यासोबत झाली असेल। [warm, friendly]
घड्याळात ${clockTime} वाजले आहेत... [short pause]
${city} मध्ये सध्या तापमान ${temp} आहे... हवेत मस्त गारवा आणि एक वेगळीच शांतता जाणवतेय। [soft, atmospheric]
मग अशा या सुंदर क्षणी... सुरुवातही व्हायला हवी ना काहीतरी प्रसन्न आणि मनाला आनंद देणाऱ्या सुरांनी! [smiling]
तुम्ही ऐकत आहात... ${showTitle}! [bright, confident]
[dramatic pause]
आता जरा... मूड बदलूया! थोडी एनर्जी वाढवूया... [upbeat]
म्हणून आवाज जरा वाढवा... चहाचा किंवा कॉफीचा एक मस्त घोट घ्या... [playful] [light laugh]
आणि तयार व्हा... पुढच्या भन्नाट गाण्यासाठी! [high energy]
सुरू करूया ${firstSong.artist} यांचं सुमधुर गाणं... "${firstSong.title}"! [music transition]`;
    } else {
      intro = `[Warm, welcoming, smiling]
Hello everyone... and a very warm welcome to all of you tuned in to ${showTitle}! [pause]
Broadcasting live across ${city} where the clock strikes ${clockTime} and the temperature rests at ${temp}. [soft, atmospheric]
The vibe outside is calm, the air is crisp, and it feels like the perfect moment to pause and let the music take over. [warm, friendly]
[dramatic pause]
Now... it is time to shift gears! Turn up your volume, settle into your favorite spot... [upbeat]
And let's drop the needle on ${firstSong.artist} with "${firstSong.title}". [high energy] [music transition]`;
    }

    // Generate non-repeating, diverse transitions across all tracks
    for (let i = 0; i < playlist.tracks.length - 1; i++) {
      const curr = playlist.tracks[i];
      const next = playlist.tracks[i + 1];
      transitions.push(
        proceduralCommentary.generateTransition(curr, next, weather, dominantLang)
      );
    }

    return {
      playlistTitle: playlist.title,
      dominantLanguage: dominantLang,
      dominantLanguageName: playlist.dominantLanguageName,
      djVoice: djVoice,
      intro: intro.trim(),
      transitions: transitions.map((t) => t.trim())
    };
  }
};
