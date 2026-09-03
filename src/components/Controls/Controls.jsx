import './Controls.css';

export function Controls({ isPlaying, onPrev, onNext, onPlayPause }) {
  return (
    <div className="controls" aria-label="Playback controls">
      <button
        type="button"
        className="control"
        id="prevBtn"
        aria-label="Previous track"
        onClick={onPrev}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5v14M19 6l-9 6 9 6V6z" />
        </svg>
      </button>

      <button
        type="button"
        className="control primary"
        id="playBtn"
        aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
        onClick={onPlayPause}
      >
        <svg id="playIcon" viewBox="0 0 24 24" aria-hidden="true">
          {isPlaying ? (
            <path d="M8 5v14M16 5v14" />
          ) : (
            <path d="M8 5l10 7-10 7V5z" />
          )}
        </svg>
      </button>

      <button
        type="button"
        className="control"
        id="nextBtn"
        aria-label="Next track"
        onClick={onNext}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 5v14M5 6l9 6-9 6V6z" />
        </svg>
      </button>
    </div>
  );
}
