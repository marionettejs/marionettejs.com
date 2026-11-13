import { readFileSync } from 'node:fs';
import { metrics, renderChart } from '../../../site/assets/news/ai-cost/charts.js';

const dataset = JSON.parse(readFileSync(new URL('../../../site/assets/news/ai-cost/data.json', import.meta.url), 'utf8'));
const article = readFileSync(new URL('./article.html', import.meta.url), 'utf8')
  .replace(/<!-- chart:([a-z]+) -->/g, (_, id) => renderChart(dataset.chart_builds, metrics.find(metric => metric.id === id)))
  .replace('<!-- benchmark-data -->', `<script id="benchmark-data" type="application/json">${JSON.stringify({ builds: dataset.chart_builds }).replaceAll('<', '\\u003c')}</script>`);

export const aiCost = {
  title: 'The AI Cost of Marionette',
  description: 'Following Nolan Lawson’s “The AI cost of JavaScript frameworks,” we ran the same benchmark task with Codex, Marionette included: four builds per framework, comparing agent effort, delivered quality and source size.',
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
  body: article
};
