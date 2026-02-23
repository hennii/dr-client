import React, { useEffect, useRef, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { useHighlights } from "../context/HighlightsContext";

export default function HighlightsModal({ onClose }) {
  const {
    highlights, presets,
    addHighlight, removeHighlight, updateHighlight,
    addPreset, removePreset, updatePreset,
  } = useHighlights();

  const [text, setText] = useState("");
  const [color, setColor] = useState("#ffff00");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [editingPresetName, setEditingPresetName] = useState("");
  const colorPickerRef = useRef(null);

  useEffect(() => {
    if (!colorPickerOpen) return;
    function handleMouseDown(e) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setColorPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [colorPickerOpen]);

  function handleSubmit() {
    if (!text.trim()) return;
    if (editingId) {
      updateHighlight(editingId, text, color);
      cancelEdit();
    } else {
      addHighlight(text, color);
      setText("");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  function startEditHighlight(h) {
    setText(h.text);
    setColor(h.color);
    setEditingId(h.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setText("");
    setColor("#ffff00");
    setColorPickerOpen(false);
  }

  function handleAddPreset() {
    const id = addPreset("New", color);
    setEditingPresetId(id);
    setEditingPresetName("New");
  }

  function startEditPresetName(p) {
    setEditingPresetId(p.id);
    setEditingPresetName(p.name);
  }

  function commitPresetName(id) {
    const name = editingPresetName.trim() || "New";
    updatePreset(id, name);
    setEditingPresetId(null);
    setEditingPresetName("");
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

        <div className="presets-section">
          <span className="presets-label">Color presets:</span>
          {presets.map((p) => (
            <span key={p.id} className="preset-chip">
              <span
                className="preset-swatch"
                style={{ backgroundColor: p.color }}
                onClick={() => setColor(p.color)}
              />
              {editingPresetId === p.id ? (
                <input
                  className="preset-name-input"
                  value={editingPresetName}
                  onChange={(e) => setEditingPresetName(e.target.value)}
                  onBlur={() => commitPresetName(p.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitPresetName(p.id); }}
                  autoFocus
                />
              ) : (
                <span className="preset-name" onClick={() => startEditPresetName(p)}>{p.name}</span>
              )}
              <button className="preset-delete" onClick={() => removePreset(p.id)}>×</button>
            </span>
          ))}
          <button className="presets-add-btn" onClick={handleAddPreset}>+</button>
        </div>

        {highlights.length === 0 ? (
          <div className="highlights-empty">No highlights yet</div>
        ) : (
          <ul className="highlights-list">
            {highlights.map((h) => (
              <li
                key={h.id}
                className={`highlights-row${editingId === h.id ? " highlights-row-active" : ""}`}
                onClick={() => startEditHighlight(h)}
              >
                <span
                  className="highlight-swatch"
                  style={{ backgroundColor: h.color }}
                />
                <span className="highlight-text">{h.text}</span>
                <button
                  className="highlight-delete"
                  onClick={(e) => { e.stopPropagation(); removeHighlight(h.id); }}
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
          <div className="color-picker-wrapper" ref={colorPickerRef}>
            <button
              className="color-picker-swatch"
              style={{ backgroundColor: color }}
              onClick={() => setColorPickerOpen(v => !v)}
              title="Pick color"
            />
            {colorPickerOpen && (
              <div className="color-picker-popover">
                <HexColorPicker color={color} onChange={setColor} />
                <div className="color-picker-footer">
                  <HexColorInput className="color-picker-hex-input" color={color} onChange={setColor} prefixed />
                  <button className="color-picker-done-btn" onClick={() => setColorPickerOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
          <button className="highlights-add-btn" onClick={handleSubmit}>
            {editingId ? "Save" : "Add"}
          </button>
          {editingId && (
            <button className="form-cancel-btn" onClick={cancelEdit}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
