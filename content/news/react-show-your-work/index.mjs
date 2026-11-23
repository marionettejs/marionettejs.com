import { readFileSync } from 'node:fs';
import { marked } from 'marked';
import { escapeHtml as escape } from '../../../scripts/html.mjs';
import { aiCost } from '../ai-cost/index.mjs';

const assetPath = '/assets/news/react-show-your-work/';
const screenshotPath = assetPath + 'chrome158-keyed-results.jpg';
const markdown = readFileSync(new URL('article.md', import.meta.url), 'utf8');
const captures = {
  timing: { label: 'Speed', alt: 'Nine operation timings and the weighted CPU scores for the selected keyed implementations.', top: 0, height: 733 },
  memory: { label: 'Memory', alt: 'Memory after page load, after adding 1,000 rows and after five create-and-clear cycles for the same keyed implementations.', top: 737, height: 292 },
  transfer: { label: 'Code shipped and first paint', alt: 'Uncompressed size, Brotli-compressed size and first paint for the same keyed implementations.', top: 1033, height: 323 }
};
const tableLabels = ['Speed comparison', 'Memory comparison', 'Code shipped comparison'];
let tableIndex = 0;
const article = marked.parse(markdown.replace(/^<!-- benchmark:(\w+) -->$/gm, (_, metric) => {
  const { label, alt, top, height } = captures[metric];
  return '<figure class="news-break news-case-capture"><a class="news-benchmark-crop" href="' + screenshotPath +
    '" aria-label="Open the full Chrome 158 screenshot for ' + escape(label) + '" style="--crop-height:' + height + ';--crop-top:' + (100 * top / height) +
    '%"><img src="' + screenshotPath + '" width="883" height="1356" loading="lazy" decoding="async" alt="' + escape(alt) + '"></a>' +
    '<figcaption>' + escape(label) + ' · <a href="https://krausest.github.io/js-framework-benchmark/2026/chrome158.html">js-framework-benchmark, Chrome 158</a>. Same selected keyed entries, sorted by weighted CPU score.</figcaption></figure>';
})).replace(/<table>/g, () => {
  const label = tableLabels[tableIndex++];
  if (!label) throw new Error('Expected only three benchmark comparison tables.');
  return '<div class="news-comparison-table" role="region" aria-label="' + escape(label) + '" tabindex="0"><table>';
}).replace(/<\/table>/g, '</table></div>');
if (tableIndex !== tableLabels.length) throw new Error('Expected all three benchmark comparison tables.');

export const reactShowYourWork = {
  title: 'React Should Have to Compete',
  description: 'In the Chrome 158 keyed-table benchmark, Marionette scored better overall on CPU, used less memory in all three tests, and shipped less JavaScript than either React entry.',
  path: '/news/react-show-your-work/',
  categories: ['Research', 'Story'],
  date: '2026-11-23',
  dateLabel: 'November 23, 2026',
  linkLabel: 'Read the feature',
  image: {
    src: assetPath + 'hero.png',
    displaySrc: assetPath + 'hero.webp',
    width: 1672,
    height: 941,
    alt: 'A Marionette-logo robot carries a grinning tortoise across the finish line while a React-logo robot tries to pull a hare.'
  }
};

const { title, description, categories, date, dateLabel, image } = reactShowYourWork;

export const reactShowYourWorkPage = {
  ...reactShowYourWork,
  title: title + ' — Marionette',
  headline: title,
  active: 'news',
  article: true,
  author: { '@type': 'Person', name: 'Paul Falgout', url: 'https://github.com/paulfalgout' },
  body: `<article class="news-article news-benchmark-feature">
    <header class="news-article-heading"><a class="study-back" href="/news/">← News</a><div class="news-meta"><ul class="news-tags" aria-label="Categories">${categories.map(category => '<li>' + escape(category) + '</li>').join('')}</ul></div><h1>${escape(title)}</h1><p class="news-lede">${escape(description)}</p><p class="news-byline">Paul Falgout · <time datetime="${escape(date)}">${escape(dateLabel)}</time></p></header>
    <figure class="news-hero"><img src="${escape(image.displaySrc)}" width="${image.width}" height="${image.height}" alt="${escape(image.alt)}"></figure>
    <div class="news-reading news-story-reading"><div class="news-prose">${article}
      <footer class="news-related" aria-label="Related story">
        <p class="eyebrow">READ NEXT</p>
        <a class="news-related-link" href="${escape(aiCost.path)}" aria-labelledby="news-related-title" aria-describedby="news-related-description">
          <img src="${escape(aiCost.image.src)}" width="${aiCost.image.width}" height="${aiCost.image.height}" alt="" loading="lazy" decoding="async">
          <div>
            <h2 id="news-related-title">${escape(aiCost.title)}</h2>
            <p id="news-related-description">We gave Codex the same Pokémon app to build in six stacks. See what it spent and what it shipped.</p>
          </div>
        </a>
      </footer>
    </div></div>
  </article>`
};
