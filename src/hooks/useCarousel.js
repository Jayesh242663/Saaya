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
  const { onNext, onPrev, onDismiss } = opts;

  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    onPrevRef.current = onPrev;
  }, [onPrev]);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const [virtualIndex, setVirtualIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dismissState, setDismissState] = useState(null); // { slotIndex, dy, isDismissing }

  // References for drag calculation
  const dragStartRef = useRef(null);
  const dragStartYRef = useRef(null);
  const dragStartSlotRef = useRef(null);
  const gestureAxisRef = useRef(null); // 'x' | 'y' | null
  const dragDeltaRef = useRef(0);
  const dragDeltaYRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerYRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const pointerVelocityRef = useRef(0);
  const pointerVelocityYRef = useRef(0);
  const didDragRef = useRef(false);
  const wheelLockedRef = useRef(false);
  const wheelTimeoutRef = useRef(null);

  const current = useMemo(
    () => (tracksCount > 0 ? Math.max(0, Math.min(tracksCount - 1, virtualIndex)) : 0),
    [virtualIndex, tracksCount]
  );

  // Keep virtualIndex strictly within valid track bounds [0, tracksCount - 1]
  useEffect(() => {
    if (tracksCount <= 0) {
      setVirtualIndex(0);
    } else {
      setVirtualIndex((prev) => Math.max(0, Math.min(tracksCount - 1, prev)));
    }
  }, [tracksCount]);

  const setCurrent = useCallback((slotOrTrackIndex) => {
    setVirtualIndex(tracksCount > 0 ? Math.max(0, Math.min(tracksCount - 1, slotOrTrackIndex)) : 0);
  }, [tracksCount]);

  const move = useCallback((direction) => {
    setVirtualIndex((prev) => {
      if (tracksCount <= 0) return 0;
      return Math.max(0, Math.min(tracksCount - 1, prev + direction));
    });
  }, [tracksCount]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (tracksCount <= 1) return;
      if (e.key === 'ArrowLeft') {
        if (virtualIndex > 0) {
          if (typeof onPrevRef.current === 'function') onPrevRef.current();
          else move(-1);
        }
      }
      if (e.key === 'ArrowRight') {
        if (virtualIndex < tracksCount - 1) {
          if (typeof onNextRef.current === 'function') onNextRef.current();
          else move(1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, tracksCount, virtualIndex]);

  // Wheel interaction
  const handleWheel = useCallback(
    (e) => {
      if (tracksCount <= 1) return;
      if (wheelLockedRef.current || (Math.abs(e.deltaY) < 12 && Math.abs(e.deltaX) < 12)) return;
      e.preventDefault();
      wheelLockedRef.current = true;
      const dir = e.deltaY + e.deltaX > 0 ? 1 : -1;
      if (dir === 1 && virtualIndex < tracksCount - 1) {
        if (typeof onNextRef.current === 'function') onNextRef.current();
        else move(1);
      } else if (dir === -1 && virtualIndex > 0) {
        if (typeof onPrevRef.current === 'function') onPrevRef.current();
        else move(-1);
      }

      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        wheelLockedRef.current = false;
      }, 520);
    },
    [move, tracksCount, virtualIndex]
  );

  // Pointer drag start
  const handlePointerDown = useCallback(
    (e) => {
      // Find if pointer initiated on an orb-wrap
      const orbWrap = e.target.closest?.('.orb-wrap');
      const slotAttr = orbWrap?.getAttribute('data-index');
      const clickedSlot = slotAttr !== null && slotAttr !== undefined ? parseInt(slotAttr, 10) : null;

      dragStartRef.current = e.clientX;
      dragStartYRef.current = e.clientY;
      dragStartSlotRef.current = clickedSlot;
      gestureAxisRef.current = null;
      dragDeltaRef.current = 0;
      dragDeltaYRef.current = 0;
      lastPointerXRef.current = e.clientX;
      lastPointerYRef.current = e.clientY;
      lastPointerTimeRef.current = performance.now();
      pointerVelocityRef.current = 0;
      pointerVelocityYRef.current = 0;
      didDragRef.current = false;

      setDragX(0);
      setDismissState(null);
      setIsDragging(true);

      if (e.currentTarget.setPointerCapture) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Safe fallback
        }
      }
    },
    []
  );

  // Pointer drag move
  const handlePointerMove = useCallback(
    (e) => {
      if (dragStartRef.current === null) return;
      const now = performance.now();
      const dt = Math.max(1, now - lastPointerTimeRef.current);
      const deltaX = e.clientX - lastPointerXRef.current;
      const deltaY = e.clientY - lastPointerYRef.current;

      dragDeltaRef.current = e.clientX - dragStartRef.current;
      dragDeltaYRef.current = e.clientY - dragStartYRef.current;
      pointerVelocityRef.current = deltaX / dt;
      pointerVelocityYRef.current = deltaY / dt;
      lastPointerXRef.current = e.clientX;
      lastPointerYRef.current = e.clientY;
      lastPointerTimeRef.current = now;

      const totalDx = Math.abs(dragDeltaRef.current);
      const totalDy = Math.abs(dragDeltaYRef.current);

      if (totalDx > 6 || totalDy > 6) {
        didDragRef.current = true;
      }

      // Determine gesture axis if not locked yet
      if (gestureAxisRef.current === null) {
        if (dragStartSlotRef.current !== null && totalDy > 6 && totalDy >= totalDx && tracksCount > 1) {
          gestureAxisRef.current = 'y';
        } else if (totalDx > 6) {
          gestureAxisRef.current = 'x';
        }
      }

      if (gestureAxisRef.current === 'y') {
        // Vertical dismiss drag on target orb
        setDismissState({
          slotIndex: dragStartSlotRef.current,
          dy: dragDeltaYRef.current * 0.85,
          isDismissing: false
        });
      } else {
        // Horizontal carousel track drag with queue boundary resistance
        const canMovePrev = virtualIndex > 0;
        const canMoveNext = virtualIndex < tracksCount - 1;
        const isDraggingPrev = dragDeltaRef.current > 0;
        const isDraggingNext = dragDeltaRef.current < 0;

        if ((isDraggingPrev && !canMovePrev) || (isDraggingNext && !canMoveNext)) {
          // Subtle rubber-band resistance when dragging beyond start or end
          setDragX(dragDeltaRef.current * 0.08);
        } else if (tracksCount > 1) {
          setDragX(dragDeltaRef.current * 0.64);
        } else {
          setDragX(dragDeltaRef.current * 0.08);
        }
      }
    },
    [virtualIndex, tracksCount]
  );

  // Pointer drag finish
  const handlePointerUp = useCallback(
    (e) => {
      if (dragStartRef.current === null) return;

      const axis = gestureAxisRef.current;
      const currentSlot = dragStartSlotRef.current;
      const dy = dragDeltaYRef.current;
      const vy = pointerVelocityYRef.current;

      setDragX(0);
      dragStartRef.current = null;
      dragStartYRef.current = null;
      dragStartSlotRef.current = null;
      gestureAxisRef.current = null;
      setIsDragging(false);

      if (axis === 'y' && currentSlot !== null) {
        // Check if vertical swipe threshold passed (e.g. 50px or fast velocity)
        const shouldDismiss = Math.abs(dy) > 50 || Math.abs(vy) > 0.35;

        if (shouldDismiss && typeof onDismissRef.current === 'function') {
          // Animate fly-off in direction of swipe
          const flyDirection = dy > 0 ? 360 : -360;
          setDismissState({
            slotIndex: currentSlot,
            dy: flyDirection,
            isDismissing: true
          });

          // Trigger onDismiss callback after fly-out animation
          setTimeout(() => {
            onDismissRef.current(currentSlot);
            setDismissState(null);
          }, 240);
        } else {
          // Snap back smoothly
          setDismissState(null);
        }
      } else if (tracksCount > 1) {
        // Horizontal drag finish: advance only if within linear queue bounds
        const shouldAdvance =
          Math.abs(dragDeltaRef.current) > 46 || Math.abs(pointerVelocityRef.current) > 0.42;

        const direction =
          pointerVelocityRef.current !== 0
            ? pointerVelocityRef.current < 0
              ? 1
              : -1
            : dragDeltaRef.current < 0
            ? 1
            : -1;

        if (shouldAdvance) {
          if (direction === 1 && virtualIndex < tracksCount - 1) {
            if (typeof onNextRef.current === 'function') {
              onNextRef.current();
            } else {
              move(1);
            }
          } else if (direction === -1 && virtualIndex > 0) {
            if (typeof onPrevRef.current === 'function') {
              onPrevRef.current();
            } else {
              move(-1);
            }
          }
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
    [move, tracksCount, virtualIndex]
  );

  // Visible slots around virtualIndex - strictly clamped to finite queue range [0, tracksCount - 1]
  const visibleSlots = useMemo(() => {
    if (tracksCount <= 0) return [];
    if (tracksCount === 1) return [0];

    const minSlot = Math.max(0, virtualIndex - actualRadius);
    const maxSlot = Math.min(tracksCount - 1, virtualIndex + actualRadius);
    const slots = [];
    for (let i = minSlot; i <= maxSlot; i++) {
      slots.push(i);
    }
    return slots;
  }, [virtualIndex, actualRadius, tracksCount]);

  // Compute CSS custom property values for any slot index
  const getOrbStyles = useCallback(
    (slotIndex, windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200) => {
      const d = slotIndex - virtualIndex;
      const abs = Math.abs(d);
      const spacing = Math.min(220, Math.max(135, windowWidth * 0.16));
      const x = d * spacing;

      // Consistent base size ensures zero width/height layout reflows during transitions
      const size = 'clamp(180px, min(28vw, 30vh), 320px)';

      let scale;
      let opacity;

      if (abs === 0) {
        scale = 1;
        opacity = 1;
      } else if (abs === 1) {
        scale = 0.62;
        opacity = 0.68;
      } else if (abs === 2) {
        scale = 0.4;
        opacity = 0.3;
      } else if (abs === 3) {
        scale = 0.26;
        opacity = 0.1;
      } else {
        scale = 0.16;
        opacity = 0;
      }

      const z = Math.max(0, 10 - abs);
      const depth = `${Math.max(-280, -abs * 85)}px`;
      const tilt = `${d * -3.5}deg`;

      const isThisDismissing = dismissState && dismissState.slotIndex === slotIndex;
      const dy = isThisDismissing ? dismissState.dy : 0;
      let finalOpacity = opacity;
      let finalScale = scale;

      if (isThisDismissing) {
        if (dismissState.isDismissing) {
          finalOpacity = 0;
          finalScale = scale * 0.65;
        } else {
          const fadeProgress = Math.min(1, Math.abs(dy) / 200);
          finalOpacity = Math.max(0.08, opacity * (1 - fadeProgress * 0.65));
          finalScale = scale * (1 - fadeProgress * 0.12);
        }
      }

      return {
        '--x': `${x}px`,
        '--drag-y': `${dy}px`,
        '--size': size,
        '--scale': finalScale,
        '--opacity': finalOpacity,
        '--z': isThisDismissing ? 20 : z,
        '--depth': depth,
        '--tilt': tilt,
        '--drag-x': `${dragX}px`,
        distance: d,
        absDistance: abs,
        isActive: d === 0,
        dismissDistance: dy,
        isDismissing: isThisDismissing ? Boolean(dismissState.isDismissing) : false,
        canDismiss: tracksCount > 1
      };
    },
    [virtualIndex, dragX, dismissState, tracksCount]
  );

  return {
    virtualIndex,
    current,
    visibleSlots,
    isPlaying,
    isDragging,
    dragX,
    dismissState,
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
