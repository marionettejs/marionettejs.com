import { readSnapshot } from '../scripts/library-docs.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const installedPackage = JSON.parse(await readFile('node_modules/marionette/package.json', 'utf8'));
const declaration = JSON.parse(await readFile('content/docs-publication-edits.json', 'utf8'));

test('canonical consumer guides replace obsolete instructional paths', async () => {
  const { manifest, pages } = await readSnapshot('content/library-docs');
  assert.equal(manifest.packageVersion, declaration.releaseEvidence.packageVersion);
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
  assert.equal(manifest.sourceRevision, declaration.releaseEvidence.sourceRevision);
  const installed = JSON.parse(await readFile('node_modules/marionette/docs-manifest.json', 'utf8'));
  assert.equal(demo.libraryRevision, installed.sourceRevision);
});

test('the primary testing guide links helper setup from its article while preserving the manual recipe and archive', async () => {
  const source = 'docs/guides/testing.md';
  const { manifest, pages } = await readSnapshot('content/library-docs');
  const archived = pages.find(page => page.source === source);
  const edit = declaration.edits.find(edit => edit.source === source);
  assert.equal(edit, undefined, 'Helper setup is now upstream; no duplicate overlay');
  const codeBlocks = markdown => [...markdown.matchAll(/^```[^\n]*\n[\s\S]*?^```/gm)].map(match => match[0]);
  assert.deepEqual(codeBlocks(await readFile('dist/docs/guides/testing.md', 'utf8')), codeBlocks(archived.markdown), 'The complete manual lifecycle recipe stays intact');
  assert.equal(await readFile(`dist/docs/markdown/${source}`, 'utf8'), archived.markdown);
  const html = await readFile('dist/docs/guides/testing/index.html', 'utf8');
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/)[1];
  const markdown = await readFile('dist/docs/guides/testing.md', 'utf8');
  assert.ok(article.includes('The optional'));
  for (const route of ['/docs/packages/test/', '/docs/packages/test/guide/']) {
    assert.ok(article.includes(`href="${route}"`), `Helper guidance is in the article, beyond sidebar navigation: ${route}`);
    assert.ok(markdown.includes(`](${route.slice(0, -1)}.md)`));
  }
  const corpus = JSON.parse(await readFile('dist/docs/corpus.json', 'utf8'));
  const document = corpus.documents.find(document => document.id === source);
  assert.equal(document.markdown, markdown);
  assert.equal(document.sourceRevision, manifest.sourceRevision);
  assert.equal(document.sourceSha256, archived.sha256);
  assert.equal(document.sha256, createHash('sha256').update(markdown).digest('hex'));
  for (const path of ['dist/docs/bundles/guides.txt', 'dist/llms-full.txt']) {
    assert.ok((await readFile(path, 'utf8')).includes(markdown), path);
  }
  const mcp = JSON.parse(await readFile('output/mcp/snapshot.json', 'utf8'));
  assert.equal(mcp.documents.find(document => document.id === source).markdown, archived.markdown);
});
