import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeFixture } from './helpers/runtime-fixture.mjs';

const helper = fileURLToPath(new URL('../content/library-docs/skills/marionette/scripts/docs.mjs', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('packaged helper reads v3 diagnostics and rejects stale schemas, missing sections and legacy installs', async t => {
  const { root, manifest } = await runtimeFixture(t);
  const installed = join(root, 'node_modules/marionette');
  const run = (...args) => spawnSync(process.execPath, [helper, '--project', root, ...args], { encoding: 'utf8' });
  const valid = run('--diagnostic', 'MN0004');
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).diagnostic.docsSection, 'docs/api/errors.md#mn0004');
  const catalog = JSON.parse(await readFile(join(installed, 'config/diagnostics/catalog.json')));
  const sections = JSON.parse(await readFile(join(installed, 'docs-sections.json')));
  const save = async (source, value) => {
    const bytes = JSON.stringify(value);
    await writeFile(join(installed, source), bytes);
    manifest.assets.find(asset => asset.source === source).sha256 = hash(bytes);
    manifest.contentSha256 = hash([...manifest.pages, ...manifest.assets].sort((a, b) => a.source.localeCompare(b.source, 'en')).map(entry => `${entry.source}\0${entry.sha256}\n`).join(''));
    await writeFile(join(installed, 'docs-manifest.json'), JSON.stringify(manifest));
  };
  await save('config/diagnostics/catalog.json', { ...catalog, schemaVersion: 2 });
  assert.match(run('--diagnostic', 'MN0004').stderr, /Unsupported or incomplete diagnostic catalog/);
  await save('config/diagnostics/catalog.json', catalog);
  await save('docs-sections.json', { ...sections, sections: sections.sections.filter(section => section.id !== 'docs/api/errors.md#mn0004') });
  const missing = run('--diagnostic', 'MN0004');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Diagnostic section is absent/);
  await rm(installed, { recursive: true });
  const legacy = join(root, 'node_modules/backbone.marionette');
  const nested = join(root, 'src/nested');
  await mkdir(legacy); await mkdir(nested, { recursive: true });
  await writeFile(join(legacy, 'package.json'), JSON.stringify({ name: 'backbone.marionette', version: '4.1.3' }));
  const ancestor = run('--project', nested);
  assert.equal(ancestor.status, 1);
  assert.match(ancestor.stderr, /backbone.marionette 4.1.3.*v4/);
  assert.match(ancestor.stderr, /exact v5 target/);
});

test('packaged example build engines match the packaged release profile', async () => {
  const read = async path => JSON.parse(await readFile(new URL('../content/library-docs/' + path, import.meta.url)));
  const { source } = await read('config/release-profile.json');
  const { engines } = await read('examples/records/package.json');
  assert.deepEqual(engines, { node: source.node, npm: source.npm });
});
