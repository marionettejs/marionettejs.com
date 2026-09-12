import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncPublication, git, hash, checkNavigation } from '../scripts/docs-sync/prepare.mjs';
import { publish } from '../scripts/docs-sync/publish.mjs';

async function fixture(t) {
  const repository = await mkdtemp(join(tmpdir(), 'docs-sync-test-'));
  t.after(() => rm(repository, { recursive: true, force: true }));
  git(repository, 'init', '-q');
  git(repository, 'config', 'user.name', 'Documentation test');
  git(repository, 'config', 'user.email', 'test@example.invalid');
  await mkdir(join(repository, 'docs'));
  const markdown = '# Guide\n\nRelease wording.\n\nMore context.\n\nOld instruction.\n';
  async function commit(text) {
    await writeFile(join(repository, 'docs/guide.md'), text);
    git(repository, 'add', '.'); git(repository, 'commit', '-qm', 'docs: update guide');
    return git(repository, 'rev-parse', 'HEAD');
  }
  const sourceRevision = await commit(markdown);
  return { repository, commit, markdown, manifest: { sourceRevision, sourceDirty: false, packageVersion: '1.0.0' }, pages: [{ source: 'docs/guide.md', markdown }], publication: { packageVersion: '1.0.0', edits: [{ source: 'docs/guide.md', before: 'Release wording.', after: 'Published wording.' }] } };
}

test('sync preserves publication wording and archive, coalesces subsequent changes, and is repeatable', async t => {
  const f = await fixture(t);
  const original = structuredClone(f.manifest);
  let upstream = f.markdown.replace('Old instruction.', 'New instruction.');
  let revision = await f.commit(upstream);
  const first = await syncPublication({ ...f, revision });
  assert.deepEqual(first.changed, ['docs/guide.md']);
  assert.match(first.publication.edits[0].after, /Published wording/);
  assert.match(first.publication.edits[0].after, /New instruction/);
  assert.equal(first.publication.edits[0].sourceSha256, hash(upstream));
  assert.equal(first.publication.edits[0].before, f.markdown);
  const repeated = await syncPublication({ ...f, revision, publication: first.publication });
  assert.deepEqual(repeated.changed, []);
  assert.deepEqual(repeated.publication, first.publication);
  upstream += '\nAnother instruction.\n';
  revision = await f.commit(upstream);
  const second = await syncPublication({ ...f, revision, publication: first.publication });
  assert.equal(second.publication.edits.length, 1);
  assert.equal(second.publication.edits[0].sourceRevision, revision);
  assert.deepEqual(f.manifest, original);
});

test('unrelated and skill-only changes produce no publication churn', async t => {
  const f = await fixture(t);
  await writeFile(join(f.repository, 'SKILL.md'), 'Unreleased skill');
  git(f.repository, 'add', '.'); git(f.repository, 'commit', '-qm', 'docs: skill only');
  const result = await syncPublication({ ...f, revision: git(f.repository, 'rev-parse', 'HEAD') });
  assert.deepEqual(result, { publication: f.publication, changed: [] });
});

test('conflicting publication edits fail without modifying inputs', async t => {
  const f = await fixture(t);
  const original = structuredClone(f.publication);
  const revision = await f.commit(f.markdown.replace('Release wording.', 'Incompatible upstream wording.'));
  await assert.rejects(syncPublication({ ...f, revision }), /DOCS_SYNC_CONFLICT/);
  assert.deepEqual(f.publication, original);
});

test('missing sources, ambiguous edits, dirty archives and invalid revisions stop the sync', async t => {
  const f = await fixture(t);
  const revision = await f.commit(f.markdown + '\nChange.\n');
  await assert.rejects(syncPublication({ ...f, revision: 'master' }), /DOCS_SYNC_REVISION/);
  await assert.rejects(syncPublication({ ...f, revision, manifest: { ...f.manifest, sourceDirty: true } }), /DOCS_SYNC_ARCHIVE/);
  await assert.rejects(syncPublication({ ...f, revision, publication: { ...f.publication, edits: [{ source: 'docs/guide.md', before: 'absent', after: 'x' }] } }), /DOCS_SYNC_EDIT/);
  await assert.rejects(syncPublication({ ...f, revision, pages: [{ source: 'docs/missing.md', markdown: '' }] }));
});

function remote({ existing = false, race = false } = {}) {
  const requests = [];
  const content = JSON.stringify({ edits: [{ sourceRevision: 'c'.repeat(40) }] });
  const state = { main: 'a'.repeat(40), head: existing ? 'b'.repeat(40) : null, revision: 'c'.repeat(40), sha256: hash(content), changedFromMain: true };
  const api = async (path, method = 'GET', body) => {
    requests.push({ path, method, body });
    if (path.endsWith('/git/ref/heads/main')) return { object: { sha: race ? 'wrong' : state.main } };
    if (path.includes('/git/ref/heads/automation')) return existing ? { object: { sha: state.head } } : null;
    if (path.includes('/pulls?')) return existing ? [{ number: 7 }] : [];
    if (path.includes('/contents/')) return { content: Buffer.from('old').toString('base64') };
    if (path.includes('/git/commits/') && method === 'GET') return { tree: { sha: 'tree' } };
    if (path.includes('/pulls')) return { html_url: 'https://github.com/marionettejs/marionettejs.com/pull/7' };
    return { sha: 'new' };
  };
  return { api, state, content, requests };
}

test('publication creates one ready PR and updates that PR without force, merging or deployment', async () => {
  for (const existing of [false, true]) {
    const f = remote({ existing });
    assert.equal((await publish(f)).status, 'pr');
    const writes = f.requests.filter(r => r.method !== 'GET');
    const pr = writes.find(r => r.path.includes('/pulls'));
    assert.equal(pr.method, existing ? 'PATCH' : 'POST');
    assert.equal(pr.body.draft, undefined);
    assert.ok(writes.every(r => !r.path.includes('/merge') && !r.path.includes('/deploy')));
    if (existing) assert.equal(writes.find(r => r.path.includes('/git/refs')).body.force, false);
  }
});

test('no change, changed refs, or invalid validated hash cannot write to GitHub', async () => {
  const unchanged = remote(); unchanged.state.changedFromMain = false;
  assert.equal((await publish(unchanged)).status, 'unchanged');
  assert.deepEqual(unchanged.requests, []);
  const race = remote({ race: true });
  await assert.rejects(publish(race), /DOCS_SYNC_RACE/);
  assert.ok(race.requests.every(r => r.method === 'GET'));
  const invalid = remote(); invalid.content += 'tampered';
  await assert.rejects(publish(invalid), /DOCS_SYNC_HASH/);
  assert.deepEqual(invalid.requests, []);
});

test('navigation changes require route review without advancing the archive', () => {
  const pages = [{ source: 'docs/guide.md', route: 'docs/guide' }];
  assert.doesNotThrow(() => checkNavigation(pages, structuredClone(pages)));
  assert.throws(() => checkNavigation(pages, []), /DOCS_SYNC_NAVIGATION/);
  assert.throws(() => checkNavigation(pages, [...pages, { source: 'docs/new.md' }]), /DOCS_SYNC_NAVIGATION/);
});

test('final validation rejects damaged archive, publication, and website/MCP corpus artifacts', async t => {
  const { cp, readFile } = await import('node:fs/promises');
  const { validateSync } = await import('../scripts/docs-sync/validate.mjs');
  const root = await mkdtemp(join(tmpdir(), 'docs-validation-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of ['content/library-docs', 'dist/docs', 'dist/errors', 'output/mcp']) {
    await cp(new URL(`../${path}`, import.meta.url), join(root, path), { recursive: true });
  }
  const content = await readFile(new URL('../content/docs-publication-edits.json', import.meta.url));
  await writeFile(join(root, 'content/docs-publication-edits.json'), content);
  git(root, 'init', '-q'); git(root, 'config', 'user.name', 'Documentation test');
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'add', 'content'); git(root, 'commit', '-qm', 'docs: archive fixture');
  await mkdir(join(root, 'output/docs-sync'));
  await writeFile(join(root, 'output/docs-sync/state.json'), JSON.stringify({ main: git(root, 'rev-parse', 'HEAD'), sha256: hash(content) }));
  await validateSync(root);
  for (const path of ['dist/docs/markdown/docs/agents.md', 'dist/docs/publication.json', 'dist/docs/agents.md', 'output/mcp/snapshot.json']) {
    const original = await readFile(join(root, path));
    await writeFile(join(root, path), '{}');
    await assert.rejects(validateSync(root), undefined, path);
    await assert.rejects(readFile(join(root, 'output/docs-sync/validated.json')), /ENOENT/);
    await writeFile(join(root, path), original);
  }
});

test('retrying identical PR content updates no branch and creates no second PR', async () => {
  const f = remote({ existing: true });
  const api = async (path, ...args) => path.includes('/contents/')
    ? { content: Buffer.from(f.content).toString('base64') }
    : f.api(path, ...args);
  await publish({ ...f, api });
  const writes = f.requests.filter(request => request.method !== 'GET');
  assert.equal(writes.length, 1);
  assert.match(writes[0].path, /\/pulls\/7$/);
  assert.equal(writes[0].method, 'PATCH');
});
