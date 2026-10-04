import { SongInput } from '../SongInput/SongInput';
import './ImportScreen.css';

export function ImportScreen({ onSubmit, onPlaySingleSong, error, onOpenRoom }) {
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

        <SongInput
          variant="hero"
          onImportPlaylist={onSubmit}
          onPlayNow={onPlaySingleSong}
          placeholder="Paste your playlist link"
        />

        {error && <div className="import-error">{error}</div>}

        <div className="import-hint">Spotify · Apple Music · YouTube Music · JioSaavn</div>
      </div>
    </div>
  );
}
