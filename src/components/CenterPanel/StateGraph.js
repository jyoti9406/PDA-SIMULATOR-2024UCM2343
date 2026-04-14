import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { usePDA } from '../../context/PDAContext';

const NODE_RADIUS = 28;

export default function StateGraph() {
  const svgRef = useRef(null);
  const gRef = useRef(null);          // persistent root <g>
  const zoomRef = useRef(null);
  const nodePositionsRef = useRef({}); // live positions during drag (not React state)
  const { state, dispatch } = usePDA();
  const { pda, simulation, nodePositions } = state;
  const { states, transitions, startState, acceptStates } = pda;
  const { result, currentStep, activeStates } = simulation;

  const [zoomLevel, setZoomLevel] = useState(1);
  const [edgeModal, setEdgeModal] = useState(null);
  const [pendingEdge, setPendingEdge] = useState(null);
  const [flashedEdge, setFlashedEdge] = useState(null);

  // Sync nodePositionsRef whenever Redux state changes
  useEffect(() => {
    nodePositionsRef.current = { ...nodePositions };
  }, [nodePositions]);

  // Determine active state / transition
  const currentTraceRow = result && result.trace[currentStep];
  const activeState = currentTraceRow ? currentTraceRow.state : startState;
  const activeActionStr = currentTraceRow ? currentTraceRow.action : null;

  // Flash edge when step changes
  useEffect(() => {
    if (activeActionStr) {
      setFlashedEdge(activeActionStr);
      const t = setTimeout(() => setFlashedEdge(null), 700);
      return () => clearTimeout(t);
    }
  }, [currentStep, activeActionStr]);

  // ── One-time SVG / zoom setup ─────────────────────────────
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('class', 'graph-root');
    gRef.current = g;

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(Math.round(event.transform.k * 100) / 100);
      });
    svg.call(zoom);
    zoomRef.current = zoom;
  }, []); // run once

  // ── Main draw function (redraws everything inside gRef) ───
  const drawGraph = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.selectAll('*').remove();

    const svgEl = svgRef.current;
    const width = svgEl ? svgEl.clientWidth || 700 : 700;
    const height = svgEl ? svgEl.clientHeight || 480 : 480;

    // ── Defs ──────────────────────────────────────────────
    const svg = d3.select(svgEl);
    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');
    else defs.selectAll('*').remove();

    const addMarker = (id, color) => {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
    };
    addMarker('arr-default', '#94a3b8');
    addMarker('arr-active',  '#2563EB');
    addMarker('arr-flash',   '#16A34A');
    addMarker('arr-start',   '#64748b');

    const addGlow = (id, color) => {
      const f = defs.append('filter').attr('id', id);
      f.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
      const m = f.append('feMerge');
      m.append('feMergeNode').attr('in', 'blur');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    };
    addGlow('glow-blue');
    addGlow('glow-green');
    addGlow('glow-red');

    // ── Build node data with positions ────────────────────
    const positions = nodePositionsRef.current;
    const nodeData = states.map((s, i) => {
      const pos = positions[s.id];
      const angle = (2 * Math.PI * i) / Math.max(states.length, 1) - Math.PI / 2;
      const r = Math.min(width, height) * 0.32;
      return {
        id: s.id,
        x: pos ? pos.x : width / 2 + r * Math.cos(angle),
        y: pos ? pos.y : height / 2 + r * Math.sin(angle),
      };
    });
    const nodeMap = Object.fromEntries(nodeData.map(n => [n.id, n]));

    // ── Simulation state ──────────────────────────────────
    let finalState = null;
    let isRejectedState = false;
    if (result) {
      const lr = result.trace[result.trace.length - 1];
      finalState = lr ? lr.state : null;
      isRejectedState = !result.accepted;
    }
    const isAtEnd = result && currentStep === result.trace.length - 1;

    // ── Group transitions (same from→to) ──────────────────
    const edgeGroups = {};
    transitions.forEach(t => {
      const key = `${t.from}|${t.to}`;
      if (!edgeGroups[key]) edgeGroups[key] = [];
      edgeGroups[key].push(t);
    });

    // Helper: is edge currently active / flashed?
    const edgeIsFlashed = (ts) =>
      flashedEdge && ts.some(t =>
        flashedEdge.includes(`(${t.from},`) && flashedEdge.includes(`→ (${t.to},`)
      );
    const edgeIsActive = (ts) =>
      activeActionStr && ts.some(t =>
        activeActionStr.includes(`(${t.from},`) && activeActionStr.includes(`→ (${t.to},`)
      );

    // ── Draw self-loops ───────────────────────────────────
    const slGroup = g.append('g');
    Object.entries(edgeGroups).forEach(([key, ts]) => {
      const [from, to] = key.split('|');
      if (from !== to) return;
      const n = nodeMap[from];
      if (!n) return;
      const flashed = edgeIsFlashed(ts);
      const label = ts.map(t => `${t.input}, ${t.stackTop}→${t.push}`).join('\n');
      const r = NODE_RADIUS + 4;
      slGroup.append('path')
        .attr('d', `M ${n.x},${n.y - r} C ${n.x + 50},${n.y - 70} ${n.x + 70},${n.y - 20} ${n.x + r},${n.y}`)
        .attr('fill', 'none')
        .attr('stroke', flashed ? '#16A34A' : '#94a3b8')
        .attr('stroke-width', flashed ? 2.5 : 1.5)
        .attr('marker-end', flashed ? 'url(#arr-flash)' : 'url(#arr-default)');
      const lines = label.split('\n');
      const lt = slGroup.append('text')
        .attr('x', n.x + 54).attr('y', n.y - 44)
        .attr('font-size', '9.5px').attr('font-family', 'Inter, monospace')
        .attr('fill', flashed ? '#16A34A' : '#64748b');
      lines.forEach((l, i) => lt.append('tspan').attr('x', n.x + 54).attr('dy', i === 0 ? 0 : 12).text(l));
    });

    // ── Draw regular edges ────────────────────────────────
    const edgeGroup  = g.append('g');
    const labelGroup = g.append('g');
    Object.entries(edgeGroups).forEach(([key, ts]) => {
      const [from, to] = key.split('|');
      if (from === to) return;
      const src = nodeMap[from], tgt = nodeMap[to];
      if (!src || !tgt) return;
      const flashed = edgeIsFlashed(ts);
      const active  = edgeIsActive(ts);
      const revKey = `${to}|${from}`;
      const curved = !!edgeGroups[revKey];
      const curvature = curved ? 55 : 0;
      const dx = tgt.x - src.x, dy = tgt.y - src.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const mx = (src.x + tgt.x) / 2 + nx * curvature;
      const my = (src.y + tgt.y) / 2 + ny * curvature;
      const smx = mx - src.x, smy = my - src.y, smLen = Math.sqrt(smx * smx + smy * smy) || 1;
      const tmx = tgt.x - mx, tmy = tgt.y - my, tmLen = Math.sqrt(tmx * tmx + tmy * tmy) || 1;
      const sx = src.x + smx / smLen * NODE_RADIUS;
      const sy = src.y + smy / smLen * NODE_RADIUS;
      const ex = tgt.x - tmx / tmLen * (NODE_RADIUS + 2);
      const ey = tgt.y - tmy / tmLen * (NODE_RADIUS + 2);
      const pathD = curvature !== 0 ? `M ${sx},${sy} Q ${mx},${my} ${ex},${ey}` : `M ${sx},${sy} L ${ex},${ey}`;
      const stroke = flashed ? '#16A34A' : active ? '#2563EB' : '#94a3b8';
      const mEnd   = flashed ? 'url(#arr-flash)' : active ? 'url(#arr-active)' : 'url(#arr-default)';
      edgeGroup.append('path')
        .attr('d', pathD).attr('fill', 'none')
        .attr('stroke', stroke).attr('stroke-width', flashed ? 2.5 : active ? 2 : 1.5)
        .attr('marker-end', mEnd);
      const lx = (src.x + tgt.x) / 2 + nx * (curvature + 14);
      const ly = (src.y + tgt.y) / 2 + ny * (curvature + 14);
      const label = ts.map(t => `${t.input}, ${t.stackTop}→${t.push}`).join('\n');
      const lt = labelGroup.append('text')
        .attr('x', lx).attr('y', ly).attr('text-anchor', 'middle')
        .attr('font-size', '9.5px').attr('font-family', 'Inter, monospace')
        .attr('fill', flashed ? '#16A34A' : active ? '#2563EB' : '#475569');
      label.split('\n').forEach((l, i) => lt.append('tspan').attr('x', lx).attr('dy', i === 0 ? 0 : 11).text(l));
    });

    // ── Start arrow ───────────────────────────────────────
    const sn = nodeMap[startState];
    if (sn) {
      g.append('circle').attr('cx', sn.x - NODE_RADIUS - 22).attr('cy', sn.y).attr('r', 3).attr('fill', '#64748b');
      g.append('line')
        .attr('x1', sn.x - NODE_RADIUS - 19).attr('y1', sn.y)
        .attr('x2', sn.x - NODE_RADIUS - 2).attr('y2', sn.y)
        .attr('stroke', '#64748b').attr('stroke-width', 2)
        .attr('marker-end', 'url(#arr-start)');
    }

    // ── Draw nodes ────────────────────────────────────────
    const nodeGroup = g.append('g');

    nodeData.forEach(node => {
      const isAccept = acceptStates.includes(node.id);
      const isActiveNode = activeStates.includes(node.id) || node.id === activeState;
      const isFinalNode  = node.id === finalState;
      const isDead   = isFinalNode && isRejectedState && isAtEnd;
      const isGreen  = isFinalNode && result?.accepted && isAtEnd;
      const isPending = pendingEdge && pendingEdge.sourceId === node.id;

      const ng = nodeGroup.append('g')
        .attr('class', 'node-group')
        .attr('transform', `translate(${node.x},${node.y})`)
        .style('cursor', 'pointer');

      // Accept ring
      if (isAccept) {
        ng.append('circle').attr('r', NODE_RADIUS + 5)
          .attr('fill', 'none')
          .attr('stroke', isGreen ? '#16A34A' : isDead ? '#DC2626' : isActiveNode ? '#2563EB' : '#94a3b8')
          .attr('stroke-width', 2);
      }

      // Main circle
      ng.append('circle').attr('r', NODE_RADIUS)
        .attr('fill',  isGreen ? 'rgba(22,163,74,0.15)' : isDead ? 'rgba(220,38,38,0.12)' : isActiveNode ? 'rgba(37,99,235,0.12)' : 'white')
        .attr('stroke', isGreen ? '#16A34A' : isDead ? '#DC2626' : isActiveNode ? '#2563EB' : '#94a3b8')
        .attr('stroke-width', isActiveNode ? 2.5 : 1.5)
        .attr('filter', isGreen ? 'url(#glow-green)' : isDead ? 'url(#glow-red)' : isActiveNode ? 'url(#glow-blue)' : null);

      // Label
      ng.append('text')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', '13px').attr('font-weight', isActiveNode ? '700' : '500')
        .attr('font-family', 'Inter, system-ui')
        .attr('fill', isGreen ? '#16A34A' : isDead ? '#DC2626' : isActiveNode ? '#2563EB' : '#1e293b')
        .text(node.id);

      // Pending selection ring
      if (isPending) {
        ng.append('circle').attr('r', NODE_RADIUS + 8)
          .attr('fill', 'none').attr('stroke', '#f59e0b')
          .attr('stroke-width', 2.5).attr('stroke-dasharray', '5,3');
      }

      // ── Drag ──────────────────────────────────────────
      const drag = d3.drag()
        .on('start', function () {
          d3.select(this.parentNode).raise();
        })
        .on('drag', function (event) {
          // Move only this node's group — no full redraw
          const gEl = d3.select(this.parentNode);
          gEl.attr('transform', `translate(${event.x},${event.y})`);
          // Keep live position in ref
          nodePositionsRef.current[node.id] = { x: event.x, y: event.y };
        })
        .on('end', function (event) {
          // Persist to React state and trigger full redraw
          dispatch({ type: 'SET_NODE_POSITION', payload: { id: node.id, x: event.x, y: event.y } });
        });

      // Attach drag to the whole node group
      ng.call(drag);

      // Click handler for edge creation
      ng.on('click', (event) => {
        event.stopPropagation();
        if (pendingEdge && pendingEdge.sourceId !== node.id) {
          setEdgeModal({ sourceId: pendingEdge.sourceId, targetId: node.id });
          setPendingEdge(null);
        } else {
          setPendingEdge({ sourceId: node.id });
        }
      });
    });
  }, [
    states, transitions, startState, acceptStates,
    activeState, activeStates, flashedEdge, activeActionStr,
    nodePositions, pendingEdge, result, currentStep, dispatch
  ]);

  // Redraw whenever deps change
  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // ── Zoom Controls ─────────────────────────────────────
  const handleZoomIn  = () => d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.3);
  const handleZoomOut = () => d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.77);
  const handleZoomReset = () => d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity);

  // ── Auto-layout ───────────────────────────────────────
  const handleAutoLayout = () => {
    const w = svgRef.current?.clientWidth  || 700;
    const h = svgRef.current?.clientHeight || 480;
    const positions = {};
    states.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / Math.max(states.length, 1) - Math.PI / 2;
      const r = Math.min(w, h) * 0.32;
      positions[s.id] = { x: w / 2 + r * Math.cos(angle), y: h / 2 + r * Math.sin(angle) };
    });
    nodePositionsRef.current = positions;
    dispatch({ type: 'SET_NODE_POSITIONS', payload: { positions } });
  };

  // ── Edge Modal Submit ─────────────────────────────────
  const handleModalSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const input    = form.edgeInput.value.trim()    || 'ε';
    const stackTop = form.edgeStackTop.value.trim();
    const push     = form.edgePush.value.trim()     || 'ε';
    if (!stackTop) return;
    dispatch({ type: 'ADD_TRANSITION', payload: { from: edgeModal.sourceId, input, stackTop, to: edgeModal.targetId, push } });
    setEdgeModal(null);
  };

  return (
    <div className="center-panel">
      <div className="graph-toolbar">
        <span className="graph-title">State Graph</span>
        {pendingEdge && (
          <span className="pending-msg">
            Click target state to add transition from <strong>{pendingEdge.sourceId}</strong>
            &nbsp;(click canvas to cancel)
          </span>
        )}
        <div className="zoom-controls">
          <button className="btn-icon" onClick={handleZoomOut}   aria-label="Zoom out">−</button>
          <span className="zoom-label">{Math.round(zoomLevel * 100)}%</span>
          <button className="btn-icon" onClick={handleZoomIn}    aria-label="Zoom in">+</button>
          <button className="btn-icon" onClick={handleZoomReset} aria-label="Reset zoom">⊡</button>
          <button className="btn btn-secondary btn-xs" onClick={handleAutoLayout} aria-label="Auto layout">Auto-layout</button>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="state-graph-svg"
        onClick={() => setPendingEdge(null)}
        aria-label="PDA State Graph"
      />

      <div className="graph-legend">
        <span className="legend-item"><span className="legend-dot dot-active" />Active</span>
        <span className="legend-item"><span className="legend-dot dot-accept" />Accept</span>
        <span className="legend-item"><span className="legend-dot dot-reject" />Dead</span>
        <span className="legend-item"><span className="legend-dot dot-flash"  />Transition taken</span>
      </div>

      {edgeModal && (
        <div className="modal-overlay" onClick={() => setEdgeModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Add transition">
            <h3 className="modal-title">Add Transition</h3>
            <p className="modal-subtitle">{edgeModal.sourceId} → {edgeModal.targetId}</p>
            <form onSubmit={handleModalSubmit}>
              <div className="modal-field">
                <label htmlFor="edgeInput">Input symbol (ε for epsilon)</label>
                <input id="edgeInput" name="edgeInput" className="text-input" defaultValue="ε" />
              </div>
              <div className="modal-field">
                <label htmlFor="edgeStackTop">Stack top symbol *</label>
                <input id="edgeStackTop" name="edgeStackTop" className="text-input" required />
              </div>
              <div className="modal-field">
                <label htmlFor="edgePush">Push string (ε to pop)</label>
                <input id="edgePush" name="edgePush" className="text-input" defaultValue="ε" />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">Add</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEdgeModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
