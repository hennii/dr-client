import React, { useRef, useEffect, useState } from "react";

// LNet: [Channel]-Game:Player: "message"
const LNET_RE = /^(\[[^\]]+\]-[^:]+:[^:]+:)\s*(.*)/;
// ESP: [Channel][Player] "message"
const ESP_RE = /^(\[[^\]]+\]\[[^\]]+\])\s*(.*)/;

function ThoughtLine({ text }) {
  let match;
  if ((match = text.match(LNET_RE))) {
    return (
      <>
        <span className="thought-lnet-prefix">{match[1]}</span> {match[2]}
      </>
    );
  }
  if ((match = text.match(ESP_RE))) {
    return (
      <>
        <span className="thought-esp-prefix">{match[1]}</span> {match[2]}
      </>
    );
  }
  return text;
}

export default function StreamPanel({ title, lines, colorizeThoughts }) {
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAutoScroll(atBottom);
  }

  return (
    <div className="stream-panel">
      <div className="stream-content" ref={containerRef} onScroll={handleScroll}>
        {(!lines || lines.length === 0) ? (
          <div className="stream-empty">No {title.toLowerCase()} yet</div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="stream-line">
              {colorizeThoughts ? <ThoughtLine text={line.text} /> : line.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
