import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRuntimeMetadata, runtimePackages, stableRelease, validateRuntimeRelease } from '../scripts/release-contract.mjs';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { release, revision } from '../scripts/agent-setup.mjs';
import provenance from '../content/provenance.json' with { type: 'json' };

// Synthetic identities test rejection paths; none are publication evidence.
function fixture(version = '5.0.0') {
  const pins = { marionette: version, '@mnjs/data': version };
  const packages = Object.fromEntries(runtimePackages.map(name => [name, { version }]));
  const lock = { packages: { '': { devDependencies: { ...pins } } } };
  for (const name of runtimePackages) lock.packages[`node_modules/${name}`] = {
    version, resolved: `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${version}.tgz`,
    integrity: 'sha512-' + Buffer.alloc(64, 1).toString('base64')
  };
  const manifest = { packageName: 'marionette', packageVersion: version, sourceDirty: false,
    sourceRepository: 'https://github.com/marionettejs/marionette', sourceRevision: 'a'.repeat(40), contentSha256: 'b'.repeat(64) };
  return { version, manifest, packages, lock, pins };
}

test('runtime contract supports the published RC archive and stable archive shape', () => {
  for (const version of ['5.0.0-rc.2', '5.0.0']) assert.equal(validateRuntimeRelease(fixture(version)).packageVersion, version);
});

test('runtime contract rejects local archives, loose pins, mismatched companions and dirty docs', () => {
  const changes = [
    data => { data.manifest.sourceDirty = true; },
    data => { data.manifest.sourceRevision = 'unknown'; },
    data => { data.manifest.packageVersion = '5.0.0-rc.2'; },
    data => { data.pins.marionette = '^5.0.0'; },
    data => { data.pins['@mnjs/data'] = '^5.0.0'; },
    data => { data.lock.packages[''].devDependencies.marionette = '^5.0.0'; },
    data => { data.manifest.sourceRepository = 'https://example.com/fork'; },
    data => { data.manifest.contentSha256 = 'not-a-hash'; },
    data => { data.manifest.packageName = 'other'; },
    data => { data.version = '6.0.0'; },
    data => { data.lock.packages[''].devDependencies['@mnjs/data'] = '5.0.0-rc.2'; },
    ...runtimePackages.flatMap(name => [
      data => { data.packages[name].version = '5.0.0-rc.2'; },
      data => { data.lock.packages[`node_modules/${name}`].resolved = 'file:local.tgz'; },
      data => { data.lock.packages[`node_modules/${name}`].integrity = 'sha512-fabricated'; }
    ])
  ];
  for (const change of changes) {
    const data = fixture(); change(data);
    assert.throws(() => validateRuntimeRelease(data));
  }
});

test('agent installation follows locally validated package metadata without registry requests', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unit tests must not fetch registry archives'); };
  try {
    const { version, manifest, lock } = await readRuntimeMetadata(fileURLToPath(new URL('../', import.meta.url)));
    assert.equal(version, stableRelease, 'The current website must use the published stable runtime');
    assert.equal(release, version);
    assert.equal(revision, manifest.sourceRevision);
    assert.equal(release, provenance.packageVersion);
    const publication = JSON.parse(await readFile(new URL('../content/docs-publication-edits.json', import.meta.url)));
    assert.equal(publication.releaseEvidence.packageVersion, version);
    assert.equal(publication.releaseEvidence.sourceRevision, manifest.sourceRevision);
    assert.equal(publication.releaseEvidence.contentSha256, manifest.contentSha256);
    for (const name of runtimePackages) {
      const key = `node_modules/${name}`;
      const { version, resolved, integrity } = lock.packages[key];
      assert.deepEqual(publication.releaseEvidence.archives[key], { version, resolved, integrity });
    }
  } finally { globalThis.fetch = previousFetch; }
});

test('runtime metadata failures identify the violated invariant', () => {
  for (const [field, value, label] of [
    ['packageVersion', 'other', 'docs manifest version'],
    ['packageName', 'other', 'package name'],
    ['sourceDirty', true, 'clean source'],
    ['sourceRepository', 'https://example.com', 'source repository'],
    ['sourceRevision', 'unknown', 'source revision format'],
    ['contentSha256', 'unknown', 'content digest format']
  ]) {
    const data = fixture();
    data.manifest[field] = value;
    assert.throws(() => validateRuntimeRelease(data), new RegExp(label));
  }
  const data = fixture(); data.version = '6.0.0';
  assert.throws(() => validateRuntimeRelease(data), /version format/);
});
