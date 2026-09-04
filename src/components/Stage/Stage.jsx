import { useState, useEffect } from 'react';
import { ShaderBackground } from '../ShaderBackground/ShaderBackground';
import './Stage.css';

export function Stage({ children, targetPalette, backgroundGradient }) {
  const [layers, setLayers] = useState({
    active: backgroundGradient,
    prev: null
  });

  useEffect(() => {
    if (backgroundGradient && backgroundGradient !== layers.active) {
      setLayers({
        active: backgroundGradient,
        prev: layers.active
      });

      const timer = setTimeout(() => {
        setLayers((curr) => ({
          ...curr,
          prev: null
        }));
      }, 1100);

      return () => clearTimeout(timer);
    }
  }, [backgroundGradient, layers.active]);

  return (
    <main className="stage" id="app">
      {layers.prev && (
        <div
          className="stage-ambient-gradient prev"
          style={{ backgroundImage: layers.prev }}
          aria-hidden="true"
        />
      )}
      <div
        className={`stage-ambient-gradient ${layers.prev ? 'fade-in' : ''}`}
        style={{ backgroundImage: layers.active || backgroundGradient }}
        aria-hidden="true"
      />
      <ShaderBackground targetPalette={targetPalette} />
      <div className="orbits" aria-hidden="true" />
      {children}
    </main>
  );
}

