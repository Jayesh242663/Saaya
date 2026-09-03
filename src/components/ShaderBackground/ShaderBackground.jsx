import { useEffect, useRef } from 'react';
import { createShaderProgram, resizeShaderCanvas } from './shaderProgram';
import './ShaderBackground.css';

export function ShaderBackground({ targetPalette = [0.56, 0.36, 0.24] }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    gl: null,
    handles: null,
    targetPalette: [0.56, 0.36, 0.24],
    currentPalette: [0.56, 0.36, 0.24],
    rafId: 0
  });

  // Keep target palette updated
  useEffect(() => {
    if (targetPalette && targetPalette.length === 3) {
      stateRef.current.targetPalette = targetPalette;
    }
  }, [targetPalette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) return;

    const handles = createShaderProgram(gl);
    if (!handles) return;

    stateRef.current.gl = gl;
    stateRef.current.handles = handles;

    const handleResize = () => {
      resizeShaderCanvas(gl, canvas);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const renderLoop = (time) => {
      const { currentPalette, targetPalette, handles, gl } = stateRef.current;

      // Smooth palette transition (lerp)
      for (let i = 0; i < 3; i++) {
        currentPalette[i] += (targetPalette[i] - currentPalette[i]) * 0.025;
      }

      gl.useProgram(handles.program);
      gl.uniform1f(handles.timeLoc, time * 0.001);
      gl.uniform2f(handles.resLoc, canvas.width, canvas.height);
      gl.uniform3fv(handles.paletteLoc, currentPalette);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      stateRef.current.rafId = requestAnimationFrame(renderLoop);
    };

    stateRef.current.rafId = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (stateRef.current.rafId) {
        cancelAnimationFrame(stateRef.current.rafId);
      }
    };
  }, []);

  return <canvas ref={canvasRef} id="shaderCanvas" aria-hidden="true" className="shader-canvas" />;
}
