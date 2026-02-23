import React, { createContext, useContext, useEffect, useState } from "react";

const HighlightsContext = createContext({ highlights: [], addHighlight: () => {}, removeHighlight: () => {} });

export function HighlightsProvider({ children }) {
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    fetch("/settings")
      .then((r) => r.json())
      .then((data) => setHighlights(data.highlights || []))
      .catch(() => {});
  }, []);

  function save(newHighlights) {
    setHighlights(newHighlights);
    fetch("/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlights: newHighlights }),
    }).catch(() => {});
  }

  function addHighlight(text, color) {
    const trimmed = text.trim();
    if (!trimmed) return;
    save([...highlights, { id: Date.now().toString(), text: trimmed, color }]);
  }

  function removeHighlight(id) {
    save(highlights.filter((h) => h.id !== id));
  }

  return (
    <HighlightsContext.Provider value={{ highlights, addHighlight, removeHighlight }}>
      {children}
    </HighlightsContext.Provider>
  );
}

export function useHighlights() {
  return useContext(HighlightsContext);
}
