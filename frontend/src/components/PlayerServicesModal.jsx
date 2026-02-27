import React, { useState } from "react";
import { usePlayerServices } from "../context/PlayerServicesContext";

export default function PlayerServicesModal({ onClose }) {
  const { services, addService, removeService, updateService } = usePlayerServices();

  const [title, setTitle] = useState("");
  const [command, setCommand] = useState("");
  const [editingId, setEditingId] = useState(null);

  function handleSubmit() {
    if (!title.trim() || !command.trim()) return;
    if (editingId) {
      updateService(editingId, title, command);
      cancelEdit();
    } else {
      addService(title, command);
      setTitle("");
      setCommand("");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  function startEdit(s) {
    setEditingId(s.id);
    setTitle(s.title);
    setCommand(s.command);
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setCommand("");
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">PC Actions</span>
          <button className="modal-close" onClick={onClose} title="Close">×</button>
        </div>

        {services.length === 0 ? (
          <div className="highlights-empty">No actions configured</div>
        ) : (
          <ul className="highlights-list">
            {services.map((s) => (
              <li
                key={s.id}
                className={`highlights-row${editingId === s.id ? " highlights-row-active" : ""}`}
                onClick={() => startEdit(s)}
              >
                <span className="highlight-text">{s.title}</span>
                <span className="player-service-command">{s.command}</span>
                <button
                  className="highlight-delete"
                  onClick={(e) => { e.stopPropagation(); removeService(s.id); }}
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
            placeholder="Title (e.g. Thief mark)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            type="text"
            className="highlights-add-input"
            placeholder="Command — use %p for player name"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
          />
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
