import { useEffect, useState } from 'react';
import { mod } from '../../hooks/useCarousel';
import { OrbCard } from './OrbCard';
import './Carousel.css';

export function Carousel({
  tracks,
  visibleSlots,
  isDragging,
  dragX = 0,
  didDragRef,
  onSelectSlot,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  getOrbStyles
}) {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className={`carousel-shell ${isDragging ? 'is-dragging' : ''}`}
      id="carouselShell"
      aria-label="Spatial track carousel. Drag, swipe, scroll, or use arrow keys to change tracks."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div className={`carousel ${isDragging ? 'is-dragging' : ''}`} id="carousel" role="list">
        {visibleSlots.map((slotIndex) => {
          const track = tracks[mod(slotIndex, tracks.length)];
          const styles = getOrbStyles(slotIndex, windowWidth);
          return (
            <OrbCard
              key={`slot-${slotIndex}`}
              track={track}
              index={slotIndex}
              styles={styles}
              isActive={styles.isActive}
              onSelect={() => onSelectSlot?.(slotIndex)}
              isDragging={isDragging}
              didDragRef={didDragRef}
            />
          );
        })}
      </div>

      <div
        className={`carousel-line ${isDragging ? 'is-dragging' : ''}`}
        aria-hidden="true"
        style={{ '--drag-x': `${dragX}px` }}
      >
        <div className="carousel-line-ticks">
          {visibleSlots.map((slotIndex) => {
            const styles = getOrbStyles(slotIndex, windowWidth);
            return (
              <span
                key={`tick-${slotIndex}`}
                className={`carousel-tick ${styles.isActive ? 'active' : ''}`}
                style={{
                  '--x': styles['--x'],
                  '--opacity': styles.isActive
                    ? 1
                    : styles.absDistance === 1
                    ? 0.45
                    : styles.absDistance === 2
                    ? 0.2
                    : 0
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
