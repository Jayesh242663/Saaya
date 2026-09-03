import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export const mod = (n, m) => ((n % m) + m) % m;

export function useCarousel(tracksCount = 7, windowRadius = 4) {
  const [virtualIndex, setVirtualIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);

  // References for drag calculation
  const dragStartRef = useRef(null);
  const dragDeltaRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const pointerVelocityRef = useRef(0);
  const didDragRef = useRef(false);
  const wheelLockedRef = useRef(false);
  const wheelTimeoutRef = useRef(null);

  const current = useMemo(
    () => (tracksCount > 0 ? mod(virtualIndex, tracksCount) : 0),
    [virtualIndex, tracksCount]
  );

  const setCurrent = useCallback((slotOrTrackIndex) => {
    setVirtualIndex(slotOrTrackIndex);
  }, []);

  const move = useCallback((direction) => {
    setVirtualIndex((prev) => prev + direction);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Wheel interaction
  const handleWheel = useCallback(
    (e) => {
      if (wheelLockedRef.current || (Math.abs(e.deltaY) < 12 && Math.abs(e.deltaX) < 12)) return;
      e.preventDefault();
      wheelLockedRef.current = true;
      move(e.deltaY + e.deltaX > 0 ? 1 : -1);

      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        wheelLockedRef.current = false;
      }, 520);
    },
    [move]
  );

  // Pointer drag start
  const handlePointerDown = useCallback((e) => {
    dragStartRef.current = e.clientX;
    dragDeltaRef.current = 0;
    lastPointerXRef.current = e.clientX;
    lastPointerTimeRef.current = performance.now();
    pointerVelocityRef.current = 0;
    didDragRef.current = false;

    setDragX(0);
    setIsDragging(true);

    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
  }, []);

  // Pointer drag move
  const handlePointerMove = useCallback((e) => {
    if (dragStartRef.current === null) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastPointerTimeRef.current);
    const delta = e.clientX - lastPointerXRef.current;

    dragDeltaRef.current = e.clientX - dragStartRef.current;
    pointerVelocityRef.current = delta / dt;
    lastPointerXRef.current = e.clientX;
    lastPointerTimeRef.current = now;

    if (Math.abs(dragDeltaRef.current) > 8) {
      didDragRef.current = true;
    }

    // 0.64 resistance factor
    setDragX(dragDeltaRef.current * 0.64);
  }, []);

  // Pointer drag finish
  const handlePointerUp = useCallback(
    (e) => {
      if (dragStartRef.current === null) return;
      const shouldAdvance =
        Math.abs(dragDeltaRef.current) > 46 || Math.abs(pointerVelocityRef.current) > 0.42;

      let direction = 0;
      if (pointerVelocityRef.current !== 0) {
        direction = pointerVelocityRef.current < 0 ? 1 : -1;
      } else {
        direction = dragDeltaRef.current < 0 ? 1 : -1;
      }

      setDragX(0);
      dragStartRef.current = null;
      setIsDragging(false);

      if (shouldAdvance) {
        move(direction);
      }

      if (
        e &&
        e.currentTarget &&
        e.currentTarget.hasPointerCapture &&
        e.currentTarget.hasPointerCapture(e.pointerId)
      ) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Safe fallback
        }
      }
    },
    [move]
  );

  // Visible slots around virtualIndex
  const visibleSlots = useMemo(() => {
    const slots = [];
    for (let i = virtualIndex - windowRadius; i <= virtualIndex + windowRadius; i++) {
      slots.push(i);
    }
    return slots;
  }, [virtualIndex, windowRadius]);

  // Compute CSS custom property values for any slot index
  const getOrbStyles = useCallback(
    (slotIndex, windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200) => {
      const d = slotIndex - virtualIndex;
      const abs = Math.abs(d);
      const spacing = Math.min(210, Math.max(130, windowWidth * 0.15));
      const x = d * spacing;

      let size = 'clamp(170px, min(27vw, 29vh), 310px)';
      let scale = 1;
      let opacity = 1;
      let blur = '0px';

      if (abs === 0) {
        size = 'clamp(170px, min(27vw, 29vh), 310px)';
        scale = 1;
        opacity = 1;
        blur = '0px';
      } else if (abs === 1) {
        size = 'clamp(100px, min(15vw, 17vh), 170px)';
        scale = 0.82;
        opacity = 0.63;
        blur = '0.35px';
      } else if (abs === 2) {
        size = 'clamp(70px, min(10vw, 12vh), 120px)';
        scale = 0.58;
        opacity = 0.27;
        blur = '1px';
      } else if (abs === 3) {
        size = 'clamp(50px, min(8vw, 9vh), 90px)';
        scale = 0.42;
        opacity = 0.08;
        blur = '2px';
      } else {
        size = 'clamp(40px, min(6vw, 7vh), 70px)';
        scale = 0.28;
        opacity = 0;
        blur = '4px';
      }

      const z = Math.max(0, 10 - abs);
      const depth = `${Math.max(-280, -abs * 85)}px`;
      const tilt = `${d * -4}deg`;

      return {
        '--x': `${x}px`,
        '--size': size,
        '--scale': scale,
        '--opacity': opacity,
        '--blur': blur,
        '--z': z,
        '--depth': depth,
        '--tilt': tilt,
        '--drag-x': `${dragX}px`,
        distance: d,
        absDistance: abs,
        isActive: d === 0
      };
    },
    [virtualIndex, dragX]
  );

  return {
    virtualIndex,
    current,
    visibleSlots,
    isPlaying,
    isDragging,
    dragX,
    didDrag: didDragRef,
    move,
    setCurrent,
    togglePlay,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getOrbStyles
  };
}
