import React, { useRef, useLayoutEffect, useCallback } from "react";

export default function GameText({ lines, onClick }) {
  const containerRef = useRef(null);
  const autoScroll = useRef(true);
  const programmaticScroll = useRef(false);

  // Scroll before browser paints so the user never sees unscrolled content
  useLayoutEffect(() => {
    if (autoScroll.current && containerRef.current) {
      programmaticScroll.current = true;
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const handleScroll = useCallback(() => {
    if (programmaticScroll.current) {
      programmaticScroll.current = false;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, []);

  return (
    <div className="game-text" ref={containerRef} onScroll={handleScroll} onClick={onClick}>
      {lines.map((line, i) => {
        if (line.segments) {
          return (
            <div key={i} className={`game-line${line.streamId ? ` stream-${line.streamId}` : ""}`}>
              {line.segments.map((seg, j) => {
                const classes = [
                  seg.style && `style-${seg.style}`,
                  seg.bold && "bold",
                  seg.mono && "mono",
                ].filter(Boolean).join(" ");
                return classes ? (
                  <span key={j} className={classes}>{seg.text}</span>
                ) : (
                  <span key={j}>{seg.text}</span>
                );
              })}
            </div>
          );
        }
        const classes = [
          "game-line",
          line.style && `style-${line.style}`,
          line.bold && "bold",
          line.mono && "mono",
        ].filter(Boolean).join(" ");
        return (
          <div key={i} className={classes}>{line.text}</div>
        );
      })}
    </div>
  );
}
