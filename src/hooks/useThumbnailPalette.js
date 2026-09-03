import { useState, useEffect } from 'react';
import { extractColorsFromImage } from '../services/colorExtractionService';

export function useThumbnailPalette(currentTrack) {
  const [palette, setPalette] = useState({
    targetPalette: [0.56, 0.36, 0.24],
    gradient: 'radial-gradient(ellipse at 50% 38%, rgba(143, 92, 61, 0.28) 0%, rgba(85, 50, 35, 0.12) 50%, transparent 75%)',
    glow: 'rgba(143, 92, 61, 0.38)'
  });

  useEffect(() => {
    if (!currentTrack) return;

    const thumbnailUrl =
      currentTrack.thumbnail ||
      currentTrack.cover ||
      currentTrack.image ||
      (currentTrack.youtubeId
        ? `https://i.ytimg.com/vi/${currentTrack.youtubeId}/hqdefault.jpg`
        : null);

    let isCancelled = false;

    extractColorsFromImage(thumbnailUrl).then((extracted) => {
      if (!isCancelled && extracted) {
        setPalette({
          targetPalette: extracted.normalized,
          gradient: extracted.gradient,
          glow: extracted.glow
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.youtubeId, currentTrack?.thumbnail]);

  return palette;
}
