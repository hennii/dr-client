import React from "react";

export default function SpellDisplay({ spell }) {
  return (
    <div className="spell-display">
      <span className="spell-label">Spell:</span>{" "}
      <span className={spell ? "spell-active" : "spell-none"}>
        {spell || "None"}
      </span>
    </div>
  );
}
