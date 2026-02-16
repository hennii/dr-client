import React, { useRef, useEffect, useState } from "react";

export default function StreamPanel({ title, lines }) {
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
              {line.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
