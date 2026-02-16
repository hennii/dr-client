import React, { useRef, useEffect, useState } from "react";

export default function GameText({ lines }) {
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
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(atBottom);
  }

  return (
    <div className="game-text" ref={containerRef} onScroll={handleScroll}>
      {lines.map((line, i) => {
        const classes = [
          "game-line",
          line.style && `style-${line.style}`,
          line.bold && "bold",
          line.mono && "mono",
          line.streamId && `stream-${line.streamId}`,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={i} className={classes}>
            {line.text}
          </div>
        );
      })}
    </div>
  );
}
