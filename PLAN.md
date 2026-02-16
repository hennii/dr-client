# DR Web Client — Project Plan

## Context

Replace Frostbite (Qt6 desktop client) with a local web-based DragonRealms client for a single user. The goal is a better-looking UI while preserving full compatibility with Lich5 and existing kor-scripts.

**Project location:** `~/dragonrealms/dr-client`

## Architecture

```
Browser (React/Vite)
    ↕ WebSocket
Sinatra backend (Ruby)
    ↕ TCP
Lich5 (proxy)
    ↕ TCP
DragonRealms game server
```

The Sinatra backend handles eAuth login, launches Lich, connects to Lich's local proxy port, parses the XML game stream, maintains game state, and relays structured events to the React frontend over WebSocket. It also runs a ScriptApiServer so kor-scripts can manage custom windows/notifications.

## Project Structure

```
dr-client/
├── Gemfile
├── server.rb              # Sinatra app: HTTP routes, WebSocket upgrade, wires everything together
├── lib/
│   ├── eauth.rb           # SSL auth to eaccess.play.net, returns session key/host/port
│   ├── game_connection.rb # TCP socket to Lich, send/receive game data
│   ├── xml_parser.rb      # Parses DR's XML stream into structured events
│   ├── game_state.rb      # In-memory game state (vitals, room, exp, inventory, etc.)
│   ├── script_api.rb      # TCP server implementing Frostbite's ScriptApiServer protocol
│   └── lich_launcher.rb   # Spawns Lich as a child process with correct args
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── hooks/
│       │   └── useGameSocket.js    # WebSocket connection + event dispatch
│       ├── components/
│       │   ├── GameText.jsx        # Main scrolling game output
│       │   ├── CommandInput.jsx    # Command line input
│       │   ├── VitalsBar.jsx       # Health/mana/fatigue/spirit/concentration
│       │   ├── RoomInfo.jsx        # Room name, desc, exits, players, objects
│       │   ├── ExpTracker.jsx      # Experience table
│       │   ├── Compass.jsx         # Directional navigation
│       │   ├── HandsDisplay.jsx    # Left/right hand items
│       │   ├── SpellBar.jsx        # Prepared spell + active spells
│       │   ├── StreamPanel.jsx     # Reusable panel for thoughts/combat/deaths/etc.
│       │   └── StatusIndicators.jsx # Standing/stunned/hidden/etc. icons
│       └── styles/
```

## Backend Components

### 1. eAuth (`lib/eauth.rb`)
- SSL connection to `eaccess.play.net` using Ruby's `OpenSSL::SSL::SSLSocket`
- Implements the full auth sequence: challenge → password XOR encryption → game select → character select → session key
- Returns `{ host:, port:, key: }` for game connection
- Reference: `~/frostbite-qt6/gui/eauthservice.cpp`

### 2. Lich Launcher (`lib/lich_launcher.rb`)
- Spawns `ruby lich.rb --host=HOST --port=PORT` as a child process
- Waits for Lich to open its local proxy port
- Returns the local port for game_connection to connect to

### 3. Game Connection (`lib/game_connection.rb`)
- TCP socket to Lich's local port
- Sends session key and Stormfront client identifier string
- Read loop in a thread: buffers incoming data by newline, feeds to XML parser
- Write method: wraps commands in `<c>CMD\r\n` format
- Enables TCP_NODELAY and keepalive

### 4. XML Parser (`lib/xml_parser.rb`)
- **Not a strict XML parser** — the game stream is malformed/continuous
- Preprocess: fix unescaped `&`, convert pushStream/popStream to proper open/close tags
- Handle pushStream buffering (cache content between push/pop, emit as batch)
- Parse key tags into typed events:
  - `prompt`, `roundTime`, `castTime` → timer events
  - `compass` → exits event
  - `indicator` → status event
  - `left`/`right`/`spell` → equipment event
  - `component id="exp ..."` → exp event
  - `component id="room ..."` → room event
  - `dialogData/progressBar` → vitals event
  - `preset`/`style`/`b`/`d`/`pushBold` → styled text events
  - `pushStream id="..."` → stream window events (thoughts, combat, deaths, etc.)
- Emit events as Ruby hashes, e.g. `{ type: "vitals", health: 100, mana: 95, ... }`
- Reference: `~/frostbite-qt6/gui/xml/xmlparserthread.cpp`

### 5. Game State (`lib/game_state.rb`)
- Thread-safe in-memory store updated by XML parser events
- Tracks: vitals, status flags, room data, experience, equipment, inventory, active spells, timers
- ScriptApiServer reads from this to answer queries
- On WebSocket connect, sends full state snapshot so React can hydrate

### 6. Script API Server (`lib/script_api.rb`)
- TCP server on configurable port (matching Frostbite's protocol exactly)
- Implements the same `GET`, `CLIENT`, `PUT` commands that `kor_frostbite_client.rb` expects
- Critical commands used by kor-scripts: `CLIENT WINDOW_LIST`, `WINDOW_ADD`, `WINDOW_REMOVE`, `WINDOW_CLEAR`, `WINDOW_WRITE`, `TRAY_WRITE`
- `CLIENT WINDOW_WRITE` events get relayed to the React frontend via WebSocket (so custom script windows appear in the browser)
- Reference: `~/frostbite-qt6/gui/scriptapiserver.cpp`, `~/dragonrealms/kor-scripts/kor_frostbite_client.rb`

### 7. Sinatra App (`server.rb`)
- `GET /` — serves the built React frontend (static files)
- WebSocket upgrade at `/ws` using `faye-websocket`
- On WS connect: sends full game state snapshot
- On WS message: forwards command to game connection
- On game event: broadcasts to all WS clients
- Starts ScriptApiServer and Lich on boot

## Frontend Components

### WebSocket Hook (`useGameSocket.js`)
- Connects to `ws://localhost:PORT/ws`
- Dispatches events to React state (useReducer or useState per domain)
- Sends commands back over WS

### UI Panels
- **GameText** — scrolling div of game output with styled text (bold, speech, whisper, room desc colors). Auto-scroll with scroll-back.
- **CommandInput** — text input at bottom, command history (up/down arrow), send on Enter
- **VitalsBar** — colored progress bars for health/mana/spirit/fatigue/concentration
- **RoomInfo** — room name, description, exits, objects, players
- **ExpTracker** — table of skills with rank, percentage, learning state
- **Compass** — clickable directional rose
- **StreamPanel** — reusable component for any pushStream window (thoughts, combat, deaths, arrivals, etc.). Script-created windows (`WINDOW_ADD`) also render as StreamPanels.
- **StatusIndicators** — icons/badges for standing/kneeling/prone/stunned/hidden/etc.
- **HandsDisplay** — what's in left/right hands
- **SpellBar** — prepared spell + active spells list

Layout: CSS Grid or flexbox, panels in a configurable dashboard-style layout.

## Key Gems

```ruby
gem "sinatra"
gem "faye-websocket"    # WebSocket support via Rack hijack
gem "thin" # or puma    # Web server that supports Rack hijack (needed for faye-websocket)
gem "nokogiri"          # For lenient XML/HTML parsing of game stream fragments
```

## Build Order (suggested phases)

### Phase 1: Connection pipeline
- eAuth login flow
- Lich launcher
- Game connection (TCP to Lich)
- XML parser (start with core tags: prompt, text output, vitals, room, compass)
- Sinatra + WebSocket relay
- Minimal React: GameText + CommandInput (playable but ugly)

### Phase 2: Full game state
- Complete XML parser (all tags, pushStream handling, experience, indicators)
- Game state container
- React panels: VitalsBar, RoomInfo, ExpTracker, Compass, StatusIndicators, HandsDisplay, SpellBar

### Phase 3: Script API compatibility
- ScriptApiServer (TCP server matching Frostbite's protocol)
- Custom window support (WINDOW_ADD/WRITE relay to React)
- Verify kor-scripts work unchanged

### Phase 4: Polish
- Styling/theming (dark theme, customizable colors)
- Panel layout customization (drag/resize/toggle)
- Command history persistence
- Scroll-back buffer management

## Verification

- **Phase 1 complete when:** you can log in, see game text flowing, type commands, and play the game through the browser
- **Phase 3 complete when:** `kor_fight`, `kor_taskmaster`, and other scripts using `KorFrostbiteClient` work without modification
- **Overall complete when:** you can run a full hunting session through the web client with all panels populated and scripts running
