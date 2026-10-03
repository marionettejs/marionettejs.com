import test from 'node:test';
import assert from 'node:assert/strict';
import { configureAnalytics, pageCategory, pagePath, track } from '../site/assets/analytics.js';

test('analytics is inert until configured and only accepts named events', () => {
  assert.equal(track('workshop_run'), false);
  const sent = [];
  configureAnalytics((...args) => sent.push(args));
  assert.equal(track('prompt_submitted', { text: 'private' }), false);
  assert.equal(track('workshop_run', { code: 'private', title: 'private' }), true);
  assert.deepEqual(sent, [['workshop_run', { page: 'other', path: null }]]);
  configureAnalytics();
  assert.equal(track('workshop_run'), false);
});

test('page categories never contain arbitrary paths, queries or fragments', () => {
  for (const path of ['/docs/api/view/?prompt=secret#secret', '/docs/private/name']) assert.equal(pageCategory(path), 'docs');
  assert.equal(pageCategory('/demos/?token=secret#private'), 'demos');
  assert.equal(pageCategory('/private/person@example.com'), 'other');
  assert.equal(pageCategory('/?secret'), 'home');
  assert.equal(pagePath('/demos/?secret#private'), '/demos/');
  assert.equal(pagePath('/private/secret'), null);
});

test('opt-out and storage failures prevent delivery; provider failures do not escape', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let count = 0;
  configureAnalytics(() => count++);
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '1' } });
    assert.equal(track('page_view'), false);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('storage unavailable'); } });
    assert.equal(track('page_view'), false);
    assert.equal(count, 0);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
    configureAnalytics(() => { throw new Error('provider unavailable'); });
    assert.equal(track('page_view'), false);
  } finally {
    configureAnalytics();
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('browser privacy signals prevent delivery', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let count = 0;
  configureAnalytics(() => count++);
  try {
    for (const signal of [{ globalPrivacyControl: true }, { doNotTrack: '1' }]) {
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: signal });
      assert.equal(track('page_view'), false);
    }
    assert.equal(count, 0);
  } finally {
    configureAnalytics();
    if (previous) Object.defineProperty(globalThis, 'navigator', previous);
    else delete globalThis.navigator;
  }
});

test('built tracker preserves only published docs routes', async () => {
  const { readFile } = await import('node:fs/promises');
  const { pathToFileURL } = await import('node:url');
  const built = await import(pathToFileURL(new URL('../dist/assets/analytics.js', import.meta.url).pathname));
  const manifest = JSON.parse(await readFile(new URL('../dist/docs/manifest.json', import.meta.url), 'utf8'));
  for (const page of manifest.pages) assert.equal(built.pagePath(`/${page.route}/?private#private`), `/${page.route}/`);
  assert.equal(built.pagePath('/docs/private-person/'), null);
  assert.equal(built.pagePath('/docs/api/region/extra/'), null);
});
