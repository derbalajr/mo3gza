#!/usr/bin/env node
// CLI for the ERP handover machine API. Zero dependencies, Node >= 18.
// Exit codes: 0 ok | 1 usage/config | 2 unreachable/5xx | 3 conflict | 4 rejected | 5 dirty tree
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

class Fail extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const HEX40 = /^[0-9a-f]{40}$/i;

function git(args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trimEnd();
  } catch (e) {
    if (allowFail) return null;
    throw new Fail(1, `git ${args.join(' ')} failed (is this a git repository?)`);
  }
}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--allow-dirty') flags.allowDirty = true;
    else if (a === '--branch' || a === '--out') {
      if (i + 1 >= argv.length) throw new Fail(1, `${a} needs a value`);
      flags[a.slice(2)] = argv[++i];
    } else if (a.startsWith('--')) throw new Fail(1, `unknown option ${a}`);
    else positional.push(a);
  }
  return { flags, positional };
}

function loadConfig() {
  const top = git(['rev-parse', '--show-toplevel']);
  let cfg = {};
  const file = path.join(top, '.handover.json');
  if (fs.existsSync(file)) {
    try {
      cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      throw new Fail(1, `${file} is not valid JSON. Run /handover setup.`);
    }
  }
  const erpUrl = process.env.HANDOVER_ERP_URL || cfg.erp_url;
  const token = process.env.HANDOVER_TOKEN || cfg.token;
  if (!erpUrl || !token) {
    throw new Fail(1, `No handover config found (.handover.json with erp_url and token at ${top}). Run /handover setup.`);
  }
  return { erpUrl: String(erpUrl).replace(/\/+$/, ''), token: String(token) };
}

async function api(cfg, method, route, body) {
  const url = `${cfg.erpUrl}/api/handover/v1/${route}`;
  let res, text;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'X-Handover-Token': cfg.token,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    text = await res.text();
  } catch (e) {
    const cause = e.cause && e.cause.code ? ` (${e.cause.code})` : e.name === 'TimeoutError' ? ' (timeout)' : '';
    throw new Fail(2, `ERP unreachable at ${cfg.erpUrl}${cause}`);
  }
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  const s = res.status;
  if (s >= 200 && s < 300) return { status: s, data };
  const detail = data ? JSON.stringify(data) : text.slice(0, 500);
  if (s === 409) {
    const keys = data && data.conflicts ? Object.keys(data.conflicts).join(', ') : '';
    throw new Fail(3, `Conflict (409): re-read and merge. Conflicting keys: ${keys || '(none listed)'}\n${detail}`);
  }
  if ([401, 403, 413, 422, 429].includes(s)) throw new Fail(4, `Rejected (${s}): ${detail}`);
  if (s >= 500) throw new Fail(2, `ERP unreachable or failing (${s})`);
  throw new Fail(4, `Unexpected response (${s}): ${detail}`);
}

const currentBranch = () => git(['rev-parse', '--abbrev-ref', 'HEAD']);
const isDirty = () => git(['status', '--porcelain', '--untracked-files=no']) !== '';
const headAuthor = () => ({
  name: git(['log', '-1', '--format=%an']),
  email: git(['log', '-1', '--format=%ae']),
});
const getHandover = (cfg, branch) => api(cfg, 'GET', `handover?branch=${encodeURIComponent(branch)}`);

async function cmdPing(cfg) {
  const { data } = await api(cfg, 'GET', 'ping');
  console.log(`ok repository=${data.repository_id} project=${data.project_id}`);
}

async function cmdPending(cfg, flags) {
  const branch = flags.branch || currentBranch();
  const { data } = await api(cfg, 'GET', `pending?branch=${encodeURIComponent(branch)}`);
  console.log(String(data.count));
}

async function cmdGet(cfg, flags) {
  const branch = flags.branch || currentBranch();
  const { data } = await getHandover(cfg, branch);
  const out = path.resolve(flags.out || path.join(git(['rev-parse', '--absolute-git-dir']), 'handover', 'current.json'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  const repoId = data.repository && data.repository.id;
  const versions = (data.sections || [])
    .filter((s) => s.key === 'overview' || s.repository_id === repoId)
    .map((s) => `${s.key} v${s.version}`);
  console.log(`repository: ${data.repository ? data.repository.label : '(unknown)'}`);
  console.log(`sections: ${versions.join(', ') || '(none)'}`);
  console.log(`features: ${(data.features || []).length}`);
  console.log(`notes: ${(data.notes || []).length}`);
  console.log(`pending: ${(data.pending || []).length}`);
  console.log(`file: ${out}`);
}

async function cmdContext(cfg, flags) {
  const branch = flags.branch || currentBranch();
  const sha = git(['rev-parse', 'HEAD']);
  const { data } = await getHandover(cfg, branch);
  const repo = data.repository || {};
  const synced = repo.last_synced_sha;
  const known =
    typeof synced === 'string' &&
    HEX40.test(synced) &&
    execOk(['merge-base', '--is-ancestor', synced, 'HEAD']);
  let range, base;
  if (known) {
    range = `${synced}..HEAD`;
    base = synced;
  } else {
    range = '-n30';
    const recent = git(['rev-list', '-n30', 'HEAD']).split('\n').filter(Boolean);
    const oldest = recent[recent.length - 1];
    base = git(['rev-parse', '--verify', '-q', `${oldest}^`], { allowFail: true }) || EMPTY_TREE;
  }
  const log = git(['log', range, '--format=%H%x09%s']);
  const commits = log
    ? log.split('\n').map((l) => {
        const i = l.indexOf('\t');
        return { sha: l.slice(0, i), subject: l.slice(i + 1) };
      })
    : [];
  console.log(
    JSON.stringify(
      {
        branch,
        default_branch: repo.default_branch || null,
        sha,
        author: headAuthor(),
        dirty: isDirty(),
        last_synced_sha: synced || null,
        behind: {
          pushes_since_sync: repo.pushes_since_sync ?? null,
          last_pushed_sha: repo.last_pushed_sha ?? null,
          last_synced_at: repo.last_synced_at ?? null,
        },
        commits_since_sync: commits,
        diff_stat: git(['diff', '--stat', base, 'HEAD']),
        last_synced_known: known,
      },
      null,
      2,
    ),
  );
}

function execOk(args) {
  try {
    execFileSync('git', args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function cmdPost(cfg, flags, positional) {
  const file = positional[0];
  if (!file) throw new Fail(1, 'usage: handover.mjs post FILE [--allow-dirty]');
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Fail(1, `cannot read payload ${file}: ${e.message}`);
  }
  if (isDirty() && !flags.allowDirty) {
    throw new Fail(5, 'Working tree has uncommitted changes to tracked files. Commit first so sha matches a real commit (or pass --allow-dirty).');
  }
  const body = { ...payload };
  if (body.branch === undefined) body.branch = flags.branch || currentBranch();
  if (body.sha === undefined) body.sha = git(['rev-parse', 'HEAD']);
  if (body.author === undefined) body.author = headAuthor();
  if (body.from_sha === undefined) {
    const { data } = await getHandover(cfg, body.branch);
    const s = data.repository && data.repository.last_synced_sha;
    body.from_sha = typeof s === 'string' && HEX40.test(s) ? s : null;
  }
  const { status, data } = await api(cfg, 'POST', 'updates', body);
  if (status === 202 || (data && data.pending)) console.log(`pending id=${data.id}`);
  else console.log(`applied versions=${JSON.stringify((data && data.versions) || {})}`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const commands = { ping: cmdPing, get: cmdGet, pending: cmdPending, post: cmdPost, context: cmdContext };
  if (!commands[cmd]) throw new Fail(1, 'usage: handover.mjs <ping|context|get|pending|post> [options]');
  const { flags, positional } = parseArgs(rest);
  const cfg = loadConfig();
  await commands[cmd](cfg, flags, positional);
}

main().catch((e) => {
  if (e instanceof Fail) {
    console.error(e.message);
    process.exit(e.code);
  }
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
