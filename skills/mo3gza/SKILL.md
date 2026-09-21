---
name: mo3gza
description: Full-power engineering mode. Use when the user says "mo3gza" (any casing, anywhere in the message) or when a hook reports MO3GZA MODE ACTIVE. Stays on for the whole session until the user says "mo3gza off".
---

# mo3gza mode

Announce once: "mo3gza mode on." Then stay in it for every task this session — do not re-announce.

## Process (superpowers is the spine — never bypass it)
- Feature / change → superpowers:brainstorming → spec → writing-plans → subagent-driven-development with TDD. Bounded/small tasks: short in-chat design, then TDD directly.
- Bug / failing test / weird behavior → superpowers:systematic-debugging. Root cause first; no symptom patches.
- Before saying "done": superpowers:verification-before-completion — run the project's test + lint commands from CLAUDE.md / CLAUDE.local.md and show the output.

## Knowledge
- Any code that touches a library/framework API (Laravel, Next.js, React, TanStack, Flutter packages, Prisma, etc.): call Context7 (`resolve-library-id` → `get-library-docs`) before writing it. Don't guess signatures.
- Read `CLAUDE.md` and `CLAUDE.local.md` of the repo first; if `CLAUDE.local.md` is missing, run the `setup-project` skill before starting.

## UI work
- Apply frontend-design while building.
- After a screen/component is built: `/impeccable audit` → fix findings → `/impeccable polish`. Existing screen being reworked: `/impeccable critique` first.
- If a dev server is available, verify the result visually with Claude in Chrome (screenshot, check states).

## Review gates (dispatch as subagents, always before finishing)
| Situation | Agent |
|---|---|
| every task that changes code | `code-reviewer` on the diff |
| auth, PII, uploads, DB queries, env/config | `ai-code-security-auditor` |
| login, OAuth/OIDC, Passport, next-auth, WebAuthn/MFA, sessions, permissions | `identity-access-engineer` |
| Stripe / PayPal / Shopify fees, invoices, refunds, webhooks, payouts | `payments-billing-engineer` |
| new migration, schema change, slow query, N+1, index, Eloquent/Prisma query design | `database-optimizer` |
| translations, locale files, RTL/Arabic layout, date/number/currency formatting | `i18n-engineer` |
| WebSocket/Echo/Pusher, Yjs/Hocuspocus/Tiptap collab, LiveKit, presence, offline sync | `realtime-collaboration-engineer` |
| new or changed UI | `accessibility-auditor` **and** `evidence-collector` (screenshots via Claude in Chrome when a dev server runs) |
| e2e / Playwright / Cypress tests | `test-automation-engineer` |
| new service, module, API contract | `backend-architect` |
| Flutter code | `mobile-app-builder` |
| Flutter build/signing/store release, versioning, CI for mobile | `mobile-release-engineer` |
| anything touching `.env*`, keys, tokens, keystores, CI secrets | `secrets-credential-engineer` |
Fix what they flag as high/critical before reporting.

## Understanding code (before building, or when asked "see / explain / how does X work")
- Dispatch `codebase-onboarding-engineer` for any module you haven't read this session; it returns a grounded map (entry points, data flow, gaps). Use its output to scope the design instead of reading 20 files yourself.

## Autonomy
- Decide, don't ask — for anything reversible inside the worktree. Record the ruling and move on.
- Stop and ask only for: destructive/irreversible ops, git push/merge to shared branches, anything touching prod, secrets, or when the plan is broken enough that every path is a guess.
- Never commit AI-config files (`CLAUDE.local.md`, `.claude/`, `docs/superpowers/`) — they are git-ignored on this machine; don't add them to a repo `.gitignore` either.

## Reporting
End every task with: what changed (files), test/lint output, reviewer findings and what was fixed, anything left open.
