import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeSearchFiles } from '../scripts/search-index.mjs';

const fixture = async t => {
  const root = await mkdtemp(join(tmpdir(), 'search-output-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
};
test('search files are fully written before the native service can be closed', async t => {
  const root = await fixture(t);
  const metadata = Buffer.from(JSON.stringify({ languages: { en: { page_count: 3 } } }));
  const binary = Uint8Array.from([0, 255, 1, 0, 128]);
  const files = [{ path: 'pagefind-entry.json', content: metadata }, { path: 'nested/index.pf_meta', content: binary }];
  await writeSearchFiles({ getFiles: async () => ({ files }), writeFiles: () => assert.fail('Native disk writer must not be used') }, root);
  // Simulate the native service being gone immediately after the awaited call.
  for (const file of files) file.content.fill(0);
  assert.equal(JSON.parse(await readFile(join(root, 'pagefind-entry.json'), 'utf8')).languages.en.page_count, 3);
  assert.deepEqual([...await readFile(join(root, 'nested/index.pf_meta'))], [0, 255, 1, 0, 128]);
});
test('search generation errors and empty output fail rather than accepting stale files', async t => {
  const root = await fixture(t);
  for (const generated of [{ errors: ['Index generation failed'] }, { files: [] }])
    await assert.rejects(writeSearchFiles({ getFiles: async () => generated }, root), /failed|No documentation search files/);
});
test('search file paths cannot write outside the output directory', async t => {
  const root = await fixture(t);
  await assert.rejects(writeSearchFiles({ getFiles: async () => ({ files: [{ path: '../escape', content: Buffer.from('x') }] }) }, root), /escapes/);
});
