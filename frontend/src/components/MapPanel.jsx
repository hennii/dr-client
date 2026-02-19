import React, { useMemo, useState, useRef, useEffect, useCallback, memo } from "react";

const MapPanel = memo(function MapPanel({ zone, currentNode, level }) {
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(null);       // { w, h } — zoom dimensions only
  const [panOffset, setPanOffset] = useState(null); // { dx, dy } — manual pan offset from center
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const [selectedLevel, setSelectedLevel] = useState(level);

  // Sync selected level from props
  useEffect(() => {
    setSelectedLevel(level);
  }, [level]);

  // Filter nodes and labels by current z-level, compute offset coordinates
  const { nodes, labels, arcs, bounds } = useMemo(() => {
    if (!zone) return { nodes: [], labels: [], arcs: [], bounds: null };

    const offsetX = Math.abs(zone.x_min);
    const offsetY = Math.abs(zone.y_min);
    const z = selectedLevel;

    const allNodes = Object.values(zone.nodes);
    const filteredNodes = allNodes
      .filter((n) => n.z === z)
      .map((n) => ({
        ...n,
        sx: n.x + offsetX,
        sy: n.y + offsetY,
      }));

    const nodeMap = {};
    allNodes.forEach((n) => {
      nodeMap[n.id] = n;
    });

    // Build arc line segments (only between same-level nodes in this zone)
    const arcLines = [];
    const seen = new Set();
    filteredNodes.forEach((n) => {
      n.arcs.forEach((arc) => {
        if (arc.hidden) return;
        const dest = nodeMap[arc.destination];
        if (!dest || dest.z !== z) return;
        const key = n.id < arc.destination
          ? `${n.id}-${arc.destination}`
          : `${arc.destination}-${n.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        arcLines.push({
          x1: n.sx,
          y1: n.sy,
          x2: dest.x + offsetX,
          y2: dest.y + offsetY,
        });
      });
    });

    const filteredLabels = (zone.labels || [])
      .filter((l) => l.z === z)
      .map((l) => ({
        ...l,
        sx: l.x + offsetX,
        sy: l.y + offsetY,
      }));

    const w = zone.x_max + offsetX + 50;
    const h = zone.y_max + offsetY + 25;

    return {
      nodes: filteredNodes,
      labels: filteredLabels,
      arcs: arcLines,
      bounds: { w, h },
    };
  }, [zone, selectedLevel]);

  // Reset pan offset when current node changes (re-center on player)
  const prevNode = useRef(currentNode);
  if (currentNode !== prevNode.current) {
    prevNode.current = currentNode;
    setPanOffset(null);
  }

  // Initialize zoom on first render only; preserve across zone changes
  useEffect(() => {
    if (zoom || !bounds) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    const viewH = Math.min(bounds.h, 300);
    const viewW = viewH * aspect;
    setZoom({ w: viewW, h: viewH });
  }, [zone, bounds, zoom]);

  // Compute viewBox synchronously during render — no flash
  const currentNodeData = nodes.find((n) => n.id === currentNode);
  const vb = useMemo(() => {
    if (!bounds) return { x: 0, y: 0, w: 100, h: 100 };
    if (!zoom) return { x: 0, y: 0, w: bounds.w, h: bounds.h };

    const cx = currentNodeData ? currentNodeData.sx : bounds.w / 2;
    const cy = currentNodeData ? currentNodeData.sy : bounds.h / 2;
    const dx = panOffset ? panOffset.dx : 0;
    const dy = panOffset ? panOffset.dy : 0;

    return {
      x: cx - zoom.w / 2 + dx,
      y: cy - zoom.h / 2 + dy,
      w: zoom.w,
      h: zoom.h,
    };
  }, [bounds, zoom, currentNodeData, panOffset]);

  // Cull SVG elements to only those within the current viewBox + a small buffer.
  // A large zone like Crossing has ~2400 SVG elements; when zoomed in you might
  // only need ~50. Rooms are 4×4 units on a ~10-unit grid, so 20 units of buffer
  // is enough to keep connections to just-offscreen rooms from disappearing.
  const CULL_PAD = 20;
  const visibleNodes = useMemo(() => {
    if (!zoom) return nodes; // fully zoomed out — show everything
    const { x, y, w, h } = vb;
    return nodes.filter(
      (n) => n.sx >= x - CULL_PAD && n.sx <= x + w + CULL_PAD &&
             n.sy >= y - CULL_PAD && n.sy <= y + h + CULL_PAD
    );
  }, [nodes, vb, zoom]);

  const visibleArcs = useMemo(() => {
    if (!zoom) return arcs;
    const { x, y, w, h } = vb;
    return arcs.filter(
      (a) => (a.x1 >= x - CULL_PAD && a.x1 <= x + w + CULL_PAD && a.y1 >= y - CULL_PAD && a.y1 <= y + h + CULL_PAD) ||
             (a.x2 >= x - CULL_PAD && a.x2 <= x + w + CULL_PAD && a.y2 >= y - CULL_PAD && a.y2 <= y + h + CULL_PAD)
    );
  }, [arcs, vb, zoom]);

  const visibleLabels = useMemo(() => {
    if (!zoom) return labels;
    const { x, y, w, h } = vb;
    return labels.filter(
      (l) => l.sx >= x - CULL_PAD && l.sx <= x + w + CULL_PAD &&
             l.sy >= y - CULL_PAD && l.sy <= y + h + CULL_PAD
    );
  }, [labels, vb, zoom]);

  // Zoom handler
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => {
      if (!z || !bounds) return z;
      const factor = e.deltaY > 0 ? 1.15 : 0.87;
      return {
        w: Math.max(50, Math.min(z.w * factor, bounds.w * 2)),
        h: Math.max(50, Math.min(z.h * factor, bounds.h * 2)),
      };
    });
  }, [bounds]);

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, pan: panOffset };
  }, [panOffset]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !dragStart.current || !zoom) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const scaleX = zoom.w / rect.width;
    const scaleY = zoom.h / rect.height;
    const prevPan = dragStart.current.pan || { dx: 0, dy: 0 };
    setPanOffset({
      dx: prevPan.dx + (dragStart.current.x - e.clientX) * scaleX,
      dy: prevPan.dy + (dragStart.current.y - e.clientY) * scaleY,
    });
  }, [dragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  // Attach wheel event with passive: false
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    svgEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => svgEl.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  if (!zone) {
    return <div className="map-panel-empty">No map data</div>;
  }

  return (
    <div className="map-panel">
      <div className="map-toolbar">
        <span className="map-zone-title">{zone.name}</span>
        <button className="map-focus-btn" onClick={() => setPanOffset(null)} title="Center on current room">
          &#8982;
        </button>
      </div>
      {zone.levels.length > 1 && (
        <div className="map-level-selector">
          {zone.levels.map((z) => (
            <button
              key={z}
              className={`map-level-btn ${z === selectedLevel ? "active" : ""}`}
              onClick={() => setSelectedLevel(z)}
            >
              {z}
            </button>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Connection lines */}
        {visibleArcs.map((a, i) => (
          <line
            key={i}
            x1={a.x1 + 2}
            y1={a.y1 + 2}
            x2={a.x2 + 2}
            y2={a.y2 + 2}
            className="map-arc"
          />
        ))}

        {/* Cross-zone exit markers */}
        {visibleNodes
          .filter((n) => n.cross_zone)
          .map((n) => (
            <circle
              key={`cz-${n.id}`}
              cx={n.sx + 2}
              cy={n.sy + 2}
              r={6}
              className="map-cross-zone"
            />
          ))}

        {/* Room rectangles */}
        {visibleNodes.map((n) => (
          <rect
            key={n.id}
            x={n.sx}
            y={n.sy}
            width={4}
            height={4}
            className="map-room"
            fill={n.color || "#aaa"}
          />
        ))}

        {/* Labels (on top of rooms, offset down so text sits below the coordinate) */}
        {visibleLabels.map((l, i) => (
          <text key={i} x={l.sx + 6} y={l.sy + 12} className="map-label">
            {l.text}
          </text>
        ))}

        {/* Current room marker */}
        {currentNodeData && (
          <circle
            cx={currentNodeData.sx + 2}
            cy={currentNodeData.sy + 2}
            r={6}
            className="map-current"
          />
        )}
      </svg>
    </div>
  );
});

export default MapPanel;
