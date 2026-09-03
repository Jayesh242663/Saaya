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

  return (
    <div
      className={`orb-wrap ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      style={styles}
      data-index={index}
      aria-hidden={isActive ? undefined : 'true'}
      inert={!isActive}
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
        </div>
      </button>
    </div>
  );
}
