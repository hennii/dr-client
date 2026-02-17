import React, { useState } from "react";

const ALL_STREAMS = ["main", "thoughts", "combat", "arrivals", "deaths", "raw"];

export default function LogToggle({ logStreams, sendMessage }) {
  const [open, setOpen] = useState(false);

  const toggle = (stream) => {
    const enabled = !logStreams.includes(stream);
    sendMessage({ type: "log_toggle", stream, enabled });
  };

  return (
    <div className="log-toggle">
      <button
        className="log-toggle-btn"
        onClick={() => setOpen(!open)}
        title="Toggle logging"
      >
        LOG
      </button>
      {open && (
        <div className="log-toggle-menu">
          {ALL_STREAMS.map((stream) => (
            <label key={stream} className="log-toggle-item">
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
