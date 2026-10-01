import test from 'node:test';
import assert from 'node:assert/strict';
import { documentSections } from '../mcp/index-sections.mjs';
import { indexSections, searchSections, selectSections } from '../mcp/sections.mjs';
import { searchSections as canonicalSearch } from '../content/library-docs/skills/marionette/scripts/search.mjs';
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
  const document = doc('# Intro\nMention detachView here.\n## detachView\nPreserve the view.\n## Destroy\nRelease it.\n');
  const sections = documentSections(document);
  const index = indexSections(sections, [document]);
  const result = searchSections(sections, 'detachView', index);
  assert.equal(result[0].heading, 'detachView');
  assert.deepEqual(result, searchSections(sections, 'detachView', index));
  assert.deepEqual(searchSections(sections, 'the and', index), []);
  assert.deepEqual(searchSections(sections, 'unfindable', index), []);
});

test('section ranking splits identifiers and scores own text while reads retain descendants', () => {
  const document = doc('# Root\nNeutral introduction.\n## listenToOnce\nSubscribe once.\n## Links\n[website](https://needle.example)\n### Needle\nneedle contract.\n');
  const sections = documentSections(document);
  const index = indexSections(sections, [document]);
  assert.equal(searchSections(sections, 'listentoonce', index)[0].heading, 'listenToOnce');
  assert.equal(searchSections(sections, 'listen once', index)[0].heading, 'listenToOnce');
  const matches = searchSections(sections, 'needle', index);
  assert.deepEqual(matches.map(section => section.heading), ['Needle']);
  const root = sections[0];
  assert.match(selectSections(sections, [root.id], 1000).sections[0].content, /needle contract/);
  assert.deepEqual(searchSections(sections, 'listen once', JSON.parse(JSON.stringify(index))), searchSections(sections, 'listen once', index));
});

test('ranking keeps full source bytes with leading text and gaps in selected sections', () => {
  const document = doc('Leading text before headings.\r\n\r\n## First\r\nGap body omitted from section selection.\r\n\r\n## Second\r\nTailneedle contract.\r\n');
  const sections = documentSections(document).filter(section => section.heading === 'Second');
  const index = indexSections(sections, [document]);
  assert.equal(index.files[0][1], document.markdown);
  assert.equal(searchSections(sections, 'tailneedle', index)[0].heading, 'Second');
  assert.deepEqual(searchSections(sections, 'leading gap', index), []);
});

test('section query acceptance follows the canonical tokenizer', () => {
  const document = doc('# Root\nBy why its these once contract.\n');
  const sections = documentSections(document);
  const index = indexSections(sections, [document]);
  const files = new Map([[document.id, { content: document.markdown }]]);
  for (const query of ['by', 'why', 'its', 'these', 'the and', 'would', 'listenToOnce']) {
    assert.deepEqual(searchSections(sections, query, index).map(section => section.score), canonicalSearch(index.sections, files, query).map(section => section.score), query);
  }
  assert.ok(searchSections(sections, 'by', index).length);
  assert.deepEqual(searchSections(sections, 'why', index), []);
});

test('canonical source ranking agrees with the imported consumer skill for public API queries', async () => {
  const { readSnapshot } = await import('../scripts/library-docs.mjs');
  const { readFile } = await import('node:fs/promises');
  const { pages } = await readSnapshot(new URL('../content/library-docs/', import.meta.url).pathname);
  const index = JSON.parse(await readFile(new URL('../content/library-docs/docs-sections.json', import.meta.url), 'utf8'));
  const files = new Map(pages.map(page => [page.source, { content: page.markdown }]));
  const sections = pages.flatMap(page => documentSections({ ...doc(page.markdown), id: page.source, title: page.title }));
  const websiteIndex = indexSections(sections, pages.map(page => ({ id: page.source, markdown: page.markdown })));
  const identity = section => ({ source: section.source ?? section.documentId, start: section.start,
    end: section.end, heading: section.heading, matchedTerms: section.matchedTerms, score: section.score });
  for (const query of ['listenTo', 'retained restart', 'prepareStart', 'detachView', 'bindRequests', 'Model set', 'setFilter', 'Application stop destroy']) {
    assert.deepEqual(searchSections(sections, query, websiteIndex).map(identity), canonicalSearch(index.sections, files, query).map(identity), query);
  }
});

// Renderer and indexer parse heading input differently: this integration check proves parity.
test('every indexed canonical section link resolves to a rendered page and anchor', async () => {
  const { loadSnapshot } = await import('../mcp/load.mjs');
  const { readFile } = await import('node:fs/promises');
  const snapshot = await loadSnapshot();
  const rankingFiles = new Map(snapshot.sectionIndex.files);
  for (const document of snapshot.documents) assert.equal(rankingFiles.get(document.id), document.markdown, document.id);
  const pages = new Map();
  for (const section of snapshot.sections) {
    const url = new URL(section.url);
    if (!pages.has(url.pathname)) pages.set(url.pathname, await readFile(new URL(`../dist${url.pathname}index.html`, import.meta.url), 'utf8').catch(error => { throw new Error('Built HTML is required; run npm run build.', { cause: error }); }));
    if (url.hash) assert.ok(pages.get(url.pathname).includes(`id="${url.hash.slice(1)}"`), section.url);
  }
});

test('lifecycle retrieval diagnostic reports coverage within the context budget', async () => {
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
