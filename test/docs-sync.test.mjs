import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir, cp, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncPublication, git, hash, checkNavigation, branchReview, mergeBranchPublication } from '../scripts/docs-sync/prepare.mjs';
import { publish } from '../scripts/docs-sync/publish.mjs';

async function fixture(t) {
  const repository = await mkdtemp(join(tmpdir(), 'docs-sync-test-'));
  t.after(() => rm(repository, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }));
  git(repository, 'init', '-q');
  // Commits must not leave detached Git maintenance writing into a disposed fixture.
  git(repository, 'config', 'maintenance.auto', 'false');
  git(repository, 'config', 'gc.auto', '0');
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
  await assert.rejects(syncPublication({ ...f, revision, pages: [...f.pages, { source: 'docs/missing.md', markdown: '' }] }), /DOCS_SYNC_SOURCE/);
});

function remote({ existing = false, race = false } = {}) {
  const requests = [];
  const content = JSON.stringify({ edits: [{ sourceRevision: 'c'.repeat(40) }] });
  const state = { main: 'a'.repeat(40), head: existing ? 'b'.repeat(40) : null, revision: 'c'.repeat(40), sha256: hash(content), changedFromMain: true };
  state.review = existing ? { number: 7, state: 'open', head: state.head } : null;
  const api = async (path, method = 'GET', body) => {
    requests.push({ path, method, body });
    if (path.endsWith('/git/ref/heads/main')) return { object: { sha: race ? 'wrong' : state.main } };
    if (path.includes('/git/ref/heads/automation')) return existing ? { object: { sha: state.head } } : null;
    if (path.includes('state=all')) return existing ? [{ number: 7, state: 'open', head: { sha: state.head } }] : [];
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

test('routing sync builds and validates independently, rejecting corrupted delivery artifacts', async t => {
  const { validateSync } = await import('../scripts/docs-sync/validate.mjs');
  const root = await mkdtemp(join(tmpdir(), 'docs-validation-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  // Use authored sources only: this test must also work before the first build.
  for (const path of ['content', 'scripts', 'site', 'mcp', 'tools', 'test', 'package.json']) {
    await cp(new URL(`../${path}`, import.meta.url), join(root, path), { recursive: true });
  }
  await symlink(new URL('../node_modules', import.meta.url).pathname, join(root, 'node_modules'), 'dir');
  const publicationPath = join(root, 'content/docs-publication-edits.json');
  const publication = JSON.parse(await readFile(publicationPath, 'utf8'));
  publication.status = 'development candidate (local source)';
  // This isolated repository contains only the routing source under test.
  publication.edits = [];
  publication.titles = [];
  const archive = JSON.parse(await readFile(join(root, 'content/library-docs/manifest.json'), 'utf8'));
  const routing = archive.pages.find(page => page.source === 'docs/guides/routing.md');
  const original = await readFile(join(root, 'content/library-docs', routing.source), 'utf8');
  const f = await fixture(t);
  await mkdir(join(f.repository, 'docs/guides'));
  await writeFile(join(f.repository, routing.source), original);
  git(f.repository, 'add', '.'); git(f.repository, 'commit', '-qm', 'docs: routing baseline');
  const previousRevision = git(f.repository, 'rev-parse', 'HEAD');
  await writeFile(join(f.repository, routing.source), original + '\nReview direct navigation alongside browser Back and Forward behavior.\n');
  git(f.repository, 'add', '.'); git(f.repository, 'commit', '-qm', 'docs: clarify routing verification');
  const revision = git(f.repository, 'rev-parse', 'HEAD');
  archive.sourceDirty = false;
  await writeFile(join(root, 'content/library-docs/manifest.json'), JSON.stringify(archive, null, 2) + '\n');
  const update = await syncPublication({ repository: f.repository, revision, manifest: { ...archive, sourceRevision: previousRevision },
    pages: [{ ...routing, markdown: original }], publication });
  publication.edits = update.publication.edits;
  const content = JSON.stringify(publication, null, 2) + '\n';
  await writeFile(publicationPath, content);
  git(root, 'init', '-q'); git(root, 'config', 'user.name', 'Documentation test');
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'add', 'content'); git(root, 'commit', '-qm', 'docs: archive fixture');
  const run = promisify(execFile);
  for (const script of ['scripts/build-workshop-starter.mjs', 'scripts/build-demo-projects.mjs', 'scripts/build.mjs', 'scripts/build-mcp.mjs']) {
    await run(process.execPath, [script], { cwd: root });
  }
  await run(process.execPath, ['--test', 'test/docs.test.mjs', 'test/site.test.mjs', 'test/agent-discovery.test.mjs', 'test/release.test.mjs'], { cwd: root });
  assert.ok((await readFile(join(root, 'dist/docs/guides/routing.md'), 'utf8')).includes(`reading source revision ${revision}`));
  await mkdir(join(root, 'output/docs-sync'));
  await writeFile(join(root, 'output/docs-sync/state.json'), JSON.stringify({ main: git(root, 'rev-parse', 'HEAD'), sha256: hash(content) }));
  await validateSync(root);
  for (const path of ['dist/docs/markdown/docs/agents.md', 'dist/docs/publication.json', 'dist/docs/agents.md', 'dist/docs/markdown/docs/guides/framework-migration.md', 'dist/docs/supplemental-manifest.json', 'output/mcp/snapshot.json']) {
    const original = await readFile(join(root, path));
    await writeFile(join(root, path), '{}');
    await assert.rejects(validateSync(root), { code: 'ERR_ASSERTION' }, path);
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

test('unknown publication sources fail even with no upstream changes', async t => {
  const f = await fixture(t);
  for (const source of ['docs/typo.md', 'skills/marionette/SKILL.md']) {
    await assert.rejects(syncPublication({ ...f, revision: f.manifest.sourceRevision,
      publication: { ...f.publication, edits: [...f.publication.edits, { source, before: 'x', after: 'y' }] } }), /DOCS_SYNC_EDIT: Unknown publication source/);
  }
});

test('main moving during object creation prevents both new and existing branch publication', async () => {
  for (const existing of [false, true]) {
    const f = remote({ existing });
    let mainReads = 0;
    const api = async (path, ...args) => {
      if (path.endsWith('/git/ref/heads/main') && ++mainReads > 1) return { object: { sha: 'moved' } };
      return f.api(path, ...args);
    };
    await assert.rejects(publish({ ...f, api }), /DOCS_SYNC_RACE/);
    assert.equal(mainReads, 2);
    assert.ok(f.requests.some(request => request.path.endsWith('/git/commits') && request.method === 'POST'));
    assert.ok(f.requests.every(request => !request.path.includes('/git/refs') && !(request.path.includes('/pulls') && request.method !== 'GET')));
  }
});


test('only an open exact-head sync PR contributes pending publication edits', async () => {
  const head = 'b'.repeat(40);
  for (const state of ['open', 'closed']) {
    const result = await branchReview(async () => [{ number: 40, state, head: { sha: head } }], head);
    assert.deepEqual(result, { number: 40, state, head });
  }
  assert.equal(await branchReview(() => assert.fail('No branch needs no PR lookup'), null), null);
  for (const pulls of [[], [{ number: 40, state: 'closed', head: { sha: 'changed' } }]])
    await assert.rejects(branchReview(async () => pulls, head), /DOCS_SYNC_BRANCH_REVIEW/);
  await assert.rejects(branchReview(async () => [1, 2].map(number => ({ number, state: 'open', head: { sha: head } })), head), /DOCS_SYNC_PRS/);
});

test('a closed sync branch is preserved as ancestry without reapplying its rejected edits', async () => {
  const f = remote({ existing: true });
  f.state.review = { number: 40, state: 'closed', head: f.state.head };
  const api = async (path, ...args) => {
    if (path.includes('state=all')) return [{ number: 40, state: 'closed', head: { sha: f.state.head } }];
    if (path.includes('state=open')) return [];
    return f.api(path, ...args);
  };
  await publish({ ...f, api });
  const commit = f.requests.find(request => request.path.endsWith('/git/commits') && request.method === 'POST');
  assert.deepEqual(commit.body.parents, [f.state.head, f.state.main]);
  assert.equal(f.requests.find(request => request.path.includes('/git/refs')).body.force, false);
  assert.ok(f.requests.some(request => request.path.endsWith('/pulls') && request.method === 'POST'));
});

test('closing or reopening the sync PR after validation prevents publication writes', async () => {
  const f = remote({ existing: true });
  f.state.review = { number: 40, state: 'open', head: f.state.head };
  const api = async (path, ...args) => path.includes('state=all')
    ? [{ number: 40, state: 'closed', head: { sha: f.state.head } }] : f.api(path, ...args);
  await assert.rejects(publish({ ...f, api }), /DOCS_SYNC_RACE/);
  assert.ok(f.requests.every(request => request.method === 'GET'));
});


test('closed RC1 branch cannot overwrite or conflict with human RC2 publication edits', async t => {
  const f = await fixture(t);
  const path = 'content/docs-publication-edits.json';
  await mkdir(join(f.repository, 'content'));
  await writeFile(join(f.repository, path), '{"version":"rc1","wording":"baseline"}\n');
  git(f.repository, 'add', '.'); git(f.repository, 'commit', '-qm', 'website: RC1 baseline');
  const base = git(f.repository, 'rev-parse', 'HEAD');
  await writeFile(join(f.repository, path), '{"version":"rc1","wording":"rejected automation"}\n');
  git(f.repository, 'add', '.'); git(f.repository, 'commit', '-qm', 'automation: pending RC1 edit');
  const head = git(f.repository, 'rev-parse', 'HEAD');
  git(f.repository, 'checkout', '-q', '--detach', base);
  const bytes = '{"version":"rc2","wording":"human publication edit"}\n';
  await writeFile(join(f.repository, path), bytes);
  git(f.repository, 'add', '.'); git(f.repository, 'commit', '-qm', 'website: reviewed RC2 wording');
  const main = git(f.repository, 'rev-parse', 'HEAD');
  assert.equal(await mergeBranchPublication({ root: f.repository, main, head, bytes, review: { state: 'closed' } }), bytes);
  await assert.rejects(mergeBranchPublication({ root: f.repository, main, head, bytes, review: { state: 'open' } }), /DOCS_SYNC_CONFLICT/);
  assert.equal(await readFile(join(f.repository, path), 'utf8'), bytes);
});


test('a sync PR changing state during object creation cannot update the branch', async () => {
  const f = remote({ existing: true });
  let reviews = 0;
  const api = async (path, ...args) => {
    if (path.includes('state=all') && ++reviews > 1) return [{ number: 7, state: 'closed', head: { sha: f.state.head } }];
    return f.api(path, ...args);
  };
  await assert.rejects(publish({ ...f, api }), /DOCS_SYNC_RACE/);
  assert.ok(f.requests.every(request => !request.path.includes('/git/refs')));
});
