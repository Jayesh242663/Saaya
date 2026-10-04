import { useState } from 'react';
import './OrbCard.css';

export function OrbCard({
  track,
  index,
  styles,
  isActive,
  onSelect,
  isDragging,
  didDragRef
}) {
  const [imgError, setImgError] = useState(false);

  const handleClick = (e) => {
    if (didDragRef?.current) {
      e.preventDefault();
      return;
    }
    onSelect?.(index);
  };

  const orbInlineStyles = {
    '--art': track.art,
    '--core': track.core,
    '--glow': track.glow,
    '--rotate': track.rotate
  };

  // Thumbnail from track metadata or high-res YouTube thumbnail
  const thumbnailUrl =
    track.thumbnail ||
    track.cover ||
    track.image ||
    (track.youtubeId ? `https://i.ytimg.com/vi/${track.youtubeId}/hqdefault.jpg` : null);

  const hasImage = Boolean(thumbnailUrl) && !imgError;

  const isDismissing = Boolean(styles?.isDismissing);
  const isSlidingVert = Math.abs(styles?.dismissDistance || 0) > 4;
  const showDismissBadge = styles?.canDismiss && Math.abs(styles?.dismissDistance || 0) > 18;
  const isDismissReady = Math.abs(styles?.dismissDistance || 0) > 55;

  return (
    <div
      className={`orb-wrap ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${
        isDismissing ? 'dismissing' : ''
      } ${isSlidingVert ? 'sliding-vert' : ''}`}
      style={styles}
      data-index={index}
      aria-hidden={isActive ? undefined : 'true'}
    >
      <button
        type="button"
        className="orb-button"
        tabIndex={isActive ? 0 : -1}
        aria-label={`Tune to ${track.title} by ${track.artist}`}
        onClick={handleClick}
      >
        <div className={`orb ${hasImage ? 'has-thumbnail' : ''}`} style={orbInlineStyles}>
          {hasImage && (
            <img
              src={thumbnailUrl}
              alt={`${track.title} - ${track.artist}`}
              className="orb-thumbnail"
              onError={() => setImgError(true)}
              loading="lazy"
              draggable="false"
            />
          )}
          <div className="orb-vignette" />
          <div className="orb-core" />
          <div className="orb-ring" />

          {/* Dismiss indicator pill when sliding up or down */}
          {showDismissBadge && (
            <div className={`orb-dismiss-badge ${isDismissReady ? 'ready' : ''}`}>
              <svg viewBox="0 0 24 24" className="dismiss-trash-icon" aria-hidden="true">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
              </svg>
              <span>{isDismissReady ? 'Release to remove' : 'Remove song'}</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
