import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { stageStableDocs } from '../scripts/stage-stable-docs.mjs';
import { readSnapshot } from '../scripts/library-docs.mjs';
import { runtimeFixture } from './helpers/runtime-fixture.mjs';

const absent = path => assert.rejects(readFile(path), { code: 'ENOENT' });

test('stable staging exports verified docs and evidence together and refuses overwrite', async t => {
  const { root, request, manifest, lock } = await runtimeFixture(t);
  const { destination, count } = await stageStableDocs(manifest.sourceRevision, { directory: root, request });
  assert.equal(count, manifest.pages.length);
  assert.equal((await readSnapshot(destination)).manifest.contentSha256, manifest.contentSha256);
  const evidencePath = join(destination, 'stable-docs-evidence.json');
  const bytes = await readFile(evidencePath);
  const evidence = JSON.parse(bytes);
  assert.equal(evidence.packageVersion, '5.0.0');
  assert.equal(evidence.sourceRevision, manifest.sourceRevision);
  assert.equal(evidence.contentSha256, manifest.contentSha256);
  assert.deepEqual(evidence.archives, Object.fromEntries(Object.entries(lock.packages).filter(([key]) => key)));
  await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request }), /Refusing to overwrite/);
  assert.deepEqual(await readFile(evidencePath), bytes);
  await absent(join(root, 'node_modules/marionette/manifest.json'));
});

test('stable staging diagnoses invalid revision, RC install and certified revision mismatch', async t => {
  await assert.rejects(stageStableDocs('typo'), /Usage:/);
  const rc = await runtimeFixture(t, '5.0.0-rc.2');
  await assert.rejects(stageStableDocs(rc.manifest.sourceRevision, { directory: rc.root, request: rc.request }), /Expected installed 5.0.0; found 5.0.0-rc.2/);
  const stable = await runtimeFixture(t);
  await assert.rejects(stageStableDocs('a'.repeat(40), { directory: stable.root, request: stable.request }), /Certified source revision mismatch: requested a{40}; installed/);
  await absent(join(stable.root, 'output/stable-docs/manifest.json'));
});

for (const failure of ['docs', 'evidence', 'rename']) {
  test(`failed ${failure} write leaves no published export and retry recovers`, async t => {
    const { root, request, manifest } = await runtimeFixture(t);
    const options = { directory: root, request };
    const write = async (path, bytes) => {
      if ((failure === 'docs' && path.endsWith('quick-start.md')) ||
          (failure === 'evidence' && path.endsWith('stable-docs-evidence.json'))) {
        await writeFile(path, 'partial');
        throw new Error('simulated disk failure');
      }
      await writeFile(path, bytes);
    };
    const publish = async () => { throw new Error('simulated rename failure'); };
    await assert.rejects(stageStableDocs(manifest.sourceRevision, { ...options, write, ...(failure === 'rename' ? { publish } : {}) }), /simulated/);
    assert.deepEqual(await readdir(join(root, 'output')), []);
    // A hard interruption may leave a uniquely named temporary sibling. It must
    // not block a retry or be overwritten as though it were a completed export.
    await mkdir(join(root, 'output/.stable-docs-interrupted'));
    await writeFile(join(root, 'output/.stable-docs-interrupted/partial'), 'old partial');
    const { destination } = await stageStableDocs(manifest.sourceRevision, options);
    assert.equal((await readSnapshot(destination)).manifest.contentSha256, manifest.contentSha256);
    assert.equal(await readFile(join(root, 'output/.stable-docs-interrupted/partial'), 'utf8'), 'old partial');
  });
}

test('staging rejects invalid documentation hashes even inside an integrity-matching archive', async t => {
  const { root, request, manifest } = await runtimeFixture(t, '5.0.0', installed => writeFile(join(installed, 'docs/quick-start.md'), 'invalid documentation'));
  await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request }), /Documentation hash mismatch: docs\/quick-start.md/);
  await absent(join(root, 'output/stable-docs/manifest.json'));
});

test('export retains the validated manifest if the live install changes during writes', async t => {
  const { root, request, manifest } = await runtimeFixture(t);
  const write = async (path, bytes) => {
    await writeFile(join(root, 'node_modules/marionette/docs-manifest.json'), '{"changed":true}');
    await writeFile(path, bytes);
  };
  const { destination } = await stageStableDocs(manifest.sourceRevision, { directory: root, request, write });
  assert.deepEqual((await readSnapshot(destination)).manifest, manifest);
  assert.equal(JSON.parse(await readFile(join(destination, 'stable-docs-evidence.json'))).contentSha256, manifest.contentSha256);
});

for (const changed of ['packageVersion', 'sourceRevision', 'contentSha256', 'route', 'title']) {
  test(`staging rejects a valid snapshot with changed ${changed} after archive verification`, async t => {
    const { root, request, manifest } = await runtimeFixture(t);
    const readDocs = async (directory, options) => {
      const replacement = structuredClone(manifest);
      if (changed === 'contentSha256') {
        const page = replacement.pages[0];
        const bytes = (await readFile(join(directory, page.source), 'utf8')) + '\nChanged after verification.\n';
        await writeFile(join(directory, page.source), bytes);
        page.sha256 = createHash('sha256').update(bytes).digest('hex');
        replacement.contentSha256 = createHash('sha256').update([...replacement.pages, ...replacement.assets]
          .sort((a, b) => a.source.localeCompare(b.source, 'en')).map(entry => `${entry.source}\0${entry.sha256}\n`).join('')).digest('hex');
      } else if (changed === 'route' || changed === 'title') {
        replacement.pages.find(page => page.route !== 'docs')[changed] = changed === 'route' ? 'docs/changed-route' : 'Changed title';
      } else replacement[changed] = changed === 'packageVersion' ? '5.0.1' : 'b'.repeat(40);
      await writeFile(join(directory, 'docs-manifest.json'), JSON.stringify(replacement));
      return readSnapshot(directory, options);
    };
    await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request, readDocs }), /snapshot changed after release verification.*clean install/);
    assert.deepEqual(await readdir(join(root, 'output')), []);
  });
}
