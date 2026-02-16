# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Overview

Web-based DragonRealms MUD client. Replaces Frostbite (Qt6 desktop client) with a local browser-based UI. Single-user, runs on localhost.

## Architecture

```
Browser (React/Vite) ↔ WebSocket ↔ Sinatra (Ruby) ↔ TCP ↔ Lich5 ↔ DR game server
```

- **Backend:** Sinatra + faye-websocket. Handles eAuth login, manages TCP connection to Lich/game server, parses the XML game stream, maintains game state, relays events over WebSocket.
- **Frontend:** React (JSX, no TypeScript) with Vite. Receives structured events over WebSocket, renders game UI panels.
- **Script API:** TCP server on localhost matching Frostbite's ScriptApiServer protocol so existing Lich/kor-scripts work unchanged.

## Tech Stack

### Backend (Ruby)
- Sinatra (web framework)
- faye-websocket (WebSocket support)
- thin or puma (Rack server with hijack support)
- nokogiri (lenient XML parsing of game stream)

### Frontend (JavaScript)
- React (JSX, **no TypeScript**)
- Vite (build tool)
- No component library chosen yet — plain CSS/flexbox/grid

## Project Structure

```
dr-client/
├── server.rb              # Sinatra app, WebSocket endpoint, wires components together
├── lib/
│   ├── eauth.rb           # SSL auth to eaccess.play.net
│   ├── game_connection.rb # TCP socket to Lich, read/write game data
│   ├── xml_parser.rb      # Parses DR's XML stream into structured events
│   ├── game_state.rb      # Thread-safe in-memory game state
│   ├── script_api.rb      # ScriptApiServer (TCP, Frostbite-compatible)
│   └── lich_launcher.rb   # Spawns Lich as child process
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/         # useGameSocket.js etc.
│   │   ├── components/    # GameText, CommandInput, VitalsBar, etc.
│   │   └── styles/
│   ├── vite.config.js
│   └── package.json
├── PLAN.md                # Detailed project plan with build phases
└── CLAUDE.md              # This file
```

## Key Protocols

### eAuth
SSL connection to eaccess.play.net. Challenge-response with XOR password encryption. Returns session key + game host/port. Reference: `~/frostbite-qt6/gui/eauthservice.cpp`

### Game Connection
TCP to Lich's local proxy port. Commands sent as `<c>COMMAND\r\n`. Server sends continuous XML stream (not well-formed). Reference: `~/frostbite-qt6/gui/tcpclient.cpp`

### XML Stream
Malformed continuous XML. Key tags: `prompt`, `roundTime`, `compass`, `indicator`, `component` (exp/room), `dialogData` (vitals), `pushStream`/`popStream` (stream windows), `preset`/`style` (styled text). Reference: `~/frostbite-qt6/gui/xml/xmlparserthread.cpp`

### ScriptApiServer
TCP server, line-based protocol. Request: `COMMAND NAME?arg1&arg2\n`, Response: `result\0`. Used by kor-scripts for custom windows (`WINDOW_ADD`, `WINDOW_WRITE`, etc.). Reference: `~/frostbite-qt6/gui/scriptapiserver.cpp`, `~/dragonrealms/kor-scripts/kor_frostbite_client.rb`

## Related Projects

- **kor-scripts** (`~/dragonrealms/kor-scripts`) — Lich5 Ruby scripts for DR automation. 8 scripts use `KorFrostbiteClient` module which connects to the ScriptApiServer.
- **Frostbite** (`~/frostbite-qt6`) — The Qt6 client being replaced. Primary reference for protocol implementation.
- **Lich5** (`~/dragonrealms/lich`) — Ruby scripting engine that proxies between client and game server.

## Development Notes

- See `PLAN.md` for the full project plan and phased build order
- The XML parser is the most complex backend component — the game stream has many edge cases
- When implementing ScriptApiServer commands, test against `kor_frostbite_client.rb` to ensure compatibility
- Frontend uses no TypeScript — plain JSX only
