import React, { useState, useEffect, useRef, memo } from "react";
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

const MINI_DIRS = ["nw","n","ne","w","e","sw","s","se"];
const MINI_EXTRAS = ["up","down","out"];
const DIR_LABELS = {
  n:"N", ne:"NE", e:"E", se:"SE",
  s:"S", sw:"SW", w:"W", nw:"NW",
  up:"U", down:"D", out:"O",
};

function MiniCompass({ compass, onMove }) {
  const exitSet = new Set(compass || []);
  return (
    <div className="mini-compass">
      <div className="mini-compass-grid">
        {MINI_DIRS.map((dir) => {
          const active = exitSet.has(dir);
          return (
            <button
              key={dir}
              className={`mini-compass-cell ${active ? "active" : "inactive"}`}
              onClick={() => active && onMove(dir)}
              disabled={!active}
            >
              {DIR_LABELS[dir]}
            </button>
          );
        })}
      </div>
      <div className="mini-compass-extras">
        {MINI_EXTRAS.map((dir) => {
          const active = exitSet.has(dir);
          return (
            <button
              key={dir}
              className={`mini-compass-cell ${active ? "active" : "inactive"}`}
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

const Toolbar = memo(function Toolbar({ vitals, hands, spell, indicators, roundtime, casttime, compass, onMove, logStreams, sendMessage }) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <HandsDisplay hands={hands} />
        <StatusIndicators indicators={indicators} />
        <SpellDisplay spell={spell} />
        <RoundtimeBars roundtime={roundtime} casttime={casttime} />
        <MiniCompass compass={compass} onMove={onMove} />
        <LogToggle logStreams={logStreams} sendMessage={sendMessage} />
      </div>
      <div className="toolbar-row">
        <VitalsBar vitals={vitals} />
      </div>
    </div>
  );
});

export default Toolbar;
