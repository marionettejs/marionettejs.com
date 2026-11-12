// Explicit local preview only. Never included in the production build or feed.
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { marked } from 'marked';
const root = new URL('../', import.meta.url);
const output = new URL('output/release-preview/', root);
await mkdir(output, { recursive: true });
await cp(new URL('site/assets/', root), new URL('assets/', output), { recursive: true });
await cp(new URL('release/drafts/marionette-5.1.webp', root), new URL('hero.webp', output));
const markdown = await readFile(new URL('release/drafts/marionette-5.1.md', root), 'utf8');
const body = marked.parse(markdown.replace(/^<!--[\s\S]*?-->\s*/, ''));
const titleEnd = body.indexOf('</h1>') + 5;
await writeFile(new URL('index.html', output), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Marionette 5.1 draft</title><link rel="stylesheet" href="assets/tokens.css"><link rel="stylesheet" href="assets/site.css"><link rel="stylesheet" href="assets/news.css"><style>body{padding:24px}main{max-width:1080px;margin:auto}.draft-note{color:#df726a}.news-article h1{font-size:clamp(2.4rem,7vw,5rem)}.news-article img{width:100%;height:auto}.news-article p,.news-article pre{max-width:760px}pre{overflow:auto;padding:24px}p{line-height:1.7}h2{margin-top:2em}</style></head><body><main><p class="draft-note">Private release-day preview. Not published.</p><article class="news-article">${body.slice(0,titleEnd)}<figure><img src="hero.webp" width="1672" height="941" alt="A small browser application model with optional HTML and routing pieces being added under Marionette-red strings."></figure>${body.slice(titleEnd)}</article></main></body></html>`);
console.log('Local preview: output/release-preview/index.html (not part of dist)');
