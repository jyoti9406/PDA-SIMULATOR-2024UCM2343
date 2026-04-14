import React, { useState } from 'react';
import { usePDA } from '../../context/PDAContext';

export default function StateManager() {
  const { state, dispatch } = usePDA();
  const { states, startState, acceptStates } = state.pda;
  const [newStateName, setNewStateName] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const id = newStateName.trim();
    if (!id) { setError('State name cannot be empty.'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(id)) { setError('Only letters, digits, and underscores allowed.'); return; }
    if (states.find(s => s.id === id)) { setError(`State "${id}" already exists.`); return; }
    dispatch({ type: 'ADD_STATE', payload: { id } });
    setNewStateName('');
    setError('');
  };

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_STATE', payload: { id } });
  };

  const handleSetStart = (id) => {
    dispatch({ type: 'SET_START_STATE', payload: { id } });
  };

  const handleToggleAccept = (id) => {
    dispatch({ type: 'TOGGLE_ACCEPT_STATE', payload: { id } });
  };

  return (
    <div className="section">
      <h3 className="section-title">
        <span className="section-icon">◎</span> State Manager
      </h3>

      <div className="add-state-row">
        <input
          className="text-input"
          placeholder="State name (e.g. q3)"
          value={newStateName}
          onChange={e => { setNewStateName(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          aria-label="New state name"
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd} title="Add state">
          + Add
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}

      <div className="state-list">
        {states.map(s => (
          <div key={s.id} className={`state-row ${s.id === startState ? 'is-start' : ''} ${acceptStates.includes(s.id) ? 'is-accept' : ''}`}>
            <span className="state-badge">{s.id}</span>
            <div className="state-tags">
              {s.id === startState && <span className="tag tag-start">START</span>}
              {acceptStates.includes(s.id) && <span className="tag tag-accept">ACCEPT</span>}
            </div>
            <div className="state-actions">
              <button
                className={`btn-icon ${s.id === startState ? 'active-start' : ''}`}
                title={`Set "${s.id}" as start state`}
                onClick={() => handleSetStart(s.id)}
                aria-label={`Set ${s.id} as start`}
              >
                →
              </button>
              <button
                className={`btn-icon ${acceptStates.includes(s.id) ? 'active-accept' : ''}`}
                title={`Toggle "${s.id}" as accept state`}
                onClick={() => handleToggleAccept(s.id)}
                aria-label={`Toggle ${s.id} accept`}
              >
                ⊛
              </button>
              <button
                className="btn-icon btn-icon-danger"
                title={`Delete state "${s.id}"`}
                onClick={() => handleDelete(s.id)}
                aria-label={`Delete ${s.id}`}
                disabled={s.id === startState}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {states.length === 0 && (
          <p className="empty-hint">No states defined. Add at least one state.</p>
        )}
      </div>
    </div>
  );
}
