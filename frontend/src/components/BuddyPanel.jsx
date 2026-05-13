import React, { useEffect, useState } from "react";
import VitalsBar from "./VitalsBar";

const COLLAPSED_KEY = "dr-buddies-collapsed";

function loadCollapsed() {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || []); } catch { return new Set(); }
}
function saveCollapsed(set) {
  try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set])); } catch {}
}

function relativeAge(updatedAtMs) {
  if (!updatedAtMs) return "—";
  const secs = Math.max(0, Math.round((Date.now() - updatedAtMs) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function BuddyRow({ name, state, updatedAt, collapsed, onToggle }) {
  const rawTitle = state?.title || "—";
  const lichRoom = state?.extras?.lich_room_id;
  // Strip the trailing "(NNNNNN)" game id; replace with Lich room id if known.
  const cleanTitle = rawTitle.replace(/\s*\(\d+\)\s*$/, "");
  const title = lichRoom ? `${cleanTitle} #${lichRoom}` : cleanTitle;
  const vitals = state?.extras?.vitals || {};
  return (
    <div className={`buddy-row ${collapsed ? "collapsed" : "open"}`}>
      <div className="buddy-row-header" onClick={onToggle}>
        <span className="buddy-toggle">{collapsed ? "▶" : "▼"}</span>
        <span className="buddy-name">{name}</span>
        <span className="buddy-age" title={`Last update ${new Date(updatedAt).toLocaleTimeString()}`}>
          {relativeAge(updatedAt)}
        </span>
      </div>
      {!collapsed && (
        <>
          <div className="buddy-title">{title}</div>
          <VitalsBar vitals={vitals} />
        </>
      )}
    </div>
  );
}

export default function BuddyPanel({ buddies }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const [collapsed, setCollapsed] = useState(loadCollapsed);

  const toggle = (name) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      saveCollapsed(next);
      return next;
    });
  };

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
          collapsed={collapsed.has(name)}
          onToggle={() => toggle(name)}
        />
      ))}
    </div>
  );
}
