import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { readRuntimeRelease, runtimePackages } from '../scripts/release-contract.mjs';
import { runtimeFixture } from './helpers/runtime-fixture.mjs';

test('installed bytes must match all four integrity-verified archives', async t => {
  const { root, request, manifest } = await runtimeFixture(t);
  assert.equal((await readRuntimeRelease(root, { request })).manifest.contentSha256, manifest.contentSha256);
  for (const name of runtimePackages) {
    const path = join(root, 'node_modules', name, 'dist/index.js');
    const original = await readFile(path);
    await writeFile(path, 'changed bytes with unchanged package metadata');
    await assert.rejects(readRuntimeRelease(root, { request }), new RegExp(`Installed registry bytes differ: ${name}/dist/index.js`));
    await writeFile(path, original);
  }
  const docs = join(root, 'node_modules/marionette/docs/quick-start.md');
  await rm(docs);
  await assert.rejects(readRuntimeRelease(root, { request }), /Installed registry bytes differ: marionette\/docs\/quick-start.md/);
});

test('extra installed files and linked runtime packages are rejected', async t => {
  const { root, request } = await runtimeFixture(t);
  const packagePath = join(root, 'node_modules/marionette');
  const extra = join(packagePath, 'dist/extra.js');
  await writeFile(extra, 'extra');
  await assert.rejects(readRuntimeRelease(root, { request }), /Installed registry bytes differ: marionette\/dist\/extra.js/);
  await rm(extra);
  await symlink('index.js', extra);
  await assert.rejects(readRuntimeRelease(root, { request }), /links are not allowed/);
  await rm(extra);
  await rename(packagePath, join(root, 'local-package'));
  await symlink(join(root, 'local-package'), packagePath);
  await assert.rejects(readRuntimeRelease(root, { request }), /Linked runtime package/);
});

test('archive integrity and registry failures fail closed with package diagnostics', async t => {
  const { root } = await runtimeFixture(t);
  await assert.rejects(readRuntimeRelease(root, { request: async () => new Response('wrong archive') }), /Registry archive integrity mismatch: marionette/);
  await assert.rejects(readRuntimeRelease(root, { request: async () => new Response('', { status: 404 }) }), /Registry archive request failed \(404\): marionette/);
  await assert.rejects(readRuntimeRelease(root, { request: async () => { throw new Error('offline'); } }), /Cannot verify installed runtime marionette: offline/);
});
