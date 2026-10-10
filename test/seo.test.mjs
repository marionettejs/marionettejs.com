import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { socialImageFor, socialMetadata, articleMetadata, sitemapMetadata, parseMetadataDate } from '../scripts/seo.mjs';

test('share images keep the hero, support overrides and safely fall back from non-raster/malformed candidates', () => {
  const hero = { src: '/hero.png', width: 1672, height: 941, alt: 'Hero' };
  const override = { src: '/share.jpg', width: 1200, height: 630, alt: 'Share' };
  assert.equal(socialImageFor({ image: hero }).url, 'https://marionettejs.com/hero.png');
  assert.equal(socialImageFor({ image: hero, socialImage: override }).type, 'image/jpeg');
  assert.equal(socialImageFor({ image: hero, socialImage: { ...override, src: '/share.svg' } }).src, hero.src);
  for (const src of ['/hero.svg', 'javascript:alert(1)', '//other.test/hero.png']) {
    assert.equal(socialImageFor({ image: { ...hero, src } }).src, '/assets/marionette-social.png');
  }
  const html = socialMetadata({ title: 'Article', description: 'Description', image: hero, route: '/story/', article: true, date: '2026-10-10' });
  assert.match(html, /og:type" content="article/);
  assert.ok(html.includes('article:published_time'));
});

test('article data uses real supplied dates, safe text, attribution and canonical identity', () => {
  const page = { title: 'An article — Marionette', description: '</script><script>bad</script>', route: '/article/', article: true, date: '2026-10-05', author: { '@type': 'Organization', name: 'Marionette project' } };
  const output = articleMetadata(page);
  const data = JSON.parse(output.match(/>(.*)<\/script>/s)[1]);
  assert.equal(data.headline, 'An article');
  assert.equal(data.datePublished, '2026-10-05');
  assert.equal(data.dateModified, undefined);
  assert.equal(data.mainEntityOfPage['@id'], 'https://marionettejs.com/article/');
  assert.equal(data.author.name, 'Marionette project');
  assert.ok(!output.includes('</script><script>'));
  assert.equal(articleMetadata({ ...page, article: false }), '');
});

test('sitemap lists canonical published pages once and only dates known modifications', () => {
  const xml = sitemapMetadata([{ route: '/' }, { route: '/' }, { route: '/hidden/', noindex: true }, { route: '/changed/', dateModified: '2026-10-10' }]);
  assert.equal((xml.match(/<loc>/g) || []).length, 2);
  assert.equal((xml.match(/<lastmod>/g) || []).length, 1);
  assert.ok(!xml.includes('/hidden/'));
});

test('built articles have chosen dates, canonical images and publishers', async () => {
  const read = file => readFile(new URL(`../dist/${file}`, import.meta.url), 'utf8');
  for (const slug of ['introducing-marionette-5', 'wear-your-very-specific-opinions']) {
    const html = await read(`news/${slug}/index.html`);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(data['@type'], 'Article');
    assert.equal(data.datePublished, slug === 'introducing-marionette-5' ? '2026-10-10' : '2026-09-08');
    assert.match(html, /robots" content="index, follow"/);
    assert.equal(html.match(/property="og:image" content="([^"]+)"/)[1], data.image.url);
  }
  const caseStudy = JSON.parse((await read('case-studies/vikunja/index.html')).match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(caseStudy.datePublished, '2026-10-07');
  assert.equal(caseStudy.author.name, 'Marionette project');
  const roundingwell = JSON.parse((await read('case-studies/roundingwell/index.html')).match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(roundingwell.datePublished, '2026-10-06');
  assert.match(await read('404.html'), /robots" content="noindex, follow"/);
});

// Search summaries must come from readable guide prose, not Markdown navigation.
test('documentation previews summarize existing prose without rewriting the source', async () => {
  const { documentationDescription } = await import('../scripts/library-docs.mjs');
  const page = { title: 'Region', markdown: '# Region\n\n[API index](../api.md) · [Runtime](runtime.md)\n\nRegions **own** their child Views. Read the [ownership guide](../architecture.md) to choose which part of an application keeps each child alive.\n' };
  const original = page.markdown;
  const text = documentationDescription(page, '5.0.0');
  assert.ok(text.startsWith('Regions own their child Views.'));
  assert.ok(!text.includes('](../'));
  assert.equal(page.markdown, original);
});


test('metadata dates reject impossible calendars, malformed clocks and future times without rejecting timezone shifts', () => {
  for (const value of ['2026-02-31', '2025-02-29', '2026-04-31', '2026-10-10T24:01:00Z', '2026-10-10T12:00:99Z', '2026-10-10Tnoon', 42]) assert.ok(Number.isNaN(parseMetadataDate(value)), String(value));
  for (const value of ['2024-02-29', '2026-10-10T00:30:00+13:00', '2026-10-09T23:30:00-07:00']) assert.ok(Number.isFinite(parseMetadataDate(value)), value);
  for (const date of ['2026-02-31', new Date(Date.now() + 3600000).toISOString()]) {
    const page = { title: 'A', description: 'D', article: true, route: '/a/', date, dateModified: date };
    assert.ok(!articleMetadata(page).includes('datePublished'));
    assert.ok(!socialMetadata(page).includes('article:published_time'));
    assert.ok(!sitemapMetadata([page]).includes('<lastmod>'));
  }
});

test('malformed alt values fall back to the next usable image', () => {
  for (const alt of [42, {}, [], '', null]) assert.equal(socialImageFor({ image: { src: '/hero.png', width: 10, height: 10, alt } }).src, '/assets/marionette-social.png');
});

test('documentation summaries skip link-only navigation and truncate long tokens consistently', async () => {
  const { documentationDescription } = await import('../scripts/library-docs.mjs');
  const explanation = 'Regions own their child Views, giving an application one clear place to replace and clean up each view.';
  for (const navigation of ['[Read the complete framework API reference and architecture navigation](api.md)', '[Read the complete framework API reference and architecture navigation][api]']) {
    const markdown = navigation + '\n\n' + explanation + '\n\n[api]: api.md';
    assert.equal(documentationDescription({ title: 'Region', markdown }, '5.0.0'), explanation);
  }
  assert.equal(documentationDescription({ title: 'Long', markdown: 'x'.repeat(260) }, '5.0.0'), 'x'.repeat(237) + '…');
});
