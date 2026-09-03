import { ShaderBackground } from '../ShaderBackground/ShaderBackground';
import './Stage.css';

export function Stage({ children, targetPalette, backgroundGradient }) {
  return (
    <main className="stage" id="app">
      <div
        className="stage-ambient-gradient"
        style={{ backgroundImage: backgroundGradient }}
        aria-hidden="true"
      />
      <ShaderBackground targetPalette={targetPalette} />
      <div className="orbits" aria-hidden="true" />
      {children}
    </main>
  );
}

