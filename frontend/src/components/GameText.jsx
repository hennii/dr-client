import React, { useRef, useLayoutEffect, useCallback, useState, memo } from "react";
import { useHighlights } from "../context/HighlightsContext";
import { applyHighlights } from "../utils/applyHighlights";

function renderHighlighted(text, highlights) {
  const parts = applyHighlights(text, highlights);
  if (!parts) return text;
  return parts.map((p, i) =>
    p.color
      ? <span key={i} style={{ color: p.color }}>{p.text}</span>
      : <React.Fragment key={i}>{p.text}</React.Fragment>
  );
}

// Renders a single game line. memo() means React skips re-rendering this
// component if the `line` prop reference hasn't changed — which is the common
// case when the sliding window advances (only the new/removed line changes).
const GameLine = memo(function GameLine({ line }) {
  const { highlights } = useHighlights();

  if (line.prompt) {
    return <div className="game-line game-line-prompt">{"\u00A0"}</div>;
  }
  if (line.segments) {
    return (
      <div className={`game-line${line.streamId ? ` stream-${line.streamId}` : ""}`}>
        {line.segments.map((seg, j, arr) => {
          // Add space between segments when boundary has no whitespace
          const prev = arr[j - 1];
          const needsSpace = prev
            && prev.text.length > 0
            && seg.text.length > 0
            && !/\s$/.test(prev.text)
            && !/^\s/.test(seg.text)
            && !/^[,.!?;:'")\]]/.test(seg.text);
          const classes = [
            seg.style && `style-${seg.style}`,
            seg.bold && "bold",
            seg.mono && "mono",
          ].filter(Boolean).join(" ");
          const text = needsSpace ? " " + seg.text : seg.text;
          return classes ? (
            <span key={j} className={classes}>{renderHighlighted(text, highlights)}</span>
          ) : (
            <span key={j}>{renderHighlighted(text, highlights)}</span>
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
  return <div className={classes}>{renderHighlighted(line.text, highlights)}</div>;
});

const GameText = memo(function GameText({ lines, onClick }) {
  const containerRef = useRef(null);
  const autoScroll = useRef(true);
  const programmaticScroll = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Scroll before browser paints so the user never sees unscrolled content
  useLayoutEffect(() => {
    if (autoScroll.current && containerRef.current) {
      programmaticScroll.current = true;
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setShowScrollBtn(false);
    }
  }, [lines]);

  const handleScroll = useCallback(() => {
    if (programmaticScroll.current) {
      programmaticScroll.current = false;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    autoScroll.current = atBottom;
    setShowScrollBtn(!atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    autoScroll.current = true;
    programmaticScroll.current = true;
    el.scrollTop = el.scrollHeight;
    setShowScrollBtn(false);
  }, []);

  return (
    <div className="game-text-wrap">
      <div className="game-text" ref={containerRef} onScroll={handleScroll} onMouseUp={() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) onClick?.();
      }}>
        {lines.map((line) => (
          <GameLine key={line.id} line={line} />
        ))}
      </div>
      {showScrollBtn && (
        <button className="scroll-to-bottom-btn" onClick={scrollToBottom} title="Scroll to bottom">
          &#x25BC;
        </button>
      )}
    </div>
  );
});

export default GameText;
