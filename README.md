# dr-client

Web-based DragonRealms MUD client. Replaces Frostbite (Qt6 desktop client) with a local browser-based UI. Single-user, runs on localhost.

## Architecture

```
Browser (React/Vite) ↔ WebSocket ↔ Sinatra (Ruby) ↔ TCP ↔ Lich5 ↔ DR game server
```

- **Backend:** Sinatra + faye-websocket. Handles eAuth login, manages TCP connection to Lich/game server, parses the XML game stream, maintains game state, relays events over WebSocket.
- **Frontend:** React (JSX) with Vite. Receives structured events over WebSocket, renders game UI panels.
- **Script API:** TCP server on localhost matching Frostbite's ScriptApiServer protocol so existing Lich/kor-scripts work unchanged.

## Setup

### Prerequisites

- Ruby (with Bundler)
- Node.js (with npm)
- Lich5

### Install dependencies

```bash
bundle install
cd frontend && npm install
```

### Build the frontend

```bash
cd frontend && npm run build
```

## Running

1. Start the backend: `bundle exec ruby server.rb`
2. Open `http://localhost:4567`

The backend serves the built frontend from `frontend/dist/`.

## Development (hot reload)

For live CSS/JS changes without rebuilding:

1. Keep the backend running on port 4567
2. Start Vite dev server: `cd frontend && npm run dev`
3. Open `http://localhost:5174` (not 4567)

Vite proxies `/ws` to the Sinatra backend automatically. Changes to source files hot-reload instantly.

## Project Structure

```
dr-client/
├── server.rb              # Sinatra app, WebSocket endpoint
├── lib/
│   ├── eauth.rb           # SSL auth to eaccess.play.net
│   ├── game_connection.rb # TCP socket to Lich
│   ├── xml_parser.rb      # Parses DR's XML stream into structured events
│   ├── game_state.rb      # Thread-safe in-memory game state
│   ├── script_api.rb      # ScriptApiServer (TCP, Frostbite-compatible)
│   └── lich_launcher.rb   # Spawns Lich as child process
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/         # useGameSocket.js etc.
│   │   ├── components/    # GameText, CommandInput, Sidebar, etc.
│   │   └── styles/
│   ├── vite.config.js
│   └── package.json
└── CLAUDE.md
```
