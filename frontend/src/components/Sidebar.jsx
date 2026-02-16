import React, { useState } from "react";
import RoomPanel from "./RoomPanel";
import ExpTracker from "./ExpTracker";
import StreamPanel from "./StreamPanel";
import Compass from "./Compass";

function CollapsiblePanel({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`sidebar-panel ${open ? "open" : "collapsed"}`}>
      <div className="sidebar-panel-header" onClick={() => setOpen(!open)}>
        <span className="panel-toggle">{open ? "\u25BC" : "\u25B6"}</span>
        <span className="panel-title">{title}</span>
      </div>
      {open && <div className="sidebar-panel-body">{children}</div>}
    </div>
  );
}

function ScriptWindowPanel({ lines }) {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="script-window-panel">
      <div className="script-window-content" ref={containerRef}>
        {lines.length === 0 ? (
          <div className="stream-empty">Empty</div>
        ) : (
          lines.map((text, i) => (
            <div
              key={i}
              className="script-window-line"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ room, exp, streams, activeSpells, compass, scriptWindows, onMove }) {
  return (
    <div className="sidebar">
      <CollapsiblePanel title="Room">
        <RoomPanel room={room} />
      </CollapsiblePanel>
      <CollapsiblePanel title="Compass">
        <Compass compass={compass} onMove={onMove} />
      </CollapsiblePanel>
      <CollapsiblePanel title="Experience">
        <ExpTracker exp={exp} />
      </CollapsiblePanel>
      <CollapsiblePanel title="Thoughts" defaultOpen={false}>
        <StreamPanel title="Thoughts" lines={streams.thoughts || []} />
      </CollapsiblePanel>
      <CollapsiblePanel title="Active Spells" defaultOpen={false}>
        <div className="active-spells-text">
          {activeSpells || "No active spells"}
        </div>
      </CollapsiblePanel>
      {Object.entries(scriptWindows || {}).map(([name, win]) => (
        <CollapsiblePanel key={name} title={win.title || name}>
          <ScriptWindowPanel lines={win.lines} />
        </CollapsiblePanel>
      ))}
    </div>
  );
}
