#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p logs/server

start_character() {
  local char="$1"
  local env_file=".env.$char"

  if [[ ! -f "$env_file" ]]; then
    echo "  Skipping $char — $env_file not found"
    return
  fi

  local port
  port=$(grep '^DR_PORT=' "$env_file" | cut -d= -f2)

  local char_name
  char_name=$(grep '^DR_CHARACTER=' "$env_file" | cut -d= -f2 | tr '[:upper:]' '[:lower:]')
  local pid_file="logs/server/${char_name}.pid"
  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "  $char already running (PID $(cat "$pid_file"))"
    return
  fi

  echo "  Starting $char on http://localhost:$port ..."
  (
    # Parse env file line-by-line to handle special characters in values
    # (sourcing as shell script breaks on passwords with (, [, etc.)
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
      export "${line%%=*}=${line#*=}"
    done < "$env_file"
    exec bundle exec ruby server.rb
  ) >> "logs/server/$char.log" 2>&1 &

  echo "  $char started"
}

echo "=== Starting DR client servers ==="
if [[ -n "${1:-}" ]]; then
  start_character "$1"
else
  start_character kesmgurr
  start_character syen
  start_character usidore
fi
echo ""
echo "Tabs:"
echo "  Kesmgurr  http://localhost:4567  (ScriptAPI 49166)"
echo "  Syen      http://localhost:4568  (ScriptAPI 49167)"
echo "  Usidore   http://localhost:4569  (ScriptAPI 49168)"
echo ""
echo "Logs: logs/server/<character>.log"
echo "Stop: ./stop.sh"
