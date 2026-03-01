# JSON Script API

## Goal

Replace the Frostbite-compatible ScriptApiServer wire protocol with a clean, JSON-based TCP API that is easier to extend, supports richer panel content, and allows the server to push game events to scripts.

This is a **future feature** — the existing Frostbite-compatible ScriptApiServer stays in place until all kor-scripts are migrated.

## Problems with the Current Frostbite Protocol

- Custom quirky format: `VERB COMMAND?arg1&arg2\n` with `\0` response terminator
- Unidirectional only: scripts query/command, server never pushes
- Text-only panel content — no styling, color, or structure
- Hard to extend: adding a new command means parsing a new string format
- Scripts must parse the game XML stream themselves via Lich hooks to react to game state

## Approach: Newline-Delimited JSON over TCP

Same TCP transport, same one-connection-per-script model. Replace the wire format with newline-delimited JSON (`\n`-terminated JSON objects). All messages in both directions are a single JSON object per line.

Keep the existing ScriptApiServer on its port. New API server listens on a separate port (e.g. `JSON_API_PORT`, default `49200+`).

## Wire Protocol

### Script → Server (commands)

Every command has a `cmd` field. Optional `id` field for correlation (if the script cares about responses).

```json
{"cmd": "panel_create", "name": "MyTracker", "title": "My Tracker"}
{"cmd": "panel_write", "name": "MyTracker", "lines": [{"text": "foo"}], "append": true}
{"cmd": "panel_clear", "name": "MyTracker"}
{"cmd": "panel_remove", "name": "MyTracker"}
{"cmd": "get", "key": "health"}
{"cmd": "command", "text": "look"}
{"cmd": "echo", "text": "some message"}
{"cmd": "notify", "text": "Pushed notification"}
{"cmd": "subscribe", "events": ["vitals", "room", "game_line"]}
{"cmd": "unsubscribe", "events": ["game_line"]}
```

### Server → Script (responses)

```json
{"ok": true}
{"ok": false, "error": "panel not found"}
{"ok": true, "value": "85"}
```

### Server → Script (pushed events, after subscribe)

```json
{"event": "vitals", "health": 85, "mana": 72, "stamina": 91, "spirit": 100, "concentration": 100}
{"event": "room", "title": "...", "desc": "...", "exits": ["north", "south"], "players": ["Foo"], "objs": ["a rock"]}
{"event": "indicators", "standing": true, "hidden": false, "bleeding": false, ...}
{"event": "hands", "left": "Empty", "right": "a sword"}
{"event": "roundtime", "expires_at": 1234567890.5}
{"event": "game_line", "stream": "main", "text": "You swing at the goblin.", "preset": null}
{"event": "game_line", "stream": "thoughts", "text": "...", "preset": "thought"}
{"event": "connected"}
{"event": "disconnected"}
```

## Command Reference

### Panel Commands

| Command | Fields | Description |
|---------|--------|-------------|
| `panel_create` | `name`, `title` | Create a named panel (idempotent) |
| `panel_write` | `name`, `lines`, `append` | Write lines to panel. `append: false` clears first |
| `panel_clear` | `name` | Clear all lines from panel |
| `panel_remove` | `name` | Remove panel entirely |

`lines` is an array of line objects:
```json
[
  {"text": "Normal text"},
  {"text": "Bold red text", "bold": true, "color": "#ff4444"},
  {"text": "Preset styled", "preset": "whisper"}
]
```

Presets match existing game presets (`whisper`, `thought`, `bold`, `roomName`, etc.) so panel text can match game text styling.

### State Query Commands

```json
{"cmd": "get", "key": "health"}
{"cmd": "get", "key": "room_title"}
{"cmd": "get", "key": "exp", "skill": "Targeted Magic"}
```

Returns `{"ok": true, "value": ...}` — value type depends on key (number, string, object).

Full key list mirrors existing `GET` commands: `health`, `mana`, `stamina`, `spirit`, `concentration`, `standing`, `sitting`, `kneeling`, `prone`, `stunned`, `bleeding`, `hidden`, `invisible`, `webbed`, `joined`, `dead`, `wield_right`, `wield_left`, `room_title`, `room_desc`, `room_objects`, `room_players`, `room_exits`, `exp`, `active_spells`, `rt`, `ct`, `char_name`.

### Action Commands

| Command | Fields | Description |
|---------|--------|-------------|
| `command` | `text` | Send command to game |
| `echo` | `text` | Display text in main game window |
| `notify` | `text` | Show notification (toast/tray) |

### Subscription Commands

```json
{"cmd": "subscribe", "events": ["vitals", "room", "game_line"]}
```

Available event types: `vitals`, `room`, `indicators`, `hands`, `roundtime`, `casttime`, `spell`, `game_line`, `connected`, `disconnected`.

`game_line` events can be filtered by stream:
```json
{"cmd": "subscribe", "events": ["game_line"], "streams": ["thoughts", "arrivals"]}
```

Subscriptions are additive; `unsubscribe` removes specific event types.

## Multiplexing Responses and Events

Both responses and pushed events arrive on the same connection. Scripts distinguish them by field:
- Response: has `ok` field
- Event: has `event` field

If a script sends commands with `id` fields, responses include the same `id` for correlation. Most scripts won't need this (fire-and-forget panel writes).

## Backend Changes

### New `lib/json_script_api.rb`

Largely mirrors `script_api.rb` structure:
- `TCPServer` accept loop, one thread per client
- `handle_client`: reads lines, parses JSON, dispatches
- `dispatch`: routes by `cmd` field
- Subscription registry: per-client set of subscribed event types
- `broadcast_event(event_hash)`: sends to all clients subscribed to that event type
- Server calls `broadcast_event` from the same hooks that already fire window events to the frontend

### `server.rb`

- Instantiate `JsonScriptApiServer` alongside existing `ScriptApiServer`
- Port from `ENV["JSON_API_PORT"]` (default `49200` + offset per character)
- Hook up same `on_command` and game state callbacks

### `.env.<character>` files

Add `JSON_API_PORT=49200` (kesmgurr), `49201` (syen), `49202` (usidore).

## Ruby Client for kor-scripts

New `DrJsonClient` module, drop-in alongside `KorFrostbiteClient`:

```ruby
module DrJsonClient
  class Connection
    def initialize(port)
      @socket = TCPSocket.new("127.0.0.1", port)
      @mutex = Mutex.new
      @event_handlers = []
      start_reader
    end

    def send_cmd(hash)
      @mutex.synchronize { @socket.puts(hash.to_json) }
    end

    def panel_create(name, title: name)
      send_cmd(cmd: "panel_create", name: name, title: title)
    end

    def panel_write(name, lines, append: true)
      send_cmd(cmd: "panel_write", name: name, lines: Array(lines).map { |l|
        l.is_a?(String) ? { text: l } : l
      }, append: append)
    end

    def panel_clear(name)
      send_cmd(cmd: "panel_clear", name: name)
    end

    def panel_remove(name)
      send_cmd(cmd: "panel_remove", name: name)
    end

    def get(key, **opts)
      send_cmd({ cmd: "get", key: key }.merge(opts))
    end

    def command(text)
      send_cmd(cmd: "command", text: text)
    end

    def subscribe(*events)
      send_cmd(cmd: "subscribe", events: events.flatten)
    end

    def on_event(&block)
      @event_handlers << block
    end

    def close
      @socket.close rescue nil
    end

    private

    def start_reader
      Thread.new do
        while (line = @socket.gets)
          msg = JSON.parse(line) rescue next
          if msg["event"]
            @event_handlers.each { |h| h.call(msg) rescue nil }
          end
          # responses with ok/error currently discarded unless scripts use ids
        end
      end
    end
  end
end
```

Accepts plain strings or `{text:, color:, bold:, preset:}` hashes in `panel_write`.

## Frontend Changes

Minimal — the frontend already renders `scriptWindows` via `StreamPanel`. Changes needed:

1. **Styled lines**: `WINDOW_WRITE` currently sends plain text strings. New API sends line objects with optional `color`, `bold`, `preset`. Frontend needs to render these — similar to how `applyHighlights` and preset classes work on game text.

2. **No new panel infrastructure needed** — create/clear/remove already works.

## Migration Path

1. Implement `JsonScriptApiServer` alongside existing server (both run simultaneously)
2. Write `DrJsonClient` module
3. Migrate kor-scripts one at a time to new client
4. Once all scripts migrated, deprecate and remove `ScriptApiServer`

Scripts that use both clients simultaneously during transition will work fine — each connects to its own port.

## Open Questions

- Should `get` be synchronous (blocks until response) or async (caller provides callback)? Synchronous is simpler for scripting but blocks if called from event handler.
- Should panel line history be capped server-side (like `MAX_SCRIPT_LINES` today) or left to the frontend?
- Does `game_line` subscription make sense given scripts already get game events via Lich hooks? May be redundant but useful for scripts running outside Lich.
- Port numbering convention for `JSON_API_PORT` — needs to be documented in `.env.example`.
