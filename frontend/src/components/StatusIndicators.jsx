import React from "react";

const INDICATOR_CONFIG = [
  { id: "IconSTANDING", label: "Stand", type: "good" },
  { id: "IconKNEELING", label: "Kneel", type: "neutral" },
  { id: "IconSITTING", label: "Sit", type: "neutral" },
  { id: "IconPRONE", label: "Prone", type: "bad" },
  { id: "IconHIDDEN", label: "Hide", type: "good" },
  { id: "IconINVISIBLE", label: "Invis", type: "good" },
  { id: "IconDEAD", label: "DEAD", type: "bad" },
  { id: "IconSTUNNED", label: "Stun", type: "bad" },
  { id: "IconBLEEDING", label: "Bleed", type: "bad" },
  { id: "IconWEBBED", label: "Web", type: "bad" },
  { id: "IconJOINED", label: "Join", type: "neutral" },
];

export default function StatusIndicators({ indicators }) {
  const active = INDICATOR_CONFIG.filter(
    ({ id }) => indicators[id] === true
  );

  if (active.length === 0) return null;

  return (
    <div className="status-indicators">
      {active.map(({ id, label, type }) => (
        <span key={id} className={`status-badge status-${type}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
