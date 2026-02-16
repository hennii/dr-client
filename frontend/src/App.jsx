import React, { useRef, useCallback, useState } from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import Toolbar from "./components/Toolbar";
import GameText from "./components/GameText";
import CommandInput from "./components/CommandInput";
import Sidebar from "./components/Sidebar";

const LAYOUT_KEY = "dr-client-layout";
const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveLayout(updates) {
  try {
    const current = loadLayout();
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ ...current, ...updates }));
  } catch {}
}

export default function App() {
  const {
    gameLines, vitals, room, compass, hands, spell, indicators,
    connected, exp, activeSpells, streams, scriptWindows, roundtime, casttime, send,
  } = useGameSocket();

  const inputRef = useRef(null);
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const layout = loadLayout();
    return layout.sidebarWidth || DEFAULT_SIDEBAR_WIDTH;
  });

  const dragging = useRef(false);

  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth));
      setSidebarWidth(clamped);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      setSidebarWidth((w) => {
        saveLayout({ sidebarWidth: w });
        return w;
      });
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div
      className="app"
      style={{ gridTemplateColumns: `1fr 4px ${sidebarWidth}px` }}
    >
      <GameText lines={gameLines} onClick={focusInput} />
      <Toolbar
        vitals={vitals}
        hands={hands}
        spell={spell}
        indicators={indicators}
      />
      <CommandInput onSend={send} roundtime={roundtime} casttime={casttime} inputRef={inputRef} />
      <div className="sidebar-divider" onMouseDown={onDividerMouseDown} />
      <Sidebar
        room={room}
        exp={exp}
        streams={streams}
        activeSpells={activeSpells}
        compass={compass}
        scriptWindows={scriptWindows}
        onMove={send}
      />
    </div>
  );
}
