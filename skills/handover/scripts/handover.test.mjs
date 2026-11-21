import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';

const CLI = path.join(path.dirname(new URL(import.meta.url).pathname), 'handover.mjs');
const SYNCED = 'a'.repeat(40);

let server, port, repo, requests, responder;

function git(args, cwd = repo) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function makeRepo(config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handover-test-'));
  git(['init', '-q', '-b', 'main'], dir);
  git(['config', 'user.name', 'Config Person'], dir);
  git(['config', 'user.email', 'config@example.com'], dir);
  fs.writeFileSync(path.join(dir, 'a.txt'), 'one\n');
  if (config) fs.writeFileSync(path.join(dir, '.handover.json'), JSON.stringify(config));
  git(['add', '-A'], dir);
  execFileSync('git', ['-c', 'user.name=Head Author', '-c', 'user.email=head@example.com', 'commit', '-q', '-m', 'first'], { cwd: dir });
  return dir;
}

function run(args, { cwd = repo, env = {} } = {}) {
  return new Promise((resolve) => {
    const cleanEnv = { ...process.env };
    delete cleanEnv.HANDOVER_ERP_URL;
    delete cleanEnv.HANDOVER_TOKEN;
    execFile('node', [CLI, ...args], { cwd, env: { ...cleanEnv, ...env } }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push({ method: req.method, url: req.url, headers: req.headers, body });
      const r = responder(req);
      res.writeHead(r.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(r.body));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
});
after(() => server.close());

const handoverBody = (extra = {}) => ({
  project: { id: 1, code: 'P', name: 'Proj' },
  repositories: [],
  sections: [
    { key: 'overview', repository_id: null, content: 'o', version: 3 },
    { key: 'tech_specs', repository_id: 7, content: 't', version: 2 },
    { key: 'pitfalls', repository_id: 8, content: 'x', version: 9 },
  ],
  features: [{ id: 1 }, { id: 2 }],
  notes: [{ id: 1 }],
  changes: [],
  repository: { id: 7, label: 'api', default_branch: 'main', last_synced_sha: SYNCED, pushes_since_sync: 4 },
  pending: [{ id: 1 }],
  ...extra,
});

beforeEach(() => {
  requests = [];
  responder = (req) => {
    if (req.url.startsWith('/api/handover/v1/ping')) return { status: 200, body: { repository_id: 7, project_id: 1 } };
    if (req.url.startsWith('/api/handover/v1/pending')) return { status: 200, body: { branch: 'main', count: 2 } };
    if (req.url.startsWith('/api/handover/v1/handover')) return { status: 200, body: handoverBody() };
    if (req.url.startsWith('/api/handover/v1/updates')) return { status: 200, body: { applied: true, versions: { overview: 4 } } };
    return { status: 404, body: {} };
  };
  repo = makeRepo({ erp_url: `http://127.0.0.1:${port}`, token: 'hov_testtoken' });
});

test('ping sends token and prints ids', async () => {
  const r = await run(['ping']);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'ok repository=7 project=1');
  assert.equal(requests[0].url, '/api/handover/v1/ping');
  assert.equal(requests[0].headers['x-handover-token'], 'hov_testtoken');
});

test('env overrides config', async () => {
  const r = await run(['ping'], { env: { HANDOVER_TOKEN: 'hov_env', HANDOVER_ERP_URL: `http://127.0.0.1:${port}/` } });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(requests[0].headers['x-handover-token'], 'hov_env');
});

test('get encodes branch and saves file', async () => {
  const r = await run(['get', '--branch', 'feature/x#1']);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(requests[0].url, '/api/handover/v1/handover?branch=feature%2Fx%231');
  const file = path.join(repo, '.git', 'handover', 'current.json');
  assert.ok(fs.existsSync(file));
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).project.code, 'P');
  assert.match(r.stdout, /api/);
  assert.match(r.stdout, /overview v3/);
  assert.match(r.stdout, /tech_specs v2/);
  assert.doesNotMatch(r.stdout, /pitfalls/);
  assert.match(r.stdout, /features: 2/);
  assert.match(r.stdout, /notes: 1/);
  assert.match(r.stdout, /pending: 1/);
  assert.ok(r.stdout.includes(file));
});

test('get --out writes to given file', async () => {
  const out = path.join(repo, 'out.json');
  const r = await run(['get', '--out', out]);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(fs.existsSync(out));
  assert.match(requests[0].url, /branch=main$/);
});

test('pending prints count', async () => {
  const r = await run(['pending', '--branch', 'dev']);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout.trim(), '2');
  assert.equal(requests[0].url, '/api/handover/v1/pending?branch=dev');
});

test('post fills branch/sha/from_sha/author from git', async () => {
  const f = path.join(os.tmpdir(), `payload-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(f, JSON.stringify({ summary: 's', sections: { overview: { content: 'c', base_version: 3 } } }));
  const r = await run(['post', f]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^applied versions=/);
  const post = requests.find((q) => q.method === 'POST');
  assert.equal(post.url, '/api/handover/v1/updates');
  const b = JSON.parse(post.body);
  assert.equal(b.branch, 'main');
  assert.equal(b.sha, git(['rev-parse', 'HEAD']));
  assert.equal(b.from_sha, SYNCED);
  assert.deepEqual(b.author, { name: 'Head Author', email: 'head@example.com' });
  assert.equal(b.summary, 's');
});

test('post with 202 prints pending id', async () => {
  const f = path.join(os.tmpdir(), `payload-${process.pid}-${Date.now()}b.json`);
  fs.writeFileSync(f, JSON.stringify({ summary: 's' }));
  const base = responder;
  responder = (req) => (req.method === 'POST' ? { status: 202, body: { pending: true, id: 55 } } : base(req));
  const r = await run(['post', f]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'pending id=55');
});

test('post from_sha null when last_synced_sha is not 40-hex', async () => {
  const f = path.join(os.tmpdir(), `payload-${process.pid}-${Date.now()}c.json`);
  fs.writeFileSync(f, JSON.stringify({ summary: 's' }));
  const base = responder;
  responder = (req) =>
    req.url.startsWith('/api/handover/v1/handover')
      ? { status: 200, body: handoverBody({ repository: { id: 7, default_branch: 'main', last_synced_sha: null } }) }
      : base(req);
  const r = await run(['post', f]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(JSON.parse(requests.find((q) => q.method === 'POST').body).from_sha, null);
});

test('post on dirty tree exits 5 without calling server', async () => {
  fs.writeFileSync(path.join(repo, 'a.txt'), 'changed\n');
  const f = path.join(os.tmpdir(), `payload-${process.pid}-${Date.now()}d.json`);
  fs.writeFileSync(f, JSON.stringify({ summary: 's' }));
  const r = await run(['post', f]);
  assert.equal(r.code, 5);
  assert.equal(requests.length, 0);
});

test('untracked files do not count as dirty; --allow-dirty bypasses', async () => {
  fs.writeFileSync(path.join(repo, 'scratch.txt'), 'x');
  const f = path.join(os.tmpdir(), `payload-${process.pid}-${Date.now()}e.json`);
  fs.writeFileSync(f, JSON.stringify({ summary: 's' }));
  assert.equal((await run(['post', f])).code, 0);
  fs.writeFileSync(path.join(repo, 'a.txt'), 'changed\n');
  assert.equal((await run(['post', f, '--allow-dirty'])).code, 0);
});

test('409 exits 3 and prints conflicts', async () => {
  const f = path.join(os.tmpdir(), `payload-${process.pid}-${Date.now()}f.json`);
  fs.writeFileSync(f, JSON.stringify({ summary: 's' }));
  const base = responder;
  responder = (req) => (req.method === 'POST' ? { status: 409, body: { message: 'stale', conflicts: { 'tech_specs': { current_version: 5 } } } } : base(req));
  const r = await run(['post', f]);
  assert.equal(r.code, 3);
  assert.match(r.stderr, /tech_specs/);
});

test('422 exits 4 and prints errors', async () => {
  const f = path.join(os.tmpdir(), `payload-${process.pid}-${Date.now()}g.json`);
  fs.writeFileSync(f, JSON.stringify({ summary: 's' }));
  const base = responder;
  responder = (req) => (req.method === 'POST' ? { status: 422, body: { errors: { summary: ['looks like a secret'] } } } : base(req));
  const r = await run(['post', f]);
  assert.equal(r.code, 4);
  assert.match(r.stderr + r.stdout, /looks like a secret/);
});

test('401 exits 4', async () => {
  responder = () => ({ status: 401, body: { message: 'bad token' } });
  const r = await run(['ping']);
  assert.equal(r.code, 4);
  assert.match(r.stderr, /bad token/);
});

test('500 exits 2', async () => {
  responder = () => ({ status: 500, body: {} });
  const r = await run(['ping']);
  assert.equal(r.code, 2);
});

test('server not listening exits 2 with ERP unreachable', async () => {
  const dead = http.createServer();
  await new Promise((r) => dead.listen(0, '127.0.0.1', r));
  const p = dead.address().port;
  await new Promise((r) => dead.close(r));
  const r = await run(['ping'], { env: { HANDOVER_ERP_URL: `http://127.0.0.1:${p}`, HANDOVER_TOKEN: 'hov_x' } });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /ERP unreachable/);
});

test('missing .handover.json exits 1 naming /handover setup', async () => {
  const bare = makeRepo(null);
  const r = await run(['ping'], { cwd: bare });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /\/handover setup/);
});

test('unknown command exits 1', async () => {
  assert.equal((await run(['bogus'])).code, 1);
});

test('context prints git + ERP info', async () => {
  // second commit so there is history after SYNCED-known sha
  const first = git(['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(repo, 'b.txt'), 'two\n');
  git(['add', 'b.txt']);
  git(['commit', '-q', '-m', 'second change']);
  const base = responder;
  responder = (req) =>
    req.url.startsWith('/api/handover/v1/handover')
      ? { status: 200, body: handoverBody({ repository: { id: 7, default_branch: 'main', last_synced_sha: first, pushes_since_sync: 4 } }) }
      : base(req);
  const r = await run(['context']);
  assert.equal(r.code, 0, r.stderr);
  const c = JSON.parse(r.stdout);
  assert.equal(c.branch, 'main');
  assert.equal(c.default_branch, 'main');
  assert.equal(c.sha, git(['rev-parse', 'HEAD']));
  assert.equal(c.dirty, false);
  assert.equal(c.last_synced_sha, first);
  assert.equal(c.last_synced_known, true);
  assert.equal(c.behind.pushes_since_sync, 4);
  assert.deepEqual(c.commits_since_sync.map((x) => x.subject), ['second change']);
  assert.match(c.diff_stat, /b\.txt/);
});

test('context with unknown last_synced_sha falls back to recent commits', async () => {
  const r = await run(['context']);
  assert.equal(r.code, 0, r.stderr);
  const c = JSON.parse(r.stdout);
  assert.equal(c.last_synced_known, false);
  assert.deepEqual(c.commits_since_sync.map((x) => x.subject), ['first']);
  assert.deepEqual(c.author, { name: 'Head Author', email: 'head@example.com' });
});
