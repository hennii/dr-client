import React from "react";

export default function HandsDisplay({ hands }) {
  return (
    <div className="hands-display">
      <span className="hand" title="Left hand">
        <span className="hand-label">L:</span> {hands.left || "Empty"}
      </span>
      <span className="hand" title="Right hand">
        <span className="hand-label">R:</span> {hands.right || "Empty"}
      </span>
    </div>
  );
}
