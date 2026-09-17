import test from 'node:test';
import assert from 'node:assert/strict';
import { documentSections } from '../mcp/index-sections.mjs';
import { searchSections, selectSections } from '../mcp/sections.mjs';
const doc = markdown => ({ id: 'docs/example.md', title: 'Example', markdown, url: 'https://marionettejs.com/docs/example/', sha256: 'fixture' });

test('sections preserve source, ignore fenced headings, and match nested duplicate anchors', () => {
  const markdown = '[ref]: https://example.com\r\n\r\n# Root\r\nintro\r\n> ## Again\r\n\r\n## Again\r\n```js\r\n# fake\r\n```\r\n### Child\r\nend\r\n## Tail\r\nlast\r\n';
  const sections = documentSections(doc(markdown));
  assert.deepEqual(sections.map(s => s.id), ['docs/example.md#@intro', 'docs/example.md#root', 'docs/example.md#again-1', 'docs/example.md#child', 'docs/example.md#tail']);
  const child = sections.find(s => s.heading === 'Child');
  assert.deepEqual(child.breadcrumbs, ['Root', 'Again']);
  assert.equal(child.parentId, 'docs/example.md#again-1');
  for (const section of sections) assert.equal(section.content, markdown.slice(section.start, section.end));
  assert.match(sections.find(s => s.heading === 'Again').content, /# fake/);
});

test('setext headings and headingless docs remain retrievable', () => {
  assert.equal(documentSections(doc('Title\n=====\n\nbody'))[0].id, 'docs/example.md#title');
  assert.equal(documentSections(doc('just body'))[0].content, 'just body');
});

test('selection never truncates contracts and deduplicates parent-child overlap in either order', () => {
  const sections = documentSections(doc('# Root\n\n## Alpha\nA\n### Child\nC\n## Beta\nB\n'));
  const [root, alpha, child, beta] = sections;
  for (const ids of [[alpha.id, child.id], [child.id, alpha.id]]) {
    const result = selectSections(sections, ids, alpha.content.length);
    assert.deepEqual(result.sections.map(s => s.id), [alpha.id]);
    assert.equal(result.characters, alpha.content.length);
    assert.deepEqual(result.omitted, []);
  }
  const limited = selectSections(sections, [root.id, beta.id, beta.id], beta.content.length);
  assert.deepEqual(limited.sections.map(s => s.id), [beta.id]);
  assert.deepEqual(limited.omitted, [{ id: root.id, characters: root.content.length, reason: 'budget' }]);
  assert.throws(() => selectSections(sections, ['../secret'], 100), /Unknown section/);
  assert.equal(selectSections(sections, [alpha.id], 1).sections.length, 0);
});

test('search ranks exact API headings and has deterministic ties', () => {
  const sections = documentSections(doc('# Intro\nMention detachView here.\n## detachView\nPreserve the view.\n## Destroy\nRelease it.\n'));
  const result = searchSections(sections, 'detachView');
  assert.equal(result[0].heading, 'detachView');
  assert.deepEqual(result, searchSections(sections, 'detachView'));
  assert.throws(() => searchSections(sections, 'the and'), /substantive/);
  assert.deepEqual(searchSections(sections, 'unfindable'), []);
});

// Renderer and indexer parse heading input differently: this integration check proves parity.
test('every indexed canonical section link resolves to a rendered page and anchor', async () => {
  const { loadSnapshot } = await import('../mcp/load.mjs');
  const { readFile } = await import('node:fs/promises');
  const snapshot = await loadSnapshot();
  const pages = new Map();
  for (const section of snapshot.sections) {
    const url = new URL(section.url);
    if (!pages.has(url.pathname)) pages.set(url.pathname, await readFile(new URL(`../dist${url.pathname}index.html`, import.meta.url), 'utf8').catch(error => { throw new Error('Built HTML is required; run npm run build.', { cause: error }); }));
    if (url.hash) assert.ok(pages.get(url.pathname).includes(`id="${url.hash.slice(1)}"`), section.url);
  }
});

test('lifecycle retrieval diagnostic retains named contracts under the context budget', async () => {
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const report = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/benchmark-section-context.mjs', import.meta.url))], { encoding: 'utf8', timeout: 15_000 }));
  assert.equal(report.scored, false);
  for (const result of report.results) {
    assert.ok(Array.isArray(result.missingContracts)); // Ranking coverage is reporting-only.
    assert.ok(result.automaticCharacters <= 20_000);
    assert.ok(result.automaticCharacters < result.fullCharacters);
  }
});

test('suffix-like headings cannot collide with generated anchors', () => {
  const sections = documentSections(doc('# Root\n## Foo\na\n## Foo-1\nb\n## Foo\nc\n## Foo-1\nd\n'));
  assert.deepEqual(sections.map(s => s.id.split('#')[1]), ['root', 'foo', 'foo-1', 'foo-2', 'foo-1-1']);
  assert.equal(new Set(sections.map(s => s.id)).size, sections.length);
});

test('absorbing a child preserves its earliest requested position', () => {
  const sections = documentSections(doc('# Root\n## Parent\np\n### Child\nc\n## Unrelated\nu\n'));
  const [, parent, child, unrelated] = sections;
  const result = selectSections(sections, [child.id, unrelated.id, parent.id], 1000);
  assert.deepEqual(result.sections.map(s => s.id), [parent.id, unrelated.id]);
  assert.equal(result.characters, parent.content.length + unrelated.content.length);
});

test('sections preserve both source and reading hashes and supplemental provenance', () => {
  const document = { ...doc('# Root\nbody'), sourceSha256: 'source', sha256: 'reading', sourceSupplements: [{ sourceSha256: 'supplement' }] };
  const section = documentSections(document)[0];
  assert.equal(section.sourceSha256, 'source');
  assert.equal(section.sha256, 'reading');
  assert.deepEqual(section.sourceSupplements, document.sourceSupplements);
  assert.equal(Object.hasOwn(section, 'documentSha256'), false);
});
