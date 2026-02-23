/**
 * Apply highlight rules to a text string.
 * Returns null if no highlights match (fast path).
 * Returns an array of { text, color } parts where color is null for unmatched spans.
 * Matching is case-insensitive. First match wins on overlaps.
 */
export function applyHighlights(text, highlights) {
  if (!highlights || highlights.length === 0 || !text) return null;

  const lower = text.toLowerCase();

  // Collect all match intervals [start, end, color]
  const matches = [];
  for (const h of highlights) {
    if (!h.text) continue;
    const needle = h.text.toLowerCase();
    let pos = 0;
    while (pos < lower.length) {
      const idx = lower.indexOf(needle, pos);
      if (idx === -1) break;
      matches.push({ start: idx, end: idx + needle.length, color: h.color });
      pos = idx + needle.length;
    }
  }

  if (matches.length === 0) return null;

  // Sort by start position; ties broken by longer match first
  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  // Merge: strip overlaps (first match wins)
  const kept = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue; // overlaps a previous match — skip
    kept.push(m);
    cursor = m.end;
  }

  // Slice text into parts
  const parts = [];
  let pos = 0;
  for (const m of kept) {
    if (m.start > pos) {
      parts.push({ text: text.slice(pos, m.start), color: null });
    }
    parts.push({ text: text.slice(m.start, m.end), color: m.color });
    pos = m.end;
  }
  if (pos < text.length) {
    parts.push({ text: text.slice(pos), color: null });
  }

  return parts;
}
