import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { branch, publicationPath, hash } from './prepare.mjs';

// All writes happen after validation, with optimistic checks on both refs.
export async function publish({ api, state, content }) {
  if (hash(content) !== state.sha256) throw new Error('DOCS_SYNC_HASH: Validated content changed.');
  if (!state.changedFromMain) return { status: 'unchanged' };
  const prefix = '/repos/marionettejs/marionettejs.com';
  const main = await api(`${prefix}/git/ref/heads/main`);
  const head = await api(`${prefix}/git/ref/heads/${branch}`, 'GET', undefined, true);
  if (main.object.sha !== state.main || (head?.object.sha || null) !== state.head) throw new Error('DOCS_SYNC_RACE: Website refs changed; rerun the sync.');
  const pulls = await api(`${prefix}/pulls?state=open&head=marionettejs:${branch}&base=main`);
  if (pulls.length > 1) throw new Error('DOCS_SYNC_PRS: Expected at most one open sync PR.');
  const existing = head && await api(`${prefix}/contents/${publicationPath}?ref=${state.head}`);
  if (!existing || Buffer.from(existing.content, 'base64').toString('utf8') !== content) {
    const base = await api(`${prefix}/git/commits/${state.main}`);
    const blob = await api(`${prefix}/git/blobs`, 'POST', { content, encoding: 'utf-8' });
    const tree = await api(`${prefix}/git/trees`, 'POST', { base_tree: base.tree.sha, tree: [{ path: publicationPath, mode: '100644', type: 'blob', sha: blob.sha }] });
    const commit = await api(`${prefix}/git/commits`, 'POST', {
      message: `docs(sync): update reading copies from ${state.revision}`,
      tree: tree.sha, parents: [...new Set([state.head, state.main].filter(Boolean))],
    });
    // GitHub cannot atomically compare main and write another ref. Check main as
    // late as possible; required up-to-date PR checks cover the remaining window.
    const latestMain = await api(`${prefix}/git/ref/heads/main`);
    if (latestMain.object.sha !== state.main) throw new Error('DOCS_SYNC_RACE: Website base changed before publication; rerun the sync.');
    // A non-force update rejects a concurrent writer even after the preflight.
    if (head) await api(`${prefix}/git/refs/heads/${branch}`, 'PATCH', { sha: commit.sha, force: false });
    else await api(`${prefix}/git/refs`, 'POST', { ref: `refs/heads/${branch}`, sha: commit.sha });
  }
  const publication = JSON.parse(content);
  const revisions = [...new Set(publication.edits.map(edit => edit.sourceRevision).filter(Boolean))].sort();
  const body = `## What\n- Update library documentation reading copies using merged source ${state.revision}.\n- Coalesce changes on this single sync branch; retain publication wording through three-way merges.\n\n## Why\nKeep website and MCP reading copies aligned with reviewed library documentation.\n\n## Scope\nOnly ${publicationPath}. Marketing, npm archive, package versions, skill and starter assets remain unchanged.\n\nExact reading-copy source revisions:\n${revisions.map(value => `- https://github.com/marionettejs/marionette/commit/${value}`).join('\n')}\n\n## Deployment Impact\nNo forms are involved. Do not merge or deploy automatically. After review and merge, manually deploy the full website and MCP from the same website commit and corpus hash using mcp/DEPLOYMENT.md.\n\n## Testing\n- npm run check\n- node scripts/check-agent-site.mjs --local --report output/agent-retrieval.json\n- node scripts/docs-sync/validate.mjs\n- Publication SHA-256: ${state.sha256}\n- Recheck required PR CI on this exact head.\n`;
  const fields = { title: 'docs(sync): update library reading copies', body, base: 'main', head: branch };
  const pr = pulls[0] ? await api(`${prefix}/pulls/${pulls[0].number}`, 'PATCH', { title: fields.title, body }) : await api(`${prefix}/pulls`, 'POST', fields);
  return { status: 'pr', url: pr.html_url };
}

async function github(path, method = 'GET', body, missing = false) {
  const response = await fetch(`https://api.github.com${path}`, { method, headers: {
    Authorization: `Bearer ${process.env.DOCS_SYNC_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (missing && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${method} ${path}: HTTP ${response.status}`);
  return response.json();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const state = JSON.parse(await readFile('output/docs-sync/validated.json', 'utf8'));
  console.log(await publish({ api: github, state, content: await readFile(publicationPath, 'utf8') }));
}
