/**
 * Export/Import utilities for PDA Simulator
 */

/**
 * Export PDA definition to JSON file
 */
export function exportPDAtoJSON(pda) {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    pda: {
      states: pda.states,
      inputAlphabet: pda.inputAlphabet,
      stackAlphabet: pda.stackAlphabet,
      initialStackSymbol: pda.initialStackSymbol,
      startState: pda.startState,
      acceptStates: pda.acceptStates,
      transitions: pda.transitions,
      mode: pda.mode,
      acceptMode: pda.acceptMode,
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pda_definition.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import PDA definition from JSON file
 * Returns promise resolving to the PDA object
 */
export function importPDAFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.pda) {
          reject(new Error('Invalid PDA file: missing "pda" key.'));
          return;
        }
        resolve(data.pda);
      } catch (err) {
        reject(new Error('Invalid JSON file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

/**
 * Export trace table to CSV
 */
export function exportTraceToCSV(trace, idChain, accepted, rejectionReason) {
  const headers = ['Step', 'Current State', 'Input Read', 'Remaining Input', 'Stack (top→bottom)', 'Action Taken'];
  const rows = trace.map(row => [
    row.step,
    row.state,
    row.inputRead,
    row.remainingInput,
    row.stackStr || row.stack.join(''),
    row.action,
  ]);

  const csvRows = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    '',
    `"ID Chain: ${idChain.join(' ⊢ ')}"`,
    `"Result: ${accepted ? 'STRING ACCEPTED' : 'STRING REJECTED — ' + rejectionReason}"`,
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pda_trace.csv';
  a.click();
  URL.revokeObjectURL(url);
}
