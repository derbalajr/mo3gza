#!/usr/bin/env bash
# Release a new version of the mo3gza plugin and update this machine to it.
#   ./release.sh patch|minor|major  "what changed"
set -e
cd "$(dirname "$0")"
kind="${1:-patch}"; msg="${2:-update}"

cur=$(python3 -c "import json;print(json.load(open('.claude-plugin/plugin.json'))['version'])")
IFS=. read -r a b c <<<"$cur"
case "$kind" in
  major) a=$((a+1)); b=0; c=0 ;;
  minor) b=$((b+1)); c=0 ;;
  patch) c=$((c+1)) ;;
  *) echo "usage: $0 patch|minor|major \"message\""; exit 1 ;;
esac
new="$a.$b.$c"

sed -i '' "s/\"version\": \"$cur\"/\"version\": \"$new\"/" .claude-plugin/plugin.json .claude-plugin/marketplace.json
claude plugin validate . >/dev/null
git add -A
git commit -q -m "$new: $msg"
git push -q origin main
claude plugin marketplace update mo3gza >/dev/null
claude plugin update mo3gza@mo3gza | tail -1
echo "✔ released $cur → $new. Restart Claude Code to load it. Teammates: claude plugin update mo3gza@mo3gza"
