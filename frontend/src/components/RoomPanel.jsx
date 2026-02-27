import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePlayerServices } from "../context/PlayerServicesContext";

const ALSO_HERE = "Also here: ";

// Room players are plain text with no markup. Player title+name groups are
// runs of consecutive Title-Case words; descriptions ("who is...", "that is...")
// use lowercase, so they naturally terminate each run. The last word of each
// capitalized-word run is the character's name.
function renderPlayers(html, onInsertText, onContextMenu) {
  if (!onInsertText || !html.startsWith(ALSO_HERE)) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  const content = html.slice(ALSO_HERE.length);
  const parts = [];
  const regex = /[A-Z][a-zA-Z'-]*(?:\s+[A-Z][a-zA-Z'-]*)*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    const words = match[0].split(/\s+/);
    const name = words[words.length - 1];
    const titlePrefix = words.slice(0, -1).join(" ");
    parts.push({ type: "player", titlePrefix, name });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return (
    <>
      <span>{ALSO_HERE}</span>
      {parts.map((part, i) =>
        part.type === "text" ? (
          <span key={i}>{part.content}</span>
        ) : (
          <span key={i}>
            {part.titlePrefix && part.titlePrefix + " "}
            <span
              className="room-player-name"
              onClick={() => { onInsertText(part.name); navigator.clipboard.writeText(part.name); }}
              onContextMenu={(e) => { e.preventDefault(); onContextMenu(part.name, e.clientX, e.clientY); }}
            >{part.name}</span>
          </span>
        )
      )}
    </>
  );
}

export default function RoomPanel({ room, onInsertText, send, addToHistoryRef }) {
  const { services } = usePlayerServices();
  const [ctxMenu, setCtxMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!ctxMenu) return;
    function handleMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setCtxMenu(null);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ctxMenu]);

  function handleContextMenu(name, x, y) {
    setCtxMenu({ name, x, y });
  }

  return (
    <div className="room-panel">
      {room.title && (
        <div className="room-title">{room.title}</div>
      )}
{room.objs && (
        <div className="room-objs">
          <span dangerouslySetInnerHTML={{ __html: room.objs }} />
        </div>
      )}
      {room.players && (
        <div className="room-players">
          {renderPlayers(room.players, onInsertText, handleContextMenu)}
        </div>
      )}
      {room.exits && (
        <div className="room-exits">
          <span className="room-section-label">Exits: </span>
          <span dangerouslySetInnerHTML={{ __html: room.exits }} />
        </div>
      )}
      {ctxMenu && createPortal(
        <div ref={menuRef} className="player-ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          {services.map((s) => (
            <div
              key={s.id}
              className="player-ctx-menu-item"
              onClick={() => { const cmd = s.command.replace(/%p/g, ctxMenu.name); send(cmd); addToHistoryRef?.current?.(cmd); navigator.clipboard.writeText(ctxMenu.name); setCtxMenu(null); }}
            >
              {s.title}
            </div>
          ))}
          {services.length === 0 && (
            <div className="player-ctx-menu-item player-ctx-menu-empty">No actions configured</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
