import { readFileSync } from 'node:fs';
import { marked } from 'marked';
import { escapeHtml as escape } from '../../scripts/html.mjs';
import { releaseArticle, releaseArticleMetadata } from '../../release/drafts/marionette-5.1-metadata.mjs';

// Set the actual editorial publication date only when article launch is authorized.
// An unset date keeps the route, feed entry and sitemap entry out of production.
export const releasePublicationDate = null;

export function createReleaseArticle(publicationDate) {
  if (!publicationDate) throw new Error('An approved actual article publication date is required');
  const metadata = releaseArticleMetadata({ publicationDate });
  const post = { ...releaseArticle, date: metadata.date, dateLabel: metadata.dateLabel };
  const markdown = readFileSync(new URL('../../release/drafts/marionette-5.1.md', import.meta.url), 'utf8').replace(/^<!--[\s\S]*?-->\s*/, '');
  const reading = marked.parse(markdown).replace(/^<h1>[\s\S]*?<\/h1>\s*<p>[\s\S]*?<\/p>\s*/, '');
  return { post, page: { ...metadata, body: `<article class="news-article">
    <header class="news-article-heading"><a class="study-back" href="/news/">← News</a><div class="news-meta"><ul class="news-tags" aria-label="Categories"><li>Release</li></ul></div><h1>${escape(post.title)}</h1><p class="news-lede">${escape(post.description)}</p><p class="news-byline">Marionette project · <time datetime="${escape(post.date)}">${escape(post.dateLabel)}</time></p></header>
    <figure class="news-hero"><img src="${escape(post.image.src)}" width="${post.image.width}" height="${post.image.height}" alt="${escape(post.image.alt)}"></figure>
    <div class="news-reading news-story-reading"><div class="news-prose">${reading}</div></div>
  </article>` } };
}

const publication = releasePublicationDate ? createReleaseArticle(releasePublicationDate) : null;
export const release510Post = publication?.post ?? null;
export const release510Page = publication?.page ?? null;
