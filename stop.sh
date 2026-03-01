#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Optional argument: stop a single character. No argument stops all.
if [[ -n "${1:-}" ]]; then
  chars=("$1")
else
  chars=()
  for env_file in .env.*; do
    [[ "$env_file" == *.example ]] && continue
    chars+=("${env_file##.env.}")
  done
fi

echo "=== Stopping DR client servers ==="

stopped=0
for char in "${chars[@]}"; do
  env_file=".env.$char"
  [[ -f "$env_file" ]] || { echo "  No env file: $env_file"; continue; }
  char_name=$(grep '^DR_CHARACTER=' "$env_file" | cut -d= -f2 | tr '[:upper:]' '[:lower:]')
  pid_file="logs/server/${char_name}.pid"

  if [[ ! -f "$pid_file" ]]; then
    echo "  $char not running (no PID file)"
    continue
  fi

  pid=$(cat "$pid_file")

  if ! kill -0 "$pid" 2>/dev/null; then
    echo "  $char not running (stale PID $pid)"
    rm -f "$pid_file"
    continue
  fi

  echo "  Stopping $char (PID $pid)..."
  pkill -9 -P "$pid" 2>/dev/null || true
  kill -9 "$pid" 2>/dev/null || true

  rm -f "$pid_file"
  stopped=$((stopped + 1))
done

if [[ $stopped -eq 0 ]]; then
  echo "  No servers were running."
fi
