import React, { useState } from "react";
import { useHighlights } from "../context/HighlightsContext";

export default function HighlightsModal({ onClose }) {
  const { highlights, addHighlight, removeHighlight } = useHighlights();
  const [text, setText] = useState("");
  const [color, setColor] = useState("#ffff00");

  function handleAdd() {
    if (!text.trim()) return;
    addHighlight(text, color);
    setText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleAdd();
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Text Highlights</span>
          <button className="modal-close" onClick={onClose} title="Close">×</button>
        </div>

        {highlights.length === 0 ? (
          <div className="highlights-empty">No highlights yet</div>
        ) : (
          <ul className="highlights-list">
            {highlights.map((h) => (
              <li key={h.id} className="highlights-row">
                <span
                  className="highlight-swatch"
                  style={{ backgroundColor: h.color }}
                />
                <span className="highlight-text">{h.text}</span>
                <button
                  className="highlight-delete"
                  onClick={() => removeHighlight(h.id)}
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="highlights-add">
          <input
            type="text"
            className="highlights-add-input"
            placeholder="Text to highlight…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            type="color"
            className="highlights-add-color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            title="Pick color"
          />
          <button className="highlights-add-btn" onClick={handleAdd}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
