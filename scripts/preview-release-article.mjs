// Explicit local preview only. Never included in the production build or feed.
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { marked } from 'marked';
import { socialMetadata, articleMetadata } from './seo.mjs';
import { releaseArticleMetadata } from '../release/drafts/marionette-5.1-metadata.mjs';
const root = new URL('../', import.meta.url);
const output = new URL('output/release-preview/', root);
await mkdir(output, { recursive: true });
await cp(new URL('site/assets/', root), new URL('assets/', output), { recursive: true });
await cp(new URL('release/drafts/marionette-5.1.webp', root), new URL('hero.webp', output));
const markdown = await readFile(new URL('release/drafts/marionette-5.1.md', root), 'utf8');
const body = marked.parse(markdown.replace(/^<!--[\s\S]*?-->\s*/, ''));
const titleEnd = body.indexOf('</h1>') + 5;
const metadata = releaseArticleMetadata();
await writeFile(new URL('index.html', output), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${metadata.title}</title><meta name="description" content="${metadata.description}">${socialMetadata(metadata)}${articleMetadata(metadata)}<link rel="stylesheet" href="assets/tokens.css"><link rel="stylesheet" href="assets/site.css"><link rel="stylesheet" href="assets/news.css"><style>body{padding:24px}main{max-width:1080px;margin:auto}.draft-note{color:#df726a}.news-article h1{font-size:clamp(2.4rem,7vw,5rem)}.news-article img{width:100%;height:auto}.news-article p,.news-article pre,.news-article h2{max-width:760px;margin-inline:auto}.news-article p{line-height:1.7;margin-bottom:1.2em}.news-article h1{margin:16px 0 28px}.news-article h2{margin-top:48px;margin-bottom:16px}.news-article figure{margin:24px 0 36px}.news-article pre{overflow:auto;padding:24px;line-height:1.6;background:#e8e4dc;border:1px solid #d4cec2;border-radius:8px;margin-block:24px}.news-article a:focus-visible,.news-article pre:focus-visible{outline:3px solid #a5352d;outline-offset:4px}</style></head><body><main><p class="draft-note">Private release-day preview. Not published.</p><article class="news-article">${body.slice(0,titleEnd)}<figure><img src="hero.webp" width="1672" height="941" alt="A small browser application model with optional HTML and routing pieces being added under Marionette-red strings."></figure>${body.slice(titleEnd)}</article></main></body></html>`);
console.log('Local preview: output/release-preview/index.html (not part of dist)');
