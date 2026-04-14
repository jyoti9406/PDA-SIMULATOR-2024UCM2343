import React from 'react';
import { usePDA } from '../../context/PDAContext';
import { getPresetNames } from '../../engine/presets';

const presets = getPresetNames();

export default function ModeToggles() {
  const { state, dispatch } = usePDA();
  const { mode, acceptMode } = state.pda;

  const handleMode = (m) => dispatch({ type: 'SET_MODE', payload: { mode: m } });
  const handleAcceptMode = (am) => dispatch({ type: 'SET_ACCEPT_MODE', payload: { acceptMode: am } });
  const handlePreset = (e) => {
    const key = e.target.value;
    if (!key) return;
    dispatch({ type: 'LOAD_PRESET', payload: { key } });
    e.target.value = '';
  };

  return (
    <div className="section">
      <h3 className="section-title">
        <span className="section-icon">⚙</span> Settings & Presets
      </h3>

      <div className="toggle-group">
        <label className="toggle-label">Automaton Type</label>
        <div className="toggle-row" role="radiogroup" aria-label="Automaton type">
          <button
            className={`toggle-btn ${mode === 'DPDA' ? 'toggle-active' : ''}`}
            onClick={() => handleMode('DPDA')}
            role="radio"
            aria-checked={mode === 'DPDA'}
            id="toggle-dpda"
          >
            DPDA
          </button>
          <button
            className={`toggle-btn ${mode === 'NPDA' ? 'toggle-active' : ''}`}
            onClick={() => handleMode('NPDA')}
            role="radio"
            aria-checked={mode === 'NPDA'}
            id="toggle-npda"
          >
            NPDA
          </button>
        </div>
        <p className="toggle-desc">
          {mode === 'DPDA'
            ? 'Deterministic: exactly one transition per (state, input, stack-top).'
            : 'Nondeterministic: multiple parallel computation paths explored (BFS).'}
        </p>
      </div>

      <div className="toggle-group">
        <label className="toggle-label">Acceptance Criterion</label>
        <div className="toggle-row" role="radiogroup" aria-label="Acceptance mode">
          <button
            className={`toggle-btn ${acceptMode === 'FINAL_STATE' ? 'toggle-active' : ''}`}
            onClick={() => handleAcceptMode('FINAL_STATE')}
            role="radio"
            aria-checked={acceptMode === 'FINAL_STATE'}
            id="toggle-final-state"
          >
            Final State
          </button>
          <button
            className={`toggle-btn ${acceptMode === 'EMPTY_STACK' ? 'toggle-active' : ''}`}
            onClick={() => handleAcceptMode('EMPTY_STACK')}
            role="radio"
            aria-checked={acceptMode === 'EMPTY_STACK'}
            id="toggle-empty-stack"
          >
            Empty Stack
          </button>
        </div>
        <p className="toggle-desc">
          {acceptMode === 'FINAL_STATE'
            ? 'Accept when all input consumed and state ∈ F.'
            : 'Accept when all input consumed and stack is empty.'}
        </p>
      </div>

      <div className="toggle-group">
        <label className="toggle-label" htmlFor="preset-select">Load Preset Example</label>
        <select
          id="preset-select"
          className="preset-select"
          onChange={handlePreset}
          defaultValue=""
          aria-label="Load preset PDA"
        >
          <option value="">— Choose a preset —</option>
          {presets.map(p => (
            <option key={p.key} value={p.key}>{p.name}</option>
          ))}
        </select>
        <p className="toggle-desc">Presets load example PDAs with test strings pre-filled.</p>
      </div>
    </div>
  );
}
