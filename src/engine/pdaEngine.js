/**
 * PDA Simulation Engine
 * 
 * Implements PDA simulation for both DPDA and NPDA modes.
 * Configuration: { state, remainingInput, stack[], stepHistory[], visitedEpsilon: Set, branchId, status }
 */

const MAX_BRANCHES = 100;
const MAX_STEPS = 10000;
const MAX_STACK_DEPTH = 500;

/**
 * Encode a configuration as a string for loop detection
 */
function encodeConfig(state, remainingInput, stack) {
  return `${state}|${remainingInput}|${stack.join(',')}`;
}

/**
 * Get all valid transitions for a given (state, inputSymbol, stackTop)
 * Checks both the actual input symbol and epsilon transitions.
 */
function getValidTransitions(state, inputSymbol, stackTop, transitions) {
  return transitions.filter(t => {
    const matchState = t.from === state;
    const matchStack = t.stackTop === stackTop;
    const matchInput = (t.input === inputSymbol) ||
      (t.input === 'ε' || t.input === '');
    return matchState && matchStack && matchInput;
  });
}

/**
 * Get transitions specifically consuming the input symbol (non-epsilon)
 */
function getNonEpsilonTransitions(state, inputSymbol, stackTop, transitions) {
  return transitions.filter(t =>
    t.from === state &&
    t.stackTop === stackTop &&
    t.input === inputSymbol &&
    t.input !== 'ε' &&
    t.input !== ''
  );
}

/**
 * Get epsilon transitions for a state/stackTop
 */
function getEpsilonTransitions(state, stackTop, transitions) {
  return transitions.filter(t =>
    t.from === state &&
    t.stackTop === stackTop &&
    (t.input === 'ε' || t.input === '')
  );
}

/**
 * Apply a transition to get the new stack
 * pop the stackTop, push the push string (left = new top)
 */
function applyTransition(stack, transition) {
  // Pop the top symbol
  const newStack = stack.slice(1);
  // Push the new symbols: push string leftmost character = new top of stack
  // e.g. push "AZ" means A goes on top, Z below it: result = [A, Z, ...rest]
  if (transition.push && transition.push !== 'ε' && transition.push !== '') {
    const pushSymbols = transition.push.split(''); // leftmost = new top
    return [...pushSymbols, ...newStack];
  }
  return newStack;
}

/**
 * Create a step record for the trace table
 */
function createStepRecord(step, state, inputRead, remainingInput, stack, action, branchId = null) {
  return {
    step,
    state,
    inputRead: inputRead === null ? '—' : (inputRead === '' ? 'ε' : inputRead),
    remainingInput: remainingInput === '' ? 'ε' : remainingInput,
    stack: stack.length === 0 ? [] : [...stack],
    stackStr: stack.length === 0 ? '∅' : stack.join(''),
    action,
    branchId,
  };
}

/**
 * Check acceptance based on mode
 */
function isAccepting(state, remainingInput, stack, acceptStates, acceptMode) {
  if (remainingInput !== '') return false;
  if (acceptMode === 'FINAL_STATE') {
    return acceptStates.includes(state);
  } else if (acceptMode === 'EMPTY_STACK') {
    return stack.length === 0;
  }
  return false;
}

/**
 * Determine rejection reason for a dead configuration
 */
function getRejectionReason(state, remainingInput, stack, transitions, acceptStates, acceptMode) {
  if (remainingInput === '') {
    if (acceptMode === 'FINAL_STATE') {
      if (!acceptStates.includes(state)) {
        return stack.length > 0
          ? `Input exhausted. Stack not empty (${stack.join('')}). Not in accept state "${state}".`
          : `All input consumed. State "${state}" is not an accept state.`;
      }
    } else if (acceptMode === 'EMPTY_STACK') {
      if (stack.length > 0) {
        return `Stack not empty at end of input. Stack: ${stack.join('')}`;
      }
    }
  }
  if (stack.length === 0) {
    return 'Stack underflow — stack is empty, no valid transition possible.';
  }
  const stackTop = stack[0];
  const inputSymbol = remainingInput.length > 0 ? remainingInput[0] : null;
  if (inputSymbol) {
    const ts = getValidTransitions(state, inputSymbol, stackTop, transitions);
    if (ts.length === 0) return `No valid transition for (${state}, ${inputSymbol}, ${stackTop}).`;
  } else {
    const eps = getEpsilonTransitions(state, stackTop, transitions);
    if (eps.length === 0) return `No valid transition for (${state}, ε, ${stackTop}).`;
  }
  return 'No valid transition available.';
}

// ─────────────────────────────────────────────────────────────
// MAIN SIMULATION FUNCTION
// ─────────────────────────────────────────────────────────────

/**
 * Run entire simulation and return full trace
 * Returns: { accepted, trace, finalConfig, branches, idChain, rejectionReason }
 */
export function runSimulation(pda, inputString) {
  const { mode, startState } = pda;
  const initialStack = [pda.initialStackSymbol];

  const trace = [];
  let globalStep = 0;

  // Initial configuration record
  trace.push(createStepRecord(
    globalStep++, startState, null, inputString, initialStack, 'Initial configuration', 'B0'
  ));

  if (mode === 'DPDA') {
    return runDPDA(pda, inputString, initialStack, trace, globalStep);
  } else {
    return runNPDA(pda, inputString, initialStack, trace, globalStep);
  }
}

// ─── DPDA ────────────────────────────────────────────────────

function runDPDA(pda, inputString, initialStack, trace, globalStep) {
  const { transitions, startState, acceptStates, acceptMode } = pda;

  let state = startState;
  let remaining = inputString;
  let stack = [...initialStack];
  const visitedEpsilon = new Set();
  let steps = 0;
  const idChain = [];

  idChain.push(`(${state}, ${remaining || 'ε'}, ${stack.join('') || '∅'})`);

  while (steps < MAX_STEPS) {
    steps++;
    if (stack.length === 0) {
      // Check if we can accept by empty stack
      if (remaining === '' && acceptMode === 'EMPTY_STACK') {
        return buildResult(true, trace, idChain, [], null, 'DPDA');
      }
      const reason = 'Stack underflow — stack is empty.';
      trace.push(createStepRecord(globalStep++, state, null, remaining, stack, `REJECTED: ${reason}`, 'B0'));
      return buildResult(false, trace, idChain, [], reason, 'DPDA');
    }

    const stackTop = stack[0];
    const inputSymbol = remaining.length > 0 ? remaining[0] : null;

    // Get all valid transitions (epsilon + current input)
    const epsilonTs = getEpsilonTransitions(state, stackTop, transitions);
    const inputTs = inputSymbol ? getNonEpsilonTransitions(state, inputSymbol, stackTop, transitions) : [];
    const allTs = [...epsilonTs, ...inputTs];

    // DPDA: must have exactly 0 or 1 valid transitions (no ε + input conflict)
    if (epsilonTs.length > 0 && inputTs.length > 0) {
      const reason = `Non-determinism conflict: both ε-transition and input transition exist for (${state}, ${inputSymbol}, ${stackTop}).`;
      trace.push(createStepRecord(globalStep++, state, null, remaining, stack, `ERROR: ${reason}`, 'B0'));
      return buildResult(false, trace, idChain, [], reason, 'DPDA');
    }
    if (allTs.length > 1) {
      const reason = `Non-determinism conflict: ${allTs.length} transitions available for (${state}, ${inputSymbol || 'ε'}, ${stackTop}).`;
      trace.push(createStepRecord(globalStep++, state, null, remaining, stack, `ERROR: ${reason}`, 'B0'));
      return buildResult(false, trace, idChain, [], reason, 'DPDA');
    }

    if (allTs.length === 0) {
      // Dead — check if currently accepting
      if (isAccepting(state, remaining, stack, acceptStates, acceptMode)) {
        idChain.push(`(${state}, ε, ${stack.join('') || '∅'})`);
        return buildResult(true, trace, idChain, [], null, 'DPDA');
      }
      const reason = getRejectionReason(state, remaining, stack, transitions, acceptStates, acceptMode);
      trace.push(createStepRecord(globalStep++, state, null, remaining, stack, `REJECTED: ${reason}`, 'B0'));
      return buildResult(false, trace, idChain, [], reason, 'DPDA');
    }

    const t = allTs[0];
    const isEpsilon = t.input === 'ε' || t.input === '';

    // Epsilon loop detection
    if (isEpsilon) {
      const configKey = encodeConfig(state, remaining, stack);
      if (visitedEpsilon.has(configKey)) {
        const reason = `Infinite epsilon loop detected at state "${state}".`;
        trace.push(createStepRecord(globalStep++, state, 'ε', remaining, stack, `ERROR: ${reason}`, 'B0'));
        return buildResult(false, trace, idChain, [], reason, 'DPDA');
      }
      visitedEpsilon.add(configKey);
    }

    // Apply transition
    const inputRead = isEpsilon ? 'ε' : inputSymbol;
    const newStack = applyTransition(stack, t);

    if (newStack.length > MAX_STACK_DEPTH) {
      const reason = `Stack depth limit exceeded (max ${MAX_STACK_DEPTH}).`;
      return buildResult(false, trace, idChain, [], reason, 'DPDA');
    }

    const pushDesc = t.push === 'ε' || t.push === '' ? 'ε (pop)' : `"${t.push}"`;
    const action = `δ(${state}, ${inputRead}, ${stackTop}) → (${t.to}, ${pushDesc})`;

    trace.push(createStepRecord(globalStep++, t.to, inputRead, isEpsilon ? remaining : remaining.slice(1), newStack, action, 'B0'));
    idChain.push(`(${t.to}, ${(isEpsilon ? remaining : remaining.slice(1)) || 'ε'}, ${newStack.join('') || '∅'})`);

    state = t.to;
    remaining = isEpsilon ? remaining : remaining.slice(1);
    stack = newStack;

    // Check acceptance after each step
    if (isAccepting(state, remaining, stack, acceptStates, acceptMode)) {
      return buildResult(true, trace, idChain, [], null, 'DPDA');
    }
  }

  const reason = `Maximum step count (${MAX_STEPS}) exceeded.`;
  return buildResult(false, trace, idChain, [], reason, 'DPDA');
}

// ─── NPDA (BFS) ──────────────────────────────────────────────

function runNPDA(pda, inputString, initialStack, trace, globalStep) {
  const { transitions, startState, acceptStates, acceptMode } = pda;

  // Branch: { state, remaining, stack, visitedEpsilon, branchId, history, idChain }
  let branches = [{
    state: startState,
    remaining: inputString,
    stack: [...initialStack],
    visitedEpsilon: new Set(),
    branchId: 'B0',
    branchIndex: 0,
    history: [{ state: startState, remaining: inputString, stack: [...initialStack] }],
    idChain: [`(${startState}, ${inputString || 'ε'}, ${initialStack.join('') || '∅'})`],
    status: 'active',
    rejectionReason: null,
  }];

  let branchCounter = 1;
  let totalSteps = 0;
  let acceptedBranch = null;

  // BFS over all active branches
  while (totalSteps < MAX_STEPS) {
    const activeBranches = branches.filter(b => b.status === 'active');
    if (activeBranches.length === 0) break;

    // Process one step per active branch
    const nextBranches = [];
    for (const branch of branches) {
      if (branch.status !== 'active') {
        nextBranches.push(branch);
        continue;
      }

      totalSteps++;
      const { state, remaining, stack } = branch;

      // Stack underflow check
      if (stack.length === 0) {
        if (remaining === '' && acceptMode === 'EMPTY_STACK') {
          branch.status = 'accepted';
          acceptedBranch = branch;
        } else {
          branch.status = 'rejected';
          branch.rejectionReason = 'Stack underflow.';
        }
        nextBranches.push(branch);
        continue;
      }

      const stackTop = stack[0];
      const inputSymbol = remaining.length > 0 ? remaining[0] : null;

      const epsilonTs = getEpsilonTransitions(state, stackTop, transitions);
      const inputTs = inputSymbol ? getNonEpsilonTransitions(state, inputSymbol, stackTop, transitions) : [];
      const allTs = [...epsilonTs, ...inputTs];

      if (allTs.length === 0) {
        // Dead branch
        if (isAccepting(state, remaining, stack, acceptStates, acceptMode)) {
          branch.status = 'accepted';
          acceptedBranch = branch;
        } else {
          branch.status = 'rejected';
          branch.rejectionReason = getRejectionReason(state, remaining, stack, transitions, acceptStates, acceptMode);
        }
        nextBranches.push(branch);
        continue;
      }

      // Check acceptance even with available transitions (can choose to stop)
      if (isAccepting(state, remaining, stack, acceptStates, acceptMode)) {
        branch.status = 'accepted';
        acceptedBranch = branch;
        nextBranches.push(branch);
        continue;
      }

      // Check per-transition for epsilon loops

      // For each transition, create a new branch (or reuse if only one)
      const transitionResults = [];
      for (const t of allTs) {
        const isEpsilon = t.input === 'ε' || t.input === '';

        if (isEpsilon) {
          const configKey = encodeConfig(state, remaining, stack);
          if (branch.visitedEpsilon.has(configKey)) {
            // Loop detected — skip this transition
            continue;
          }
        }

        const newStack = applyTransition(stack, t);
        if (newStack.length > MAX_STACK_DEPTH) continue;

        const newRemaining = isEpsilon ? remaining : remaining.slice(1);
        const inputRead = isEpsilon ? 'ε' : inputSymbol;
        const newVisited = new Set(branch.visitedEpsilon);

        if (isEpsilon) {
          newVisited.add(encodeConfig(state, remaining, stack));
        }

        transitionResults.push({
          t, newStack, newRemaining, inputRead, newVisited
        });
      }

      if (transitionResults.length === 0) {
        // All transitions were epsilon loops
        branch.status = 'rejected';
        branch.rejectionReason = `Infinite epsilon loop detected at state "${state}".`;
        nextBranches.push(branch);
        continue;
      }

      // First transition continues the current branch
      const first = transitionResults[0];
      branch.state = first.t.to;
      branch.remaining = first.newRemaining;
      branch.stack = first.newStack;
      branch.visitedEpsilon = first.newVisited;
      branch.idChain.push(`(${first.t.to}, ${first.newRemaining || 'ε'}, ${first.newStack.join('') || '∅'})`);
      nextBranches.push(branch);

      // Additional transitions spawn new branches
      for (let i = 1; i < transitionResults.length; i++) {
        if (branches.length + nextBranches.filter(b => b.status === 'active').length >= MAX_BRANCHES) break;
        const res = transitionResults[i];
        const newBranchId = `B${branchCounter++}`;
        const newBranch = {
          state: res.t.to,
          remaining: res.newRemaining,
          stack: res.newStack,
          visitedEpsilon: res.newVisited,
          branchId: newBranchId,
          branchIndex: branchCounter - 1,
          history: [...branch.history, { state: res.t.to, remaining: res.newRemaining, stack: res.newStack }],
          idChain: [...branch.idChain, `(${res.t.to}, ${res.newRemaining || 'ε'}, ${res.newStack.join('') || '∅'})`],
          status: 'active',
          rejectionReason: null,
        };
        nextBranches.push(newBranch);
      }
    }

    branches = nextBranches;
    if (acceptedBranch) break;
  }

  // Find accepted branch
  const accepted = branches.find(b => b.status === 'accepted');
  const accepted2 = acceptedBranch || accepted;

  // Build trace from first branch (B0)
  const b0 = branches.find(b => b.branchId === 'B0') || branches[0];

  // Build full trace steps from all branches (summarized)
  const fullTrace = [...trace];
  branches.forEach(b => {
    if (b.branchId !== 'B0') {
      fullTrace.push(createStepRecord(
        fullTrace.length, b.state, '—', b.remaining, b.stack,
        b.status === 'accepted'
          ? `Branch ${b.branchId}: ACCEPTED`
          : b.status === 'rejected'
            ? `Branch ${b.branchId}: REJECTED — ${b.rejectionReason}`
            : `Branch ${b.branchId}: active`,
        b.branchId
      ));
    }
  });

  const idChain = accepted2 ? accepted2.idChain : (b0 ? b0.idChain : []);
  const rejectionReason = !accepted2
    ? (branches.map(b => b.rejectionReason).filter(Boolean)[0] || 'No accepting path found.')
    : null;

  return buildResult(!!accepted2, fullTrace, idChain, branches, rejectionReason, 'NPDA');
}

function buildResult(accepted, trace, idChain, branches, rejectionReason, mode) {
  return {
    accepted,
    trace,
    idChain,
    branches,
    rejectionReason,
    mode,
  };
}

// ─────────────────────────────────────────────────────────────
// STEP-BY-STEP SIMULATION
// Returns a generator-like sequence for stepping
// ─────────────────────────────────────────────────────────────

/**
 * Build a complete step history for use with step forward/back.
 * Returns array of step states covering every configuration change.
 */
export function buildStepHistory(pda, inputString) {
  const result = runSimulation(pda, inputString);
  return result;
}

/**
 * Get all transitions taken in step i from a trace
 */
export function getTransitionAtStep(trace, step) {
  if (step <= 0 || step >= trace.length) return null;
  const row = trace[step];
  return row ? row.action : null;
}
