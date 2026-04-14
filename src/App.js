import React, { useRef } from 'react';
import { usePDA } from './context/PDAContext';
import StateManager from './components/LeftPanel/StateManager';
import AlphabetEditor from './components/LeftPanel/AlphabetEditor';
import TransitionTable from './components/LeftPanel/TransitionTable';
import InputField from './components/LeftPanel/InputField';
import RunControls from './components/LeftPanel/RunControls';
import ModeToggles from './components/LeftPanel/ModeToggles';
import StateGraph from './components/CenterPanel/StateGraph';
import StackVisualizer from './components/RightPanel/StackVisualizer';
import TraceTable from './components/BottomPanel/TraceTable';
import TheoryPanel from './components/TheoryPanel/TheoryPanel';
import NotificationBar from './components/NotificationBar';
import { exportPDAtoJSON, importPDAFromJSON, exportTraceToCSV } from './utils/exportUtils';

function App() {
  const { state, dispatch } = usePDA();
  const { simulation } = state;
  const importRef = useRef(null);

  const handleExportJSON = () => {
    exportPDAtoJSON(state.pda);
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const pda = await importPDAFromJSON(file);
      dispatch({ type: 'IMPORT_PDA', payload: { pda } });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { message: 'PDA imported successfully.', level: 'info' } });
    } catch (err) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { message: 'Import failed: ' + err.message, level: 'error' } });
    }
    e.target.value = '';
  };

  const handleExportCSV = () => {
    const { result } = simulation;
    if (!result) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { message: 'Run simulation first to export trace.', level: 'warning' } });
      return;
    }
    exportTraceToCSV(result.trace, result.idChain, result.accepted, result.rejectionReason);
  };

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <span className="logo-icon">⊳</span>
            <span className="logo-text">PDA Simulator</span>
          </div>
          <span className="header-subtitle">TAFL Educational Tool</span>
        </div>
        <div className="header-center">
          <span className="mode-badge">{state.pda.mode}</span>
          <span className="accept-badge">{state.pda.acceptMode === 'FINAL_STATE' ? 'Accept by Final State' : 'Accept by Empty Stack'}</span>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleExportJSON} title="Export PDA as JSON" aria-label="Export JSON">
            ↓ Export JSON
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => importRef.current?.click()} title="Import PDA from JSON" aria-label="Import JSON">
            ↑ Import JSON
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} title="Export trace as CSV" aria-label="Export CSV">
            ⊡ Export Trace
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJSON} aria-label="Import JSON file" />
          <TheoryPanel />
        </div>
      </header>

      <NotificationBar />

      {/* Main Layout */}
      <main className="app-main">
        {/* Left Panel */}
        <aside className="left-panel" aria-label="PDA Builder">
          <div className="panel-inner">
            <StateManager />
            <AlphabetEditor />
            <TransitionTable />
            <InputField />
            <ModeToggles />
            <RunControls />
          </div>
        </aside>

        {/* Center Panel */}
        <section className="center-area" aria-label="State Graph">
          <StateGraph />
        </section>

        {/* Right Panel */}
        <aside className="right-area" aria-label="Stack Visualizer">
          <StackVisualizer />
        </aside>
      </main>

      {/* Bottom Panel */}
      <section className="bottom-area" aria-label="Simulation Trace">
        <TraceTable />
      </section>
    </div>
  );
}

export default App;
