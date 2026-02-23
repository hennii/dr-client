import React, { createContext, useContext, useEffect, useState } from "react";

const HighlightsContext = createContext({
  highlights: [],
  presets: [],
  addHighlight: () => {},
  removeHighlight: () => {},
  updateHighlight: () => {},
  addPreset: () => {},
  removePreset: () => {},
  updatePreset: () => {},
});

export function HighlightsProvider({ children }) {
  const [highlights, setHighlights] = useState([]);
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    fetch("/settings")
      .then((r) => r.json())
      .then((data) => {
        setHighlights(data.highlights || []);
        setPresets(data.presets || []);
      })
      .catch(() => {});
  }, []);

  function save(newHighlights, newPresets) {
    setHighlights(newHighlights);
    setPresets(newPresets);
    fetch("/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlights: newHighlights, presets: newPresets }),
    }).catch(() => {});
  }

  function addHighlight(text, color) {
    const trimmed = text.trim();
    if (!trimmed) return;
    save([...highlights, { id: Date.now().toString(), text: trimmed, color }], presets);
  }

  function removeHighlight(id) {
    save(highlights.filter((h) => h.id !== id), presets);
  }

  function updateHighlight(id, text, color) {
    const trimmed = text.trim();
    if (!trimmed) return;
    save(highlights.map((h) => h.id === id ? { ...h, text: trimmed, color } : h), presets);
  }

  function addPreset(name, color) {
    const newPreset = { id: Date.now().toString(), name, color };
    save(highlights, [...presets, newPreset]);
    return newPreset.id;
  }

  function removePreset(id) {
    save(highlights, presets.filter((p) => p.id !== id));
  }

  function updatePreset(id, name) {
    save(highlights, presets.map((p) => p.id === id ? { ...p, name } : p));
  }

  return (
    <HighlightsContext.Provider value={{
      highlights, presets,
      addHighlight, removeHighlight, updateHighlight,
      addPreset, removePreset, updatePreset,
    }}>
      {children}
    </HighlightsContext.Provider>
  );
}

export function useHighlights() {
  return useContext(HighlightsContext);
}
