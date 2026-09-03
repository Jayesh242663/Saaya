import './BroadcastOverlay.css';

export function BroadcastOverlay({ isDjSpeaking, spokenText, city = 'Tokyo', weather = null }) {
  if (!isDjSpeaking && !spokenText) return null;

  const showTitle = weather?.showTitle ? `${weather.showTitle.toUpperCase()} · ` : '';
  const weatherBadge = weather?.formattedBadge || `${city.toUpperCase()} · ON AIR`;

  // Extract emotional delivery cues from brackets if present
  const emotionMatches = spokenText ? [...spokenText.matchAll(/\[(.*?)\]/g)].map((m) => m[1].trim()) : [];
  // Find tone tags (exclude bare pauses)
  const toneTags = emotionMatches.filter((e) => !/pause/i.test(e));
  const activeEmotion = toneTags.length > 0 ? toneTags[0].toUpperCase() : null;
  const isPause = /pause/i.test(spokenText);

  // Clean brackets for the main subtitle text
  const cleanSpokenText = spokenText
    ? spokenText
        .replace(/\[(?:dramatic pause|longer dramatic pause|long dramatic pause)\]/gi, '... [dramatic pause] ...')
        .replace(/\[(?:short pause|pause)\]/gi, '... [pause] ...')
        .replace(/\[.*?\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  return (
    <aside className="broadcast-overlay" aria-live="assertive" role="region" aria-label="AI Radio DJ Broadcast">
      <div className="broadcast-content">
        <header className="broadcast-header">
          <span className="dj-mic-pulse">
            <span className="bar bar-1" />
            <span className="bar bar-2" />
            <span className="bar bar-3" />
            <span className="bar bar-4" />
          </span>
          <span className="dj-label">MEHER · {showTitle}ON AIR</span>

          {activeEmotion && (
            <span className="dj-emotional-state-pill" title="Host emotional delivery state">
              ● {activeEmotion}
            </span>
          )}

          {isPause && !activeEmotion && (
            <span className="dj-pause-indicator" title="Dramatic pause">
              ◌ PAUSE
            </span>
          )}

          <span className="broadcast-city" title={weather?.description || 'Broadcast conditions'}>
            {weatherBadge}
          </span>
        </header>

        <p className="broadcast-subtitles">
          “{cleanSpokenText}”
        </p>
      </div>
    </aside>
  );
}
