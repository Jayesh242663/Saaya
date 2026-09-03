import { useState, useEffect } from 'react';
import './RoomModal.css';

export function RoomModal({
  isOpen,
  onClose,
  isInRoom,
  isHost,
  roomId,
  inviteUrl,
  participants = [],
  roomSettings = { djOnly: true },
  syncStatus = 'offline',
  isJoining = false,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onUpdateSettings,
  initialCode = ''
}) {
  const [mode, setMode] = useState(initialCode ? 'join' : 'create'); // 'create' | 'join'
  const [hostName, setHostName] = useState(() => localStorage.getItem('saaya_dj_name') || 'Host DJ');
  const [joinCode, setJoinCode] = useState(initialCode || '');
  const [userName, setUserName] = useState(() => localStorage.getItem('saaya_listener_name') || 'Listener');
  const [copiedType, setCopiedType] = useState(null); // 'code' | 'link' | null
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialCode) {
      setJoinCode(initialCode);
      setMode('join');
    }
  }, [initialCode]);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrorMessage('');
    setCopiedType(null);
    onClose?.();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      localStorage.setItem('saaya_dj_name', hostName.trim() || 'Host DJ');
      await onCreateRoom(hostName.trim() || 'Host DJ');
    } catch (err) {
      setErrorMessage(err.message || 'Could not create room. Check connection.');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setErrorMessage('Please enter an invite code.');
      return;
    }
    setErrorMessage('');
    try {
      localStorage.setItem('saaya_listener_name', userName.trim() || 'Listener');
      await onJoinRoom(joinCode.trim().toUpperCase(), userName.trim() || 'Listener');
    } catch (err) {
      setErrorMessage(err.message || 'Room not found or expired.');
    }
  };

  const handleCopy = (text, type) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  return (
    <section
      className={`room-modal-screen ${isOpen ? 'open' : ''}`}
      aria-label="Listening Room Session"
    >
      <div className="room-modal-head">
        <div className="brand">
          <img src="/favicon.png" alt="SAAYA logo" className="brand-mark" />
          <span className="brand-title">SAAYA</span>
          <span className="brand-dev">साया</span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close listening room"
        >
          Close
        </button>
      </div>

      <div className="room-modal-content">
        <div className="room-section-label">EPHEMERAL SESSION</div>
        <h2>{isInRoom ? 'Listening room.' : 'Listen together.'}</h2>
        <p className="room-modal-subtitle">
          {isInRoom
            ? 'Playback and station transitions are synchronized in real time across all listeners. Zero storage.'
            : 'Start a synchronized listening room or tune in to an active station code with zero persistent storage.'}
        </p>

        {errorMessage && (
          <div className="room-error-notice">{errorMessage}</div>
        )}

        <div className="room-modal-grid">
          {/* VIEW A: NOT IN A ROOM (Create or Join) */}
          {!isInRoom ? (
            <>
              {/* Group 1: Mode Selection */}
              <div className="room-group">
                <h3>Session type</h3>
                <div className="room-row">
                  <span>
                    Action
                    <small>Choose to host a new station or tune in with an invite code</small>
                  </span>
                  <select
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value);
                      setErrorMessage('');
                    }}
                    aria-label="Session type"
                  >
                    <option value="create">Host a new station</option>
                    <option value="join">Join with invite code</option>
                  </select>
                </div>
              </div>

              {/* Group 2: Form Inputs */}
              {mode === 'create' ? (
                <form onSubmit={handleCreate} className="room-form-block">
                  <div className="room-group">
                    <h3>Host details</h3>
                    <div className="room-row">
                      <span>
                        DJ display name
                        <small>Name shown to tuned-in listeners</small>
                      </span>
                      <input
                        type="text"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        placeholder="Host DJ"
                        maxLength={30}
                        required
                      />
                    </div>
                    <div className="room-row">
                      <span>
                        Station broadcast
                        <small>Streams your currently loaded playlist in real time</small>
                      </span>
                      <span className="room-text-pill">Live Sync</span>
                    </div>
                  </div>

                  <div className="room-foot">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                    <div className="room-foot-right">
                      <button
                        type="submit"
                        className="primary-save-btn"
                        disabled={isJoining}
                      >
                        {isJoining ? 'Creating...' : 'Start room'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleJoin} className="room-form-block">
                  <div className="room-group">
                    <h3>Join details</h3>
                    <div className="room-row">
                      <span>
                        Invite code
                        <small>6-character station identifier</small>
                      </span>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="SAAYA-XXXX"
                        maxLength={16}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="room-row">
                      <span>
                        Your nickname
                        <small>Name displayed in the room</small>
                      </span>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Listener"
                        maxLength={30}
                        required
                      />
                    </div>
                  </div>

                  <div className="room-foot">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                    <div className="room-foot-right">
                      <button
                        type="submit"
                        className="primary-save-btn"
                        disabled={isJoining}
                      >
                        {isJoining ? 'Tuning in...' : 'Tune in'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* VIEW B: CURRENTLY IN AN ACTIVE ROOM */
            <>
              {/* Group 1: Session Info & Invite */}
              <div className="room-group">
                <h3>Broadcast session</h3>
                <div className="room-row">
                  <span>
                    Invite code
                    <small>Share this code for friends to tune in</small>
                  </span>
                  <div className="room-action-cluster">
                    <span className="room-code-tag">{roomId}</span>
                    <button
                      type="button"
                      className="ghost-btn action-link"
                      onClick={() => handleCopy(roomId, 'code')}
                    >
                      {copiedType === 'code' ? 'Copied' : 'Copy code'}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn action-link"
                      onClick={() => handleCopy(inviteUrl, 'link')}
                    >
                      {copiedType === 'link' ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                </div>

                <div className="room-row">
                  <span>
                    Sync status
                    <small>Dynamic drift compensation active</small>
                  </span>
                  <span className={`room-status-indicator ${syncStatus}`}>
                    {syncStatus === 'in-sync' ? 'Synchronized' : 'Syncing'}
                  </span>
                </div>

                <div className="room-row">
                  <span>
                    Your role
                    <small>{isHost ? 'You control the playback' : 'Synchronized with host'}</small>
                  </span>
                  <span className="room-text-pill">
                    {isHost ? 'Host DJ' : 'Listener'}
                  </span>
                </div>
              </div>

              {/* Group 2: Connected Listeners */}
              <div className="room-group">
                <h3>Listeners ({participants.length})</h3>
                <div className="room-participants-flow">
                  {participants.map((p) => (
                    <div key={p.id} className="room-participant-badge">
                      <span className="participant-name">{p.name}</span>
                      <span className="participant-sub">
                        {p.isHost ? 'Host' : 'Listener'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 3: Host Settings (if host) */}
              {isHost && (
                <div className="room-group">
                  <h3>Permissions</h3>
                  <div className="room-row">
                    <span>
                      DJ only control
                      <small>Only host can pause, scrub, or advance tracks</small>
                    </span>
                    <button
                      type="button"
                      className={`toggle ${roomSettings.djOnly ? 'on' : ''}`}
                      onClick={() =>
                        onUpdateSettings?.({
                          ...roomSettings,
                          djOnly: !roomSettings.djOnly
                        })
                      }
                      aria-pressed={roomSettings.djOnly}
                      aria-label="Toggle DJ only control"
                    />
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="room-foot">
                <button
                  type="button"
                  className="ghost-btn leave-btn"
                  onClick={() => {
                    onLeaveRoom?.();
                    handleClose();
                  }}
                >
                  Leave room
                </button>
                <div className="room-foot-right">
                  <button
                    type="button"
                    className="primary-save-btn"
                    onClick={handleClose}
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
