import { readFileSync } from 'node:fs';
import { marked } from 'marked';
import { escapeHtml as escape } from '../../../scripts/html.mjs';
import { articleMetadata, socialMetadata } from '../../../scripts/seo.mjs';
import { reactShowYourWorkPage } from '../../news/react-show-your-work/index.mjs';

export const chineseBenchmarkPath = '/zh-CN/news/react-show-your-work/';
const headline = 'Marionette、Vue 和 React：速度、内存和包体积怎么比？';
const description = '在 Chrome 158 的表格基准测试中，Vue 的 CPU 综合得分略好于 Marionette；Marionette 的内存综合指标更低，Brotli 压缩后的 JavaScript 也更小。';
const image = {
  ...reactShowYourWorkPage.image,
  alt: '带有 Marionette 标志的机器人抱着乌龟冲过终点，带有 React 标志的机器人试图拉动兔子。'
};
const page = {
  title: headline + ' — Marionette',
  headline, description, image, route: chineseBenchmarkPath, article: true,
  language: 'zh-CN', locale: 'zh_CN', date: reactShowYourWorkPage.date, author: reactShowYourWorkPage.author
};
const markdown = readFileSync(new URL('article.md', import.meta.url), 'utf8');
const article = marked.parse(markdown)
  .replaceAll('<table>', '<div class="news-comparison-table" role="region" aria-label="基准测试对比" tabindex="0"><table>')
  .replaceAll('</table>', '</table></div>');

export function renderChineseBenchmarkPage({ stylesheets, siteRevision }) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta name="site-revision" content="${escape(siteRevision)}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escape(description)}"><title>${escape(page.title)}</title>
${socialMetadata(page)}
${articleMetadata(page)}
<link rel="icon" href="/assets/mark.svg" type="image/svg+xml">
${stylesheets.map(href => `<link rel="stylesheet" href="${escape(href)}">`).join('\n')}
</head><body><a class="skip-link" href="#main">跳到正文</a>
<main id="main"><article class="news-article news-benchmark-feature">
  <header class="news-article-heading"><h1>${escape(headline)}</h1><p class="news-lede">${escape(description)}</p><p class="news-byline">${escape(page.author.name)} · <time datetime="${escape(page.date)}">2026年11月23日</time></p></header>
  <figure class="news-hero"><img src="${escape(image.displaySrc)}" width="${image.width}" height="${image.height}" alt="${escape(image.alt)}"></figure>
  <div class="news-reading news-story-reading"><div class="news-prose">${article}</div></div>
</article></main></body></html>`;
}
