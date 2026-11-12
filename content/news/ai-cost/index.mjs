import { readFileSync } from 'node:fs';

export const aiCost = {
  title: 'The AI Cost of Marionette',
  description: 'Four agent-generated applications per framework. What Codex used, what it built, and how Marionette compares.',
  path: '/news/ai-cost-of-marionette/',
  categories: ['Research'],
  date: '2026-11-12',
  dateLabel: 'November 12, 2026',
  linkLabel: 'Read the research',
  image: { src: '/assets/news/ai-cost/hero.png', width: 1672, height: 941, alt: 'Newspaper headline: Old Marionette yells at vibes.' }
};
export const aiCostPage = {
  ...aiCost,
  title: `${aiCost.title} — Marionette`,
  active: 'news',
  article: true,
  author: { '@type': 'Person', name: 'Paul Falgout' },
  body: readFileSync(new URL('./article.html', import.meta.url), 'utf8')
};
