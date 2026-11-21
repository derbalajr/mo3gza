---
name: handover
description: Keep this project's internal handover in the ERP up to date (overview, features, tech specs, run locally, environments, services, pitfalls, decisions, people). Use when the user types "/handover" (setup, init, status or update), says "update the handover", or after committing a change to behaviour, setup, deploy, services or data model in a repo that has a .handover.json file.
argument-hint: "[setup <token> [erp_url] | init | status]"
---

# /handover

The handover is the team's internal record of a project, kept in the ERP. Readers are teammates who forgot
something, or a new teammate taking the project over. **Success = someone who has never touched this repo can
understand, run, change and deploy it from the handover alone.** You write it from the code and from what you
know about this session's work.

Arguments: `$ARGUMENTS`. Empty = **update** (the default mode).

## The CLI

Every call to the ERP goes through one script, run from the repo root:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/handover/scripts/handover.mjs" <command>
```

If `${CLAUDE_PLUGIN_ROOT}` is not expanded, use the newest
`~/.claude/plugins/cache/mo3gza/mo3gza/*/skills/handover/scripts/handover.mjs` (or the `scripts/handover.mjs` next to
this SKILL.md). Below, `H` means that full command.

| Command | Does |
|---|---|
| `H ping` | checks the token: `ok repository=<id> project=<id>` |
| `H context` | JSON: branch, default_branch, sha, author, dirty, last_synced_sha, behind, commits_since_sync, diff_stat, last_synced_known |
| `H get [--branch B] [--out F]` | saves the whole project handover to `<git-dir>/handover/current.json` and prints a summary |
| `H pending [--branch B]` | number of pending updates for a branch |
| `H post FILE [--allow-dirty]` | sends an update. It fills in `branch`, `sha` (= HEAD), `author` and `from_sha` itself |

Exit codes: `0` ok · `1` usage, missing config or detached HEAD · `2` ERP unreachable or unexpected answer ·
`3` conflict (409) · `4` rejected (401/403/413/422/429) · `5` uncommitted changes.

`<git-dir>` is `$(git rev-parse --absolute-git-dir)`. Files under it are never committed.

## Modes

### `/handover setup <token> [erp_url]`

`erp_url` defaults to `https://erp-api.giantrex.net`. The token starts with `hov_` and comes from the ERP
(Project → Settings → Repositories). Do not echo it back in chat more than needed.

1. Write `.handover.json` at the repo root: `{"erp_url": "<erp_url>", "token": "<token>"}` (2-space JSON, trailing newline).
   This file is meant to be committed: the token is scoped to this one repository. Check with
   `git check-ignore .handover.json`; if it is ignored, tell the user.
2. Add the rule to `CLAUDE.md` (create the file if missing). Take the block from
   `${CLAUDE_PLUGIN_ROOT}/skills/handover/templates/claude-md-rule.md`. If `CLAUDE.md` already has a block from
   `<!-- handover-rule -->` to `<!-- /handover-rule -->`, replace that block. Otherwise append it after one blank line.
   Never add it twice.
3. Copy `${CLAUDE_PLUGIN_ROOT}/skills/handover/templates/handover-check.yml` to `.github/workflows/handover-check.yml`
   (overwrite an older copy).
4. Run `H ping`. On failure, report the error and the exit code, then stop. Steps 1–3 stay in place.
5. Print these webhook steps for the user:
   - GitHub repo → Settings → Webhooks → Add webhook.
   - **Payload URL** and **Secret**: copy both from the ERP Repositories screen (the secret is shown once).
   - **Content type**: `application/json`.
   - **Events**: "Let me select individual events" → **Pushes** and **Pull requests** only.
6. Do not commit unless the user asks. If they do, commit `.handover.json`, `CLAUDE.md` and the workflow together.
   Then suggest `/handover init` if `H get` shows no sections for this repository.

### `/handover init`

This is the first full write-up of the repo. Run it on the default branch, after pulling.

1. Run `H context` and `H get`, then read `<git-dir>/handover/current.json`. If this repository already has sections, this
   is a full refresh: use their current text as input, keep facts that are still true, and set `base_version` to their version.
2. Read the repo. Do not guess. Look at: README*, `PRODUCT.md`, `CLAUDE.md`, `AGENTS.md`, manifests and lockfiles
   (`package.json`, `composer.json`, `pyproject.toml`, `pubspec.yaml`, …), routes, controllers, models, migrations
   and schema, jobs, scheduler and queue config, `.env.example` (**variable names only**), Dockerfiles, deploy config
   (Forge/Vercel/Cloudflare/fly/…), CI workflows, i18n files, tests. Also run `git shortlog -sne --no-merges HEAD`
   and `git log --format='%an %s' --no-merges -- <dir>` for the main areas.
3. Write every repo section: `tech_specs`, `run_locally`, `environments`, `services`, `pitfalls`, `decisions`, `people`.
   Also write the **full feature list**. Write `overview` only when the project has no `overview` section yet.
   It is shared with the other repos of the project.
4. `summary`: "Initial handover for <repo label>: …" in one or two sentences.
5. Write the payload, then post it (see *Posting*). The limit is 200 features per post. If there are more, post them in batches.
   Every post after the first carries only features and a short summary.

### `/handover` (update, default)

Run this **after committing** the work and before pushing.

1. `H context`. If `dirty` is true, commit the work first, following the repo's commit rules. If the uncommitted changes
   are not yours, ask the user. Never post handover text for uncommitted code.
2. `H get`, then read `<git-dir>/handover/current.json`: sections, features, notes, changes, `repository`, `pending`.
   If this repository has no sections and no features yet, say so and run **init** instead.
3. Work out what changed. Read `commits_since_sync` and `diff_stat`. For details, run `git diff <last_synced_sha>..HEAD`
   (or the last 30 commits when `last_synced_known` is false). Add what you know from this session: why it was
   done, what was tried and dropped, what is fragile.
4. Decide which sections and features are affected. Use the content guide below. Update **only** those. Most changes touch
   one or two features and maybe `pitfalls` or `decisions`. A section is replaced as a whole, so start from its current
   text (or from the pending text, see Branches) and change only the parts that are now wrong or missing.
5. **Typo, formatting, refactor-only or test-only work**: post a changelog-only update. That means `summary` alone,
   with no `sections` and no `features`.
6. Write the payload and post it (see *Posting*). Then tell the user, in one or two lines, what was updated.

### `/handover status`

Run `H ping` and `H get`. Report the repository label, section versions, number of features, notes and pending
updates, the last synced commit and time, and how many pushes happened since then (`repository.pushes_since_sync`).
If that number is above 0, the handover is **behind**: suggest `/handover`. Change nothing.

## Posting

Write the payload to `<git-dir>/handover/payload.json`:

```json
{
  "summary": "Discount codes: added a per-customer usage limit and an expiry check at checkout.",
  "sections": {
    "pitfalls": { "content": "…full new markdown of the section…", "base_version": 4 }
  },
  "features": [
    {
      "slug": "discount-codes",
      "title": "Discount codes",
      "summary": "What it does and who uses it (e.g. shop staff create codes; customers redeem them at checkout).",
      "how_it_works": "Flow from screen to database, in plain steps.",
      "business_rules": "- One code per order\n- Max 3 uses per customer\n- Expired codes are rejected at checkout",
      "main_files": ["app/Services/DiscountService.php", "src/pages/checkout/DiscountField.tsx"],
      "sort_order": 40
    }
  ]
}
```

- `summary` (required, at most 2000 characters) is the changelog entry. Write it in plain words: what changed, and why.
- `sections.<key>.base_version` is the `version` of that section in `current.json` (`null` if it does not exist yet).
  Repo sections are the ones with `repository_id` equal to `repository.id`. `overview` has `repository_id: null`.
- Do not set `branch`, `sha`, `author` or `from_sha`. The CLI fills them in.

Then run `H post "$(git rev-parse --absolute-git-dir)/handover/payload.json"`.

| Exit | Meaning | Do |
|---|---|---|
| 0 | `applied versions=…` (default branch) or `pending id=…` (other branch) | report it |
| 2 | ERP unreachable or unexpected answer | tell the user **"ERP unreachable — handover not updated"**, and stop. The payload stays in `<git-dir>/handover/` for a later retry. Never claim it was updated. |
| 3 | 409 conflict: someone else changed those sections | run `H get` again. For each conflicting section, merge their new text with your change (keep both), and use the new `version` as `base_version`. Retry **once**. If it fails again, stop and report. |
| 4 | rejected | **422**: read `errors.<field>`. A secret-guard hit names the line: rephrase it to say where the value is kept, not what it is. Fix any other validation errors, then retry. **Never** bypass the guard (no splitting, encoding or obfuscating values). **401**: the token is wrong or rotated, so check `.handover.json` and pull the latest. **403**: the project is archived, so stop. **413**: the update is over 2 MB, so split the features into batches. **429**: wait a minute, then retry once. |
| 5 | uncommitted tracked changes | commit first. Use `--allow-dirty` only if the user explicitly says so. |
| 1 | no config, or detached HEAD | run `/handover setup`, or check out a branch |

## Branches

The handover always describes the **default branch**.

- On the default branch, an update is applied right away.
- On any other branch, it is stored as **pending** and published when the PR merges (it is discarded if the PR closes
  unmerged). The ERP applies pending updates in order, last write wins.
- On a non-default branch, `current.json` → `pending[]` holds this branch's earlier pending updates, oldest first.
  Build on the **latest** one: start from its `payload.sections` and `payload.features` and carry them forward
  together with your new changes. Keep `base_version` = the **published** section version (or `null`). `summary`
  covers only the new commits.

## Rules

- **Secrets.** Write env variable **names** only and credential **locations** only (e.g. "Forge → Environment",
  "team password manager → <entry name>"). Never paste values, `.env*` contents, keys, tokens, connection strings or
  config files with values. The server rejects secret shapes with 422. Rephrase; never work around it.
- **Human notes** (`notes[]`) are written by teammates. Read them for context. Never copy them into generated text.
  If the code now contradicts a note, do not quietly write the opposite: tell the user which note looks out of date.
- **Feature slugs are stable** (kebab-case). Never rename a slug, even if the title changes. When a feature is
  deleted, send it once with `"removed": true` (all required fields still filled in). Send only features that changed.
  Each one is sent whole, because all fields are replaced.
- **Write for a teammate who has never seen this repo.** Use markdown. Be concise and concrete: exact paths (repo-relative),
  exact commands, exact values for business rules ("orders over 500 EGP need manager approval", not "large orders need
  approval"). Do not write marketing copy, and do not restate what the code obviously says.
- A section should usually stay **under ~1,500 words**. Link to files instead of copying them.
- Only describe what is in the code or what you know from the work. If you are unsure, say "unverified" rather than guess.
- Other repos' sections and features in `current.json` are context. Never write them. A token can only write its own
  repository's sections and features, plus `overview`.
- Doc health (synced commit, pushes behind) is computed by the ERP. Never write it.

## Content guide

- **overview** (project level, shared by all repos): what the product is, the client, who uses it (roles), the business
  purpose, and which repos make up the project and how they connect. Change it only when the product picture changes.
- **features** (structured list, one entry per feature): `title`. `summary` = what it does **and who uses it**.
  `how_it_works` = the flow from screen to API to data, with jobs or notifications involved. `business_rules` =
  exact values, limits, states, permissions. `main_files` = repo-relative paths of the key files and screens. A deleted
  feature gets `removed: true`.
- **tech_specs**: the stack with versions (from manifests), the architecture (layers, modules, how the frontend talks to the backend),
  the main data entities and their relations, the APIs (route groups, auth method, versioning), i18n/RTL, and anything unusual.
- **run_locally**: prerequisites with versions, setup steps as exact commands, the **names** of required env variables
  (and where to get the values), seed data and demo logins (location only), and the test, lint and build commands.
- **environments**: each environment with its URL, the hosting, how deploys happen (which branch goes where, which
  tool, manual steps), queues and workers, cron and the scheduler, and backups if they are known.
- **services**: each outside service (payments, email, SMS, storage, maps, auth, analytics, …): what it is used for,
  whose account it is (ours or the client's), the env variable names, and where the credentials live (location only).
- **pitfalls**: fragile areas, workarounds, known bugs, ordering gotchas, "don't touch X without Y", and things that
  burned time in this session.
- **decisions**: why X was chosen over Y. One short entry each: the decision, the reason, the alternatives dropped, and the date when known.
- **people**: who built which areas, from `git shortlog -sne --no-merges HEAD` and `git log` per main directory.
  Use **names only**: never write email addresses into the content.
- **Changelog** is the `summary` of each post. It is not a section.
