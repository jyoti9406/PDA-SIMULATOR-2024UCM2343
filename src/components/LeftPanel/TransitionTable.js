import React from 'react';
import { usePDA } from '../../context/PDAContext';

export default function TransitionTable() {
  const { state, dispatch } = usePDA();
  const { transitions, states, inputAlphabet, stackAlphabet } = state.pda;

  const stateOptions = states.map(s => s.id);
  const inputOptions = ['ε', ...inputAlphabet];
  const stackOptions = stackAlphabet;

  const handleAdd = () => {
    dispatch({
      type: 'ADD_TRANSITION',
      payload: {
        from: stateOptions[0] || 'q0',
        input: inputOptions[1] || 'ε',
        stackTop: stackOptions[0] || 'Z',
        to: stateOptions[0] || 'q0',
        push: 'ε',
      },
    });
  };

  const handleChange = (id, field, value) => {
    dispatch({ type: 'UPDATE_TRANSITION', payload: { id, field, value } });
  };

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_TRANSITION', payload: { id } });
  };

  // Detect duplicates
  const seenKeys = {};
  const duplicateIds = new Set();
  transitions.forEach(t => {
    const key = `${t.from}|${t.input}|${t.stackTop}|${t.to}|${t.push}`;
    if (seenKeys[key]) duplicateIds.add(t.id);
    else seenKeys[key] = t.id;
  });

  // Detect ND conflicts (for DPDA)
  const ndMap = {};
  transitions.forEach(t => {
    const key = `${t.from}|${t.stackTop}`;
    if (!ndMap[key]) ndMap[key] = { normal: [], epsilon: [] };
    if (t.input === 'ε' || t.input === '') ndMap[key].epsilon.push(t.id);
    else ndMap[key].normal.push(t.id);
  });
  const ndConflictIds = new Set();
  Object.values(ndMap).forEach(({ normal, epsilon }) => {
    if (normal.length > 0 && epsilon.length > 0 && state.pda.mode === 'DPDA') {
      [...normal, ...epsilon].forEach(id => ndConflictIds.add(id));
    }
  });

  return (
    <div className="section">
      <h3 className="section-title">
        <span className="section-icon">δ</span> Transition Table
        <span className="section-count">{transitions.length} rules</span>
      </h3>

      <div className="transition-table-wrapper">
        <table className="transition-table">
          <thead>
            <tr>
              <th>From</th>
              <th>Input</th>
              <th>Stack Top</th>
              <th>To</th>
              <th>Push</th>
              <th>Del</th>
            </tr>
          </thead>
          <tbody>
            {transitions.map((t, idx) => {
              const isDup = duplicateIds.has(t.id);
              const isND = ndConflictIds.has(t.id);
              const rowClass = isDup ? 'row-dup' : isND ? 'row-nd' : '';
              return (
                <tr key={t.id} className={rowClass} title={isDup ? 'Duplicate rule' : isND ? 'ND conflict (DPDA)' : ''}>
                  <td>
                    <select
                      className="td-select"
                      value={t.from}
                      onChange={e => handleChange(t.id, 'from', e.target.value)}
                      aria-label={`Row ${idx + 1} from state`}
                    >
                      {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      className="td-select"
                      value={t.input}
                      onChange={e => handleChange(t.id, 'input', e.target.value)}
                      aria-label={`Row ${idx + 1} input`}
                    >
                      {inputOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      className="td-select"
                      value={t.stackTop}
                      onChange={e => handleChange(t.id, 'stackTop', e.target.value)}
                      aria-label={`Row ${idx + 1} stack top`}
                    >
                      {stackOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      className="td-select"
                      value={t.to}
                      onChange={e => handleChange(t.id, 'to', e.target.value)}
                      aria-label={`Row ${idx + 1} to state`}
                    >
                      {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      className="td-input"
                      value={t.push}
                      onChange={e => handleChange(t.id, 'push', e.target.value)}
                      placeholder="ε"
                      aria-label={`Row ${idx + 1} push string`}
                      maxLength={10}
                    />
                  </td>
                  <td>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={() => handleDelete(t.id)}
                      title="Delete this transition"
                      aria-label={`Delete transition row ${idx + 1}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {transitions.length === 0 && (
          <p className="empty-hint">No transitions. Click "Add Row" to define transition rules.</p>
        )}
      </div>

      {(duplicateIds.size > 0 || ndConflictIds.size > 0) && (
        <div className="transition-warnings">
          {duplicateIds.size > 0 && (
            <p className="warn-badge">⚠ {duplicateIds.size} duplicate rule(s) detected (highlighted orange)</p>
          )}
          {ndConflictIds.size > 0 && (
            <p className="warn-badge warn-nd">⚠ Non-determinism conflict in DPDA mode (highlighted red)</p>
          )}
        </div>
      )}

      <button className="btn btn-secondary btn-sm mt-2" onClick={handleAdd} aria-label="Add transition row">
        + Add Row
      </button>
    </div>
  );
}
