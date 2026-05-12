import React, { useEffect, useState } from "react";
import VitalsBar from "./VitalsBar";

function relativeAge(updatedAtMs) {
  if (!updatedAtMs) return "—";
  const secs = Math.max(0, Math.round((Date.now() - updatedAtMs) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function BuddyRow({ name, state, updatedAt }) {
  const rawTitle = state?.title || "—";
  const lichRoom = state?.extras?.lich_room_id;
  // Strip the trailing "(NNNNNN)" game id; replace with Lich room id if known.
  const cleanTitle = rawTitle.replace(/\s*\(\d+\)\s*$/, "");
  const title = lichRoom ? `${cleanTitle} #${lichRoom}` : cleanTitle;
  const vitals = state?.extras?.vitals || {};
  return (
    <div className="buddy-row">
      <div className="buddy-row-header">
        <span className="buddy-name">{name}</span>
        <span className="buddy-age" title={`Last update ${new Date(updatedAt).toLocaleTimeString()}`}>
          {relativeAge(updatedAt)}
        </span>
      </div>
      <div className="buddy-title">{title}</div>
      <VitalsBar vitals={vitals} />
    </div>
  );
}

export default function BuddyPanel({ buddies }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const names = Object.keys(buddies || {}).sort();
  if (names.length === 0) {
    return <div className="stream-empty">No buddies connected</div>;
  }
  return (
    <div className="buddy-panel">
      {names.map((name) => (
        <BuddyRow
          key={name}
          name={name}
          state={buddies[name]?.state}
          updatedAt={buddies[name]?.updatedAt}
        />
      ))}
    </div>
  );
}
