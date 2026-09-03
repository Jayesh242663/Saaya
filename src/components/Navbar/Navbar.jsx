import { useState, useEffect } from 'react';
import './Navbar.css';

export function Navbar({
  activeTab = 'radio',
  onTabChange,
  isMuted,
  onToggleSound,
  onOpenSettings,
  onOpenRoom,
  isInRoom = false,
  roomId = null,
  participantCount = 0,
  onImportPlaylist,
  isDjSpeaking,
  isAiDjEnabled = true,
  onToggleAiDj,
  weather = null
}) {
  const [headerUrl, setHeaderUrl] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState(() => {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  });

  useEffect(() => {
    const tick = () => {
      setCurrentTimeStr(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    };
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleHeaderSubmit = (e) => {
    e.preventDefault();
    if (!headerUrl.trim()) return;
    onImportPlaylist?.(headerUrl.trim());
    setHeaderUrl('');
  };

  const displayTime = weather?.clockTime || currentTimeStr;

  return (
    <header className="nav">
      <div className="brand-wrapper">
        <div className="brand">
          <img src="/favicon.png" alt="SAAYA logo" className="brand-mark" />
          <span className="brand-title">SAAYA</span>
          <span className="brand-dev">साया</span>
        </div>

        {/* Time shown under the Saaya logo and title */}
        <div className="brand-time">
          {displayTime}
        </div>

        {/* ON / OFF AIR Broadcast Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isAiDjEnabled}
          aria-label={
            isAiDjEnabled
              ? 'Broadcast is ON AIR. Click to switch to OFF AIR.'
              : 'Broadcast is OFF AIR. Click to switch to ON AIR.'
          }
          className={`broadcast-switch ${isAiDjEnabled ? 'is-on-air' : 'is-off-air'}`}
          onClick={onToggleAiDj}
          title={
            isAiDjEnabled
              ? 'Status: ON AIR (Host commentary active · Click for OFF AIR)'
              : 'Status: OFF AIR (Music only mode · Click for ON AIR)'
          }
        >
          <span className="beacon-container" aria-hidden="true">
            <span className="beacon-dot" />
          </span>
          <span className="broadcast-status-label">
            {isAiDjEnabled ? 'ON AIR' : 'OFF AIR'}
          </span>
          {isAiDjEnabled && isDjSpeaking && (
            <span className="broadcast-live-tag" title="Host is speaking live">
              ● LIVE
            </span>
          )}
        </button>
      </div>

      {/* Playlist Link Input in Header matching landing page design */}
      <form className="nav-playlist-form" onSubmit={handleHeaderSubmit}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-link-icon">
          <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 7 20l1.1-1.1" />
        </svg>
        <input
          type="url"
          placeholder="Paste playlist link to switch..."
          value={headerUrl}
          onChange={(e) => setHeaderUrl(e.target.value)}
          aria-label="Change playlist"
        />
        <button type="submit" className="nav-tune-btn" aria-label="Tune to playlist">
          <span>Tune</span>
          <span className="nav-arrow">→</span>
        </button>
      </form>

      <div className="nav-actions">
        <button
          type="button"
          className={`room-nav-btn ${isInRoom ? 'is-active-room' : ''}`}
          onClick={onOpenRoom}
          aria-label={isInRoom ? `Listening room ${roomId} active` : 'Open Listening Rooms'}
        >
          {isInRoom ? `Room [${roomId}]` : 'Rooms'}
        </button>

        <button
          type="button"
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
          className={`sound-toggle ${isMuted ? 'muted' : ''}`}
          onClick={onToggleSound}
        >
          {isMuted ? 'Sound [Muted]' : 'Sound'}
        </button>
        <button
          type="button"
          aria-label="Open settings"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
