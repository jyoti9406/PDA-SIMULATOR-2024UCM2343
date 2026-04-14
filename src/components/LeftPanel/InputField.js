import React from 'react';
import { usePDA } from '../../context/PDAContext';

export default function InputField() {
  const { state, dispatch } = usePDA();
  const { inputAlphabet } = state.pda;
  const { inputString } = state;

  const sigmaSet = new Set(inputAlphabet);
  const invalidChars = inputString.split('').filter(c => !sigmaSet.has(c));
  const isValid = invalidChars.length === 0;

  const handleChange = (e) => {
    dispatch({ type: 'SET_INPUT_STRING', payload: { inputString: e.target.value } });
  };

  const handleClear = () => {
    dispatch({ type: 'SET_INPUT_STRING', payload: { inputString: '' } });
  };

  return (
    <div className="section">
      <h3 className="section-title">
        <span className="section-icon">w</span> Input String
      </h3>

      <div className="input-field-row">
        <input
          id="input-string-field"
          className={`text-input input-string-box ${!isValid && inputString ? 'input-error' : ''}`}
          value={inputString}
          onChange={handleChange}
          placeholder='Enter input (e.g. "aabb") or leave empty for ε'
          aria-label="Input string for PDA simulation"
          spellCheck={false}
          autoComplete="off"
        />
        {inputString && (
          <button className="btn-icon" onClick={handleClear} title="Clear input" aria-label="Clear input string">
            ✕
          </button>
        )}
      </div>

      <div className="input-meta">
        <span className="input-length">Length: {inputString.length}</span>
        {inputString === '' && (
          <span className="epsilon-badge">ε (empty string)</span>
        )}
      </div>

      {!isValid && inputString && (
        <p className="field-error">
          ⚠ Invalid symbol(s): [{[...new Set(invalidChars)].join(', ')}] — not in Σ {'{' + inputAlphabet.join(', ') + '}'}
        </p>
      )}
      {isValid && inputString && (
        <p className="field-ok">✓ All symbols are in Σ</p>
      )}
    </div>
  );
}
