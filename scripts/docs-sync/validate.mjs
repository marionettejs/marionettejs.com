import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { git, hash, publicationPath } from './prepare.mjs';
import { readSnapshot } from '../library-docs.mjs';

export async function validateSync(root) {
  const read = path => readFile(resolve(root, path));
  await rm(resolve(root, 'output/docs-sync/validated.json'), { force: true });
  const state = JSON.parse(await read('output/docs-sync/state.json'));
  const changes = git(root, 'diff', '--name-only', state.main).split('\n').filter(Boolean);
  assert.deepEqual(changes.filter(path => path !== publicationPath), [], 'Sync changed files outside publication edits');
  const { manifest, pages, assets } = await readSnapshot(resolve(root, 'content/library-docs'));
  for (const item of [...pages, ...assets]) {
    const path = item.markdown === undefined ? `dist/docs/source/${item.source}` : `dist/docs/markdown/${item.source}`;
    assert.equal(hash(await read(path)), item.sha256, `Archived output changed: ${item.source}`);
  }
  assert.deepEqual(JSON.parse(await read('dist/docs/manifest.json')), manifest);
  const publication = await read(publicationPath);
  assert.equal(hash(publication), state.sha256);
  assert.equal(hash(await read('dist/docs/publication.json')), state.sha256);
  const corpus = JSON.parse(await read('dist/docs/corpus.json'));
  assert.equal(corpus.publicationEditsSha256, state.sha256);
  for (const document of corpus.documents) {
    const path = new URL(document.markdownUrl).pathname;
    assert.equal(hash(await read(`dist${path}`)), document.sha256, document.id);
  }
  const mcp = JSON.parse(await read('output/mcp/snapshot.json'));
  assert.equal(mcp.provenance.corpusSha256, hash(await read('dist/docs/corpus.json')));
  await writeFile(resolve(root, 'output/docs-sync/validated.json'), JSON.stringify({ ...state, corpusSha256: mcp.provenance.corpusSha256 }));
  console.log('Validated archive bytes, publication hash, and website/MCP parity.');

}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await validateSync(process.cwd());
}
