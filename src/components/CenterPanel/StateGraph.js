import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { usePDA } from '../../context/PDAContext';

const R = 28; // node radius

// ── Pure geometry helpers ──────────────────────────────────────
function edgePathD(sx, sy, tx, ty, curvature = 0) {
  if (curvature === 0) {
    const nx = (tx - sx), ny = (ty - sy), len = Math.sqrt(nx * nx + ny * ny) || 1;
    const ux = nx / len, uy = ny / len;
    return `M ${sx + ux * R},${sy + uy * R} L ${tx - ux * (R + 2)},${ty - uy * (R + 2)}`;
  }
  const dx = tx - sx, dy = ty - sy, len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / len, perpY = dx / len;
  const mx = (sx + tx) / 2 + perpX * curvature;
  const my = (sy + ty) / 2 + perpY * curvature;
  const sm = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2) || 1;
  const tm = Math.sqrt((tx - mx) ** 2 + (ty - my) ** 2) || 1;
  const x1 = sx + ((mx - sx) / sm) * R,      y1 = sy + ((my - sy) / sm) * R;
  const x2 = tx - ((tx - mx) / tm) * (R + 2), y2 = ty - ((ty - my) / tm) * (R + 2);
  return `M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`;
}

function selfLoopPath(x, y) {
  const r = R + 4;
  return `M ${x},${y - r} C ${x + 50},${y - 70} ${x + 70},${y - 20} ${x + r},${y}`;
}

// ─────────────────────────────────────────────────────────────
export default function StateGraph() {
  const svgRef   = useRef(null);
  const gRef     = useRef(null);
  const zoomRef  = useRef(null);
  const posRef   = useRef({});          // live positions (updated during drag)
  const isDragging = useRef(false);

  const { state, dispatch } = usePDA();
  const { pda, simulation, nodePositions } = state;
  const { states, transitions, startState, acceptStates } = pda;
  const { result, currentStep, activeStates } = simulation;

  const curRow     = result?.trace[currentStep];
  const activeState = curRow ? curRow.state : startState;
  const activeAction = curRow ? curRow.action : null;
  const isAtEnd     = result && currentStep === result.trace.length - 1;
  const finalState  = isAtEnd ? curRow?.state : null;
  const isRejected  = isAtEnd && result && !result.accepted;

  const [zoomLevel,  setZoomLevel]  = useState(1);
  const [edgeModal,  setEdgeModal]  = useState(null);
  const [pendingEdge, setPendingEdge] = useState(null);
  const [flashedEdge, setFlashedEdge] = useState(null);

  // Flash edge on step change
  useEffect(() => {
    if (!activeAction) return;
    setFlashedEdge(activeAction);
    const t = setTimeout(() => setFlashedEdge(null), 700);
    return () => clearTimeout(t);
  }, [currentStep, activeAction]);

  // Keep posRef in sync with Redux on non-drag updates
  useEffect(() => {
    if (!isDragging.current) {
      posRef.current = { ...nodePositions };
    }
  }, [nodePositions]);

  // ── One-time SVG + zoom setup ──────────────────────────────
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('class', 'graph-root');
    gRef.current = g;

    const zoom = d3.zoom().scaleExtent([0.3, 3]).on('zoom', ev => {
      g.attr('transform', ev.transform);
      setZoomLevel(Math.round(ev.transform.k * 100) / 100);
    });
    svg.call(zoom);
    zoomRef.current = zoom;

    // Defs: markers + glow  (created once)
    const defs = svg.append('defs');
    const mkMarker = (id, color) => {
      defs.append('marker').attr('id', id)
        .attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
    };
    mkMarker('arr-default', '#94a3b8');
    mkMarker('arr-active',  '#2563EB');
    mkMarker('arr-flash',   '#16A34A');
    mkMarker('arr-start',   '#64748b');

    const mkGlow = (id) => {
      const f = defs.append('filter').attr('id', id);
      f.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
      const m = f.append('feMerge');
      m.append('feMergeNode').attr('in', 'blur');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    };
    mkGlow('glow-blue'); mkGlow('glow-green'); mkGlow('glow-red');
  }, []); // runs once

  // ── Full structural redraw ─────────────────────────────────
  // Only rebuilds when topology or node positions change (NOT style).
  const drawStructure = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.selectAll('*').remove();

    const el = svgRef.current;
    const W = el?.clientWidth  || 700;
    const H = el?.clientHeight || 480;

    // Compute default positions for any state without a stored position
    const pos = { ...posRef.current };
    states.forEach((s, i) => {
      if (!pos[s.id]) {
        const angle = (2 * Math.PI * i) / Math.max(states.length, 1) - Math.PI / 2;
        const r = Math.min(W, H) * 0.32;
        pos[s.id] = { x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle) };
      }
    });
    posRef.current = pos; // sync

    // Group transitions by from|to key
    const edgeGroups = {};
    transitions.forEach(t => {
      const k = `${t.from}|${t.to}`;
      if (!edgeGroups[k]) edgeGroups[k] = [];
      edgeGroups[k].push(t);
    });

    // ── Layer order: self-loops → edges → labels → start-arrow → nodes ──

    // Self-loop layer
    const slLayer = g.append('g').attr('class', 'layer-selfloops');
    // Edge layer
    const elLayer = g.append('g').attr('class', 'layer-edges');
    // Edge labels layer
    const lblLayer = g.append('g').attr('class', 'layer-labels');
    // Start arrow layer
    const saLayer = g.append('g').attr('class', 'layer-startarrow');
    // Node layer
    const nLayer = g.append('g').attr('class', 'layer-nodes');

    // Draw self-loops
    Object.entries(edgeGroups).forEach(([key, ts]) => {
      const [from, to] = key.split('|');
      if (from !== to) return;
      const p = pos[from]; if (!p) return;
      const label = ts.map(t => `${t.input}, ${t.stackTop}→${t.push}`).join('\n');
      slLayer.append('path')
        .attr('class', `selfloop sl-${from}`)
        .attr('d', selfLoopPath(p.x, p.y))
        .attr('fill', 'none').attr('stroke', '#94a3b8').attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arr-default)');
      const lt = slLayer.append('text')
        .attr('class', `selfloop-lbl sll-${from}`)
        .attr('font-size', '9.5px').attr('font-family', 'Inter, monospace').attr('fill', '#64748b');
      label.split('\n').forEach((l, i) =>
        lt.append('tspan').attr('x', p.x + 54).attr('y', p.y - 44 + i * 12).text(l)
      );
    });

    // Draw edges
    Object.entries(edgeGroups).forEach(([key, ts]) => {
      const [from, to] = key.split('|');
      if (from === to) return;
      const sp = pos[from], tp = pos[to]; if (!sp || !tp) return;
      const hasBidi = !!edgeGroups[`${to}|${from}`];
      const curve = hasBidi ? 55 : 0;
      const label = ts.map(t => `${t.input}, ${t.stackTop}→${t.push}`).join('\n');

      elLayer.append('path')
        .attr('class', `edge-path ep-${from}-${to}`)
        .attr('data-from', from).attr('data-to', to)
        .attr('data-curve', curve)
        .attr('d', edgePathD(sp.x, sp.y, tp.x, tp.y, curve))
        .attr('fill', 'none').attr('stroke', '#94a3b8').attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arr-default)');

      // Label at midpoint
      const dx = tp.x - sp.x, dy = tp.y - sp.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      const perpX = -dy / len, perpY = dx / len;
      const lx = (sp.x + tp.x) / 2 + perpX * (curve + 14);
      const ly = (sp.y + tp.y) / 2 + perpY * (curve + 14);
      const lt = lblLayer.append('text')
        .attr('class', `edge-lbl el-${from}-${to}`)
        .attr('data-from', from).attr('data-to', to)
        .attr('x', lx).attr('y', ly).attr('text-anchor', 'middle')
        .attr('font-size', '9.5px').attr('font-family', 'Inter, monospace').attr('fill', '#475569');
      label.split('\n').forEach((l, i) =>
        lt.append('tspan').attr('x', lx).attr('dy', i === 0 ? 0 : 11).text(l)
      );
    });

    // Start arrow
    const sp = pos[startState];
    if (sp) {
      saLayer.append('circle').attr('cx', sp.x - R - 22).attr('cy', sp.y).attr('r', 3).attr('fill', '#64748b');
      saLayer.append('line')
        .attr('x1', sp.x - R - 19).attr('y1', sp.y)
        .attr('x2', sp.x - R - 2).attr('y2', sp.y)
        .attr('stroke', '#64748b').attr('stroke-width', 2)
        .attr('marker-end', 'url(#arr-start)');
    }

    // Draw nodes
    states.forEach(s => {
      const p = pos[s.id]; if (!p) return;
      const isAccept = acceptStates.includes(s.id);

      const ng = nLayer.append('g')
        .attr('class', `node-grp ng-${s.id}`)
        .attr('data-id', s.id)
        .attr('transform', `translate(${p.x},${p.y})`)
        .style('cursor', 'pointer');

      if (isAccept) {
        ng.append('circle').attr('class', 'node-accept-ring').attr('r', R + 5)
          .attr('fill', 'none').attr('stroke', '#94a3b8').attr('stroke-width', 2);
      }
      ng.append('circle').attr('class', 'node-body').attr('r', R)
        .attr('fill', 'white').attr('stroke', '#94a3b8').attr('stroke-width', 1.5);
      ng.append('text').attr('class', 'node-label')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', '13px').attr('font-weight', '500')
        .attr('font-family', 'Inter, system-ui').attr('fill', '#1e293b')
        .text(s.id);

      // ── Drag (moves node + connected edges live, no React re-render) ──
      const drag = d3.drag()
        .on('start', function () {
          isDragging.current = true;
          d3.select(this).raise();
        })
        .on('drag', function (event) {
          const nx = event.x, ny = event.y;
          // Move node group
          d3.select(this).attr('transform', `translate(${nx},${ny})`);
          // Update start arrow if this is start state
          if (s.id === startState) {
            saLayer.select('circle').attr('cx', nx - R - 22).attr('cy', ny);
            saLayer.select('line')
              .attr('x1', nx - R - 19).attr('y1', ny)
              .attr('x2', nx - R - 2).attr('y2', ny);
          }
          // Update live posRef
          posRef.current[s.id] = { x: nx, y: ny };
          // Update edges connected to this node
          elLayer.selectAll(`path.edge-path`).each(function () {
            const ef = d3.select(this).attr('data-from');
            const et = d3.select(this).attr('data-to');
            if (ef !== s.id && et !== s.id) return;
            const fromP = posRef.current[ef] || { x: 0, y: 0 };
            const toP   = posRef.current[et] || { x: 0, y: 0 };
            const curve = parseFloat(d3.select(this).attr('data-curve')) || 0;
            d3.select(this).attr('d', edgePathD(fromP.x, fromP.y, toP.x, toP.y, curve));
          });
          // Update edge labels connected to this node
          lblLayer.selectAll('text.edge-lbl').each(function () {
            const ef = d3.select(this).attr('data-from');
            const et = d3.select(this).attr('data-to');
            if (ef !== s.id && et !== s.id) return;
            const fromP  = posRef.current[ef] || { x: 0, y: 0 };
            const toP    = posRef.current[et] || { x: 0, y: 0 };
            const hasBidi = !!edgeGroups[`${et}|${ef}`];
            const curve  = hasBidi ? 55 : 0;
            const dx2 = toP.x - fromP.x, dy2 = toP.y - fromP.y;
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
            const lpX = -dy2 / len2, lpY = dx2 / len2;
            const lx2 = (fromP.x + toP.x) / 2 + lpX * (curve + 14);
            const ly2 = (fromP.y + toP.y) / 2 + lpY * (curve + 14);
            d3.select(this).attr('x', lx2).attr('y', ly2);
            d3.select(this).selectAll('tspan').attr('x', lx2);
          });
          // Update self-loop if dragging node owning one
          slLayer.selectAll(`path.sl-${s.id}`)
            .attr('d', selfLoopPath(nx, ny));
          slLayer.selectAll(`text.sll-${s.id}`).each(function () {
            d3.select(this).selectAll('tspan').each(function (_, i) {
              d3.select(this).attr('x', nx + 54).attr('y', ny - 44 + i * 12);
            });
          });
        })
        .on('end', function (event) {
          isDragging.current = false;
          dispatch({ type: 'SET_NODE_POSITION', payload: { id: s.id, x: event.x, y: event.y } });
        });

      ng.call(drag);

      // Click for edge creation
      ng.on('click', (event) => {
        event.stopPropagation();
        setPendingEdge(prev => {
          if (prev && prev.sourceId !== s.id) {
            setEdgeModal({ sourceId: prev.sourceId, targetId: s.id });
            return null;
          }
          return { sourceId: s.id };
        });
      });
    });

    // After structure is drawn, apply current styles
    applyStyles(g, activeState, activeStates, flashedEdge, finalState, isRejected, pendingEdge, isAtEnd, result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states, transitions, startState, acceptStates, nodePositions, dispatch]);

  // ── Style-only update (no DOM rebuilding) ─────────────────
  // Called when simulation step or flash changes — doesn't touch g.selectAll('*').remove()
  const applyStyles = useCallback((g, activeState, activeStates, flashedEdge, finalState, isRejected, pendingEdge, isAtEnd, result) => {
    if (!g) return;

    // Update node styles
    g.selectAll('.node-grp').each(function () {
      const id       = d3.select(this).attr('data-id');
      const isActive = activeStates.includes(id) || id === activeState;
      const isFinal  = id === finalState;
      const isDead   = isFinal && isRejected && isAtEnd;
      const isGreen  = isFinal && result?.accepted && isAtEnd;
      const isPending = pendingEdge && pendingEdge.sourceId === id;

      // Remove old pending ring if any
      d3.select(this).select('.pending-ring').remove();

      d3.select(this).select('.node-accept-ring')
        .attr('stroke', isGreen ? '#16A34A' : isDead ? '#DC2626' : isActive ? '#2563EB' : '#94a3b8');

      d3.select(this).select('.node-body')
        .attr('fill',   isGreen ? 'rgba(22,163,74,0.15)' : isDead ? 'rgba(220,38,38,0.12)' : isActive ? 'rgba(37,99,235,0.12)' : 'white')
        .attr('stroke', isGreen ? '#16A34A' : isDead ? '#DC2626' : isActive ? '#2563EB' : '#94a3b8')
        .attr('stroke-width', isActive ? 2.5 : 1.5)
        .attr('filter', isGreen ? 'url(#glow-green)' : isDead ? 'url(#glow-red)' : isActive ? 'url(#glow-blue)' : null);

      d3.select(this).select('.node-label')
        .attr('fill',        isGreen ? '#16A34A' : isDead ? '#DC2626' : isActive ? '#2563EB' : '#1e293b')
        .attr('font-weight', isActive ? '700' : '500');

      if (isPending) {
        d3.select(this).append('circle').attr('class', 'pending-ring')
          .attr('r', R + 8).attr('fill', 'none')
          .attr('stroke', '#f59e0b').attr('stroke-width', 2.5).attr('stroke-dasharray', '5,3');
      }
    });

    // Update edge styles
    g.selectAll('.edge-path').each(function () {
      const ef = d3.select(this).attr('data-from');
      const et = d3.select(this).attr('data-to');
      const isFlash  = flashedEdge && flashedEdge.includes(`(${ef},`) && flashedEdge.includes(`→ (${et},`);
      const stroke = isFlash ? '#16A34A' : '#94a3b8';
      const mEnd   = isFlash ? 'url(#arr-flash)' : 'url(#arr-default)';
      d3.select(this).attr('stroke', stroke).attr('stroke-width', isFlash ? 2.5 : 1.5).attr('marker-end', mEnd);
    });

    g.selectAll('.edge-lbl').each(function () {
      const ef = d3.select(this).attr('data-from');
      const et = d3.select(this).attr('data-to');
      const isFlash = flashedEdge && flashedEdge.includes(`(${ef},`) && flashedEdge.includes(`→ (${et},`);
      d3.select(this).attr('fill', isFlash ? '#16A34A' : '#475569');
    });

    g.selectAll('.selfloop').attr('stroke', '#94a3b8');
  }, []);

  // Trigger full redraw when structure changes
  useEffect(() => {
    drawStructure();
  }, [drawStructure]);

  // Trigger style-only update when simulation state or flash changes
  useEffect(() => {
    if (!gRef.current) return;
    applyStyles(gRef.current, activeState, activeStates, flashedEdge, finalState, isRejected, pendingEdge, isAtEnd, result);
  }, [applyStyles, activeState, activeStates, flashedEdge, finalState, isRejected, pendingEdge, isAtEnd, result]);

  // ── Controls ───────────────────────────────────────────────
  const handleZoomIn    = () => d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.3);
  const handleZoomOut   = () => d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.77);
  const handleZoomReset = () => d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity);

  const handleAutoLayout = () => {
    const W = svgRef.current?.clientWidth  || 700;
    const H = svgRef.current?.clientHeight || 480;
    const newPos = {};
    states.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / Math.max(states.length, 1) - Math.PI / 2;
      const r = Math.min(W, H) * 0.32;
      newPos[s.id] = { x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle) };
    });
    posRef.current = newPos;
    dispatch({ type: 'SET_NODE_POSITIONS', payload: { positions: newPos } });
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    dispatch({
      type: 'ADD_TRANSITION',
      payload: {
        from: edgeModal.sourceId,
        input:    f.edgeInput.value.trim()    || 'ε',
        stackTop: f.edgeStackTop.value.trim(),
        to:       edgeModal.targetId,
        push:     f.edgePush.value.trim()     || 'ε',
      },
    });
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
          <button className="btn btn-secondary btn-xs" onClick={handleAutoLayout}>Auto-layout</button>
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
