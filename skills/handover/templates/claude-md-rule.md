<!-- handover-rule -->
## Handover

This repo feeds the project's internal handover in the ERP (config: `.handover.json`). The `/handover` skill lives in `.claude/skills/handover/`.

After finishing and committing any task that changes behaviour, setup, deploy, services or data model — before pushing — run `/handover`. If the ERP is unreachable, say so; don't skip silently.

- Order: commit → `/handover` → push. `/handover` refuses to post while tracked files have uncommitted changes.
- Typo, formatting or refactor-only work needs no section changes; `/handover` posts a changelog line only.
- Never write secret values into the handover: env variable names and credential locations only.
<!-- /handover-rule -->
