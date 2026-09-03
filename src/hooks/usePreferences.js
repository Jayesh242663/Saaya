import { useState, useCallback, useEffect } from 'react';
import { preferenceService, DJ_PRESETS } from '../services/preferenceService.js';

export function usePreferences() {
  const [preferences, setPreferences] = useState(() => preferenceService.getPreferences());

  // Reload preferences on mount / window storage sync
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'saaya_dj_preferences_v2') {
        setPreferences(preferenceService.getPreferences());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updatePreference = useCallback((key, value) => {
    setPreferences((prev) => {
      const updated = preferenceService.savePreferences({
        [key]: value,
        preset: 'custom' // switching any field switches to custom
      });
      return updated;
    });
  }, []);

  const updatePreferences = useCallback((partial) => {
    setPreferences((prev) => {
      const updated = preferenceService.savePreferences({
        ...partial,
        preset: partial.preset || 'custom'
      });
      return updated;
    });
  }, []);

  const applyPreset = useCallback((presetName) => {
    if (presetName === 'custom') {
      setPreferences((prev) => preferenceService.savePreferences({ preset: 'custom' }));
      return;
    }
    const updated = preferenceService.applyPreset(presetName);
    setPreferences(updated);
  }, []);

  const resetPreferences = useCallback(() => {
    const updated = preferenceService.resetToDefaults();
    setPreferences(updated);
  }, []);

  return {
    preferences,
    activePreset: preferences.preset || 'custom',
    isCustom: preferences.preset === 'custom',
    presets: DJ_PRESETS,
    updatePreference,
    updatePreferences,
    applyPreset,
    resetPreferences
  };
}
