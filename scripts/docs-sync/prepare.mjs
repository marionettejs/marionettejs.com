import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const publicationPath = 'content/docs-publication-edits.json';
export const branch = 'automation/library-docs-sync';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trimEnd();
function sourceAt(repository, revision, source) {
  const result = spawnSync('git', ['show', `${revision}:${source}`], { cwd: repository, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`DOCS_SYNC_SOURCE: Cannot read ${source} at ${revision}.`, { cause: result.error });
  return result.stdout;
}

export async function mergeText(current, base, incoming, label) {
  if (current === base || current === incoming) return incoming;
  if (incoming === base) return current;
  const directory = await mkdtemp(join(tmpdir(), 'docs-merge-'));
  try {
    await Promise.all([current, base, incoming].map((text, i) => writeFile(join(directory, String(i)), text)));
    const result = spawnSync('git', ['merge-file', '-p', ...[0, 1, 2].map(i => join(directory, String(i)))], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`DOCS_SYNC_CONFLICT: Review publication edits for ${label}; no sync was published.`);
    return result.stdout;
  } finally { await rm(directory, { recursive: true, force: true }); }
}

// Read Git objects, never execute library code or copy its distributable assets.
export async function syncPublication({ repository, revision, manifest, pages, publication }) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('DOCS_SYNC_REVISION: Expected an exact commit.');
  if (manifest.sourceDirty || publication.packageVersion !== manifest.packageVersion) throw new Error('DOCS_SYNC_ARCHIVE: Review the npm import first.');
  const sources = new Set(pages.map(page => page.source));
  for (const edit of publication.edits) {
    if (!sources.has(edit.source)) throw new Error(`DOCS_SYNC_EDIT: Unknown publication source ${edit.source}.`);
  }
  const result = structuredClone(publication);
  const changed = [];
  for (const page of pages) {
    const edits = result.edits.filter(edit => edit.source === page.source);
    const revisions = [...new Set(edits.map(edit => edit.sourceRevision).filter(Boolean))];
    if (revisions.length > 1) throw new Error(`DOCS_SYNC_PROVENANCE: Multiple revisions for ${page.source}.`);
    const previousRevision = revisions[0] || page.sourceRevision || manifest.sourceRevision;
    if (!/^[a-f0-9]{40}$/.test(previousRevision) || spawnSync('git', ['merge-base', '--is-ancestor', previousRevision, revision], { cwd: repository }).status !== 0) throw new Error(`DOCS_SYNC_HISTORY: ${page.source} is not based on an ancestor of the requested source.`);
    const base = sourceAt(repository, previousRevision, page.source);
    const incoming = sourceAt(repository, revision, page.source);
    if (edits.some(edit => edit.sourceSha256 && edit.sourceSha256 !== hash(base))) throw new Error(`DOCS_SYNC_PROVENANCE: Source hash differs for ${page.source}.`);
    if (base === incoming) continue;
    let current = page.markdown;
    for (const edit of edits) {
      if (!edit.before || current.split(edit.before).length !== 2) throw new Error(`DOCS_SYNC_EDIT: Ambiguous publication edit for ${page.source}.`);
      current = current.replace(edit.before, () => edit.after);
    }
    const after = await mergeText(current, base, incoming, page.source);
    result.edits = result.edits.filter(edit => edit.source !== page.source);
    result.edits.push({ source: page.source, sourceRevision: revision, sourceSha256: hash(incoming), readingSha256: hash(after), before: page.markdown, after });
    changed.push(page.source);
  }
  return { publication: result, changed };
}

export function checkNavigation(previous, incoming) {
  if (JSON.stringify(previous) !== JSON.stringify(incoming)) {
    throw new Error('DOCS_SYNC_NAVIGATION: Navigation changed; review routes and archive boundaries in a website PR before retrying.');
  }
}

export async function branchReview(api, head) {
  if (!head) return null;
  const pulls = await api('/repos/marionettejs/marionettejs.com/pulls?state=all&head=marionettejs:automation/library-docs-sync&base=main&per_page=100');
  const open = pulls.filter(pr => pr.state === 'open');
  if (open.length > 1) throw new Error('DOCS_SYNC_PRS: Expected at most one open sync PR.');
  const pr = open[0] || pulls[0];
  if (!pr || pr.head.sha !== head) throw new Error('DOCS_SYNC_BRANCH_REVIEW: Branch has unreviewed changes; review it manually.');
  return { number: pr.number, state: pr.state, head };
}

export async function mergeBranchPublication({ root, main, head, review, bytes }) {
  // A closed PR is not a pending publication edit. Its ref is still retained
  // for optimistic publication checks and non-force ancestry preservation.
  if (review?.state !== 'open') return bytes;
  const base = git(root, 'merge-base', main, head);
  const files = git(root, 'diff', '--name-only', base, head).split('\n').filter(Boolean);
  if (files.some(file => file !== publicationPath)) throw new Error('DOCS_SYNC_BRANCH: Sync branch contains other changes; review it manually.');
  return mergeText(bytes, sourceAt(root, base, publicationPath), sourceAt(root, head, publicationPath), publicationPath);
}

async function githubRead(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers: {
    Accept: 'application/vnd.github+json',
    ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {})
  } });
  if (!response.ok) throw new Error(`DOCS_SYNC_REVIEW: Cannot read branch PR state (HTTP ${response.status}).`);
  return response.json();
}

export async function prepare({ root, repository, api = githubRead }) {
  const { readSnapshot, readSupplementalPages } = await import('../library-docs.mjs');
  const { manifest, pages: archivedPages } = await readSnapshot(resolve(root, 'content/library-docs'));
  const pages = [...archivedPages, ...await readSupplementalPages(resolve(root, 'content/supplemental-docs'), archivedPages)];
  const revision = git(repository, 'rev-parse', 'HEAD');
  // Route additions/removals need website presentation review, never an implicit npm import.
  const initialPublication = JSON.parse(await readFile(resolve(root, publicationPath), 'utf8'));
  const baselineNavigation = JSON.parse(sourceAt(repository, initialPublication.navigationRevision || manifest.sourceRevision, 'docs-site/navigation.json'));
  const incomingNavigation = JSON.parse(sourceAt(repository, revision, 'docs-site/navigation.json'));
  checkNavigation(baselineNavigation, incomingNavigation);
  const main = git(root, 'rev-parse', 'HEAD');
  const remoteBranch = `refs/remotes/origin/${branch}`;
  const old = spawnSync('git', ['rev-parse', '--verify', remoteBranch], { cwd: root, encoding: 'utf8' });
  const head = old.status === 0 ? old.stdout.trim() : null;
  const review = await branchReview(api, head);
  let bytes = await readFile(resolve(root, publicationPath), 'utf8');
  bytes = await mergeBranchPublication({ root, main, head, review, bytes });
  const { publication, changed } = await syncPublication({ repository, revision, manifest, pages, publication: JSON.parse(bytes) });
  const next = `${JSON.stringify(publication, null, 2)}\n`;
  const original = await readFile(resolve(root, publicationPath), 'utf8');
  await mkdir(resolve(root, 'output/docs-sync'), { recursive: true });
  await writeFile(resolve(root, 'output/docs-sync/state.json'), JSON.stringify({ main, head, review, revision, changed, sha256: hash(next), changedFromMain: next !== original }));
  await writeFile(resolve(root, publicationPath), next);
  console.log(`Documentation sync ${revision}: ${changed.length} changed reading copies.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/docs-sync/prepare.mjs /path/to/library');
  await prepare({ root: resolve(import.meta.dirname, '../..'), repository: resolve(process.argv[2]) });
}
