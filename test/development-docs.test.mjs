import { readSnapshot } from '../scripts/library-docs.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const installedPackage = JSON.parse(await readFile('node_modules/marionette/package.json', 'utf8'));
const declaration = JSON.parse(await readFile('content/docs-publication-edits.json', 'utf8'));

test('canonical consumer guides replace obsolete instructional paths', async () => {
  const { manifest, pages } = await readSnapshot('content/library-docs');
  assert.equal(manifest.packageVersion, installedPackage.version);
  for (const source of ['docs/quick-start.md', 'docs/tooling.md', 'docs/guides/testing.md', 'docs/guides/production.md']) {
    const page = pages.find(page => page.source === source);
    assert.equal(await readFile(`dist/docs/markdown/${source}`, 'utf8'), page.markdown);
    const html = await readFile(`dist/${page.route}/index.html`, 'utf8');
    assert.ok(html.includes(declaration.status));
    assert.ok(html.includes(manifest.sourceRevision.slice(0, 8)));
  }
  const redirects = await readFile('dist/_redirects', 'utf8');
  assert.doesNotMatch(redirects, /docs\/(?:development|troubleshooting)/);
});

test('diagnostics use the matching catalog without obsolete example supplements', async () => {
  const corpus = JSON.parse(await readFile('dist/docs/corpus.json', 'utf8'));
  for (const document of corpus.documents.filter(document => document.kind === 'diagnostic')) {
    assert.equal(document.sourceSupplements, undefined);
    if (document.id !== 'errors/index') assert.ok(document.markdown.includes('/docs/tooling/'));
  }
  const demo = JSON.parse(await readFile('dist/reference/provenance.json', 'utf8'));
  assert.equal(demo.packageVersion, installedPackage.version);
  const manifest = JSON.parse(await readFile('dist/docs/manifest.json', 'utf8'));
  assert.equal(demo.libraryRevision, manifest.sourceRevision);
});
