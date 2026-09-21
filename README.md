# mo3gza — full-power engineering mode for Claude Code

Say **`mo3gza`** in any message and the session switches into a disciplined
build-and-review pipeline that stays on until you say **`mo3gza off`**.

## What it does

| Layer | Provided by | Role |
|---|---|---|
| Process | [superpowers](https://github.com/obra/superpowers) | brainstorm → spec → plan → TDD with subagents; systematic debugging |
| Library docs | Context7 MCP (bundled) | pulls current docs before writing framework code |
| UI quality | frontend-design + [impeccable](https://github.com/pbakaus/impeccable) | taste while building, `/impeccable audit` + `polish` after |
| Review gates | 16 specialist agents (from [agency-agents](https://github.com/msitarzewski/agency-agents)) | dispatched automatically based on what the diff touches |
| Hygiene | hooks (bundled) | auto-format on every edit (prettier / pint / ruff / dart); session-mode reminder |
| Per-repo rules | `/setup-project` | writes an untracked `CLAUDE.local.md` with stack, commands, conventions |

### The 16 agents and when they fire
| Situation | Agent |
|---|---|
| every code change | `code-reviewer` |
| auth, PII, uploads, DB queries, config | `ai-code-security-auditor` |
| login / OAuth / Passport / next-auth / WebAuthn / MFA / permissions | `identity-access-engineer` |
| Stripe / PayPal / invoices / refunds / webhooks | `payments-billing-engineer` |
| migrations, schema, slow queries, N+1 | `database-optimizer` |
| translations, RTL/Arabic, locale formatting | `i18n-engineer` |
| WebSocket / Echo / Yjs / LiveKit / presence | `realtime-collaboration-engineer` |
| new or changed UI | `accessibility-auditor` + `evidence-collector` |
| e2e tests | `test-automation-engineer` |
| new service / module / API contract | `backend-architect` |
| Laravel implementation (controllers, services, Blade/Livewire, Eloquent), before dispatching generic implementers on PHP work | `senior-developer` |
| Flutter code | `mobile-app-builder` |
| Flutter release / signing / stores | `mobile-release-engineer` |
| `.env*`, keys, tokens, keystores | `secrets-credential-engineer` |
| "explain / how does X work" | `codebase-onboarding-engineer` |

## Install (one time)

```bash
curl -fsSL https://raw.githubusercontent.com/derbalajr/mo3gza/main/install.sh | bash
```
or manually:
```bash
claude plugin marketplace add derbalajr/mo3gza
claude plugin install mo3gza@mo3gza
# plus the plugins it builds on:
claude plugin install superpowers@claude-plugins-official
claude plugin install frontend-design@claude-plugins-official
claude plugin marketplace add pbakaus/impeccable && claude plugin install impeccable@impeccable
claude plugin marketplace add obra/superpowers-marketplace && claude plugin install elements-of-style@superpowers-marketplace
echo 'CLAUDE.local.md' >> ~/.config/git/ignore
```
Restart Claude Code afterwards.

Formatters are used only if the repo already has them (`node_modules/.bin/prettier`, `vendor/bin/pint`, `ruff`, `dart`). Nothing is installed into your projects.

## Use

```
/setup-project                      # once per repo → writes CLAUDE.local.md (git-ignored)
mo3gza add a discount-code field to checkout
fix the Arabic date format on the orders page   # still in mode
mo3gza off
```

Verbs decide the path: *see / explain* → read-only map; *add / build / fix / ship* → full pipeline.
Call any agent directly at any time: "run secrets-credential-engineer on this repo".

## Rules the mode enforces
- Never commit AI-config files (`CLAUDE.local.md`, `.claude/`, `docs/superpowers/`).
- Stops to ask only for destructive ops, pushes to shared branches, prod, secrets.
- No "done" without test/lint output and reviewer findings.

## Update
```bash
claude plugin marketplace update mo3gza && claude plugin update mo3gza@mo3gza
```

## License
MIT. Bundled agents are derived from [agency-agents](https://github.com/msitarzewski/agency-agents) (MIT) — see LICENSE.
