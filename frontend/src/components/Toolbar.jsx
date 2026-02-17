import React, { useState, useEffect, useRef } from "react";
import HandsDisplay from "./HandsDisplay";
import SpellDisplay from "./SpellDisplay";
import StatusIndicators from "./StatusIndicators";
import VitalsBar from "./VitalsBar";
import LogToggle from "./LogToggle";

function TimerBar({ remaining, duration, className, label }) {
  const pct = duration > 0 ? Math.min((remaining / duration) * 100, 100) : 0;

  return (
    <div className="rt-bar">
      {remaining > 0 && (
        <>
          <div className={`rt-fill ${className}`} style={{ width: `${pct}%` }} />
          <span className="rt-label">{Math.ceil(remaining)}s {label}</span>
        </>
      )}
    </div>
  );
}

function RoundtimeBars({ roundtime, casttime }) {
  const [now, setNow] = useState(() => Date.now() / 1000);
  const rtDuration = useRef(0);
  const ctDuration = useRef(0);
  const prevRt = useRef(null);
  const prevCt = useRef(null);

  // Capture total duration when a new timer starts
  if (roundtime !== prevRt.current) {
    prevRt.current = roundtime;
    if (roundtime) {
      rtDuration.current = Math.max(0, roundtime - Date.now() / 1000);
    }
  }
  if (casttime !== prevCt.current) {
    prevCt.current = casttime;
    if (casttime) {
      ctDuration.current = Math.max(0, casttime - Date.now() / 1000);
    }
  }

  useEffect(() => {
    if (!roundtime && !casttime) return;
    const id = setInterval(() => setNow(Date.now() / 1000), 100);
    return () => clearInterval(id);
  }, [roundtime, casttime]);

  const rtRemaining = roundtime ? Math.max(0, roundtime - now) : 0;
  const ctRemaining = casttime ? Math.max(0, casttime - now) : 0;

  return (
    <>
      <TimerBar remaining={rtRemaining} duration={rtDuration.current} className="rt-roundtime" label="RT" />
      <TimerBar remaining={ctRemaining} duration={ctDuration.current} className="rt-casttime" label="CT" />
    </>
  );
}

export default function Toolbar({ vitals, hands, spell, indicators, roundtime, casttime, logStreams, sendMessage }) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <HandsDisplay hands={hands} />
        <StatusIndicators indicators={indicators} />
        <SpellDisplay spell={spell} />
        <RoundtimeBars roundtime={roundtime} casttime={casttime} />
        <LogToggle logStreams={logStreams} sendMessage={sendMessage} />
      </div>
      <div className="toolbar-row">
        <VitalsBar vitals={vitals} />
      </div>
    </div>
  );
}
