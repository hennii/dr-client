# Buddy Broker

## Goal

Allow two (or more) characters running under Stiletto to share live state with each other on the same machine, so support-buddy scripts can know things like "what room is my primary in right now?" without going through LNet or in-game thoughts.

The first use case is a hunting support buddy script that needs to know the primary character's room (and follow them if separated). The mechanism should generalize to other shared state (vitals, stance, hands, target, status indicators).

## Architecture

A small standalone Ruby process — `buddy_broker.rb` — runs on the local machine and acts as a fan-out hub for character state. Each Stiletto backend opens a persistent TCP connection to it, publishes its own character's state on game events, and receives updates whenever any other connected character publishes.

```
Stiletto(Kesmgurr) ─┐
                    ├──▶  buddy_broker (localhost:49600)
Stiletto(Syen)    ──┘
```

Scripts running in Lich never talk to the broker directly. They go through Stiletto's existing ScriptApiServer using new commands, which read from the in-memory peer-state mirror that `buddy_client.rb` maintains.

### Why a separate process

- No "primary" instance — every Stiletto behaves identically
- Survives one Stiletto restarting; the other keeps its peer connection
- Trivially extends to 3+ characters
- Small enough (~150 lines) that the cost is negligible

## Port

Broker listens on `localhost:49600`. High, uncommon, distinct from existing Stiletto ports (4567 web, ScriptApi range, JSON API at 49200+).

## Wire Protocol (broker ↔ Stiletto)

Plain TCP, newline-delimited JSON. One JSON object per line in both directions.

### Stiletto → broker

```json
{"op": "hello", "character": "Kesmgurr"}
{"op": "publish", "state": {"room_id": 12345, "title": "Stone Clan Hall", "extras": {...}}}
{"op": "bye"}
```

`hello` must be the first message on a connection. The broker rejects subsequent messages if it hasn't seen `hello`. Re-using a character name disconnects the older connection (handles Stiletto restarts cleanly).

### broker → Stiletto

```json
{"op": "snapshot", "peers": {"Syen": {"state": {...}, "updated_at": "..."}, ...}}
{"op": "update", "character": "Syen", "state": {...}, "updated_at": "..."}
{"op": "leave", "character": "Syen"}
```

`snapshot` is sent once, immediately after `hello`, containing the current state of every other registered character. `update` is broadcast to every connected client (except the publisher) whenever someone publishes. `leave` is broadcast when a client disconnects.

## State Shape

The published `state` object has a fixed top-level schema plus a free-form `extras` blob:

```json
{
  "room_id": 12345,
  "title": "Stone Clan Hall",
  "extras": {
    "vitals": {"health": 100, "mana": 80, "stamina": 90, "spirit": 85},
    "stance": "offensive",
    "status": ["kneeling"],
    "hands": {"left": "a longsword", "right": "empty"},
    "target": null
  }
}
```

Starting set for `extras` is always-on (vitals, stance, status, hands, target). New keys can be added without protocol changes — consumers just ignore unknown keys. Per-character publish filtering is deferred; nothing here is sensitive enough to warrant it on day one.

## Broker (`buddy_broker.rb`)

Standalone script, run as a child process by the first Stiletto to start up (see Lifecycle below). Responsibilities:

- TCP server on `localhost:49600`
- Per-connection: read JSON lines, dispatch by `op`
- Global state: `{character => {state, updated_at}}` + `{character => socket}`
- On `hello`: register, send snapshot
- On `publish`: update state, broadcast `update` to other connections
- On disconnect / `bye`: remove from both maps, broadcast `leave`
- Periodic stale-connection cleanup (heartbeat optional; simple TCP keepalive is probably enough)

No persistence — broker state is purely in-memory. If the broker dies, every Stiletto reconnects and re-publishes.

## Stiletto Client (`lib/buddy_client.rb`)

New module wired up from `server.rb`. Responsibilities:

- On backend startup, connect to `localhost:49600` (with retry/backoff if broker isn't up yet)
- Send `hello` with the active character name
- Maintain thread-safe `@peer_state = {character => {state, updated_at}}` mirror
- Listen for `snapshot` / `update` / `leave` and update the mirror
- Expose:
  - `peer_state(name)` — current state of one peer, or nil
  - `peer_state_all` — full mirror
  - `publish(state)` — send a `publish` op
  - `on_change(&block)` — register a callback fired whenever any peer's state changes; used by ScriptApi long-poll

Reconnection: if the broker connection drops, retry with exponential backoff. On reconnect, send `hello` and re-publish current local state.

## game_state.rb Integration

`game_state.rb` is the single source of truth for the local character's state. Add a hook so that any mutation that touches the published fields (room change, vitals change, stance/status/hands/target change) triggers `buddy_client.publish(current_state)`.

Implementation sketch: a single `notify_changed` method on `game_state` that builds the published-state hash from current fields and hands it to `buddy_client`. Debounce to coalesce rapid-fire updates (e.g. vitals tick every prompt) — 100ms window is fine.

## ScriptApi Integration (Push via Long-Poll)

ScriptApi stays request/response. Add three new commands:

- `BUDDY_LIST` — returns a comma-separated list of known peer character names
- `BUDDY_GET NAME?<name>` — returns the current state of `<name>` as a serialized blob, or empty if unknown. Format TBD: pipe-delimited for the existing Frostbite protocol (`12345|Stone Clan Hall|<extras-json>`), since the existing client expects flat strings
- `BUDDY_WAIT NAME?<name>&since=<unix_ms>` — blocks until peer `<name>` has state newer than `since`, returns that state in the same format as `BUDDY_GET`. Timeout via a `timeout=<ms>` query param (default: 30s); on timeout return current state regardless

Long-poll mechanics:
- `BUDDY_WAIT` handler grabs a `Mutex` + `ConditionVariable` keyed by peer name
- `buddy_client.on_change` signals the right condition variable when the peer in question updates
- Handler returns as soon as it wakes, or when the timeout elapses

Why long-poll instead of an event channel: it preserves the existing `KorFrostbiteClient` request/response shape exactly, so no script-side changes beyond calling the new commands in a loop.

## Lifecycle / Startup

On Stiletto startup:

1. Try to bind `localhost:49600` very briefly as a probe.
2. If bind succeeds, release it and **spawn `buddy_broker.rb` as a child process** (so it outlives the Stiletto that started it).
3. If bind fails with `EADDRINUSE`, assume the broker is already running.
4. Either way, `buddy_client` opens a client connection to `localhost:49600` (with retry, since there's a race between spawn and ready).

No "primary" Stiletto — whoever starts first wins the race and spawns the broker. Every other Stiletto just connects. If the broker dies, the next Stiletto to start (or restart) will spawn a fresh one.

Broker child process should:
- Detach from the parent so the parent's exit doesn't kill it
- Log to a known location (`logs/buddy_broker.log`) for debugging
- Exit cleanly if it can't bind

## Frontend (optional, not in MVP)

A small "Party" panel could show connected peers with their current rooms / vitals. Drawing from `buddy_client.peer_state_all`, pushed over the existing WebSocket. Nice-to-have, defer until the backend pieces are working.

## Build Phases

1. **Broker.** Write `buddy_broker.rb` standalone; test with two `nc` connections.
2. **Client.** Write `lib/buddy_client.rb` and wire it into `server.rb`. Verify two Stiletto instances see each other's published state by logging.
3. **game_state hook.** Hook room changes first (smallest surface), confirm room state flows end-to-end. Then add vitals/stance/etc.
4. **Lifecycle.** Auto-spawn broker from Stiletto. Verify restart behavior.
5. **ScriptApi commands.** Add `BUDDY_LIST` / `BUDDY_GET` / `BUDDY_WAIT`. Test against a small Ruby script using `KorFrostbiteClient`.
6. **Buddy script.** Write the actual hunting support buddy script in kor-scripts, using the new commands. (Lives in `~/dragonrealms/kor-scripts`, not this repo.)
7. **Frontend party panel.** Deferred; do when there's an obvious need.

## Open Questions / Future Work

- **Authentication / scoping.** Broker accepts anyone on localhost. Fine for single-user local-only Stiletto; revisit if Stiletto ever runs on a shared box.
- **History.** `BUDDY_GET` only returns the latest state. If a script needs "where was Kesmgurr 10 seconds ago" we'd need a ring buffer in the client mirror. Not needed for MVP.
- **JSON Script API integration.** Once the JSON Script API (see `json-script-api.md`) lands, peer-update push becomes natural — a `peer_update` event type pushed over the existing subscribe model — and `BUDDY_WAIT` long-poll can be retired.
- **Per-character publish filtering.** If we ever want one character to share less than the full extras set, add a `BUDDY_WANTS` command (consumer-driven) or a publish-side allowlist (publisher-driven).
