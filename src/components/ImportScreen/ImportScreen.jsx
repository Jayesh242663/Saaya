import { useState } from 'react';
import './ImportScreen.css';

export function ImportScreen({ onSubmit, error, onOpenRoom }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim());
  };

  return (
    <div className="import-screen-container">
      <div className="brand-header">
        <img src="/favicon.png" alt="SAAYA logo" className="brand-mark" />
        <span className="brand-title">SAAYA</span>
        <span className="brand-dev">साया</span>
      </div>

      {onOpenRoom && (
        <div className="import-top-actions">
          <button
            type="button"
            className="import-room-top-btn"
            onClick={onOpenRoom}
            aria-label="Open listening rooms"
          >
            Rooms
          </button>
        </div>
      )}

      <div className="import-center">
        <div className="import-kicker">YOUR PERSONAL RADIO</div>
        <h1 className="import-heading">
          Give your playlist<br />a voice.
        </h1>
        <p className="import-intro">
          Paste a playlist link and SAAYA will shape its songs into a continuous radio show, tuned to your mood.
        </p>

        <form className="import-form" onSubmit={handleSubmit}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="link-icon">
            <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 7 20l1.1-1.1" />
          </svg>
          <label className="sr-only" htmlFor="landingPlaylistUrl">
            Playlist link
          </label>
          <input
            id="landingPlaylistUrl"
            type="url"
            placeholder="Paste your playlist link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            autoFocus
          />
          <button className="tune-submit-btn" type="submit">
            <span>Tune in</span>
            <span className="tune-arrow">→</span>
          </button>
        </form>

        {error && <div className="import-error">{error}</div>}

        <div className="import-hint">Spotify · Apple Music · YouTube Music · JioSaavn</div>
      </div>
    </div>
  );
}
