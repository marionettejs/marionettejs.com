import { deriveMarkdown, markdownUrl } from '../scripts/library-docs.mjs';
import { publishedMarkdown } from '../scripts/published-docs.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public release-candidate pages are canonical and indexable while mirrors stay noindexed', async () => {
  for (const path of ['index.html', 'why/index.html', 'docs/index.html', 'docs/quick-start/index.html']) {
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
  assert.match(await read('dist/sitemap.xml'), /https:\/\/marionettejs.com\/docs\/quick-start\//);
});

test('reading copies preserve every imported source and declared publication status', async () => {
  const manifest = JSON.parse(await read('content/library-docs/manifest.json'));
  const publication = JSON.parse(await read('dist/docs/publication.json'));
  assert.equal(publication.packageVersion, manifest.packageVersion);
  const declaration = JSON.parse(await read('content/docs-publication-edits.json'));
  assert.equal(publication.status, declaration.status);
  for (const page of manifest.pages) assert.equal(await read(`dist/docs/markdown/${page.source}`), await read(`content/library-docs/${page.source}`));
  const routing = await read('dist/docs/guides/routing.md');
  assert.match(routing, /hashchange/);
  assert.match(routing, /readiness/);
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
  assert.match(redirects, /^\/docs\/regions\/ \/docs\/api\/region\/ 301$/m);
  assert.match(redirects, /^\/reference\/region.md \/docs\/api\/region.md 301$/m);
  assert.ok((await read('dist/docs/api/region.md')).startsWith('<!-- Documentation snapshot:'));
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

test('publication overrides retain complete source identity without rewriting the archive', async () => {
  const publication = JSON.parse(await read('dist/docs/publication.json'));
  const originals = JSON.parse(await read('content/library-docs/manifest.json'));
  for (const edit of publication.edits.filter(edit => edit.sourceRevision)) {
    assert.match(edit.sourceRevision, /^[a-f0-9]{40}$/);
    const archived = await read(`dist/docs/markdown/${edit.source}`);
    assert.equal(createHash('sha256').update(archived).digest('hex'),
      originals.pages.find(page => page.source === edit.source).sha256, edit.source);
    assert.equal(edit.before, archived, edit.source);
    const page = { ...originals.pages.find(page => page.source === edit.source), markdown: archived };
    assert.equal(publishedMarkdown(page), edit.after, edit.source);
    // Compare every byte of the delivered reading copy, including prose, while
    // allowing the documented link rewriting and provenance/footer additions.
    assert.equal(await read(`dist${markdownUrl(page)}`), deriveMarkdown(page, originals.pages, originals), edit.source);
    if (edit.readingSha256) {
      assert.equal(createHash('sha256').update(edit.after).digest('hex'), edit.readingSha256);
      assert.match(edit.sourceSha256, /^[a-f0-9]{64}$/);
    }
  }
});

test('published pages keep a validator and the sitemap dates every entry', async () => {
  // Cloudflare's HTML processing strips the ETag from any page it may rewrite,
  // which leaves a crawler nothing to revalidate and no sign a release happened.
  const headers = await read('dist/_headers');
  const rules = [...headers.matchAll(/\n(\/\S*)\n(?:  [^\n]+\n)*?  Cache-Control: [^\n]*no-transform/g)].map(([, rule]) => rule);
  const dist = new URL('../dist/', import.meta.url);
  const published = ['/'];
  for (const entry of await readdir(dist, { withFileTypes: true })) {
    if (entry.isDirectory() && await stat(new URL(`${entry.name}/index.html`, dist)).then(() => true, () => false)) published.push(`/${entry.name}/`);
  }
  assert.ok(published.length > 4);
  for (const route of published) {
    assert.ok(rules.some(rule => rule.endsWith('*') ? route.startsWith(rule.slice(0, -1)) : rule === route),
      `${route} may be transformed, and would lose the ETag a crawler revalidates with`);
  }
  // One date per entry, shared by all of them, and never ahead of the build that
  // wrote it. The value itself belongs to whichever revision produced this dist,
  // which is not necessarily the commit checked out when the test runs.
  const sitemap = await read('dist/sitemap.xml');
  const entries = [...sitemap.matchAll(/<url>(.*?)<\/url>/g)].map(([, entry]) => entry);
  const manifest = JSON.parse(await read('content/library-docs/manifest.json'));
  const catalog = JSON.parse(await read('dist/docs/diagnostics.json'));
  assert.equal(entries.length, manifest.pages.length + catalog.diagnostics.length + 8);
  const dates = new Set();
  for (const entry of entries) {
    const [, date] = entry.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/) ?? [];
    assert.ok(date, `${entry} carries no lastmod`);
    dates.add(date);
  }
  assert.equal(dates.size, 1);
  assert.ok([...dates][0] <= new Date().toISOString().slice(0, 10));
});
