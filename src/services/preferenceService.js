const STORAGE_KEY = 'saaya_dj_preferences_v2';

export const DJ_PRESETS = {
  'after-dark': {
    name: 'After Dark',
    description: 'Nocturnal, intimate, velvety radio commentary with atmospheric musings.',
    preferences: {
      preset: 'after-dark',
      voiceId: 'Sarah',
      language: 'en-US',
      personality: 'late-night',
      commentaryLevel: 'balanced',
      energy: 'mellow',
      speakingRate: 1.0,
      deliveryMode: 'STABLE',
      mentionSongArtist: true,
      explainTransitions: true,
      musicFacts: false,
      moodReactions: true,
      storytelling: true
    }
  },
  'morning-drive': {
    name: 'Morning Drive',
    description: 'Warm, melodic, and engaging host with musical lore and city momentum.',
    preferences: {
      preset: 'morning-drive',
      voiceId: 'Blake',
      language: 'en-US',
      personality: 'warm',
      commentaryLevel: 'full',
      energy: 'moderate',
      speakingRate: 1.05,
      deliveryMode: 'CREATIVE',
      mentionSongArtist: true,
      explainTransitions: true,
      musicFacts: true,
      moodReactions: true,
      storytelling: false
    }
  },
  'dreamscape': {
    name: 'Dreamscape',
    description: 'Ethereal, slow, ambient poetry where music seamlessly melts together.',
    preferences: {
      preset: 'dreamscape',
      voiceId: 'Sarah',
      language: 'en-US',
      personality: 'calm',
      commentaryLevel: 'subtle',
      energy: 'mellow',
      speakingRate: 0.88,
      deliveryMode: 'STABLE',
      mentionSongArtist: false,
      explainTransitions: true,
      musicFacts: false,
      moodReactions: true,
      storytelling: true
    }
  },
  'custom': {
    name: 'Custom',
    description: 'Tailored DJ behavior, voice settings, and commentary preferences.',
    preferences: null
  }
};

export const DEFAULT_PREFERENCES = {
  voiceId: 'Auto',
  personality: 'late-night',
  energy: 'mellow',
  speakingRate: 1.0,
  deliveryMode: 'BALANCED',
  mentionSongArtist: true,
  explainTransitions: true,
  musicFacts: true,
  moodReactions: true,
  storytelling: true
};

const VALID_PERSONALITIES = ['late-night', 'warm', 'calm', 'energetic', 'elegant'];
const VALID_ENERGIES = ['mellow', 'moderate', 'high'];
const VALID_DELIVERY_MODES = ['BALANCED', 'FAST', 'EXPRESSIVE', 'CREATIVE', 'STABLE'];
const VALID_COMMENTARY_LEVELS = ['subtle', 'balanced', 'full'];

export const preferenceService = {
  validate(raw = {}) {
    const valid = { ...DEFAULT_PREFERENCES };

    if (typeof raw.voiceId === 'string' && raw.voiceId.trim()) {
      const v = raw.voiceId.trim().toLowerCase();
      if (v === 'blake') valid.voiceId = 'Blake';
      else if (v === 'sarah') valid.voiceId = 'Sarah';
      else if (v === 'meher') valid.voiceId = 'Meher';
      else valid.voiceId = 'Auto';
    }
    if (typeof raw.language === 'string' && raw.language.trim()) {
      valid.language = raw.language.trim();
    }
    if (VALID_PERSONALITIES.includes(raw.personality)) {
      valid.personality = raw.personality;
    }
    if (VALID_ENERGIES.includes(raw.energy)) {
      valid.energy = raw.energy;
    }
    if (VALID_COMMENTARY_LEVELS.includes(raw.commentaryLevel)) {
      valid.commentaryLevel = raw.commentaryLevel;
    }
    if (VALID_DELIVERY_MODES.includes(raw.deliveryMode)) {
      valid.deliveryMode = raw.deliveryMode;
    }
    if (typeof raw.speakingRate === 'number' && !isNaN(raw.speakingRate)) {
      valid.speakingRate = Math.max(0.7, Math.min(1.3, Number(raw.speakingRate.toFixed(2))));
    }
    if (typeof raw.mentionSongArtist === 'boolean') {
      valid.mentionSongArtist = raw.mentionSongArtist;
    }
    if (typeof raw.explainTransitions === 'boolean') {
      valid.explainTransitions = raw.explainTransitions;
    }
    if (typeof raw.musicFacts === 'boolean') {
      valid.musicFacts = raw.musicFacts;
    }
    if (typeof raw.moodReactions === 'boolean') {
      valid.moodReactions = raw.moodReactions;
    }
    if (typeof raw.storytelling === 'boolean') {
      valid.storytelling = raw.storytelling;
    }
    if (typeof raw.preset === 'string' && Object.keys(DJ_PRESETS).includes(raw.preset)) {
      valid.preset = raw.preset;
    }

    return valid;
  },

  getPreferences() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PREFERENCES };
      const parsed = JSON.parse(raw);
      return this.validate(parsed);
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  },

  savePreferences(partial = {}) {
    const current = this.getPreferences();
    const merged = { ...current, ...partial };
    const validated = this.validate(merged);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    } catch (err) {
      console.warn('Failed to save DJ preferences to localStorage:', err);
    }
    return validated;
  },

  applyPreset(presetName) {
    const preset = DJ_PRESETS[presetName];
    if (!preset || !preset.preferences) return this.getPreferences();
    return this.savePreferences({ ...preset.preferences, preset: presetName });
  },

  resetToDefaults() {
    return this.savePreferences({ ...DEFAULT_PREFERENCES });
  }
};
