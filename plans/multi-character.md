# Multi-Character Support

## Goal

Run up to 3-4 characters simultaneously, each in their own browser tab, with full kor-script support for every character and process isolation (one crash does not affect others).

## Approach

**Multiple server processes, one per character.** Each character gets its own `ruby server.rb` process, its own Lich instance, its own web port, and its own ScriptApiServer port. Browser tabs point to different ports.

Alternatives considered and rejected:
- **Single server, character-scoped WebSocket sessions** — cleaner URL, but characters share a process (no isolation) and requires significant refactor of all `@@` class vars.
- **Single tab, multi-character UI** — too much screen real estate pressure; input routing complexity.

## Architecture

```
Tab 1 (http://localhost:4567) ↔ server process (Kesmgurr) ↔ Lich ↔ DR
Tab 2 (http://localhost:4568) ↔ server process (Syen)     ↔ Lich ↔ DR
Tab 3 (http://localhost:4569) ↔ server process (Usidore)  ↔ Lich ↔ DR
```

Each process is fully independent. A crash or restart of one character has no effect on the others.

## Port Assignment

| Character | Web Port | ScriptApiServer Port |
|-----------|----------|----------------------|
| Kesmgurr  | 4567     | 49166                |
| Syen      | 4568     | 49167                |
| Usidore   | 4569     | 49168                |
| (4th)     | 4570     | 49169                |

ScriptApiServer ports match `api_client_port` in each character's `kor-settings/base/<character>.json`.

## Key Insight: kor-scripts Already Supported This

`KorFrostbiteClient` reads `api_client_port` from per-character settings (`kor-settings/base/<char>.json`). No kor-script changes were needed — just ensure each character's JSON has a unique port. Syen (49167) and Usidore (49167) had a conflict; Usidore was updated to 49168.

## Files Changed

### `server.rb`
- `set :port` reads `ENV["DR_PORT"]` (default `4567`)
- `ScriptApiServer.new(port:)` reads `ENV["SCRIPT_API_PORT"]` (default `49166`)
- Backward compatible: single-character `.env` usage unchanged

### Per-character `.env` files
- `.env.kesmgurr`, `.env.syen`, `.env.usidore`
- Each sets `DR_USERNAME`, `DR_PASSWORD`, `DR_CHARACTER`, `DR_GAME_CODE`, `DR_PORT`, `SCRIPT_API_PORT`
- `.gitignore` updated: `.env.*` excluded, `!.env.example` kept tracked

### `kor-scripts/kor-settings/base/usidore.json`
- `api_client_port`: 49167 → 49168 (resolve conflict with Syen)

### `start.sh` / `stop.sh`
- `start.sh`: launches each character's server in the background, sources its `.env.*` file, logs to `logs/server/<char>.log`, tracks PID in `logs/server/<char>.pid`. Skips characters whose `.env` file is missing. Detects already-running instances.
- `stop.sh`: kills all tracked PIDs and cleans up PID files.

## Adding a 4th Character

1. Create `kor-settings/base/<char>.json` with `"api_client_port": 49169`
2. Create `.env.<char>` with credentials, `DR_PORT=4570`, `SCRIPT_API_PORT=49169`
3. Add `start_character <char>` line to `start.sh`
