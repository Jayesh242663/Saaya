const STORAGE_KEYS = {
  LLM_PROVIDER: 'saaya_llm_provider',
  GEMINI_KEY: 'saaya_gemini_api_key',
  OPENAI_KEY: 'saaya_openai_api_key',
  LLM_MODEL_NAME: 'saaya_llm_model_name',
  AI_DJ_ENABLED: 'saaya_ai_dj_enabled',
  WEATHER_CITY: 'saaya_weather_city'
};

function safeGetItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
}

function safeSetItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {
    // ignore
  }
}

function getEnv(key) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env[key]) return import.meta.env[key];
      if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env) {
      if (globalThis.process.env[key]) return globalThis.process.env[key];
      if (globalThis.process.env[`VITE_${key}`]) return globalThis.process.env[`VITE_${key}`];
    }
  } catch {
    // ignore
  }
  return null;
}

export const apiConfig = {
  getLlmProvider: () => {
    return (
      safeGetItem(STORAGE_KEYS.LLM_PROVIDER) ||
      getEnv('LLM_PROVIDER') ||
      'gemini'
    );
  },

  setLlmProvider: (provider) => {
    safeSetItem(STORAGE_KEYS.LLM_PROVIDER, (provider || 'gemini').trim());
  },

  getGeminiKey: () => {
    return (
      safeGetItem(STORAGE_KEYS.GEMINI_KEY) ||
      getEnv('GEMINI_API_KEY') ||
      ''
    );
  },

  setGeminiKey: (key) => {
    safeSetItem(STORAGE_KEYS.GEMINI_KEY, (key || '').trim());
  },

  getOpenAiKey: () => {
    return (
      safeGetItem(STORAGE_KEYS.OPENAI_KEY) ||
      getEnv('OPENAI_API_KEY') ||
      ''
    );
  },

  setOpenAiKey: (key) => {
    safeSetItem(STORAGE_KEYS.OPENAI_KEY, (key || '').trim());
  },

  getLlmModelName: () => {
    const provider = apiConfig.getLlmProvider();
    const defaultModel = provider === 'openai' ? 'gpt-4o-mini' : 'gemini-3.5-flash-lite';
    return (
      safeGetItem(STORAGE_KEYS.LLM_MODEL_NAME) ||
      getEnv('LLM_MODEL_NAME') ||
      defaultModel
    );
  },

  setLlmModelName: (modelName) => {
    safeSetItem(STORAGE_KEYS.LLM_MODEL_NAME, (modelName || '').trim());
  },

  isAiDjEnabled: () => {
    const val = safeGetItem(STORAGE_KEYS.AI_DJ_ENABLED);
    return val === null ? true : val === 'true';
  },

  setAiDjEnabled: (enabled) => {
    safeSetItem(STORAGE_KEYS.AI_DJ_ENABLED, String(enabled));
  },

  getWeatherCity: () => {
    return safeGetItem(STORAGE_KEYS.WEATHER_CITY) || 'Tokyo';
  },

  setWeatherCity: (city) => {
    safeSetItem(STORAGE_KEYS.WEATHER_CITY, (city || 'Tokyo').trim());
  }
};
