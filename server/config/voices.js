export const SUPPORTED_LANGUAGES = {
  'en-US': 'English (United States)',
  'hi-IN': 'Hindi (हिंदी)',
  'mr-IN': 'Marathi (मराठी)',
  'es-ES': 'Spanish (Español)',
  'fr-FR': 'French (Français)',
  'de-DE': 'German (Deutsch)',
  'ja-JP': 'Japanese (日本語)'
};

export const VOICES = [
  {
    id: 'Meher',
    name: 'Meher (Hindi / Marathi / English)',
    gender: 'FEMALE',
    inworldVoiceName: 'Meher',
    supportedLanguages: ['hi-IN', 'mr-IN', 'en-US'],
    defaultPersonality: 'calm',
    defaultDeliveryMode: 'BALANCED',
    defaultSpeakingRate: 1.0,
    modelId: 'inworld-tts-2',
    description: 'Inworld TTS-2 Indian Female Voice for Hindi, Marathi & English (Warm, Eloquent & Natural).'
  },
  {
    id: 'Sarah',
    name: 'Sarah (Nocturnal Host)',
    gender: 'FEMALE',
    inworldVoiceName: 'Sarah',
    supportedLanguages: ['en-US', 'hi-IN', 'mr-IN', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
    defaultPersonality: 'calm',
    defaultDeliveryMode: 'BALANCED',
    defaultSpeakingRate: 1.0,
    modelId: 'inworld-tts-2',
    description: 'Inworld TTS-2 Female Voice (Stable & Velvety).'
  },
  {
    id: 'Blake',
    name: 'Blake (Expressive Host)',
    gender: 'MALE',
    inworldVoiceName: 'Blake',
    supportedLanguages: ['en-US', 'hi-IN', 'mr-IN', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
    defaultPersonality: 'late-night',
    defaultDeliveryMode: 'BALANCED',
    defaultSpeakingRate: 1.0,
    modelId: 'inworld-tts-2',
    description: 'Inworld TTS-2 Male Voice (Expressive & Deep).'
  }
];

export function getVoiceById(id) {
  const clean = (id || '').trim().toLowerCase();
  if (clean === 'auto' || !clean) return VOICES[0];

  const match = VOICES.find(
    (v) => v.id.toLowerCase() === clean ||
           v.inworldVoiceName.toLowerCase() === clean
  );
  if (match) return match;

  if (clean === 'meher') return VOICES[0];
  if (clean === 'sarah') return VOICES[1];
  if (clean === 'blake') return VOICES[2];

  // Direct Inworld Voice fallback
  if (clean) {
    return {
      id: id.trim(),
      name: id.trim(),
      gender: 'NEUTRAL',
      inworldVoiceName: id.trim(),
      supportedLanguages: Object.keys(SUPPORTED_LANGUAGES),
      defaultPersonality: 'calm',
      defaultDeliveryMode: 'BALANCED',
      defaultSpeakingRate: 1.0,
      modelId: 'inworld-tts-2',
      description: `Inworld Voice: ${id.trim()}`
    };
  }

  return VOICES[0]; // Default: Meher
}

export function isLanguageSupported(voice, language) {
  if (!language || language === 'AUTO') return true;
  return Boolean(voice?.supportedLanguages?.includes(language));
}
