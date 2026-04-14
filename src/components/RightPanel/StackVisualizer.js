import React from 'react';
import { usePDA } from '../../context/PDAContext';

function StackCell({ symbol, status, z0Symbol, animKey }) {
  const isZ0 = symbol === z0Symbol;
  let cellClass = 'stack-cell';
  if (status === 'push') cellClass += ' stack-push';
  else if (status === 'pop') cellClass += ' stack-pop';
  else if (isZ0) cellClass += ' stack-z0';
  else cellClass += ' stack-unchanged';

  const labelClass = isZ0 ? 'stack-sym-z0' : '';

  return (
    <div className={cellClass} key={animKey}>
      <span className={`stack-sym ${labelClass}`}>{symbol}</span>
    </div>
  );
}

export default function StackVisualizer() {
  const { state } = usePDA();
  const { simulation, pda } = state;
  const { result, currentStep } = simulation;
  const { initialStackSymbol } = pda;


  // Determine current and previous stacks
  let currentStack = [initialStackSymbol];
  let prevStack = [initialStackSymbol];

  if (result && result.trace) {
    const cur = result.trace[currentStep];
    const prev = result.trace[Math.max(0, currentStep - 1)];
    currentStack = cur ? cur.stack : [];
    prevStack = prev ? prev.stack : [initialStackSymbol];
  }

  // NPDA branches
  const isNPDA = pda.mode === 'NPDA';
  const branches = (result && result.branches && result.branches.length > 1)
    ? result.branches.slice(0, 6) // Show max 6 branches
    : null;

  // Determine symbol statuses
  function getSymbolStatuses(cur, prev) {
    const prevSet = [...prev];
    const curSet = [...cur];

    // Detect push: new symbol at top that wasn't there before
    const statuses = curSet.map((sym, i) => {
      if (i === 0 && curSet.length > prevSet.length) return 'push';
      if (i === 0 && curSet.length < prevSet.length) return 'unchanged'; // after pop
      return 'unchanged';
    });

    // Detect pop: if stack shrank, mark animation on previous top
    // (handled by CSS transition — previous stack cell disappears)
    return statuses;
  }

  const statuses = getSymbolStatuses(currentStack, prevStack);

  const depth = currentStack.length;

  const renderStack = (stack, label) => (
    <div className="stack-column">
      {label && <div className="branch-label">{label}</div>}
      <div className="stack-depth-badge">Depth: {stack.length}</div>
      <div className="stack-container">
        {stack.length === 0 ? (
          <div className="stack-empty">∅ Empty</div>
        ) : (
          stack.map((sym, i) => {
            const status = label ? 'unchanged' : statuses[i];
            return (
              <StackCell
                key={`${i}-${sym}`}
                symbol={sym}
                status={status}
                z0Symbol={initialStackSymbol}
                animKey={`${i}-${sym}-${currentStep}`}
              />
            );
          })
        )}
      </div>
      <div className="stack-bottom-label">Bottom ↑</div>
    </div>
  );

  return (
    <div className="right-panel">
      <div className="panel-header">
        <h2 className="panel-title">Stack Visualizer</h2>
        {!isNPDA && (
          <div className="stack-depth-counter">
            Stack Depth: <strong>{depth}</strong>
          </div>
        )}
      </div>

      <div className="stack-legend">
        <span className="legend-chip chip-push">Push</span>
        <span className="legend-chip chip-pop">Pop</span>
        <span className="legend-chip chip-unchanged">Unchanged</span>
        <span className="legend-chip chip-z0">Z₀</span>
      </div>

      {isNPDA && branches ? (
        <div className="npda-branches">
          {branches.map((branch, i) => {
            const branchStack = branch.stack || [];
            return renderStack(branchStack, `Branch ${i + 1} (${branch.branchId})`);
          })}
        </div>
      ) : (
        renderStack(currentStack, null)
      )}

      {/* Current config display */}
      {result && result.trace[currentStep] && (
        <div className="config-display">
          <div className="config-label">Current ID:</div>
          <div className="config-value">
            ({result.trace[currentStep].state}, {result.trace[currentStep].remainingInput}, {result.trace[currentStep].stackStr})
          </div>
        </div>
      )}
    </div>
  );
}
