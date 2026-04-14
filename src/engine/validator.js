/**
 * PDA Validation Engine
 * Validates PDA definitions before simulation.
 */

export function validatePDA(pda) {
  const errors = [];
  const warnings = [];

  const { states, inputAlphabet, stackAlphabet, initialStackSymbol, transitions, startState, acceptStates } = pda;
  const stateIds = states.map(s => s.id);
  const sigmaSet = new Set(inputAlphabet);
  const gammaSet = new Set(stackAlphabet);

  // 1. Must have at least one state
  if (stateIds.length === 0) {
    errors.push('PDA must have at least one state (Q is empty).');
  }

  // 2. Start state must exist
  if (!startState) {
    errors.push('No start state (q0) defined. Mark exactly one state as start.');
  } else if (!stateIds.includes(startState)) {
    errors.push(`Start state "${startState}" is not in Q.`);
  }

  // 3. Accept states must be in Q
  if (acceptStates) {
    acceptStates.forEach(f => {
      if (!stateIds.includes(f)) {
        errors.push(`Accept state "${f}" is not in Q.`);
      }
    });
  }

  // 4. initialStackSymbol must be in Γ
  if (!initialStackSymbol) {
    errors.push('Initial stack symbol (Z0) is not defined.');
  } else if (!gammaSet.has(initialStackSymbol)) {
    errors.push(`Initial stack symbol "${initialStackSymbol}" (Z0) is not in the stack alphabet Γ.`);
  }

  // 5. Validate transitions
  const transitionKeys = new Set();
  transitions.forEach((t, idx) => {
    const label = `Transition row ${idx + 1}`;

    if (!t.from || !stateIds.includes(t.from)) {
      errors.push(`${label}: From-state "${t.from}" is not in Q.`);
    }
    if (!t.to || !stateIds.includes(t.to)) {
      errors.push(`${label}: To-state "${t.to}" is not in Q.`);
    }
    if (t.input !== 'ε' && t.input !== '' && !sigmaSet.has(t.input)) {
      warnings.push(`${label}: Input symbol "${t.input}" is not in Σ (input alphabet).`);
    }
    if (!gammaSet.has(t.stackTop)) {
      warnings.push(`${label}: Stack-top symbol "${t.stackTop}" is not in Γ (stack alphabet).`);
    }
    // Validate push string: each character must be in Γ or it is ε
    if (t.push !== 'ε' && t.push !== '') {
      const pushSymbols = t.push.split('');
      pushSymbols.forEach(sym => {
        if (!gammaSet.has(sym)) {
          warnings.push(`${label}: Push string character "${sym}" is not in Γ.`);
        }
      });
    }

    // Duplicate detection
    const key = `${t.from}|${t.input}|${t.stackTop}|${t.to}|${t.push}`;
    if (transitionKeys.has(key)) {
      warnings.push(`Duplicate transition rule detected at row ${idx + 1}: (${t.from}, ${t.input}, ${t.stackTop}) → (${t.to}, ${t.push}).`);
    }
    transitionKeys.add(key);
  });

  // 6. DPDA conflict detection
  const dpda_map = {};
  transitions.forEach((t) => {
    const epsilonKey = `${t.from}|ε|${t.stackTop}`;
    const normalKey = `${t.from}|${t.input}|${t.stackTop}`;
    if (t.input !== 'ε' && t.input !== '') {
      if (!dpda_map[normalKey]) dpda_map[normalKey] = 0;
      dpda_map[normalKey]++;
    }
    if (t.input === 'ε' || t.input === '') {
      if (!dpda_map[epsilonKey]) dpda_map[epsilonKey] = 0;
      dpda_map[epsilonKey]++;
    }
  });

  // 7. Unreachable states warning
  if (startState && stateIds.includes(startState)) {
    const reachable = new Set([startState]);
    const queue = [startState];
    while (queue.length > 0) {
      const cur = queue.shift();
      transitions.filter(t => t.from === cur).forEach(t => {
        if (!reachable.has(t.to)) {
          reachable.add(t.to);
          queue.push(t.to);
        }
      });
    }
    stateIds.forEach(sid => {
      if (!reachable.has(sid)) {
        warnings.push(`State "${sid}" is unreachable from the start state.`);
      }
    });
  }

  return { errors, warnings, isValid: errors.length === 0 };
}

export function checkNDConflicts(transitions, mode) {
  // Returns list of conflicts for DPDA mode
  const conflicts = [];
  if (mode !== 'DPDA') return conflicts;

  const groupByStateAndTop = {};
  transitions.forEach(t => {
    const key = `${t.from}|${t.stackTop}`;
    if (!groupByStateAndTop[key]) groupByStateAndTop[key] = [];
    groupByStateAndTop[key].push(t);
  });

  Object.entries(groupByStateAndTop).forEach(([key, ts]) => {
    const hasEpsilon = ts.some(t => t.input === 'ε' || t.input === '');
    const hasNormal = ts.some(t => t.input !== 'ε' && t.input !== '');
    if (hasEpsilon && hasNormal) {
      const [state, stackTop] = key.split('|');
      conflicts.push(`Non-determinism conflict at state "${state}" with stack-top "${stackTop}": both ε-transition and input transitions exist.`);
    }
    // Check for multiple transitions on same (state, input, stackTop)
    const inputGroups = {};
    ts.forEach(t => {
      const ik = t.input || 'ε';
      if (!inputGroups[ik]) inputGroups[ik] = 0;
      inputGroups[ik]++;
    });
    Object.entries(inputGroups).forEach(([inp, count]) => {
      if (count > 1) {
        const [state, stackTop] = key.split('|');
        conflicts.push(`Non-determinism conflict: ${count} transitions defined for (${state}, ${inp}, ${stackTop}).`);
      }
    });
  });

  return conflicts;
}
