import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aiCost, aiCostPage } from '../content/news/ai-cost/index.mjs';
import { featuredNewsPath, newsPosts } from '../content/news.mjs';
import { metrics, rowsFor } from '../site/assets/news/ai-cost/charts.js';

const body = aiCostPage.body;
const data = JSON.parse(body.match(/<script id="benchmark-data" type="application\/json">(.*?)<\/script>/s)[1]);
test('the article is the featured, registered research post with publication metadata', () => {
  assert.equal(featuredNewsPath, aiCost.path);
  assert.ok(newsPosts.includes(aiCost));
  assert.equal(aiCostPage.article, true);
  assert.equal(aiCostPage.author.name, 'Paul Falgout');
  assert.equal(aiCost.image.width, 1672);
  assert.doesNotMatch(body, /Private editorial|UNPUBLISHED|Draft for review|RED FLAG|Pokémon detail route|Available tools are not/);
  assert.match(body, /github.com\/marionettejs\/agent-framework-benchmark\/tree\/results\/codex-2026-11/);
});
test('every chart retains six frameworks and four applications with reconciled source counts', () => {
  assert.equal(data.builds.length, 24);
  for (const metric of metrics) {
    const rows = rowsFor(data.builds, metric);
    assert.equal(rows.length, 6);
    assert.ok(rows.every(row => row.observations.length === 4));
  }
  assert.deepEqual(data.builds.filter(b => b.framework === 'Marionette').map(b => b.normalized_lines), [998, 950, 1027, 1053]);
  assert.equal(data.builds.find(b => b.framework === 'SvelteKit' && b.build === 'b2').normalized_lines, 946);
  assert.equal((body.match(/data-benchmark=/g) || []).length, 7);
});
test('the built page includes canonical, social, article and sitemap metadata', async () => {
  const html = await readFile(new URL('../dist/news/ai-cost-of-marionette/index.html', import.meta.url), 'utf8');
  assert.match(html, /property="og:type" content="article"/);
  assert.match(html, /https:\/\/marionettejs.com\/news\/ai-cost-of-marionette\//);
  assert.match(html, /"@type":"Article"/);
  const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  assert.ok(sitemap.includes(aiCost.path));
});
