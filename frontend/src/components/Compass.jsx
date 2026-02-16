import React from "react";

const DIRECTIONS = [
  [null, "nw", "n", "ne", null],
  [null, "w", null, "e", null],
  [null, "sw", "s", "se", null],
];

const DIR_LABELS = {
  n: "N", ne: "NE", e: "E", se: "SE",
  s: "S", sw: "SW", w: "W", nw: "NW",
  up: "Up", down: "Dn", out: "Out",
};

export default function Compass({ compass, onMove }) {
  const exitSet = new Set(compass || []);

  return (
    <div className="compass">
      <div className="compass-grid">
        {DIRECTIONS.flat().map((dir, i) => {
          if (!dir) return <div key={i} className="compass-cell empty" />;
          const active = exitSet.has(dir);
          return (
            <button
              key={dir}
              className={`compass-cell compass-dir ${active ? "active" : "inactive"}`}
              onClick={() => active && onMove(dir)}
              disabled={!active}
              title={dir}
            >
              {DIR_LABELS[dir]}
            </button>
          );
        })}
      </div>
      <div className="compass-extras">
        {["up", "down", "out"].map((dir) => {
          const active = exitSet.has(dir);
          return (
            <button
              key={dir}
              className={`compass-extra ${active ? "active" : "inactive"}`}
              onClick={() => active && onMove(dir)}
              disabled={!active}
            >
              {DIR_LABELS[dir]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
