---
name: setup-project
description: Scan the current repo and write CLAUDE.local.md (untracked) with stack, commands, conventions, and the AI workflow rules for this project
---


Set up this project for the standard AI workflow (superpowers + impeccable + reviewer agents + Context7).

## Steps

1. **Inspect the repo** — do not guess. Read (as present): `package.json`, `composer.json`, `pyproject.toml`, `requirements.txt`, `pubspec.yaml`, lockfiles, `README*`, `CLAUDE.md`, `AGENTS.md`, `.env.example` (names only — never values), lint/format configs (`.prettierrc*`, `eslint.config.*`, `pint.json`, `ruff.toml`, `analysis_options.yaml`), CI config, and the top two levels of the directory tree (skip `node_modules`, `vendor`, `build`, `dist`, `.git`).
2. **Detect** the stack, package manager (`npm`/`pnpm`/`yarn`/`bun`/`composer`/`uv`/`pip`/`flutter`), and the exact commands for: install, dev server, test (unit + e2e if any), lint, format, type-check, DB migrate/seed. Verify each command exists in the manifest scripts — only list commands that are real.
3. **If `CLAUDE.md` already exists**, read it and do NOT duplicate its content. `CLAUDE.local.md` only adds what's missing.
4. **Write `CLAUDE.local.md`** in the repo root using the template below. Keep it under ~80 lines; concrete over generic. If the file already exists, show the diff and ask before overwriting.
5. **Ensure it's ignored**: if `.gitignore` exists and doesn't already ignore `CLAUDE.local.md`, tell the user (Claude Code normally adds it automatically — confirm with `git check-ignore CLAUDE.local.md`). Do not commit anything.
6. Print a 5-line summary of what was detected.

## Template for CLAUDE.local.md

```markdown
# <Project name> — local AI rules (untracked)

## Stack
<framework + version, language, DB, key libs — one line each>

## Commands
- Install: `...`
- Dev: `...`
- Test: `...`   (single file: `...`)
- Lint / Format / Type-check: `...`
- Migrate / Seed: `...`

## Structure
<3–8 bullets: where controllers/services/components/tests live; naming conventions observed>

## Conventions observed
<patterns actually found in the code: DI style, error handling, API response shape, state mgmt, i18n, etc.>

## AI workflow
- Features/bugs: superpowers is active — brainstorm → plan → TDD; run the test command above before claiming done.
- Library APIs: use Context7 (`resolve-library-id` → `get-library-docs`) for <main libs> before writing code that touches them.
- UI work: apply frontend-design; after building a screen run `/impeccable audit` then `/impeccable polish`; verify visually with Claude in Chrome when a dev server is available.
- Before finishing a task, dispatch `code-reviewer` on the diff. Also `ai-code-security-auditor` for auth/payment/upload/DB code, `accessibility-auditor` for new UI, `test-automation-engineer` when adding e2e tests, `mobile-app-builder` for Flutter work, `backend-architect` for new services/schemas.

## Don'ts
<repo-specific: files not to touch, generated dirs, prod configs, .env, etc.>
```
