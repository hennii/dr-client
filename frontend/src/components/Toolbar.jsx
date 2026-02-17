import React from "react";
import HandsDisplay from "./HandsDisplay";
import SpellDisplay from "./SpellDisplay";
import StatusIndicators from "./StatusIndicators";
import VitalsBar from "./VitalsBar";
import LogToggle from "./LogToggle";

export default function Toolbar({ vitals, hands, spell, indicators, logStreams, sendMessage }) {
  return (
    <div className="toolbar">
      <HandsDisplay hands={hands} />
      <SpellDisplay spell={spell} />
      <StatusIndicators indicators={indicators} />
      <VitalsBar vitals={vitals} />
      <LogToggle logStreams={logStreams} sendMessage={sendMessage} />
    </div>
  );
}
