import { useState, useEffect } from 'react';
import './SignalLoader.css';

const DEFAULT_STAGES = [
  'Reading your playlist',
  'Finding the songs',
  'Detecting language & tuning voice',
  'Building your radio show',
  'Tuning the station'
];

export function SignalLoader({ currentStage = null }) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (currentStage) return; // Managed externally

    const timer = setInterval(() => {
      setStageIndex((prev) => (prev < DEFAULT_STAGES.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => clearInterval(timer);
  }, [currentStage]);

  const activeText = currentStage || DEFAULT_STAGES[stageIndex];

  return (
    <div className="signal-loader-screen">
      <div className="signal-loader-container">
        <div className="signal" aria-hidden="true">
          <span className="core" />
        </div>
        <div className="loading-copy" aria-live="polite">
          {activeText}
        </div>
      </div>
    </div>
  );
}
