import React from 'react';
import { usePDA } from '../../context/PDAContext';

export default function TheoryPanel() {
  const { state, dispatch } = usePDA();
  const { pda, simulation, theoryPanelOpen } = state;
  const { states, inputAlphabet, stackAlphabet, initialStackSymbol, startState, acceptStates, transitions, mode, acceptMode } = pda;
  const { result, currentStep } = simulation;

  const curRow = result && result.trace[currentStep];

  return (
    <>
      <button
        className={`theory-toggle-btn ${theoryPanelOpen ? 'theory-toggle-open' : ''}`}
        onClick={() => dispatch({ type: 'TOGGLE_THEORY_PANEL' })}
        title="Toggle Theory Panel"
        aria-label="Toggle Theory Panel"
        aria-expanded={theoryPanelOpen}
      >
        {theoryPanelOpen ? '✕ Close' : '📖 Theory'}
      </button>

      {theoryPanelOpen && (
        <div className="theory-panel" role="complementary" aria-label="Theory Panel">
          <h3 className="theory-title">Formal Definition (7-Tuple)</h3>

          {curRow && (
            <div className="theory-current-id">
              <strong>Current ID:</strong>
              <code>({curRow.state}, {curRow.remainingInput}, {curRow.stackStr})</code>
            </div>
          )}

          <div className="theory-tuple">
            <div className="theory-line">
              <span className="theory-sym">M</span> = (Q, Σ, Γ, δ, q₀, Z₀, F)
            </div>
            <div className="theory-line">
              <span className="theory-sym">Q</span> = {'{'}{states.map(s => s.id).join(', ')}{'}'}
              &nbsp;<span className="theory-desc">— finite set of states</span>
            </div>
            <div className="theory-line">
              <span className="theory-sym">Σ</span> = {'{'}{inputAlphabet.join(', ')}{'}'}
              &nbsp;<span className="theory-desc">— input alphabet</span>
            </div>
            <div className="theory-line">
              <span className="theory-sym">Γ</span> = {'{'}{stackAlphabet.join(', ')}{'}'}
              &nbsp;<span className="theory-desc">— stack alphabet</span>
            </div>
            <div className="theory-line">
              <span className="theory-sym">δ</span>&nbsp;
              <span className="theory-desc">— transition function ({transitions.length} rules defined)</span>
            </div>
            <div className="theory-line">
              <span className="theory-sym">q₀</span> = {startState || '—'}
              &nbsp;<span className="theory-desc">— start state</span>
            </div>
            <div className="theory-line">
              <span className="theory-sym">Z₀</span> = {initialStackSymbol || '—'}
              &nbsp;<span className="theory-desc">— initial stack symbol</span>
            </div>
            <div className="theory-line">
              <span className="theory-sym">F</span> = {'{'}{acceptStates.join(', ')}{'}'}
              &nbsp;<span className="theory-desc">— accept states</span>
            </div>
          </div>

          <div className="theory-section">
            <h4>Acceptance Mode</h4>
            <p>
              {acceptMode === 'FINAL_STATE'
                ? 'By Final State: L(M) = { w | (q₀, w, Z₀) ⊢* (f, ε, α), f ∈ F }'
                : 'By Empty Stack: N(M) = { w | (q₀, w, Z₀) ⊢* (q, ε, ε) }'}
            </p>
          </div>

          <div className="theory-section">
            <h4>Automaton Type</h4>
            <p>
              {mode === 'DPDA'
                ? 'DPDA — Deterministic. For every (q, a, A): |δ(q, a, A)| ≤ 1 and no ε-conflicts.'
                : 'NPDA — Nondeterministic. Multiple transitions explored in parallel via BFS.'}
            </p>
          </div>

          <div className="theory-section">
            <h4>Move Relation (⊢)</h4>
            <p className="theory-mono">
              (q, aw, Aβ) ⊢ (p, w, γβ) &nbsp;if&nbsp; (p,γ) ∈ δ(q,a,A)<br />
              (q, w, Aβ) ⊢ (p, w, γβ) &nbsp;if&nbsp; (p,γ) ∈ δ(q,ε,A)
            </p>
          </div>

          <div className="theory-section">
            <h4>Quick Theory</h4>
            <ul className="theory-list">
              <li>A language is Context-Free ⟺ ∃ PDA M such that L = L(M).</li>
              <li>NPDAs are strictly more powerful than DPDAs.</li>
              <li>Epsilon (ε) moves don't consume input — only change stack/state.</li>
              <li>Epsilon loop: if (q, w, α) is revisited via ε-moves only → reject that branch.</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
