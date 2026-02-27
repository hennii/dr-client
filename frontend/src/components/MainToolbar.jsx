import React, { useState, useEffect, useRef } from "react";
import LogToggle from "./LogToggle";

const STATIC_PANELS = [
  { id: "room",    label: "Room" },
  { id: "map",     label: "Map" },
  { id: "exp",     label: "Experience" },
  { id: "thoughts",label: "Thoughts" },
  { id: "arrivals",label: "Arrivals" },
  { id: "spells",  label: "Active Spells" },
];

function PanelToggle({ hiddenPanels, onTogglePanel, scriptWindows }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const scriptPanels = Object.entries(scriptWindows || {}).map(([name, win]) => ({
    id: `script:${name}`,
    label: win.title || name,
  }));

  const allPanels = [...STATIC_PANELS, ...scriptPanels];

  return (
    <div className="toolbar-dropdown" ref={ref}>
      <button className="toolbar-dropdown-btn" onClick={() => setOpen(!open)} title="Toggle panels">
        Panels
      </button>
      {open && (
        <div className="toolbar-dropdown-menu">
          {allPanels.map(({ id, label }) => (
            <label key={id} className="toolbar-dropdown-item">
              <input
                type="checkbox"
                checked={!hiddenPanels.has(id)}
                onChange={() => onTogglePanel(id)}
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MainToolbar({ logStreams, sendMessage, hiddenPanels, onTogglePanel, scriptWindows, onOpenHighlights, onOpenPlayerServices }) {
  return (
    <div className="main-toolbar">
      <PanelToggle hiddenPanels={hiddenPanels} onTogglePanel={onTogglePanel} scriptWindows={scriptWindows} />
      <LogToggle logStreams={logStreams} sendMessage={sendMessage} />
      <button className="toolbar-dropdown-btn" onClick={onOpenHighlights} title="Text highlights">
        Highlights
      </button>
      <button className="toolbar-dropdown-btn" onClick={onOpenPlayerServices} title="Configure player context menu actions">
        PC Actions
      </button>
    </div>
  );
}
