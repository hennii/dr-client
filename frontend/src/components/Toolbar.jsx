import React from "react";
import HandsDisplay from "./HandsDisplay";
import SpellDisplay from "./SpellDisplay";
import StatusIndicators from "./StatusIndicators";
import VitalsBar from "./VitalsBar";

export default function Toolbar({ vitals, hands, spell, indicators }) {
  return (
    <div className="toolbar">
      <HandsDisplay hands={hands} />
      <SpellDisplay spell={spell} />
      <StatusIndicators indicators={indicators} />
      <VitalsBar vitals={vitals} />
    </div>
  );
}
