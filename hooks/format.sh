#!/usr/bin/env bash
# Stack-aware formatter for Claude Code PostToolUse (Edit|Write|MultiEdit).
# Reads hook JSON on stdin, formats the edited file with whichever formatter
# the project actually has. Silent no-op when nothing applies. Never fails the tool.
set -u

f=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty' 2>/dev/null)
[ -n "$f" ] && [ -f "$f" ] || exit 0

# Find project root: nearest ancestor with a manifest file.
root=$(dirname "$f")
while [ "$root" != "/" ]; do
  for m in package.json composer.json pyproject.toml pubspec.yaml; do
    [ -e "$root/$m" ] && break 2
  done
  root=$(dirname "$root")
done
[ "$root" = "/" ] && exit 0

cd "$root" || exit 0
ext="${f##*.}"
case "$ext" in
  js|jsx|ts|tsx|mjs|cjs|vue|css|scss|json|md|html|yaml|yml)
    if [ -x "$root/node_modules/.bin/prettier" ]; then
      "$root/node_modules/.bin/prettier" --write --log-level silent "$f"
    elif [ -x "$root/node_modules/.bin/biome" ]; then
      "$root/node_modules/.bin/biome" format --write "$f" >/dev/null
    fi ;;
  php)
    if [ -x "$root/vendor/bin/pint" ]; then
      "$root/vendor/bin/pint" --quiet "$f"
    fi ;;
  py)
    if [ -x "$root/.venv/bin/ruff" ]; then
      "$root/.venv/bin/ruff" format --quiet "$f"
    elif command -v ruff >/dev/null; then
      ruff format --quiet "$f"
    elif [ -x "$root/.venv/bin/black" ]; then
      "$root/.venv/bin/black" --quiet "$f"
    fi ;;
  dart)
    if command -v dart >/dev/null; then
      dart format "$f" >/dev/null
    fi ;;
esac
exit 0
