import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, rename, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importDocs } from '../scripts/import-docs.mjs';

const source = fileURLToPath(new URL('../content/library-docs', import.meta.url));

test('failed snapshot installation restores the previous directory', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'marionette-import-'));
  const target = resolve(directory, 'docs');
  try {
    await mkdir(target);
    await writeFile(resolve(target, 'previous.md'), 'previous snapshot');
    await assert.rejects(importDocs(source, { target, renamePath: async (from, to) => {
      if (from === `${target}.import`) throw new Error('injected install failure');
      await rename(from, to);
    } }), /injected install failure/);
    assert.equal(await readFile(resolve(target, 'previous.md'), 'utf8'), 'previous snapshot');
    await assert.rejects(access(`${target}.backup`), { code: 'ENOENT' });
    await assert.rejects(access(`${target}.import`), { code: 'ENOENT' });
    await importDocs(source, { target });
    assert.equal(await readFile(resolve(target, 'manifest.json'), 'utf8'), await readFile(resolve(source, 'manifest.json'), 'utf8'));
    await assert.rejects(access(resolve(target, 'previous.md')), { code: 'ENOENT' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('the next import recovers an interrupted replacement before validating new input', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'marionette-recover-'));
  const target = resolve(directory, 'docs');
  try {
    await cp(source, `${target}.backup`, { recursive: true });
    await mkdir(`${target}.import`);
    await assert.rejects(importDocs(resolve(directory, 'missing'), { target }), { code: 'ENOENT' });
    assert.equal(await readFile(resolve(target, 'manifest.json'), 'utf8'), await readFile(resolve(source, 'manifest.json'), 'utf8'));
    await importDocs(source, { target });
    await assert.rejects(access(`${target}.backup`), { code: 'ENOENT' });
    await assert.rejects(access(`${target}.import`), { code: 'ENOENT' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
