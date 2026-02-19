import React, { useState, useEffect, useRef } from "react";

const ALL_STREAMS = ["main", "thoughts", "combat", "arrivals", "deaths", "raw"];

export default function LogToggle({ logStreams, sendMessage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (stream) => {
    const enabled = !logStreams.includes(stream);
    sendMessage({ type: "log_toggle", stream, enabled });
  };

  return (
    <div className="toolbar-dropdown" ref={ref}>
      <button
        className="toolbar-dropdown-btn"
        onClick={() => setOpen(!open)}
        title="Toggle logging"
      >
        Log
      </button>
      {open && (
        <div className="toolbar-dropdown-menu">
          {ALL_STREAMS.map((stream) => (
            <label key={stream} className="toolbar-dropdown-item">
              <input
                type="checkbox"
                checked={logStreams.includes(stream)}
                onChange={() => toggle(stream)}
              />
              {stream}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
