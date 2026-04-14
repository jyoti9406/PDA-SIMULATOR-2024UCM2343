import React, { useRef, useEffect } from 'react';
import { usePDA } from '../../context/PDAContext';

export default function TraceTable() {
  const { state, dispatch } = usePDA();
  const { simulation } = state;
  const { result, currentStep } = simulation;
  const tableRef = useRef(null);

  // Auto-scroll to current step row
  useEffect(() => {
    if (!tableRef.current) return;
    const activeRow = tableRef.current.querySelector('.trace-row-active');
    if (activeRow) {
      activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentStep]);

  if (!result) {
    return (
      <div className="bottom-panel">
        <div className="trace-empty">
          <p>Run the simulation to see the step-by-step trace.</p>
        </div>
      </div>
    );
  }

  const { trace, idChain, accepted, rejectionReason } = result;

  const handleRowClick = (step) => {
    dispatch({ type: 'JUMP_TO_STEP', payload: { step } });
  };

  return (
    <div className="bottom-panel">
      {/* Verdict Banner */}
      {result && (
        <div className={`verdict-banner ${accepted ? 'verdict-accept' : 'verdict-reject'}`}>
          {accepted
            ? '✓ STRING ACCEPTED'
            : `✗ STRING REJECTED — ${rejectionReason || 'No accepting path found.'}`}
        </div>
      )}

      <div className="trace-container" ref={tableRef}>
        <table className="trace-table" aria-label="Simulation trace">
          <thead>
            <tr>
              <th>Step</th>
              <th>State</th>
              <th>Input Read</th>
              <th>Remaining Input</th>
              <th>Stack (top→bottom)</th>
              <th>Action Taken</th>
            </tr>
          </thead>
          <tbody>
            {trace.map((row, i) => (
              <tr
                key={i}
                className={`trace-row ${i === currentStep ? 'trace-row-active' : ''}`}
                onClick={() => handleRowClick(i)}
                style={{ cursor: 'pointer' }}
                aria-label={`Trace step ${row.step}`}
                aria-current={i === currentStep ? 'true' : undefined}
              >
                <td className="trace-step">{row.step}</td>
                <td className="trace-state">
                  <span className={`state-chip ${
                    i === trace.length - 1 && accepted ? 'state-chip-accept' :
                    i === trace.length - 1 && !accepted ? 'state-chip-reject' : ''
                  }`}>
                    {row.state}
                  </span>
                </td>
                <td className="trace-input-read">
                  {row.inputRead === 'ε' || row.inputRead === '—'
                    ? <span className="epsilon-cell">{row.inputRead}</span>
                    : row.inputRead}
                </td>
                <td className="trace-remaining">
                  {row.remainingInput === 'ε'
                    ? <span className="epsilon-cell">ε</span>
                    : row.remainingInput}
                </td>
                <td className="trace-stack">
                  <code>{row.stackStr || (row.stack && row.stack.join('')) || '∅'}</code>
                </td>
                <td className="trace-action">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ID Chain */}
      {idChain && idChain.length > 0 && (
        <div className="id-chain-section">
          <h4 className="id-chain-title">Computation ID Chain:</h4>
          <div className="id-chain-text">
            {idChain.join(' ⊢ ')}
          </div>
        </div>
      )}
    </div>
  );
}
