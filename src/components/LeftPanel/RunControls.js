import React, { useEffect, useRef } from 'react';
import { usePDA } from '../../context/PDAContext';

export default function RunControls() {
  const { state, dispatch } = usePDA();
  const { simulation } = state;
  const { result, currentStep, isPaused, speed } = simulation;
  const autoRunRef = useRef(null);

  const hasResult = !!result;
  const isAtEnd = hasResult && currentStep >= result.trace.length - 1;
  const isAtStart = currentStep === 0;

  const handleRunFull = () => {
    dispatch({ type: 'RESET_SIMULATION' });
    dispatch({ type: 'RUN_SIMULATION' });
  };

  const handleStepForward = () => {
    if (!hasResult) {
      dispatch({ type: 'RUN_SIMULATION' });
      setTimeout(() => dispatch({ type: 'JUMP_TO_STEP', payload: { step: 0 } }), 50);
    } else {
      dispatch({ type: 'STEP_FORWARD' });
    }
  };

  const handleStepBack = () => {
    dispatch({ type: 'STEP_BACK' });
  };

  const handleReset = () => {
    clearInterval(autoRunRef.current);
    dispatch({ type: 'RESET_SIMULATION' });
  };

  const handlePause = () => {
    dispatch({ type: 'SET_PAUSED', payload: { isPaused: !isPaused } });
  };

  // Auto-step mode
  const handleAutoStep = () => {
    if (!hasResult) {
      dispatch({ type: 'RUN_SIMULATION' });
    }
    dispatch({ type: 'SET_PAUSED', payload: { isPaused: false } });
  };

  useEffect(() => {
    if (!hasResult || isPaused) {
      clearInterval(autoRunRef.current);
      return;
    }
    // Auto-advance in play mode (when simulation is running and not paused)
    if (!isPaused && hasResult && !isAtEnd) {
      autoRunRef.current = setInterval(() => {
        dispatch({ type: 'STEP_FORWARD' });
      }, speed);
    }
    return () => clearInterval(autoRunRef.current);
  }, [hasResult, isPaused, isAtEnd, speed, dispatch]);

  const handleSpeedChange = (e) => {
    const val = parseInt(e.target.value, 10);
    // Invert: slider right = faster = lower delay
    const ms = 1200 - val;
    dispatch({ type: 'SET_SPEED', payload: { speed: Math.max(100, ms) } });
  };

  const sliderValue = 1200 - speed;

  return (
    <div className="section">
      <h3 className="section-title">
        <span className="section-icon">▶</span> Run Controls
      </h3>

      <div className="run-controls-grid">
        <button
          id="btn-run-full"
          className="btn btn-primary run-btn"
          onClick={handleRunFull}
          title="Run full simulation"
          aria-label="Run full simulation"
        >
          ▶ Run Full
        </button>

        <button
          id="btn-auto-step"
          className={`btn run-btn ${!isPaused && hasResult ? 'btn-accent' : 'btn-secondary'}`}
          onClick={!hasResult || isPaused ? handleAutoStep : handlePause}
          title={isPaused || !hasResult ? 'Play step-by-step animation' : 'Pause'}
          aria-label={isPaused || !hasResult ? 'Play animation' : 'Pause'}
        >
          {!isPaused && hasResult ? '⏸ Pause' : '▷ Play'}
        </button>

        <button
          id="btn-step-back"
          className="btn btn-secondary run-btn"
          onClick={handleStepBack}
          disabled={!hasResult || isAtStart}
          title="Step backward"
          aria-label="Step backward"
        >
          ◀ Step Back
        </button>

        <button
          id="btn-step-forward"
          className="btn btn-secondary run-btn"
          onClick={handleStepForward}
          disabled={hasResult && isAtEnd}
          title="Step forward"
          aria-label="Step forward"
        >
          Step Fwd ▶
        </button>

        <button
          id="btn-reset"
          className="btn btn-ghost run-btn"
          onClick={handleReset}
          title="Reset simulation"
          aria-label="Reset simulation"
        >
          ⟳ Reset
        </button>
      </div>

      <div className="speed-control">
        <label className="field-label" htmlFor="speed-slider">
          Speed
          <span className="speed-labels">
            <span>Slow</span>
            <span>Fast</span>
          </span>
        </label>
        <input
          id="speed-slider"
          type="range"
          min={100}
          max={1100}
          step={100}
          value={sliderValue}
          onChange={handleSpeedChange}
          className="speed-slider"
          aria-label="Simulation speed"
        />
      </div>

      {hasResult && (
        <div className="step-counter">
          Step {currentStep} / {result.trace.length - 1}
          <div className="step-progress-bar">
            <div
              className="step-progress-fill"
              style={{ width: `${(currentStep / Math.max(1, result.trace.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
