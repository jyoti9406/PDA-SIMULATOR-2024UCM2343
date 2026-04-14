import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { buildStepHistory } from '../engine/pdaEngine';
import { validatePDA, checkNDConflicts } from '../engine/validator';
import { PRESETS } from '../engine/presets';

// ─── Initial State ────────────────────────────────────────────

const initialPDA = {
  states: [
    { id: 'q0', isStart: true, isAccept: false },
    { id: 'q1', isStart: false, isAccept: false },
    { id: 'q2', isStart: false, isAccept: true },
  ],
  inputAlphabet: ['a', 'b'],
  stackAlphabet: ['A', 'Z'],
  initialStackSymbol: 'Z',
  startState: 'q0',
  acceptStates: ['q2'],
  transitions: [
    { id: 't0', from: 'q0', input: 'a', stackTop: 'Z', to: 'q0', push: 'AZ' },
    { id: 't1', from: 'q0', input: 'a', stackTop: 'A', to: 'q0', push: 'AA' },
    { id: 't2', from: 'q0', input: 'b', stackTop: 'A', to: 'q1', push: 'ε' },
    { id: 't3', from: 'q1', input: 'b', stackTop: 'A', to: 'q1', push: 'ε' },
    { id: 't4', from: 'q1', input: 'ε', stackTop: 'Z', to: 'q2', push: 'Z' },
  ],
  mode: 'DPDA',
  acceptMode: 'FINAL_STATE',
};

const initialSimulation = {
  isRunning: false,
  isPaused: false,
  currentStep: 0,
  result: null,       // { accepted, trace, idChain, branches, rejectionReason }
  activeStates: [],
  activeTransition: null,
  speed: 600,         // ms per step
};

const initialState = {
  pda: initialPDA,
  inputString: 'aabb',
  simulation: initialSimulation,
  notifications: [],
  validationResult: null,
  ndConflicts: [],
  theoryPanelOpen: false,
  nodePositions: {},  // { stateId: { x, y } }
};

// ─── Reducer ──────────────────────────────────────────────────

let notifId = 0;
let transitionId = 100;

function pdaReducer(state, action) {
  switch (action.type) {

    // ── PDA Definition ──────────────────────────────
    case 'ADD_STATE': {
      const id = action.payload.id;
      if (state.pda.states.find(s => s.id === id)) {
        return addNotification(state, `State "${id}" already exists.`, 'error');
      }
      const newState = { id, isStart: false, isAccept: false };
      return { ...state, pda: { ...state.pda, states: [...state.pda.states, newState] } };
    }

    case 'DELETE_STATE': {
      const id = action.payload.id;
      if (state.pda.startState === id) {
        return addNotification(state, `Cannot delete start state "${id}". Reassign start state first.`, 'error');
      }
      const newStates = state.pda.states.filter(s => s.id !== id);
      const newTransitions = state.pda.transitions.filter(t => t.from !== id && t.to !== id);
      const newAcceptStates = state.pda.acceptStates.filter(s => s !== id);
      return {
        ...state,
        pda: {
          ...state.pda,
          states: newStates,
          transitions: newTransitions,
          acceptStates: newAcceptStates,
        },
      };
    }

    case 'SET_START_STATE': {
      const id = action.payload.id;
      return {
        ...state,
        pda: {
          ...state.pda,
          startState: id,
          states: state.pda.states.map(s => ({ ...s, isStart: s.id === id })),
        },
      };
    }

    case 'TOGGLE_ACCEPT_STATE': {
      const id = action.payload.id;
      const isCurrentlyAccept = state.pda.acceptStates.includes(id);
      const newAcceptStates = isCurrentlyAccept
        ? state.pda.acceptStates.filter(s => s !== id)
        : [...state.pda.acceptStates, id];
      return {
        ...state,
        pda: {
          ...state.pda,
          acceptStates: newAcceptStates,
          states: state.pda.states.map(s => ({ ...s, isAccept: newAcceptStates.includes(s.id) })),
        },
      };
    }

    case 'SET_INPUT_ALPHABET': {
      const syms = action.payload.symbols;
      return { ...state, pda: { ...state.pda, inputAlphabet: syms } };
    }

    case 'SET_STACK_ALPHABET': {
      const syms = action.payload.symbols;
      return { ...state, pda: { ...state.pda, stackAlphabet: syms } };
    }

    case 'SET_INITIAL_STACK_SYMBOL': {
      return { ...state, pda: { ...state.pda, initialStackSymbol: action.payload.symbol } };
    }

    case 'ADD_TRANSITION': {
      const t = { ...action.payload, id: `t${transitionId++}` };
      return { ...state, pda: { ...state.pda, transitions: [...state.pda.transitions, t] } };
    }

    case 'UPDATE_TRANSITION': {
      const { id, field, value } = action.payload;
      const updated = state.pda.transitions.map(t =>
        t.id === id ? { ...t, [field]: value } : t
      );
      return { ...state, pda: { ...state.pda, transitions: updated } };
    }

    case 'DELETE_TRANSITION': {
      return {
        ...state,
        pda: { ...state.pda, transitions: state.pda.transitions.filter(t => t.id !== action.payload.id) },
      };
    }

    case 'SET_MODE': {
      return { ...state, pda: { ...state.pda, mode: action.payload.mode } };
    }

    case 'SET_ACCEPT_MODE': {
      return { ...state, pda: { ...state.pda, acceptMode: action.payload.acceptMode } };
    }

    // ── Input String ──────────────────────────────────
    case 'SET_INPUT_STRING': {
      return { ...state, inputString: action.payload.inputString };
    }

    // ── Simulation ────────────────────────────────────
    case 'RUN_SIMULATION': {
      const validation = validatePDA(state.pda);
      if (!validation.isValid) {
        return addNotification(
          { ...state, simulation: { ...initialSimulation } },
          'Cannot run: ' + validation.errors[0],
          'error'
        );
      }
      const result = buildStepHistory(state.pda, state.inputString);
      return {
        ...state,
        simulation: {
          ...initialSimulation,
          result,
          currentStep: result.trace.length - 1,
          isRunning: false,
          activeStates: result.trace.length > 0
            ? [result.trace[result.trace.length - 1].state]
            : [state.pda.startState],
        },
      };
    }

    case 'STEP_FORWARD': {
      const { result, currentStep } = state.simulation;
      if (!result) return state;
      const next = Math.min(currentStep + 1, result.trace.length - 1);
      const row = result.trace[next];
      return {
        ...state,
        simulation: {
          ...state.simulation,
          currentStep: next,
          activeStates: row ? [row.state] : state.simulation.activeStates,
          activeTransition: row ? row.action : null,
        },
      };
    }

    case 'STEP_BACK': {
      const { result, currentStep } = state.simulation;
      if (!result) return state;
      const prev = Math.max(currentStep - 1, 0);
      const row = result.trace[prev];
      return {
        ...state,
        simulation: {
          ...state.simulation,
          currentStep: prev,
          activeStates: row ? [row.state] : state.simulation.activeStates,
          activeTransition: null,
        },
      };
    }

    case 'JUMP_TO_STEP': {
      const { result } = state.simulation;
      if (!result) return state;
      const step = Math.max(0, Math.min(action.payload.step, result.trace.length - 1));
      const row = result.trace[step];
      return {
        ...state,
        simulation: {
          ...state.simulation,
          currentStep: step,
          activeStates: row ? [row.state] : state.simulation.activeStates,
          activeTransition: row ? row.action : null,
        },
      };
    }

    case 'RESET_SIMULATION': {
      return {
        ...state,
        simulation: {
          ...initialSimulation,
          speed: state.simulation.speed,
        },
      };
    }

    case 'SET_SPEED': {
      return { ...state, simulation: { ...state.simulation, speed: action.payload.speed } };
    }

    case 'SET_PAUSED': {
      return { ...state, simulation: { ...state.simulation, isPaused: action.payload.isPaused } };
    }

    // ── Preset Loading ─────────────────────────────────
    case 'LOAD_PRESET': {
      const preset = PRESETS[action.payload.key];
      if (!preset) return state;
      let tid = 0;
      return {
        ...state,
        pda: {
          states: preset.states,
          inputAlphabet: preset.inputAlphabet,
          stackAlphabet: preset.stackAlphabet,
          initialStackSymbol: preset.initialStackSymbol,
          startState: preset.states.find(s => s.isStart)?.id || preset.states[0]?.id,
          acceptStates: preset.states.filter(s => s.isAccept).map(s => s.id),
          transitions: preset.transitions.map(t => ({ ...t, id: `t${tid++}` })),
          mode: preset.mode || 'DPDA',
          acceptMode: preset.acceptMode || 'FINAL_STATE',
        },
        inputString: preset.testStrings?.[0]?.input || '',
        simulation: { ...initialSimulation, speed: state.simulation.speed },
        nodePositions: {},
      };
    }

    // ── Validation ─────────────────────────────────────
    case 'SET_VALIDATION': {
      return { ...state, validationResult: action.payload.result, ndConflicts: action.payload.conflicts || [] };
    }

    // ── Node Positions ─────────────────────────────────
    case 'SET_NODE_POSITION': {
      return {
        ...state,
        nodePositions: {
          ...state.nodePositions,
          [action.payload.id]: { x: action.payload.x, y: action.payload.y },
        },
      };
    }

    case 'SET_NODE_POSITIONS': {
      return { ...state, nodePositions: action.payload.positions };
    }

    // ── Import PDA ─────────────────────────────────────
    case 'IMPORT_PDA': {
      const imp = action.payload.pda;
      let tid = 0;
      const newPda = {
        ...imp,
        transitions: (imp.transitions || []).map(t => ({ ...t, id: `t${tid++}` })),
        startState: imp.startState || imp.states?.find(s => s.isStart)?.id || '',
        acceptStates: imp.acceptStates || imp.states?.filter(s => s.isAccept).map(s => s.id) || [],
      };
      return {
        ...state,
        pda: newPda,
        simulation: { ...initialSimulation, speed: state.simulation.speed },
        nodePositions: {},
      };
    }

    // ── Notifications ──────────────────────────────────
    case 'ADD_NOTIFICATION': {
      return addNotification(state, action.payload.message, action.payload.level);
    }

    case 'DISMISS_NOTIFICATION': {
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload.id),
      };
    }

    case 'CLEAR_NOTIFICATIONS': {
      return { ...state, notifications: [] };
    }

    // ── Theory Panel ───────────────────────────────────
    case 'TOGGLE_THEORY_PANEL': {
      return { ...state, theoryPanelOpen: !state.theoryPanelOpen };
    }

    default:
      return state;
  }
}

function addNotification(state, message, level = 'info') {
  const n = { id: notifId++, message, level, timestamp: Date.now() };
  return { ...state, notifications: [...state.notifications.slice(-9), n] };
}

// ─── Context ──────────────────────────────────────────────────

const PDAContext = createContext(null);

export function PDAProvider({ children }) {
  const [state, dispatch] = useReducer(pdaReducer, initialState);

  // Validate whenever PDA changes
  const validate = useCallback((pda) => {
    const result = validatePDA(pda);
    const conflicts = checkNDConflicts(pda.transitions, pda.mode);
    dispatch({ type: 'SET_VALIDATION', payload: { result, conflicts } });
    return result;
  }, []);

  return (
    <PDAContext.Provider value={{ state, dispatch, validate }}>
      {children}
    </PDAContext.Provider>
  );
}

export function usePDA() {
  const ctx = useContext(PDAContext);
  if (!ctx) throw new Error('usePDA must be used within PDAProvider');
  return ctx;
}
