import { useState, useEffect } from 'react';
import { apiConfig } from '../../config/apiConfig.js';
import { usePreferences } from '../../hooks/usePreferences.js';
import { ttsClient } from '../../services/ttsClient.js';
import { weatherService } from '../../services/weatherService.js';
import './SettingsModal.css';

export function SettingsModal({ isOpen, onClose }) {
  // LLM Config
  const [provider, setProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [isAiDjEnabled, setIsAiDjEnabled] = useState(true);
  const [detectedLocation, setDetectedLocation] = useState(null);

  // Hook for DJ Preferences
  const {
    preferences,
    updatePreference,
    resetPreferences
  } = usePreferences();

  // UI status
  const [previewStatus, setPreviewStatus] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProvider(apiConfig.getLlmProvider());
      setGeminiKey(apiConfig.getGeminiKey());
      setOpenAiKey(apiConfig.getOpenAiKey());
      setIsAiDjEnabled(apiConfig.isAiDjEnabled());

      setPreviewStatus('');
      setSavedNotice(false);

      // Auto-detect broadcast location from IP
      weatherService.detectLocationFromIp().then((loc) => {
        if (loc) {
          setDetectedLocation(loc);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    apiConfig.setLlmProvider(provider);
    apiConfig.setGeminiKey(geminiKey);
    apiConfig.setOpenAiKey(openAiKey);
    apiConfig.setAiDjEnabled(isAiDjEnabled);

    setSavedNotice(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handlePreviewVoice = async () => {
    setPreviewStatus('Synthesizing...');
    try {
      const vId = preferences.voiceId || 'Auto';
      const actualVoice = vId === 'Auto' ? 'Meher' : vId;
      const isMeher = actualVoice.toLowerCase() === 'meher';

      const sampleText = isMeher
        ? "नमस्ते, आणि नमस्कार! You're tuned in to SAAYA. Where words fade, and the frequencies take over."
        : actualVoice === 'Blake'
        ? "Turn up your dials on SAAYA. Moving ahead in our midnight journey."
        : "Good evening. Settle into your frequency with SAAYA. Radio in the dark.";

      await ttsClient.previewVoice(
        {
          text: sampleText,
          voiceId: actualVoice,
          language: isMeher ? 'hi-IN' : 'en-US',
          personality: preferences.personality || 'late-night',
          speakingRate: 1.0,
          deliveryMode: 'BALANCED'
        },
        () => setPreviewStatus('Broadcasting...'),
        () => setPreviewStatus('')
      );
    } catch (err) {
      setPreviewStatus('Preview error');
      setTimeout(() => setPreviewStatus(''), 3000);
    }
  };

  return (
    <section className="settings open" aria-label="Settings" aria-hidden="false">
      <div className="settings-head">
        <span className="settings-label">SAAYA / SETTINGS</span>
        <button id="closeSettings" type="button" onClick={onClose}>
          Close ×
        </button>
      </div>

      <div className="settings-content">
        <div className="settings-label">PERSONAL RADIO</div>
        <h2>Tune the atmosphere.</h2>

        <div className="settings-grid">
          {/* Group 1: Playback */}
          <div className="settings-group">
            <h3>Playback</h3>
            <div className="setting">
              <span>
                AI Radio Host
                <small>Spoken station commentary and intros</small>
              </span>
              <button
                className={`toggle ${isAiDjEnabled ? 'on' : ''}`}
                type="button"
                onClick={() => setIsAiDjEnabled(!isAiDjEnabled)}
                aria-pressed={isAiDjEnabled}
                aria-label="Toggle AI Radio Host"
              />
            </div>
            <div className="setting">
              <span>
                Mention Song & Artist
                <small>Directly announce tracks in speech</small>
              </span>
              <button
                className={`toggle ${preferences.mentionSongArtist ? 'on' : ''}`}
                type="button"
                onClick={() => updatePreference('mentionSongArtist', !preferences.mentionSongArtist)}
                aria-pressed={preferences.mentionSongArtist}
                aria-label="Toggle mention song & artist"
              />
            </div>
          </div>

          {/* Group 2: Radio Voice */}
          <div className="settings-group">
            <h3>Radio voice</h3>
            <div className="setting">
              <span>
                Broadcast language
                <small>
                  {preferences.language === 'hi-IN'
                    ? 'Hindi (हिंदी)'
                    : preferences.language === 'mr-IN'
                    ? 'Marathi (मराठी)'
                    : preferences.language === 'en-US'
                    ? 'English'
                    : 'Auto (Match playlist)'}
                </small>
              </span>
              <select
                value={preferences.language || 'AUTO'}
                onChange={(e) => {
                  const newLang = e.target.value;
                  updatePreference('language', newLang);
                  if (newLang === 'hi-IN' || newLang === 'mr-IN') {
                    updatePreference('voiceId', 'Meher');
                  }
                }}
                aria-label="Broadcast language"
              >
                <option value="AUTO">Auto (Match playlist)</option>
                <option value="hi-IN">Hindi (हिंदी)</option>
                <option value="mr-IN">Marathi (मराठी)</option>
                <option value="en-US">English</option>
              </select>
            </div>
            <div className="setting">
              <span>
                Host voice
                <small>{preferences.voiceId === 'Auto' ? 'Smart (Meher/Blake/Sarah)' : preferences.voiceId}</small>
              </span>
              <select
                value={preferences.voiceId || 'Auto'}
                onChange={(e) => {
                  const newVoice = e.target.value;
                  updatePreference('voiceId', newVoice);
                  if (newVoice === 'Meher' && preferences.language === 'en-US') {
                    updatePreference('language', 'hi-IN');
                  }
                }}
                aria-label="Host voice"
              >
                <option value="Auto">Auto (Smart selection)</option>
                <option value="Meher">Meher (Hindi/Marathi)</option>
                <option value="Sarah">Sarah (Female Host)</option>
                <option value="Blake">Blake (Male Host)</option>
              </select>
            </div>
            <div className="setting">
              <span>
                DJ personality
                <small>
                  {preferences.personality === 'morning'
                    ? 'Morning Horizon — Fresh, gentle optimism & early light'
                    : preferences.personality === 'daylight'
                    ? 'Midday Pulse — Steady, focused afternoon companionship'
                    : preferences.personality === 'golden-hour'
                    ? 'Golden Hour Drive — Amber sunset nostalgia & unwinding'
                    : preferences.personality === 'evening'
                    ? 'Velvet Evening — Cozy, conversational late-night lounge'
                    : preferences.personality === 'late-night'
                    ? 'Midnight Solace — Intimate nocturnal companion for quiet hours'
                    : preferences.personality === 'warm'
                    ? 'Warm & Heartfelt — Friendly, personal, and welcoming'
                    : preferences.personality === 'calm'
                    ? 'Tranquil & Meditative — Soothing, mindful serenity'
                    : preferences.personality === 'energetic'
                    ? 'Vibrant & Dynamic — Lively, passionate enthusiasm'
                    : preferences.personality === 'elegant'
                    ? 'Refined & Cultured — Poetic lore & sophisticated depth'
                    : 'Auto (Time of Day) — Synchronized with your local sky'}
                </small>
              </span>
              <select
                value={preferences.personality || 'auto-time'}
                onChange={(e) => updatePreference('personality', e.target.value)}
                aria-label="DJ personality"
              >
                <optgroup label="24-Hour Broadcast Schedules">
                  <option value="auto-time">Auto (Sync with local time of day)</option>
                  <option value="morning">Morning Horizon (05:00 - 11:59 · Awakening)</option>
                  <option value="daylight">Midday Pulse (12:00 - 16:59 · Afternoon Flow)</option>
                  <option value="golden-hour">Golden Hour Drive (17:00 - 20:59 · Sunset)</option>
                  <option value="evening">Velvet Evening (21:00 - 23:59 · Cozy Lounge)</option>
                  <option value="late-night">Midnight Solace (00:00 - 04:59 · Quiet Solitude)</option>
                </optgroup>
                <optgroup label="Aesthetic Archetypes">
                  <option value="warm">Warm & Heartfelt (Friendly & Welcoming)</option>
                  <option value="calm">Tranquil & Meditative (Soothing & Peaceful)</option>
                  <option value="elegant">Refined & Cultured (Poetic & Sophisticated)</option>
                  <option value="energetic">Vibrant & Dynamic (Upbeat & Passionate)</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Group 3: Atmosphere & Location */}
          <div className="settings-group">
            <h3>Atmosphere</h3>
            <div className="setting">
              <span>
                Broadcast Location
                <small>
                  {detectedLocation
                    ? `${detectedLocation.name}${detectedLocation.country ? `, ${detectedLocation.country}` : ''}`
                    : 'Resolving via IP...'}
                </small>
              </span>
              <span className="settings-label">AUTO IP</span>
            </div>
            <div className="setting">
              <span>
                Late-night storytelling
                <small>Poetic midnight reflections</small>
              </span>
              <button
                className={`toggle ${preferences.storytelling ? 'on' : ''}`}
                type="button"
                onClick={() => updatePreference('storytelling', !preferences.storytelling)}
                aria-pressed={preferences.storytelling}
                aria-label="Toggle storytelling"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="settings-foot">
          <button type="button" className="ghost-btn" onClick={resetPreferences}>
            Reset defaults
          </button>
          <div className="settings-foot-right">
            <button type="button" className="ghost-btn" onClick={handlePreviewVoice}>
              {previewStatus || 'Preview voice →'}
            </button>
            <button type="button" className="primary-save-btn" onClick={handleSave}>
              {savedNotice ? 'Saved!' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
