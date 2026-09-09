import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readDevelopmentDocs, diagnosticExamples } from '../scripts/development-docs.mjs';

test('development guides preserve library source and distinguish the published reference', async () => {
  const { manifest, pages } = await readDevelopmentDocs();
  assert.equal(manifest.packageVersion, '5.0.0-beta.1');
  for (const page of pages) {
    assert.equal(await readFile(`dist/development/source/${page.source}`, 'utf8'), page.markdown);
    const html = await readFile(`dist/${page.route}/index.html`, 'utf8');
    assert.ok(html.includes('Published beta.1 reference'));
    assert.ok(html.includes(manifest.sourceRevision.slice(0, 8)));
    assert.ok(html.includes(`/${page.route}.md`));
  }
  const beta = await readFile('dist/docs/manifest.json', 'utf8');
  assert.equal(beta, await readFile('content/library-docs/manifest.json', 'utf8'));
  const entry = await readFile('dist/docs/agent-start.md', 'utf8');
  assert.match(entry, /Channel: latest/);
  assert.doesNotMatch(await readFile('dist/docs/beta.md', 'utf8'), /Move `next`/);
});

test('diagnostic pages include the canonical failing and corrected examples', async () => {
  const { pages, manifest } = await readDevelopmentDocs();
  const corpus = JSON.parse(await readFile('dist/docs/corpus.json', 'utf8'));
  const examples = diagnosticExamples(pages[1].markdown);
  assert.deepEqual(Object.keys(examples), ['MN0020', 'MN0003', 'MN0023', 'MN0007']);
  for (const code of Object.keys(examples)) {
    const html = await readFile(`dist/errors/${code}/index.html`, 'utf8');
    assert.match(html, /Failing and corrected example/);
    assert.match(html, /export function fail/);
    assert.match(html, /export function fix/);
    assert.ok(html.includes('/development/manifest.json'));
    const markdown = await readFile(`dist/errors/${code}.md`, 'utf8');
    assert.ok(markdown.includes(`Supplemental example source: docs/troubleshooting.md; revision ${manifest.sourceRevision}; source SHA-256 ${pages[1].sha256}`));
    const doc = corpus.documents.find(doc => doc.id === `errors/${code}`);
    assert.deepEqual(doc.sourceSupplements, [{ sourceUrl: 'https://marionettejs.com/development/source/docs/troubleshooting.md',
      sourceRevision: manifest.sourceRevision, sourceSha256: pages[1].sha256 }]);
  }
});
