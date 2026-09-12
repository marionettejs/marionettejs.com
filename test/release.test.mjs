import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public beta pages are canonical and indexable while mirrors stay noindexed', async () => {
  for (const path of ['index.html', 'why/index.html', 'docs/index.html', 'docs/installation/index.html']) {
    const html = await read(`dist/${path}`);
    assert.match(html, /rel="canonical" href="https:\/\/marionettejs.com\//);
    assert.match(html, /content="index, follow"/);
    assert.ok(!html.includes('noindex'));
    assert.ok(!html.includes('Development documentation;'));
  }
  const headers = await read('dist/_headers');
  assert.match(headers, /https:\/\/v5.marionettejs.com\/\*\n  X-Robots-Tag: noindex, follow/);
  for (const block of headers.split(/\n(?=\S)/)) {
    if (block.startsWith('/') || block.startsWith('https://marionettejs.com/')) {
      assert.doesNotMatch(block, /X-Robots-Tag:.*noindex/i, 'The live site must not inherit a noindex header');
    }
  }
  assert.match(await read('dist/robots.txt'), /Sitemap: https:\/\/marionettejs.com\/sitemap.xml/);
  assert.match(await read('dist/sitemap.xml'), /https:\/\/marionettejs.com\/docs\/installation\//);
});

test('release reading copies announce publication while the package source stays exact', async () => {
  const website = JSON.parse(await read('content/library-docs/manifest.json'));
  const installed = JSON.parse(await read('node_modules/marionette/dist/docs/manifest.json'));
  for (const key of ['packageVersion', 'sourceRevision', 'sourceRepository', 'sourceDirty', 'channel']) {
    assert.equal(website[key], installed[key], key);
  }
  // The website export also includes maintainer docs; every npm consumer source
  // must still be present with exactly the published metadata and bytes.
  for (const key of ['pages', 'assets']) for (const entry of installed[key]) {
    assert.deepEqual(website[key].find(item => item.source === entry.source), entry, entry.source);
    assert.equal(await read(`content/library-docs/${entry.source}`),
      await read(`node_modules/marionette/dist/docs/${entry.source}`), entry.source);
  }
  for (const path of ['docs/installation.md', 'docs/beta.md']) {
    const raw = await read(`content/library-docs/${path}`);
    const npmSource = await read(`node_modules/marionette/dist/docs/${path}`);
    assert.equal(raw, npmSource);
    const published = await read(`dist/${path}`);
    assert.doesNotMatch(published, /becomes available after the beta|After publication, install|registry when available/);
    assert.match(published, /5\.0\.0-beta\.2/);
  }
});

test('routing reading copies publish reviewed guidance without replacing the beta archive', async () => {
  const revision = 'b777333934af5414256edab85c34c37ab20953f1';
  const reading = await read('dist/docs/routing.md');
  const html = await read('dist/docs/routing/index.html');
  for (const output of [reading, html]) {
    assert.match(output, /Use the Navigation API/);
    assert.match(output, /Connect Backbone.Router/);
    assert.ok(output.includes(`${revision}/test/browser/docs-routing.test.mjs`));
    assert.ok(output.includes(`${revision}/test/fixtures/docs-routing/validate.mjs`));
  }
  assert.doesNotMatch(reading, /status\.textContent|querySelector\('h1'\)/);
  const publication = JSON.parse(await read('dist/docs/publication.json'));
  assert.equal(publication.edits.find(edit => edit.source === 'docs/routing.md').sourceRevision, revision);
  assert.equal(await read('dist/docs/markdown/docs/routing.md'),
    await read('node_modules/marionette/dist/docs/docs/routing.md'));
});

test('legacy worker retirement clears only its precache and unregisters before reloading', async () => {
  const events = {}, calls = [];
  runInNewContext(await read('site/sw.js'), {
    self: {
      addEventListener: (name, callback) => { events[name] = callback; },
      skipWaiting: () => calls.push('skip'),
      clients: { claim: async () => calls.push('claim'), matchAll: async () => [{ url: 'https://marionettejs.com/', navigate: async url => calls.push(url) }] },
      registration: { unregister: async () => calls.push('unregister') }
    },
    caches: { keys: async () => ['sw-precache-v3-marionettejs.com-https://marionettejs.com/', 'unrelated'], delete: async name => calls.push(name) }
  });
  events.install();
  let completion;
  events.activate({ waitUntil: promise => { completion = promise; } });
  await completion;
  assert.deepEqual(calls, ['skip', 'sw-precache-v3-marionettejs.com-https://marionettejs.com/', 'claim', 'unregister', 'https://marionettejs.com/']);
});

test('the sitemap includes every diagnostic and published preview links redirect', async () => {
  const sitemap = await read('dist/sitemap.xml');
  const catalog = JSON.parse(await read('dist/docs/diagnostics.json'));
  for (const route of ['/errors/', ...catalog.diagnostics.map(entry => entry.docsAnchor)]) {
    assert.ok(sitemap.includes(`<loc>https://marionettejs.com${route}</loc>`), route);
  }
  const redirects = await read('dist/_redirects');
  assert.match(redirects, /^\/docs\/regions\/ \/docs\/region\/ 301$/m);
  assert.match(redirects, /^\/reference\/region.md \/docs\/region.md 301$/m);
  assert.ok((await read('dist/docs/region.md')).startsWith('<!-- Documentation snapshot:'));
});

test('worker retirement finishes when one closing window rejects navigation', async () => {
  let activate, completion;
  const calls = [];
  runInNewContext(await read('site/sw.js'), {
    self: {
      addEventListener: (name, callback) => { if (name === 'activate') activate = callback; },
      clients: { claim: async () => {}, matchAll: async () => [
        { url: 'https://marionettejs.com/closing', navigate: async () => { calls.push('closing'); throw new TypeError('Window closed'); } },
        { url: 'https://marionettejs.com/ready', navigate: async () => { calls.push('ready'); } }
      ] },
      registration: { unregister: async () => calls.push('unregister') }
    },
    caches: { keys: async () => [] }
  });
  activate({ waitUntil: promise => { completion = promise; } });
  await completion;
  assert.deepEqual(calls, ['unregister', 'closing', 'ready']);
});

// Digests pin the complete reading copies checked against the merged library
// source, including the explicit source link for the non-archived evaluation plan.
test('agent publication copies retain reviewed content and source revision', async () => {
  const publication = JSON.parse(await read('dist/docs/publication.json'));
  const originals = JSON.parse(await read('content/library-docs/manifest.json'));
  const expected = [
    ['docs/agents.md', 'e93f8d082bf40d0531494726ee06a914ba19ce7ec6b802e1cc9082b0ffb6a886'],
    ['docs/application-agent-template.md', '3790bbe30cc4fc0dd1a5d3162d9326c335fbde1d8b085c24f28d4b90efd87656'],
    ['docs/maintainers/readme.md', '58c249cc445c2d0fae7de57bc8f67426bb8a59939c8015248bedf367917b1ab3'],
    ['docs/maintainers/documentation.md', 'f710e7e22a6ecda5416f6303199fcfa40e4d40ca2f5275b19d961f576153c88a'],
  ];
  for (const [source, digest] of expected) {
    const edits = publication.edits.filter(edit => edit.source === source);
    assert.equal(edits.length, 1, source);
    assert.equal(edits[0].sourceRevision, '2dbc781cf1e7ae1a08a1474cb4395ac510757488');
    assert.equal(createHash('sha256').update(edits[0].after).digest('hex'), digest, source);
    const archived = await read(`dist/docs/markdown/${source}`);
    assert.equal(createHash('sha256').update(archived).digest('hex'),
      originals.pages.find(page => page.source === source).sha256, source);
  }
});
