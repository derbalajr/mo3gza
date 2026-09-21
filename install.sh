#!/usr/bin/env bash
# One-time setup for the mo3gza engineering mode.
# Installs the plugin plus the three plugins it builds on, and makes CLAUDE.local.md
# git-ignored globally (so per-repo AI rules never get committed).
set -e

echo "▸ Registering marketplaces…"
claude plugin marketplace add obra/superpowers-marketplace 2>/dev/null || true
claude plugin marketplace add pbakaus/impeccable            2>/dev/null || true
claude plugin marketplace add derbalajr/mo3gza              2>/dev/null || true

echo "▸ Installing plugins…"
claude plugin install superpowers@claude-plugins-official
claude plugin install frontend-design@claude-plugins-official
claude plugin install elements-of-style@superpowers-marketplace
claude plugin install impeccable@impeccable
claude plugin install mo3gza@mo3gza

echo "▸ Ignoring CLAUDE.local.md globally (never touches a repo's .gitignore)…"
mkdir -p ~/.config/git
grep -qxF 'CLAUDE.local.md' ~/.config/git/ignore 2>/dev/null || echo 'CLAUDE.local.md' >> ~/.config/git/ignore

echo
echo "✔ Done. Restart Claude Code, open a repo, run /setup-project once, then say: mo3gza <task>"
