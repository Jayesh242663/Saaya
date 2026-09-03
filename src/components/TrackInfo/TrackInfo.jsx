import { useState, useRef, useEffect } from 'react';
import './TrackInfo.css';

function formatTime(secs) {
  if (!secs || isNaN(secs) || secs < 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TrackInfo({
  track,
  index,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  onSeek
}) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const fillRef = useRef(null);
  const thumbRef = useRef(null);
  const elapsedRef = useRef(null);

  const isScrubbingRef = useRef(false);
  const scrubPctRef = useRef(0);
  const lastSyncRef = useRef({ time: currentTime, stamp: performance.now() });

  const formattedIndex = String(index + 1).padStart(2, '0');

  // Keep lastSyncRef updated when currentTime changes from audio engine
  useEffect(() => {
    lastSyncRef.current = { time: currentTime, stamp: performance.now() };
  }, [currentTime]);

  // Continuous 60fps/120fps requestAnimationFrame loop for liquid-smooth movement
  useEffect(() => {
    let animId;

    const tick = () => {
      if (!isScrubbingRef.current && duration > 0) {
        let currentSecs = lastSyncRef.current.time;
        if (isPlaying) {
          const delta = (performance.now() - lastSyncRef.current.stamp) / 1000;
          currentSecs = Math.min(duration, lastSyncRef.current.time + delta);
        }
        const pct = Math.min(100, Math.max(0, (currentSecs / duration) * 100));

        if (fillRef.current) fillRef.current.style.width = `${pct}%`;
        if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
        if (elapsedRef.current) elapsedRef.current.textContent = formatTime(currentSecs);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [duration, isPlaying]);

  const getPercentFromEvent = (e, trackEl) => {
    const rect = trackEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return rect.width > 0 ? (x / rect.width) * 100 : 0;
  };

  const setVisualPosition = (p) => {
    scrubPctRef.current = p;
    if (fillRef.current) fillRef.current.style.width = `${p}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${p}%`;
    if (elapsedRef.current && duration > 0) {
      elapsedRef.current.textContent = formatTime((p / 100) * duration);
    }
  };

  const handlePointerDown = (e) => {
    if (duration <= 0) return;
    const trackEl = e.currentTarget;
    try {
      trackEl.setPointerCapture(e.pointerId);
    } catch (_) {}
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    const p = getPercentFromEvent(e, trackEl);
    setVisualPosition(p);
  };

  const handlePointerMove = (e) => {
    if (!isScrubbingRef.current || duration <= 0) return;
    const p = getPercentFromEvent(e, e.currentTarget);
    setVisualPosition(p);
  };

  const handlePointerUp = (e) => {
    if (!isScrubbingRef.current) return;
    const p = getPercentFromEvent(e, e.currentTarget);
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    if (onSeek && duration > 0) {
      const targetSec = (p / 100) * duration;
      lastSyncRef.current = { time: targetSec, stamp: performance.now() };
      onSeek(targetSec);
    }
  };

  const handleKeyDown = (e) => {
    if (duration <= 0 || !onSeek) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const target = Math.max(0, currentTime - 5);
      lastSyncRef.current = { time: target, stamp: performance.now() };
      onSeek(target);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const target = Math.min(duration, currentTime + 5);
      lastSyncRef.current = { time: target, stamp: performance.now() };
      onSeek(target);
    }
  };

  return (
    <section className="track-info" aria-live="polite">
      <div className="track-kicker">
        NOW PLAYING / <span id="trackIndex">{formattedIndex}</span>
      </div>
      <h1 className="track-title" id="trackTitle">
        {track?.title || 'Unknown Track'}
      </h1>
      <div className="track-artist" id="trackArtist">
        {track?.artist || 'Unknown Artist'}
      </div>
      <div className="track-meta" id="trackMeta">
        {track?.meta || ''}
      </div>

      {/* Interactive Music Progress Bar with 60fps continuous liquid animation */}
      <div className="progress-wrap">
        <div
          className={`progress-track ${isScrubbing ? 'is-scrubbing' : ''}`}
          role="slider"
          aria-label="Song progress"
          aria-valuemin="0"
          aria-valuemax="100"
          tabIndex="0"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          <div ref={fillRef} className="progress-fill" />
          <div ref={thumbRef} className="progress-thumb" />
        </div>
        <div className="progress-times">
          <span ref={elapsedRef} id="elapsed">{formatTime(currentTime)}</span>
          <span id="duration">{formatTime(duration)}</span>
        </div>
      </div>
    </section>
  );
}
