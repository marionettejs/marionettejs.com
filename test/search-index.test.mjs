import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdtemp, readFile, rm, mkdir, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeSearchFiles } from '../scripts/search-index.mjs';

const fixture = async t => {
  const root = await mkdtemp(join(tmpdir(), 'search-output-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
};
test('search files are complete when the awaited writer resolves', async t => {
  const root = await fixture(t);
  const metadata = Buffer.from(JSON.stringify({ languages: { en: { page_count: 3 } } }));
  const binary = Uint8Array.from([0, 255, 1, 0, 128]);
  const files = [{ path: 'pagefind-entry.json', content: metadata }, { path: 'nested/index.pf_meta', content: binary }];
  await writeSearchFiles({ getFiles: async () => ({ files }), writeFiles: () => assert.fail('Native disk writer must not be used') }, root);
  // Mutating the input after resolution cannot change the completed disk bytes.
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


test('rebuilding the bundle removes stale fragments and preserves sibling output', async t => {
  const parent = await fixture(t);
  const root = join(parent, 'pagefind');
  await mkdir(join(root, 'nested'), { recursive: true });
  await writeFile(join(root, 'nested/stale.pf_fragment'), 'obsolete');
  await writeFile(join(parent, 'index.html'), 'keep');
  await writeSearchFiles({ getFiles: async () => ({ files: [{ path: 'pagefind-entry.json', content: Buffer.from('{}') }] }) }, root);
  await assert.rejects(readFile(join(root, 'nested/stale.pf_fragment')), /ENOENT/);
  assert.equal(await readFile(join(root, 'pagefind-entry.json'), 'utf8'), '{}');
  assert.equal(await readFile(join(parent, 'index.html'), 'utf8'), 'keep');
});

test('generation and path errors preserve the previous bundle before replacement', async t => {
  const root = await fixture(t);
  const existing = join(root, 'pagefind-entry.json');
  await writeFile(existing, 'previous');
  for (const generated of [{ errors: ['failed'] }, { files: [] }, { files: [{ path: '../escape', content: Buffer.from('bad') }] }]) {
    await assert.rejects(writeSearchFiles({ getFiles: async () => generated }, root));
    assert.equal(await readFile(existing, 'utf8'), 'previous');
  }
});


test('a mid-write filesystem error preserves the previous bundle and cleans staging', async t => {
  const parent = await fixture(t);
  const root = join(parent, 'pagefind');
  await mkdir(root);
  await writeFile(join(root, 'pagefind-entry.json'), 'previous bundle');
  const files = [{ path: 'collision', content: Buffer.from('first file') }, { path: 'collision/child', content: Buffer.from('cannot create directory over a file') }];
  await assert.rejects(writeSearchFiles({ getFiles: async () => ({ files }) }, root), /EEXIST|ENOTDIR/);
  assert.equal(await readFile(join(root, 'pagefind-entry.json'), 'utf8'), 'previous bundle');
  assert.deepEqual(await readdir(parent), ['pagefind']);
});


test('cleanup failure neither rejects a completed replacement nor masks a write failure', async t => {
  const parent = await fixture(t);
  const root = join(parent, 'pagefind');
  await mkdir(root);
  await writeFile(join(root, 'pagefind-entry.json'), 'previous');
  const cleanup = t.mock.method(fs, 'rm', async () => { throw new Error('cleanup unavailable'); });
  try {
    await writeSearchFiles({ getFiles: async () => ({ files: [{ path: 'pagefind-entry.json', content: Buffer.from('installed') }] }) }, root);
    assert.equal(await readFile(join(root, 'pagefind-entry.json'), 'utf8'), 'installed');
    const files = [{ path: 'collision', content: Buffer.from('file') }, { path: 'collision/child', content: Buffer.from('bad') }];
    await assert.rejects(writeSearchFiles({ getFiles: async () => ({ files }) }, root), /EEXIST|ENOTDIR/);
    assert.equal(await readFile(join(root, 'pagefind-entry.json'), 'utf8'), 'installed');
    assert.equal(cleanup.mock.callCount(), 2);
  } finally { cleanup.mock.restore(); }
});
