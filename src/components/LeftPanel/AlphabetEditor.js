import React from 'react';
import { usePDA } from '../../context/PDAContext';

function parseSymbols(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

export default function AlphabetEditor() {
  const { state, dispatch } = usePDA();
  const { inputAlphabet, stackAlphabet, initialStackSymbol } = state.pda;

  const z0Valid = stackAlphabet.includes(initialStackSymbol);

  const handleInputAlphabet = (e) => {
    const syms = parseSymbols(e.target.value);
    dispatch({ type: 'SET_INPUT_ALPHABET', payload: { symbols: syms } });
  };

  const handleStackAlphabet = (e) => {
    const syms = parseSymbols(e.target.value);
    dispatch({ type: 'SET_STACK_ALPHABET', payload: { symbols: syms } });
  };

  const handleZ0 = (e) => {
    dispatch({ type: 'SET_INITIAL_STACK_SYMBOL', payload: { symbol: e.target.value.trim() } });
  };

  return (
    <div className="section">
      <h3 className="section-title">
        <span className="section-icon">∑</span> Alphabet Definition
      </h3>

      <div className="field-group">
        <label className="field-label">
          Input Alphabet (Σ)
          <span className="field-hint">— comma-separated symbols</span>
        </label>
        <input
          className="text-input"
          value={inputAlphabet.join(', ')}
          onChange={handleInputAlphabet}
          placeholder="e.g. a, b"
          aria-label="Input alphabet sigma"
        />
        <div className="symbol-chips">
          {inputAlphabet.map(s => (
            <span key={s} className="chip chip-sigma">{s}</span>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">
          Stack Alphabet (Γ)
          <span className="field-hint">— comma-separated symbols</span>
        </label>
        <input
          className="text-input"
          value={stackAlphabet.join(', ')}
          onChange={handleStackAlphabet}
          placeholder="e.g. A, Z"
          aria-label="Stack alphabet gamma"
        />
        <div className="symbol-chips">
          {stackAlphabet.map(s => (
            <span key={s} className={`chip ${s === initialStackSymbol ? 'chip-z0' : 'chip-gamma'}`}>{s}</span>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">
          Initial Stack Symbol (Z₀)
          <span className="field-hint">— must be in Γ</span>
        </label>
        <input
          className={`text-input ${!z0Valid && initialStackSymbol ? 'input-error' : z0Valid ? 'input-valid' : ''}`}
          value={initialStackSymbol}
          onChange={handleZ0}
          placeholder="e.g. Z"
          maxLength={4}
          aria-label="Initial stack symbol Z0"
        />
        {!z0Valid && initialStackSymbol && (
          <p className="field-error">⚠ Z₀ "{initialStackSymbol}" is not in Γ!</p>
        )}
        {z0Valid && initialStackSymbol && (
          <p className="field-ok">✓ Z₀ is valid</p>
        )}
      </div>
    </div>
  );
}
