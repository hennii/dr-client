import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";

export default function MapPanel({ zone, currentNode, level }) {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState(null);
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

  // Auto-center on current node
  useEffect(() => {
    if (!zone || !bounds) return;
    const node = nodes.find((n) => n.id === currentNode);
    if (!node) return;

    setViewBox((prev) => {
      // Preserve current zoom level if we already have a viewBox
      if (prev) {
        return {
          x: node.sx - prev.w / 2,
          y: node.sy - prev.h / 2,
          w: prev.w,
          h: prev.h,
        };
      }
      // Initial view size
      const svgEl = svgRef.current;
      if (!svgEl) return prev;
      const rect = svgEl.getBoundingClientRect();
      const aspect = rect.width / rect.height;
      const viewH = Math.min(bounds.h, 300);
      const viewW = viewH * aspect;
      return {
        x: node.sx - viewW / 2,
        y: node.sy - viewH / 2,
        w: viewW,
        h: viewH,
      };
    });
  }, [currentNode, zone, bounds, nodes]);

  // Zoom handler
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setViewBox((vb) => {
      if (!vb) return vb;
      const factor = e.deltaY > 0 ? 1.15 : 0.87;
      const newW = Math.max(50, Math.min(vb.w * factor, bounds.w * 2));
      const newH = Math.max(50, Math.min(vb.h * factor, bounds.h * 2));
      // Zoom toward center
      return {
        x: vb.x + (vb.w - newW) / 2,
        y: vb.y + (vb.h - newH) / 2,
        w: newW,
        h: newH,
      };
    });
  }, [bounds]);

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, vb: viewBox };
  }, [viewBox]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const vb = dragStart.current.vb;
    if (!vb) return;
    const scaleX = vb.w / rect.width;
    const scaleY = vb.h / rect.height;
    const dx = (dragStart.current.x - e.clientX) * scaleX;
    const dy = (dragStart.current.y - e.clientY) * scaleY;
    setViewBox({
      x: vb.x + dx,
      y: vb.y + dy,
      w: vb.w,
      h: vb.h,
    });
  }, [dragging]);

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

  const vb = viewBox || { x: 0, y: 0, w: bounds.w, h: bounds.h };

  return (
    <div className="map-panel">
      <div className="map-zone-title">{zone.name}</div>
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
        {arcs.map((a, i) => (
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
        {nodes
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
        {nodes.map((n) => (
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
        {labels.map((l, i) => (
          <text key={i} x={l.sx} y={l.sy + 12} className="map-label">
            {l.text}
          </text>
        ))}

        {/* Current room marker */}
        {nodes.find((n) => n.id === currentNode) && (() => {
          const cn = nodes.find((n) => n.id === currentNode);
          return (
            <circle
              cx={cn.sx + 2}
              cy={cn.sy + 2}
              r={6}
              className="map-current"
            />
          );
        })()}
      </svg>
    </div>
  );
}
