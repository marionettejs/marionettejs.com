import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { socialImageFor, socialMetadata, articleMetadata, sitemapMetadata } from '../scripts/seo.mjs';

test('share images keep the hero, support overrides and safely fall back from non-raster/malformed candidates', () => {
  const hero = { src: '/hero.png', width: 1672, height: 941, alt: 'Hero' };
  const override = { src: '/share.jpg', width: 1200, height: 630, alt: 'Share' };
  assert.equal(socialImageFor({ image: hero }).url, 'https://marionettejs.com/hero.png');
  assert.equal(socialImageFor({ image: hero, socialImage: override }).type, 'image/jpeg');
  assert.equal(socialImageFor({ image: hero, socialImage: { ...override, src: '/share.svg' } }).src, hero.src);
  for (const src of ['/hero.svg', 'javascript:alert(1)', '//other.test/hero.png']) {
    assert.equal(socialImageFor({ image: { ...hero, src } }).src, '/assets/marionette-social.png');
  }
  const html = socialMetadata({ title: 'Article', description: 'Description', image: hero, route: '/story/', article: true, date: '2026-10-10', draft: true });
  assert.match(html, /og:type" content="article/);
  assert.ok(!html.includes('article:published_time'));
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
  assert.ok(!articleMetadata({ ...page, draft: true }).includes('datePublished'));
  assert.equal(articleMetadata({ ...page, article: false }), '');
});

test('sitemap lists canonical published pages once and only dates known modifications', () => {
  const xml = sitemapMetadata([{ route: '/' }, { route: '/' }, { route: '/draft/', draft: true }, { route: '/hidden/', noindex: true }, { route: '/changed/', dateModified: '2026-10-10' }]);
  assert.equal((xml.match(/<loc>/g) || []).length, 2);
  assert.equal((xml.match(/<lastmod>/g) || []).length, 1);
  assert.ok(!xml.includes('/draft/'));
  assert.ok(!xml.includes('/hidden/'));
});

test('built article metadata preserves drafts and matches visible heroes and publishers', async () => {
  const read = file => readFile(new URL(`../dist/${file}`, import.meta.url), 'utf8');
  for (const slug of ['introducing-marionette-5', 'wear-your-very-specific-opinions']) {
    const html = await read(`news/${slug}/index.html`);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(data['@type'], 'Article');
    assert.equal(data.datePublished, undefined);
    assert.match(html, /robots" content="noindex, follow"/);
    assert.equal(html.match(/property="og:image" content="([^"]+)"/)[1], data.image.url);
  }
  const caseStudy = JSON.parse((await read('case-studies/vikunja/index.html')).match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(caseStudy.datePublished, '2026-10-07');
  assert.equal(caseStudy.author.name, 'Marionette project');
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
