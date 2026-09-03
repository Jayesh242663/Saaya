/**
 * SAAYA Dynamic Artwork Color Extraction Service
 * Extracts vibrant dominant and secondary color palettes from song thumbnails/covers
 * to dynamically illuminate the WebGL ambient shader and background gradients.
 */

const paletteCache = new Map();

// Default fallback palette (warm ambient gold/copper)
const DEFAULT_PALETTE = {
  normalized: [0.56, 0.36, 0.24],
  primary: { r: 143, g: 92, b: 61 },
  secondary: { r: 85, g: 50, b: 35 },
  glow: 'rgba(143, 92, 61, 0.4)',
  gradient: 'radial-gradient(ellipse at 50% 38%, rgba(143, 92, 61, 0.28) 0%, rgba(85, 50, 35, 0.12) 50%, transparent 75%)'
};

/**
 * Extracts dominant and accent colors from an image URL using off-screen canvas
 */
export function extractColorsFromImage(imageUrl) {
  if (!imageUrl) return Promise.resolve(DEFAULT_PALETTE);
  if (paletteCache.has(imageUrl)) {
    return Promise.resolve(paletteCache.get(imageUrl));
  }

  // If running in SSR or headless environment without document
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(DEFAULT_PALETTE);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      resolve(DEFAULT_PALETTE);
    }, 2000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(DEFAULT_PALETTE);
          return;
        }

        // Downsample for speed and automatic color quantization
        const width = 32;
        const height = 24;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        const candidates = [];

        // Sample pixels, ignoring YouTube 4:3 letterbox margins and monochrome extreme pixels
        for (let y = 3; y < height - 3; y++) {
          for (let x = 3; x < width - 3; x++) {
            const idx = (y * width + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const a = imgData[idx + 3];

            if (a < 128) continue;

            // Exclude near-black letterbox bars and washed-out pure whites
            const brightness = (r + g + b) / 3;
            if (brightness < 28 || brightness > 240) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            const saturation = max === 0 ? 0 : delta / max;

            // Vibrant scoring prefers rich color over dull gray
            const score = saturation * 1.5 + (brightness / 255) * 0.5;

            candidates.push({ r, g, b, score, saturation, brightness });
          }
        }

        if (candidates.length === 0) {
          // If the image was very dark or monochromatic, sample all pixels
          let totalR = 0, totalG = 0, totalB = 0, count = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            totalR += imgData[i];
            totalG += imgData[i + 1];
            totalB += imgData[i + 2];
            count++;
          }
          const avgR = Math.round(totalR / count) || 120;
          const avgG = Math.round(totalG / count) || 80;
          const avgB = Math.round(totalB / count) || 60;
          const result = formatPalette({ r: avgR, g: avgG, b: avgB }, { r: Math.round(avgR * 0.7), g: Math.round(avgG * 0.7), b: Math.round(avgB * 0.7) });
          paletteCache.set(imageUrl, result);
          resolve(result);
          return;
        }

        // Sort candidates by vibrant score
        candidates.sort((a, b) => b.score - a.score);

        const primary = candidates[0];

        // Find a distinct secondary color that has some hue/distance from primary
        let secondary = candidates.find((c) => {
          const dist = Math.abs(c.r - primary.r) + Math.abs(c.g - primary.g) + Math.abs(c.b - primary.b);
          return dist > 60;
        }) || candidates[Math.min(candidates.length - 1, 5)] || primary;

        const result = formatPalette(primary, secondary);
        paletteCache.set(imageUrl, result);
        resolve(result);
      } catch (err) {
        console.warn('[ColorExtraction] Notice:', err.message);
        resolve(DEFAULT_PALETTE);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(DEFAULT_PALETTE);
    };

    img.src = imageUrl;
  });
}

function formatPalette(primary, secondary) {
  // Boost vibrancy slightly if color is too muted
  const pR = Math.min(255, Math.max(20, primary.r));
  const pG = Math.min(255, Math.max(20, primary.g));
  const pB = Math.min(255, Math.max(20, primary.b));

  const sR = Math.min(255, Math.max(15, secondary.r));
  const sG = Math.min(255, Math.max(15, secondary.g));
  const sB = Math.min(255, Math.max(15, secondary.b));

  return {
    normalized: [
      Number((pR / 255).toFixed(3)),
      Number((pG / 255).toFixed(3)),
      Number((pB / 255).toFixed(3))
    ],
    primary: { r: pR, g: pG, b: pB },
    secondary: { r: sR, g: sG, b: sB },
    glow: `rgba(${pR}, ${pG}, ${pB}, 0.38)`,
    gradient: `radial-gradient(ellipse at 50% 38%, rgba(${pR}, ${pG}, ${pB}, 0.28) 0%, rgba(${sR}, ${sG}, ${sB}, 0.12) 50%, transparent 75%)`
  };
}
