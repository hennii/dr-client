import React from "react";

const VITAL_CONFIG = [
  { id: "health", label: "H", color: null },
  { id: "mana", label: "M", color: "#4488cc" },
  { id: "concentration", label: "C", color: "#66aacc" },
  { id: "stamina", label: "F", color: "#ccaa44" },
  { id: "spirit", label: "S", color: "#aa77bb" },
];

function healthColor(value) {
  if (value > 66) return "#44bb44";
  if (value > 33) return "#ccaa44";
  if (value > 15) return "#cc7733";
  return "#cc4444";
}

export default function VitalsBar({ vitals }) {
  return (
    <div className="vitals-bar">
      {VITAL_CONFIG.map(({ id, label, color }) => {
        const value = vitals[id] ?? 100;
        const barColor = id === "health" ? healthColor(value) : color;
        return (
          <div key={id} className="vital" title={`${label}: ${value}%`}>
            <span className="vital-label">{label}</span>
            <div className="vital-track">
              <div
                className="vital-fill"
                style={{ width: `${value}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="vital-pct">{value}%</span>
          </div>
        );
      })}
    </div>
  );
}
