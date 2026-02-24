import React, { useState, useCallback, useEffect } from "react";

const COLLAPSED_KEY = "dr-inv-collapsed";

function loadCollapsed() {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || []); } catch { return new Set(); }
}
function saveCollapsed(set) {
  try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set])); } catch {}
}

// Strip leading article for container name matching.
function stripArticle(name) {
  return name.replace(/^(a|an|some|the) /i, "");
}

// Words that begin a modifying phrase in DR item descriptions.
// Everything from the first match onward is stripped before extracting the noun.
const MODIFIER_RE = /\b(with|fashioned|crafted|laced|studded|threaded|wrapped|adorned|decorated|etched|engraved|painted|inlaid|outlined|trimmed|reinforced|embossed|bearing|carved|made)\b/i;

// Derive the keyword to use in an "inv <keyword>" command from an item name.
// Strips the article, parenthetical annotations, modifier phrases, then takes the last word.
function invKeyword(name) {
  let base = stripArticle(name).replace(/\s*\([^)]*\)/g, "").trim();
  const idx = base.search(MODIFIER_RE);
  if (idx > 0) base = base.slice(0, idx).trim();
  return base.split(" ").pop();
}

function InventoryItem({ item, depth, onRefresh, collapsed, onToggle }) {
  const isKnownContainer = Array.isArray(item.items);
  const isExpanded = isKnownContainer && !collapsed.has(item.name);

  return (
    <div className="inv-item">
      <div className="inv-item-row" style={{ paddingLeft: depth * 14 + 6 }}>
        {isKnownContainer ? (
          <button
            className="inv-toggle-btn"
            onClick={() => onToggle(item.name)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        ) : (
          <span className="inv-toggle-placeholder" />
        )}
        <span className="inv-item-name">{item.name}</span>
        <button
          className="inv-refresh-btn"
          onClick={() => onRefresh(item.name)}
          title={`Refresh: inv ${invKeyword(item.name)}`}
        >
          ↻
        </button>
      </div>
      {isKnownContainer && isExpanded && (
        <div className="inv-children">
          {item.items.length === 0 ? (
            <div className="inv-empty-container" style={{ paddingLeft: (depth + 1) * 14 + 22 }}>
              (empty)
            </div>
          ) : (
            item.items.map((child, i) => (
              <InventoryItem
                key={i}
                item={child}
                depth={depth + 1}
                onRefresh={onRefresh}
                collapsed={collapsed}
                onToggle={onToggle}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function InventoryPanel({ inventory, send }) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  useEffect(() => {
    saveCollapsed(collapsed);
  }, [collapsed]);

  const toggleCollapsed = useCallback((name) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const handleRefreshContainer = useCallback((itemName) => {
    send(`inv ${invKeyword(itemName)}`);
  }, [send]);

  const handleRefreshAll = useCallback(() => {
    send("inv list");
  }, [send]);

  const worn = inventory?.worn || [];
  const lastRefresh = inventory?.lastFullRefresh;

  return (
    <div className="inventory-panel">
      <div className="inv-toolbar">
        <button
          className="inv-refresh-all-btn"
          onClick={handleRefreshAll}
          title="Refresh all inventory (inv list)"
        >
          ↻ Refresh All
        </button>
        {lastRefresh && (
          <span className="inv-last-refresh">
            {new Date(lastRefresh * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      <div className="inv-list">
        {worn.length === 0 ? (
          <div className="inv-empty-state">No items</div>
        ) : (
          worn.map((item, i) => (
            <InventoryItem
              key={i}
              item={item}
              depth={0}
              onRefresh={handleRefreshContainer}
              collapsed={collapsed}
              onToggle={toggleCollapsed}
            />
          ))
        )}
      </div>
    </div>
  );
}
