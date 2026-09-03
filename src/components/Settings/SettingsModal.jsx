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
                Host voice
                <small>{preferences.voiceId === 'Auto' ? 'Smart (Meher/Blake/Sarah)' : preferences.voiceId}</small>
              </span>
              <select
                value={preferences.voiceId || 'Auto'}
                onChange={(e) => updatePreference('voiceId', e.target.value)}
                aria-label="Host voice"
              >
                <option value="Auto">Auto (Smart selection)</option>
                <option value="Meher">Meher (Hindi/Marathi)</option>
                <option value="Sarah">Sarah (Female Host)</option>
                <option value="Blake">Blake (Male Host)</option>
              </select>
            </div>
            <div className="setting">
              <span>DJ tone</span>
              <select
                value={preferences.personality || 'late-night'}
                onChange={(e) => updatePreference('personality', e.target.value)}
                aria-label="DJ tone"
              >
                <option value="late-night">Late night</option>
                <option value="warm">Warm</option>
                <option value="calm">Calm</option>
                <option value="elegant">Elegant</option>
                <option value="energetic">Energetic</option>
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
