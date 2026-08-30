#!/bin/bash
# SessionStart hook: makes sure the `graft` CLI (npm package @nanonets/graft)
# is on PATH before .claude/helpers/graft-hooks.cjs runs, so the graft MCP
# server (.mcp.json) and hooks don't silently no-op with ENOENT.
#
# Only runs in Claude Code on the web / remote environments — a local dev
# machine manages its own toolchain. Idempotent: no-ops with zero output
# once graft is already installed, so this costs nothing on repeat sessions
# within the same container.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if command -v graft >/dev/null 2>&1; then
  exit 0
fi

if ! npm install -g @nanonets/graft >/dev/null 2>&1; then
  echo "graft: install failed - graft MCP server/hooks unavailable this session" >&2
fi

exit 0
