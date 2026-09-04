import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export const mod = (n, m) => ((n % m) + m) % m;

export function useCarousel(tracksCount = 7, windowRadius = 4, options = {}) {
  const opts =
    typeof windowRadius === 'object' && windowRadius !== null
      ? windowRadius
      : typeof options === 'object' && options !== null
      ? options
      : {};
  const actualRadius = typeof windowRadius === 'number' ? windowRadius : 4;
  const { onNext, onPrev } = opts;

  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    onPrevRef.current = onPrev;
  }, [onPrev]);

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
      if (e.key === 'ArrowLeft') {
        if (typeof onPrevRef.current === 'function') onPrevRef.current();
        else move(-1);
      }
      if (e.key === 'ArrowRight') {
        if (typeof onNextRef.current === 'function') onNextRef.current();
        else move(1);
      }
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
      const dir = e.deltaY + e.deltaX > 0 ? 1 : -1;
      if (dir === 1 && typeof onNextRef.current === 'function') {
        onNextRef.current();
      } else if (dir === -1 && typeof onPrevRef.current === 'function') {
        onPrevRef.current();
      } else {
        move(dir);
      }

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
        if (direction === 1 && typeof onNextRef.current === 'function') {
          onNextRef.current();
        } else if (direction === -1 && typeof onPrevRef.current === 'function') {
          onPrevRef.current();
        } else {
          move(direction);
        }
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
      const spacing = Math.min(220, Math.max(135, windowWidth * 0.16));
      const x = d * spacing;

      // Consistent base size ensures zero width/height layout reflows during transitions
      const size = 'clamp(180px, min(28vw, 30vh), 320px)';

      let scale = 1;
      let opacity = 1;

      if (abs === 0) {
        scale = 1;
        opacity = 1;
      } else if (abs === 1) {
        scale = 0.62;
        opacity = 0.68;
      } else if (abs === 2) {
        scale = 0.40;
        opacity = 0.30;
      } else if (abs === 3) {
        scale = 0.26;
        opacity = 0.10;
      } else {
        scale = 0.16;
        opacity = 0;
      }

      const z = Math.max(0, 10 - abs);
      const depth = `${Math.max(-280, -abs * 85)}px`;
      const tilt = `${d * -3.5}deg`;

      return {
        '--x': `${x}px`,
        '--size': size,
        '--scale': scale,
        '--opacity': opacity,
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
