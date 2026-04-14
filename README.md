# PDA Simulator — TAFL Educational Tool

> An interactive, fully client-side **Pushdown Automata Simulator** built for BTech Theory of Automata and Formal Languages (TAFL) courses.

[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
[![D3.js](https://img.shields.io/badge/D3.js-v7-orange?logo=d3.js)](https://d3js.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Features

### 🧠 Simulation Engine
- **DPDA Mode** — Strict determinism validation; detects ε + input conflicts
- **NPDA Mode** — BFS-based parallel branch exploration (up to 100 branches, 10,000 steps)
- **Epsilon Loop Detection** — Tracks visited `(state, input, stack)` triplets per branch
- **Acceptance Criteria** — By Final State or By Empty Stack

### 🖥️ Three-Panel UI

| Panel | Features |
|---|---|
| **Left — PDA Builder** | State manager, Σ / Γ / Z₀ alphabet editor, interactive transition table with ND/duplicate highlighting, input string validation, DPDA/NPDA toggle, preset loader |
| **Center — State Graph** | D3.js interactive graph: draggable nodes, curved bidirectional edges, self-loops, zoom/pan, auto-layout, active/accept/dead state animations, edge flash on transition |
| **Right — Stack Visualizer** | Animated push (green slide-in) / pop (red fade-out), Z₀ double-border, NPDA multi-branch columns, live current ID display |

### 📋 Trace Table
- Step-by-step computation history with clickable rows
- Formal ID chain: `(q₀, w, Z) ⊢ ... ⊢ (qₙ, ε, Z)`
- Accept / Reject verdict banner with specific rejection reason

### 📦 Presets Included
1. **aⁿbⁿ** (DPDA) — classic pushdown language
2. **Balanced Parentheses** (DPDA)
3. **Even Palindromes** (NPDA) — nondeterministic midpoint guess
4. **CFG→PDA via S→aSb|ε** (NPDA) — top-down parsing

### 🔧 Utilities
- Export PDA definition as **JSON**
- Import PDA from JSON
- Export simulation trace as **CSV**
- **Theory Panel** — live-updating formal 7-tuple definition with move relation notation

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/jyoti9406/PDA-SIMULATOR-2024UCM2343.git
cd PDA-SIMULATOR-2024UCM2343

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at **http://localhost:3000**

---

## Project Structure

```
src/
├── App.js                        # Main layout
├── App.css                       # Premium academic stylesheet
├── index.js                      # React entry point
├── engine/
│   ├── pdaEngine.js              # DPDA + NPDA simulation engine
│   ├── validator.js              # PDA definition validation
│   └── presets.js                # Hardcoded preset examples
├── context/
│   └── PDAContext.js             # Global state (Context + useReducer)
├── components/
│   ├── LeftPanel/                # StateManager, AlphabetEditor, TransitionTable, etc.
│   ├── CenterPanel/StateGraph.js # D3.js graph (smooth drag, edge-in-place update)
│   ├── RightPanel/StackVisualizer.js
│   ├── BottomPanel/TraceTable.js
│   ├── TheoryPanel/TheoryPanel.js
│   └── NotificationBar.js
└── utils/
    └── exportUtils.js            # JSON + CSV export/import
```

---

## Tech Stack

- **React 18** — UI framework
- **D3.js v7** — SVG graph rendering and drag interactions
- **Pure CSS** — No external UI framework; custom animations
- **React Context + useReducer** — Global state management

---

## Academic Context

This project was built for a **BTech TAFL (Theory of Automata and Formal Languages)** course (Roll No: 2024UCM2343). It demonstrates formal PDA definitions, the move relation `⊢`, and supports both acceptance conditions as per standard automata theory textbooks.

---

*Built with ❤️ for the love of formal languages.*
