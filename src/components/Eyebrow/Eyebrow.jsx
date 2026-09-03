import './Eyebrow.css';

export function Eyebrow({ isPlaying, isBuffering, weather = null, isAiDjEnabled = true }) {
  // Only show the name of the radio channel when it is ON AIR
  if (!isAiDjEnabled) {
    return null;
  }

  const showTitle = weather?.showTitle || 'SAAYA RADIO';

  return (
    <div
      className={`eyebrow ${isPlaying ? 'is-playing' : 'is-paused'} ${
        isBuffering ? 'is-buffering' : ''
      }`}
    >
      <span className="on-air">
        <i aria-hidden="true" />
        {isBuffering ? 'TUNING SIGNAL...' : showTitle.toUpperCase()}
      </span>
    </div>
  );
}
