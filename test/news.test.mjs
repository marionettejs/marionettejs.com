import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { categories, newsItems, featuredNewsPath, selectNewsLayout, sortNewsItems, renderDialogue, storeStory } from '../content/news.mjs';

test('an older editorial feature stays selected while the remaining feed stays chronological', () => {
  const entries = [
    { path: '/middle/', date: '2026-10-06' },
    { path: '/old-feature/', date: '2025-01-01' },
    { path: '/new/', date: '2026-10-10' },
    { path: '/undated-draft/', date: null }
  ];
  const original = structuredClone(entries);
  const layout = selectNewsLayout(entries, '/old-feature/');
  assert.equal(layout.featured.path, '/old-feature/');
  assert.deepEqual(layout.chronological.map(entry => entry.path), ['/new/', '/middle/', '/undated-draft/']);
  assert.deepEqual(sortNewsItems(entries).map(entry => entry.path), ['/new/', '/middle/', '/old-feature/', '/undated-draft/']);
  assert.deepEqual(entries, original);
  assert.equal(selectNewsLayout(entries, '/missing/').featured, undefined);
  assert.equal(featuredNewsPath, '/news/introducing-marionette-5/');
});

test('the requested taxonomy supports research case studies and a dated Story draft', () => {
  assert.deepEqual(categories, ['Release', 'Case Study', 'Research', 'Story']);
  for (const slug of ['realworld', 'vikunja']) {
    assert.deepEqual(newsItems.find(entry => entry.path === `/case-studies/${slug}/`).categories, ['Case Study', 'Research']);
  }
  assert.deepEqual(newsItems.find(entry => entry.path === '/case-studies/roundingwell/').categories, ['Case Study']);
  assert.deepEqual(storeStory.categories, ['Story']);
  assert.equal(storeStory.date, '2026-09-08');
  assert.equal(storeStory.dateSource, 'https://x.com/marionettejs/status/2097394994114101568');
  assert.equal(storeStory.dateStatus, 'verified');
  assert.equal(storeStory.draft, true);
});

test('speaker labels appear initially and on transitions, including across questions', () => {
  const html = renderDialogue([
    { speaker: 'dot', text: 'First question?', question: true },
    { speaker: 'Paul', text: 'First paragraph.' },
    { speaker: 'Paul', text: 'Second paragraph.' },
    { speaker: 'dot', text: 'Response.' },
    { speaker: 'dot', text: 'Next question?', question: true },
    { speaker: 'Paul', text: 'Next answer.' }
  ]);
  assert.deepEqual([...html.matchAll(/class="news-speaker">([^<]+)/g)].map(match => match[1]), ['dot', 'Paul', 'dot', 'Paul']);
  assert.ok(html.includes('<div class="news-answer"><p>Second paragraph.</p></div>'));
  assert.ok(html.includes('<section id="conversation-2"><h2>Next question?</h2>'));
});

test('the served draft preserves the approved opening and dated draft publication metadata', async () => {
  const article = await readFile(new URL('../dist/news/introducing-marionette-5/index.html', import.meta.url), 'utf8');
  assert.ok(article.includes('Well, I noticed agents were doing more and more of my coding, and I started wondering whether I should abandon Marionette and move to one of the major frameworks.'));
  assert.ok(!article.includes('I don’t know much about Svelte'));
  const story = await readFile(new URL('../dist/news/wear-your-very-specific-opinions/index.html', import.meta.url), 'utf8');
  assert.ok(story.includes('<time datetime="2026-09-08">September 8, 2026</time>'));
  assert.ok(!story.includes('Publication date pending'));
  assert.ok(story.includes('<meta name="robots" content="noindex, follow">'));
  assert.ok(!story.includes('property="article:published_time"'), 'An unpublished Story must not claim a publication time');
  for (const url of ['https://store.marionettejs.com/', 'https://github.com/sponsors/paulfalgout', 'https://marionettejs.com/thanks/']) assert.ok(story.includes(`href="${url}"`));
  const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  assert.ok(!sitemap.includes(storeStory.path));
});
