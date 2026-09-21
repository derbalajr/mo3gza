# mo3gza — full-power engineering mode for Claude Code

Say **`mo3gza`** in any message and the session switches into a disciplined
build-and-review pipeline that stays on until you say **`mo3gza off`**.

## What it does

| Layer | Provided by | Role |
|---|---|---|
| Process | [superpowers](https://github.com/obra/superpowers) | brainstorm → spec → plan → TDD with subagents; systematic debugging |
| Library docs | Context7 MCP (bundled) | pulls current docs before writing framework code |
| UI quality | frontend-design + [impeccable](https://github.com/pbakaus/impeccable) | taste while building, `/impeccable audit` + `polish` after |
| Review gates | 21 specialist agents (from [agency-agents](https://github.com/msitarzewski/agency-agents)) | dispatched automatically based on what the diff touches |
| Hygiene | hooks (bundled) | auto-format on every edit (prettier / pint / ruff / dart); session-mode reminder |
| Per-repo rules | `/setup-project` | writes an untracked `CLAUDE.local.md` with stack, commands, conventions |

### The 21 agents and when they fire
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
| React / Next.js / Vue implementation, before dispatching generic implementers on frontend work | `frontend-developer` |
| Dockerfiles, CI/CD pipelines, deploy configs, cloud/infra changes | `devops-automator` |
| new or changed API endpoints, third-party integrations, contract/regression tests | `api-tester` |
| slow pages or queries, bundle size, load tests, Core Web Vitals | `performance-benchmarker` |
| README, API reference, ADRs, changelogs, onboarding docs | `technical-writer` |
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

## Optional agents (not bundled — add only if you need them)

Kept out of the core to keep every session lean. Each command copies one agent from
[agency-agents](https://github.com/msitarzewski/agency-agents) into `~/.claude/agents/`:

```bash
A=https://raw.githubusercontent.com/msitarzewski/agency-agents/main; mkdir -p ~/.claude/agents
curl -fsSL $A/engineering/engineering-ai-engineer.md            -o ~/.claude/agents/ai-engineer.md             # ML models in production
curl -fsSL $A/engineering/engineering-prompt-engineer.md        -o ~/.claude/agents/prompt-engineer.md         # LLM prompts & evals
curl -fsSL $A/engineering/engineering-rag-pipeline-engineer.md  -o ~/.claude/agents/rag-pipeline-engineer.md   # RAG / retrieval
curl -fsSL $A/engineering/engineering-data-engineer.md          -o ~/.claude/agents/data-engineer.md           # ETL / pipelines
curl -fsSL $A/engineering/engineering-privacy-engineer.md       -o ~/.claude/agents/privacy-engineer.md        # GDPR / PII in code
curl -fsSL $A/engineering/engineering-api-platform-engineer.md  -o ~/.claude/agents/api-platform-engineer.md   # public/partner APIs, SDKs
curl -fsSL $A/engineering/engineering-desktop-app-engineer.md   -o ~/.claude/agents/desktop-app-engineer.md    # Electron / Tauri
curl -fsSL $A/engineering/engineering-cms-developer.md          -o ~/.claude/agents/cms-developer.md           # WordPress / Drupal
curl -fsSL $A/engineering/engineering-wordpress-shopping-cart.md -o ~/.claude/agents/woocommerce-engineer.md   # WooCommerce
curl -fsSL $A/engineering/engineering-filament-optimization-specialist.md -o ~/.claude/agents/filament-specialist.md  # Laravel Filament admin
curl -fsSL $A/specialized/corporate-training-designer.md        -o ~/.claude/agents/training-designer.md       # LMS curricula
```
Then fix the `name:` line in each file to the kebab-case filename (Claude Code uses it as the agent id) and restart.
Once installed, name them in your prompt ("run privacy-engineer on this diff") — mo3gza will also pick them up when the task obviously matches.

### Deliberately not included (already covered)
| Agent(s) | Covered by |
|---|---|
| reality-checker, test-results-analyzer | `evidence-collector` + superpowers verification-before-completion |
| software-architect, api-platform-engineer | `backend-architect` |
| appsec-engineer, security-architect, penetration-tester, senior-secops | `ai-code-security-auditor` + `secrets-credential-engineer` |
| git-workflow-master, minimal-change-engineer, rapid-prototyper | superpowers process (TDD, YAGNI, branch finishing) |
| ui-designer, ux-architect, ui-finish-gate-reviewer | frontend-design + impeccable |

## License
MIT. Bundled agents are derived from [agency-agents](https://github.com/msitarzewski/agency-agents) (MIT) — see LICENSE.
