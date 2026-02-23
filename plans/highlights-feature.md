# Plan: User-Defined Text Highlights

## Setup Tasks (run first)
1. Create `dr-client/plans/` directory
2. Save this plan as `dr-client/plans/highlights-feature.md`
3. Update `CLAUDE.md`: add instruction that all plans should be saved as artifact `.md` files in `dr-client/plans/`

---


## Context

The client needs a way for players to visually flag text that matters to them (combat outcomes, spell names, item drops, etc.) by highlighting it in any color they choose. Highlights are client-level — not per-character — and must survive browser resets, so they persist in `settings/highlights.json` on the server.

---

## Data Format

**`settings/highlights.json`**
```json
{
  "highlights": [
    { "id": "1703123456789", "text": "best shot possible", "color": "#ffff00" }
  ]
}
```

- Matching is **case-insensitive**
- IDs are `Date.now().toString()` (sufficient for single-user client)

---

## Architecture

```
HighlightsProvider (App.jsx root)
  ├── fetches GET /settings on mount
  ├── exposes { highlights, addHighlight, removeHighlight } via context
  └── saves via POST /settings on every change

GameLine (GameText.jsx)          ← reads context directly
StreamPanel.jsx                  ← reads context directly
```

**Why context instead of prop drilling**: highlights are consumed three levels deep (App → RightSidebars → SortablePanel → StreamPanel). Context avoids threading the prop through layout components. `memo()` on `GameLine` still prevents re-renders on new game lines; highlights-change re-renders are acceptable (infrequent, user-initiated).

---

## Files to Create

### `frontend/src/utils/applyHighlights.js`
Pure function — no React imports. Takes `(text, highlights)`, returns `null` (no matches) or an array of `{ text, color }` parts where `color` is `null` for unmatched spans and a hex string for matched spans. Algorithm: find all match positions across all highlights, sort by start, strip overlaps (first match wins), slice text into parts.

### `frontend/src/components/HighlightsModal.jsx`
Modal overlay with:
- List of existing highlights: color swatch + text label + × delete button
- Add form at bottom: text `<input>` + native `<input type="color">` (default `#ffff00`) + "Add" button
- Enter key submits the form
- Clicking overlay backdrop closes; × button closes
- Uses `useHighlights()` hook for state
- "No highlights yet" empty state

### `frontend/src/context/HighlightsContext.jsx`
```javascript
const HighlightsContext = createContext({ highlights: [], addHighlight: () => {}, removeHighlight: () => {} });

export function HighlightsProvider({ children }) { ... }
export function useHighlights() { return useContext(HighlightsContext); }
```
- `useEffect` on mount: `fetch('/settings')` → set state
- `save(newHighlights)`: optimistic setState + `POST /settings` with `{ highlights }`
- `addHighlight(text, color)`: appends to array, calls save
- `removeHighlight(id)`: filters array, calls save

---

## Files to Modify

### `server.rb`
Add two REST endpoints inside `GameApp < Sinatra::Base`, before the `boot!` method:

```ruby
SETTINGS_FILE = File.join(__dir__, "settings", "highlights.json")

get "/settings" do
  content_type :json
  if File.exist?(SETTINGS_FILE)
    File.read(SETTINGS_FILE)
  else
    { highlights: [] }.to_json
  end
end

post "/settings" do
  content_type :json
  body = JSON.parse(request.body.read)
  FileUtils.mkdir_p(File.dirname(SETTINGS_FILE))
  File.write(SETTINGS_FILE, body.to_json)
  { ok: true }.to_json
end
```

Also add `require "fileutils"` near the top.

### `frontend/src/App.jsx`
1. Import `HighlightsProvider` and `HighlightsModal`
2. Add `const [highlightsOpen, setHighlightsOpen] = useState(false)`
3. Wrap the return JSX in `<HighlightsProvider>`
4. Add `<HighlightsModal>` conditionally rendered when `highlightsOpen`
5. Pass `onOpenHighlights={() => setHighlightsOpen(true)}` to `<MainToolbar>`

### `frontend/src/components/MainToolbar.jsx`
Add a plain `<button>` next to the existing buttons:
```jsx
<button className="toolbar-btn" onClick={onOpenHighlights} title="Text highlights">
  Highlights
</button>
```
Accept `onOpenHighlights` prop.

### `frontend/src/components/GameText.jsx`
1. Import `useHighlights` and `applyHighlights`
2. In `GameLine`, call `useHighlights()` to get `highlights`
3. In segment rendering, replace the raw `text` with highlighted output:
   ```javascript
   const parts = applyHighlights(text, highlights);
   // if parts is null, render text as before (fast path)
   // if parts, render array: matched parts get <mark style={{backgroundColor: color}}>
   ```
4. Same logic for the simple (non-segmented) line case.

### `frontend/src/components/StreamPanel.jsx`
1. Import `useHighlights` and `applyHighlights`
2. In the stream-line render, replace `line.text` with a `HighlightedText` helper:
   ```jsx
   function HighlightedText({ text, highlights }) {
     const parts = applyHighlights(text, highlights);
     if (!parts) return text;
     return parts.map((p, i) =>
       p.color ? <mark key={i} style={{ backgroundColor: p.color }}>{p.text}</mark>
               : <React.Fragment key={i}>{p.text}</React.Fragment>
     );
   }
   ```
3. For `colorizeThoughts` lines, apply highlighting to the message body portion inside `ThoughtLine` (the `match[2]` text and fallback text).

### `frontend/src/styles/game.css`
Add styles for:
- `.modal-overlay` — fixed fullscreen semi-transparent backdrop, flex center
- `.modal` — dark-themed box, max-width 480px, padding, border-radius
- `.modal-header` — flex row, title + close button
- `.highlights-list` — unstyled list, each row: flex, gap, align-center
- `.highlight-swatch` — 16×16px inline-block, border-radius 3px, border
- `.highlights-add` — flex row with gap, full-width text input, color input, add button
- `mark` within `.game-line`, `.stream-line` — `color: inherit` to preserve text color

---

## Verification

1. Start backend: `bundle exec ruby server.rb`
2. Open `http://localhost:4567` in browser
3. Click **Highlights** in the top toolbar → modal opens
4. Type "best shot possible", pick yellow, click **Add** → appears in list
5. Check `settings/highlights.json` was created with the entry
6. Text "best shot possible" in the main game window shows yellow background
7. Text in StreamPanel (Thoughts, Arrivals) also highlights
8. Reload the page → highlights persist (loaded from file)
9. Delete a highlight → list updates, game text updates, file updates
10. Close modal via backdrop click and × button
