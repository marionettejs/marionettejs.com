import { test } from 'node:test';
import assert from 'node:assert/strict';
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
