#!/bin/bash
# Claude Code post-session hook
# Cleanup temporary files and verify project state after each session

echo "[post-session] Cleaning up..."

# Remove temp files
rm -f .tmp_*.txt .tmp_*.json

# Remove stale Next.js cache if it's too large (>500MB)
if [ -d ".next" ]; then
  SIZE=$(du -sm .next 2>/dev/null | cut -f1)
  if [ "${SIZE:-0}" -gt 500 ]; then
    echo "[post-session] .next cache too large (${SIZE}MB), removing..."
    rm -rf .next
  fi
fi

# Quick type check
echo "[post-session] Running type check..."
npx tsc --noEmit --pretty 2>&1 | tail -5

echo "[post-session] Done."
