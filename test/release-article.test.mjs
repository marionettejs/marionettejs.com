import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { releaseArticle, releaseArticleMetadata } from '../release/drafts/marionette-5.1-metadata.mjs';
import { socialMetadata, articleMetadata } from '../scripts/seo.mjs';
import { newsPosts } from '../content/news.mjs';

test('held release article prepares canonical, social and Article metadata without inventing a date', () => {
  const page = releaseArticleMetadata();
  const social = socialMetadata(page);
  const schema = articleMetadata(page);
  assert.equal(page.date, undefined);
  assert.match(social, /rel="canonical" href="https:\/\/marionettejs.com\/news\/marionette-5-1\/"/);
  assert.match(social, /property="og:type" content="article"/);
  assert.match(social, /name="twitter:card" content="summary_large_image"/);
  assert.ok(social.includes('https://marionettejs.com/assets/news/marionette-5.1.webp'));
  assert.ok(social.includes('content="1672"') && social.includes('content="941"'));
  assert.ok(!social.includes('article:published_time'));
  assert.ok(!schema.includes('datePublished'));
  assert.ok(schema.includes('"@type":"Article"') && schema.includes('"headline":"Marionette 5.1: Two more opinions."'));
  assert.ok(schema.includes('"author":{"@type":"Organization","name":"Marionette project"'));
  assert.ok(!newsPosts.some(entry => entry.path === releaseArticle.path));
});

test('release metadata admits only a real publication date when explicitly supplied', () => {
  for (const publicationDate of ['later', '2026-02-30', '2999-01-01', '2026-11-12T00:00:00Z']) {
    assert.throws(() => releaseArticleMetadata({ publicationDate }), /actual publication date/);
  }
  const page = releaseArticleMetadata({ publicationDate: '2000-01-01' });
  assert.match(articleMetadata(page), /"datePublished":"2000-01-01"/);
});

test('held draft includes package versions and compatibility, without repeated minor-release justification', async () => {
  const draft = await readFile(new URL('../release/drafts/marionette-5.1.md', import.meta.url), 'utf8');
  assert.ok(draft.includes("## What's in 5.1"));
  assert.ok(draft.includes('Directives connect and disconnect with the View, and subsequent renders stay within the renderer-owned range, leaving child Views outside that range alone.'));
  assert.ok(!draft.includes('Worth a minor release') && !draft.includes('That is worth **5.1**'));
  for (const version of ['**5.1.0**', '**`@mnjs/html` 1.0.0**', '**`@mnjs/router` 0.1.1**', '**`@mnjs/test` 1.0.0**']) assert.ok(draft.includes(version));
});
