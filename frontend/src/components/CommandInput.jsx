import React, { useState, useRef, useCallback, useEffect } from "react";

function RoundtimeBar({ roundtime, casttime }) {
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    if (!roundtime && !casttime) return;
    const id = setInterval(() => setNow(Date.now() / 1000), 100);
    return () => clearInterval(id);
  }, [roundtime, casttime]);

  const rtRemaining = roundtime ? Math.max(0, roundtime - now) : 0;
  const ctRemaining = casttime ? Math.max(0, casttime - now) : 0;

  if (rtRemaining <= 0 && ctRemaining <= 0) return null;

  const maxDuration = 30;
  const rtPct = Math.min((rtRemaining / maxDuration) * 100, 100);
  const ctPct = Math.min((ctRemaining / maxDuration) * 100, 100);

  return (
    <div className="rt-bar-container">
      {rtRemaining > 0 && (
        <div className="rt-bar">
          <div className="rt-fill rt-roundtime" style={{ width: `${rtPct}%` }} />
          <span className="rt-label">{Math.ceil(rtRemaining)}s RT</span>
        </div>
      )}
      {ctRemaining > 0 && (
        <div className="rt-bar">
          <div className="rt-fill rt-casttime" style={{ width: `${ctPct}%` }} />
          <span className="rt-label">{Math.ceil(ctRemaining)}s CT</span>
        </div>
      )}
    </div>
  );
}

export default function CommandInput({ onSend, roundtime, casttime }) {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = value.trim();
        if (cmd) {
          onSend(cmd);
          setHistory((prev) => [cmd, ...prev].slice(0, 100));
        } else {
          onSend("");
        }
        setValue("");
        setHistoryIndex(-1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHistoryIndex((prev) => {
          const next = Math.min(prev + 1, history.length - 1);
          if (next >= 0 && next < history.length) {
            setValue(history[next]);
          }
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHistoryIndex((prev) => {
          const next = prev - 1;
          if (next < 0) {
            setValue("");
            return -1;
          }
          setValue(history[next]);
          return next;
        });
      }
    },
    [value, history, onSend]
  );

  return (
    <div className="command-area">
      <RoundtimeBar roundtime={roundtime} casttime={casttime} />
      <div className="command-input">
        <span className="prompt-char">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
