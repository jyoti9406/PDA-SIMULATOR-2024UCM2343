// Preset PDA definitions for the simulator
export const PRESETS = {
  anbn: {
    name: 'a^n b^n',
    description: 'Accepts strings of equal a\'s followed by b\'s (n ≥ 1)',
    mode: 'DPDA',
    acceptMode: 'FINAL_STATE',
    states: [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: false },
      { id: 'q2', isStart: false, isAccept: true },
    ],
    inputAlphabet: ['a', 'b'],
    stackAlphabet: ['A', 'Z'],
    initialStackSymbol: 'Z',
    transitions: [
      { from: 'q0', input: 'a', stackTop: 'Z', to: 'q0', push: 'AZ' },
      { from: 'q0', input: 'a', stackTop: 'A', to: 'q0', push: 'AA' },
      { from: 'q0', input: 'b', stackTop: 'A', to: 'q1', push: 'ε' },
      { from: 'q1', input: 'b', stackTop: 'A', to: 'q1', push: 'ε' },
      { from: 'q1', input: 'ε', stackTop: 'Z', to: 'q2', push: 'Z' },
    ],
    testStrings: [
      { input: 'aabb', expected: 'ACCEPT' },
      { input: 'ab', expected: 'ACCEPT' },
      { input: 'aaabbb', expected: 'ACCEPT' },
      { input: 'aab', expected: 'REJECT' },
      { input: 'abb', expected: 'REJECT' },
      { input: '', expected: 'REJECT' },
    ],
  },

  balancedParens: {
    name: 'Balanced Parentheses',
    description: 'Accepts strings of balanced parentheses',
    mode: 'DPDA',
    acceptMode: 'FINAL_STATE',
    states: [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: true },
    ],
    inputAlphabet: ['(', ')'],
    stackAlphabet: ['P', 'Z'],
    initialStackSymbol: 'Z',
    transitions: [
      { from: 'q0', input: '(', stackTop: 'Z', to: 'q0', push: 'PZ' },
      { from: 'q0', input: '(', stackTop: 'P', to: 'q0', push: 'PP' },
      { from: 'q0', input: ')', stackTop: 'P', to: 'q0', push: 'ε' },
      { from: 'q0', input: 'ε', stackTop: 'Z', to: 'q1', push: 'Z' },
    ],
    testStrings: [
      { input: '()', expected: 'ACCEPT' },
      { input: '(())', expected: 'ACCEPT' },
      { input: '()()', expected: 'ACCEPT' },
      { input: '((()))', expected: 'ACCEPT' },
      { input: '(()', expected: 'REJECT' },
      { input: ')(', expected: 'REJECT' },
    ],
  },

  palindromesEven: {
    name: 'Even Palindromes',
    description: 'Accepts even-length palindromes over {a,b} (NPDA)',
    mode: 'NPDA',
    acceptMode: 'FINAL_STATE',
    states: [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: false },
      { id: 'q2', isStart: false, isAccept: true },
    ],
    inputAlphabet: ['a', 'b'],
    stackAlphabet: ['A', 'B', 'Z'],
    initialStackSymbol: 'Z',
    transitions: [
      // Push phase: push symbols onto stack
      { from: 'q0', input: 'a', stackTop: 'Z', to: 'q0', push: 'AZ' },
      { from: 'q0', input: 'b', stackTop: 'Z', to: 'q0', push: 'BZ' },
      { from: 'q0', input: 'a', stackTop: 'A', to: 'q0', push: 'AA' },
      { from: 'q0', input: 'a', stackTop: 'B', to: 'q0', push: 'AB' },
      { from: 'q0', input: 'b', stackTop: 'A', to: 'q0', push: 'BA' },
      { from: 'q0', input: 'b', stackTop: 'B', to: 'q0', push: 'BB' },
      // Nondeterministic midpoint guesses (epsilon transitions)
      { from: 'q0', input: 'ε', stackTop: 'Z', to: 'q1', push: 'Z' },
      { from: 'q0', input: 'ε', stackTop: 'A', to: 'q1', push: 'A' },
      { from: 'q0', input: 'ε', stackTop: 'B', to: 'q1', push: 'B' },
      // Pop phase: match remaining input against stack
      { from: 'q1', input: 'a', stackTop: 'A', to: 'q1', push: 'ε' },
      { from: 'q1', input: 'b', stackTop: 'B', to: 'q1', push: 'ε' },
      // Accept when stack is back to Z0
      { from: 'q1', input: 'ε', stackTop: 'Z', to: 'q2', push: 'Z' },
    ],
    testStrings: [
      { input: 'abba', expected: 'ACCEPT' },
      { input: 'baab', expected: 'ACCEPT' },
      { input: 'aabbaa', expected: 'ACCEPT' },
      { input: 'abab', expected: 'REJECT' },
      { input: 'ab', expected: 'REJECT' },
    ],
  },

  cfgToPda: {
    name: 'CFG→PDA (a^n b^n via grammar)',
    description: 'Top-down parsing of a^n b^n using grammar S→aSb|ε (NPDA)',
    mode: 'NPDA',
    acceptMode: 'FINAL_STATE',
    states: [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: true },
    ],
    inputAlphabet: ['a', 'b'],
    stackAlphabet: ['S', 'a', 'b', 'Z'],
    initialStackSymbol: 'Z',
    transitions: [
      // Initialize: push S
      { from: 'q0', input: 'ε', stackTop: 'Z', to: 'q0', push: 'SZ' },
      // CFG productions: S → aSb | ε
      { from: 'q0', input: 'ε', stackTop: 'S', to: 'q0', push: 'aSb' },
      { from: 'q0', input: 'ε', stackTop: 'S', to: 'q0', push: 'ε' },
      // Terminal matching
      { from: 'q0', input: 'a', stackTop: 'a', to: 'q0', push: 'ε' },
      { from: 'q0', input: 'b', stackTop: 'b', to: 'q0', push: 'ε' },
      // Accept when Z is on top
      { from: 'q0', input: 'ε', stackTop: 'Z', to: 'q1', push: 'Z' },
    ],
    testStrings: [
      { input: 'aabb', expected: 'ACCEPT' },
      { input: 'ab', expected: 'ACCEPT' },
      { input: '', expected: 'ACCEPT' },
      { input: 'aab', expected: 'REJECT' },
      { input: 'ba', expected: 'REJECT' },
    ],
  },
};

export function getPresetNames() {
  return Object.entries(PRESETS).map(([key, preset]) => ({
    key,
    name: preset.name,
    description: preset.description,
  }));
}
