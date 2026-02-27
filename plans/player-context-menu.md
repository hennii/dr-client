# Plan: Player Context Menu + PC Actions Editor

## Goal

Add a right-click context menu to PC names in the Room panel. Menu items are user-configurable via a new "PC Actions" modal accessible from the toolbar.

## Data Model

`settings/player-services.json`:
```json
{
  "services": [
    { "id": "1", "title": "Thief mark", "command": "mark %p" }
  ]
}
```

`%p` in the command is replaced with the player name at execution time.

## Architecture

- `PlayerServicesContext.jsx` — context provider, fetches/saves `/player-services`
- `PlayerServicesModal.jsx` — modal editor (add/edit/delete services)
- `RoomPanel.jsx` — context menu on PC name right-click, uses `usePlayerServices`
- `server.rb` — GET/POST `/player-services` routes
- `MainToolbar.jsx` — "PC Actions" button
- `App.jsx` — wires provider, modal state, toolbar prop

## UI Design

- Right-click on PC name → fixed-position context menu at cursor
- Menu closes on outside click (mousedown listener)
- Each service appears as a menu item; clicking sends the command with `%p` substituted
- Modal: list of services (title + command), add/edit/delete, `%p` hint text

## Implementation Status

Completed. All phases implemented and built successfully.
