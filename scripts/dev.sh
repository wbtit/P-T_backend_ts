#!/usr/bin/env bash
# `npm run dev` -- starts the TS API server (ts-node-dev, hot-reload) and the
# Standards RAG cross-encoder reranker service together, in one terminal,
# with prefixed/colored output so the two logs stay distinguishable.
#
# Previously these were two separate manual commands every session, and the
# reranker was left orphaned running in the background more than once as a
# result. Ctrl+C here stops both -- including the ACTUAL node server process,
# not just its wrapper. Confirmed by testing directly: killing only the `npx
# ts-node-dev` PID does NOT cascade down through npm's own
# npm-exec -> sh -c -> ts-node-dev -> node(wrap.js) chain -- that leaves the
# real server process orphaned and running. Fix: `setsid` puts each child (and
# everything IT spawns) in its own new process group, so cleanup can kill the
# whole group via `kill -- -"$PID"`, not just the top wrapper process.
#
# Second bug, found and fixed after the first one shipped: `ts-node-dev
# --respawn` forks a brand-new child on every file change (a fresh process
# each time source is edited, replacing the previous one). If a shutdown
# signal lands at almost the same instant as a respawn -- confirmed
# reproducible, not a one-off, by triggering it twice this session -- the
# freshly-forked child can end up not honoring SIGTERM at all (still alive,
# unresponsive, needed SIGKILL by hand both times). A single best-effort
# `kill -- -"$PID"` with no follow-up left that orphan running. Fix:
# wait_for_group_exit() below sends SIGTERM, polls the actual process group
# for survivors instead of assuming the signal worked, and escalates to
# SIGKILL on whatever's left after a short grace period -- so a shutdown
# always actually finishes, even if it races a respawn.
set -uo pipefail

# Load environment variables from .env if present (so system-specific paths like RERANKER_PYTHON can be defined locally)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

RERANKER_PYTHON="${RERANKER_PYTHON:-.venv/bin/python3}"
RERANKER_SCRIPT="src/modules/standards/reranker/server.py"
RERANKER_PORT="${RERANKER_PORT:-8008}"

CYAN=$'\033[36m'
MAGENTA=$'\033[35m'
RESET=$'\033[0m'

# Sends SIGTERM to the process group led by $1, then actually checks (rather
# than assumes) whether anything in that group is still alive every 0.2s for
# up to 5s, escalating to SIGKILL on stragglers. Silent no-op if the group is
# already gone (the common case).
wait_for_group_exit() {
  local pgid="$1"
  local label="$2"
  [[ -z "$pgid" ]] && return
  kill -- "-$pgid" 2>/dev/null

  local waited=0
  while [[ $waited -lt 5000 ]]; do
    pgrep -g "$pgid" >/dev/null 2>&1 || return
    sleep 0.2
    waited=$((waited + 200))
  done

  if pgrep -g "$pgid" >/dev/null 2>&1; then
    echo "${CYAN}[dev]${RESET} ${label} (pgid $pgid) didn't exit within 5s of SIGTERM -- force-killing"
    kill -KILL -- "-$pgid" 2>/dev/null
  fi
}

cleanup() {
  echo "${CYAN}[dev]${RESET} stopping..."
  wait_for_group_exit "${RERANKER_PID:-}" "reranker"
  wait_for_group_exit "${SERVER_PID:-}" "server"
  wait 2>/dev/null
  exit 0
}
trap cleanup INT TERM

RESOLVED_RERANKER_PYTHON=""
if [ -n "${RERANKER_PYTHON:-}" ]; then
  if [ -x "$RERANKER_PYTHON" ]; then
    RESOLVED_RERANKER_PYTHON="$RERANKER_PYTHON"
  elif command -v "$RERANKER_PYTHON" >/dev/null 2>&1; then
    RESOLVED_RERANKER_PYTHON="$(command -v "$RERANKER_PYTHON")"
  fi
fi

if [ -n "$RESOLVED_RERANKER_PYTHON" ]; then
  echo "${MAGENTA}[dev]${RESET} starting reranker: ${RESOLVED_RERANKER_PYTHON} -u ${RERANKER_SCRIPT} --port ${RERANKER_PORT}"
  setsid "$RESOLVED_RERANKER_PYTHON" -u "$RERANKER_SCRIPT" --port "$RERANKER_PORT" \
    > >(sed -u "s/^/${MAGENTA}[reranker]${RESET} /") 2>&1 &
  RERANKER_PID=$!
else
  echo "${MAGENTA}[dev]${RESET} reranker interpreter not found at '${RERANKER_PYTHON}' (only needed for standards queries; set RERANKER_PYTHON in .env to enable). Skipping reranker."
  RERANKER_PID=""
fi

DEV_PORT="${PORT:-5156}"
STALE_PIDS=$(lsof -ti :"$DEV_PORT" 2>/dev/null || true)
if [ -n "$STALE_PIDS" ]; then
  for pid in $STALE_PIDS; do
    cmd=$(ps -p "$pid" -o cmd= 2>/dev/null || true)
    if [[ "$cmd" == *"ts-node-dev"* || "$cmd" == *"src/server.ts"* ]]; then
      echo "${CYAN}[dev]${RESET} Freeing port $DEV_PORT from stale dev process (PID $pid)..."
      kill -9 "$pid" 2>/dev/null || true
    else
      echo "${CYAN}[dev]${RESET} Error: Port $DEV_PORT is in use by non-dev process: $cmd"
      exit 1
    fi
  done
  sleep 0.5
fi

echo "${CYAN}[dev]${RESET} starting server: npx ts-node-dev --respawn src/server.ts"
setsid npx ts-node-dev --respawn src/server.ts \
  > >(sed -u "s/^/${CYAN}[server]${RESET} /") 2>&1 &
SERVER_PID=$!

if [ -n "$RERANKER_PID" ]; then
  wait -n "$RERANKER_PID" "$SERVER_PID"
else
  wait "$SERVER_PID"
fi
cleanup
