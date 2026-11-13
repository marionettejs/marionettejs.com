import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { stageStableDocs } from '../scripts/stage-stable-docs.mjs';
import { readSnapshot } from '../scripts/library-docs.mjs';
import { runtimeFixture as makeRuntimeFixture } from './helpers/runtime-fixture.mjs';

async function documentationFixture(t, version = '5.1.0', mutate) {
  const fixture = await makeRuntimeFixture(t, version, mutate);
  const { root, lock } = fixture;
  await cp(join(root, 'node_modules/marionette'), join(root, 'node_modules/marionette-docs'), { recursive: true });
  lock.packages['node_modules/marionette-docs'] = { name: 'marionette', ...lock.packages['node_modules/marionette'] };
  const pins = lock.packages[''].devDependencies;
  pins['marionette-docs'] = `npm:marionette@${version}`;
  // The browser install is deliberately a different release and never fetched.
  pins.marionette = pins['@mnjs/data'] = '5.1.1';
  await writeFile(join(root, 'node_modules/marionette/package.json'), JSON.stringify({ name: 'marionette', version: '5.1.1' }));
  await writeFile(join(root, 'package.json'), JSON.stringify({ devDependencies: pins }));
  await writeFile(join(root, 'package-lock.json'), JSON.stringify(lock));
  const requests = [];
  const request = async url => { requests.push(url); return fixture.request(url); };
  return { ...fixture, request, requests };
}

const absent = path => assert.rejects(readFile(path), { code: 'ENOENT' });

test('documentation alias stages 5.1.0 independently of the 5.1.1 demo and refuses overwrite', async t => {
  const { root, request, requests, manifest, lock } = await documentationFixture(t);
  const { destination, count } = await stageStableDocs(manifest.sourceRevision, { directory: root, request });
  assert.equal(count, manifest.pages.length);
  assert.equal((await readSnapshot(destination)).manifest.contentSha256, manifest.contentSha256);
  const evidencePath = join(destination, 'stable-docs-evidence.json');
  const bytes = await readFile(evidencePath);
  const evidence = JSON.parse(bytes);
  assert.equal(evidence.packageVersion, '5.1.0');
  assert.deepEqual(requests, [lock.packages['node_modules/marionette-docs'].resolved]);
  assert.equal(evidence.sourceRevision, manifest.sourceRevision);
  assert.equal(evidence.contentSha256, manifest.contentSha256);
  assert.equal(evidence.installedAs, 'marionette-docs');
  const { version, resolved, integrity } = lock.packages['node_modules/marionette-docs'];
  assert.deepEqual(evidence.archives, { 'node_modules/marionette': { version, resolved, integrity } });
  await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request }), /Refusing to overwrite/);
  assert.deepEqual(await readFile(evidencePath), bytes);
  await absent(join(root, 'node_modules/marionette-docs/manifest.json'));
});

test('stable staging diagnoses invalid revision, RC install and certified revision mismatch', async t => {
  await assert.rejects(stageStableDocs('typo'), /Usage:/);
  const rc = await documentationFixture(t, '5.0.0-rc.2');
  await assert.rejects(stageStableDocs(rc.manifest.sourceRevision, { directory: rc.root, request: rc.request }), /Expected installed documentation 5.1.0; found 5.0.0-rc.2/);
  const stable = await documentationFixture(t);
  await assert.rejects(stageStableDocs('a'.repeat(40), { directory: stable.root, request: stable.request }), /Certified source revision mismatch: requested a{40}; installed/);
  await absent(join(stable.root, 'output/stable-docs/manifest.json'));
});

for (const failure of ['docs', 'evidence', 'rename']) {
  test(`failed ${failure} write leaves no published export and retry recovers`, async t => {
    const { root, request, manifest } = await documentationFixture(t);
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
  const { root, request, manifest } = await documentationFixture(t, '5.1.0', installed => writeFile(join(installed, 'docs/quick-start.md'), 'invalid documentation'));
  await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request }), /Documentation hash mismatch: docs\/quick-start.md/);
  await absent(join(root, 'output/stable-docs/manifest.json'));
});

test('export retains the validated manifest if the live install changes during writes', async t => {
  const { root, request, manifest } = await documentationFixture(t);
  const write = async (path, bytes) => {
    await writeFile(join(root, 'node_modules/marionette-docs/docs-manifest.json'), '{"changed":true}');
    await writeFile(path, bytes);
  };
  const { destination } = await stageStableDocs(manifest.sourceRevision, { directory: root, request, write });
  assert.deepEqual((await readSnapshot(destination)).manifest, manifest);
  assert.equal(JSON.parse(await readFile(join(destination, 'stable-docs-evidence.json'))).contentSha256, manifest.contentSha256);
});

for (const changed of ['packageVersion', 'sourceRevision', 'contentSha256', 'route', 'title']) {
  test(`staging rejects a valid snapshot with changed ${changed} after archive verification`, async t => {
    const { root, request, manifest } = await documentationFixture(t);
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

// Synthetic fixtures verify the next-release path, not publication readiness.
test('current stable release rejects wrong targets and keeps all archive verification', async t => {
  const { root, request, manifest } = await documentationFixture(t, '5.1.0');
  await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request, targetVersion: '5.0.0' }), /Unsupported stable release target/);
  await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request, targetVersion: '5.2.0' }), /Unsupported stable release target/);
  const { destination, version } = await stageStableDocs(manifest.sourceRevision, { directory: root, request, targetVersion: '5.1.0' });
  assert.equal(version, '5.1.0');
  assert.equal((await readSnapshot(destination)).manifest.packageVersion, '5.1.0');
});


test('5.1 staging rejects changed installed runtime bytes before export', async t => {
  const { root, request, manifest } = await documentationFixture(t, '5.1.0');
  await writeFile(join(root, 'node_modules/marionette-docs/dist/index.js'), 'changed runtime');
  await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request, targetVersion: '5.1.0' }), /Installed registry bytes differ/);
  await absent(join(root, 'output/stable-docs/manifest.json'));
});


test('documentation staging excludes npm-installed dependencies from archive bytes and export', async t => {
  const { root, request, manifest } = await documentationFixture(t);
  const dependency = join(root, 'node_modules/marionette-docs/node_modules/dependency');
  await mkdir(dependency, { recursive: true });
  await writeFile(join(dependency, 'index.js'), 'separately installed dependency');
  const extra = join(root, 'node_modules/marionette-docs/dist/extra.js');
  await writeFile(extra, 'unexpected package file');
  await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request }), /Installed registry bytes differ: marionette-docs\/dist\/extra.js/);
  await rm(extra);
  const { destination } = await stageStableDocs(manifest.sourceRevision, { directory: root, request });
  assert.equal((await readSnapshot(destination)).manifest.packageVersion, '5.1.0');
  await absent(join(destination, 'node_modules/dependency/index.js'));
});

test('documentation staging rejects loose alias pins, wrong archives and invalid integrity', async t => {
  for (const failure of ['pin', 'archive', 'integrity']) {
    const { root, request, manifest, lock } = await documentationFixture(t);
    if (failure === 'pin') {
      const pkg = JSON.parse(await readFile(join(root, 'package.json')));
      pkg.devDependencies['marionette-docs'] = 'npm:marionette@^5.1.0';
      await writeFile(join(root, 'package.json'), JSON.stringify(pkg));
    } else {
      const entry = lock.packages['node_modules/marionette-docs'];
      if (failure === 'archive') entry.resolved = 'file:local.tgz';
      else entry.integrity = 'sha512-invalid';
      await writeFile(join(root, 'package-lock.json'), JSON.stringify(lock));
    }
    await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request }), /Expected exact documentation pin|Expected locked published documentation archive/);
    await absent(join(root, 'output/stable-docs/manifest.json'));
  }
});

test('documentation staging rejects a corrupted archive and linked alias install', async t => {
  const { root, request, manifest } = await documentationFixture(t);
  await assert.rejects(stageStableDocs(manifest.sourceRevision, {
    directory: root, request: async () => new Response('wrong archive bytes'),
  }), /Registry archive integrity mismatch: marionette-docs/);
  const alias = join(root, 'node_modules/marionette-docs');
  await rename(alias, join(root, 'linked-docs'));
  await symlink(join(root, 'linked-docs'), alias);
  await assert.rejects(stageStableDocs(manifest.sourceRevision, { directory: root, request }), /Linked runtime package.*marionette-docs/);
  await absent(join(root, 'output/stable-docs/manifest.json'));
});
