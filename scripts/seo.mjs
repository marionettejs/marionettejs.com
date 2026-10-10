import { escapeHtml as escape } from './html.mjs';
export const siteOrigin = 'https://marionettejs.com';
export const defaultSocialImage = {
  src: '/assets/marionette-social.png', width: 1200, height: 630,
  alt: 'Marionette 5. JavaScript with a little structure. A coral string connects the application to its parts on a dark background.'
};
const rasterTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const absolute = path => new URL(path, siteOrigin).href;
// Calendar validation is separate from the timestamp's timezone and UTC day.
export function parseMetadataDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/.test(value)) return NaN;
  const day = value.slice(0, 10);
  const calendar = Date.parse(day);
  if (!Number.isFinite(calendar) || new Date(calendar).toISOString().slice(0, 10) !== day) return NaN;
  return Date.parse(value);
}
const validDate = value => { const timestamp = parseMetadataDate(value); return Number.isFinite(timestamp) && timestamp <= Date.now(); };

// Preserve the hero unless the page explicitly supplies a usable raster override.
export function socialImageFor({ image, socialImage } = {}) {
  for (const candidate of [socialImage, image, defaultSocialImage]) {
    if (!candidate || typeof candidate.src !== 'string' || !(candidate.src.startsWith('/') && !candidate.src.startsWith('//') || candidate.src.startsWith('https://'))) continue;
    let url;
    try { url = new URL(candidate.src, siteOrigin); } catch { continue; }
    const type = rasterTypes[url.pathname.slice(url.pathname.lastIndexOf('.')).toLowerCase()];
    if (!type || !Number.isInteger(candidate.width) || candidate.width <= 0 || !Number.isInteger(candidate.height) || candidate.height <= 0 || typeof candidate.alt !== 'string' || !candidate.alt.trim()) continue;
    return { ...candidate, url: url.href, type };
  }
}

export function socialMetadata(page) {
  const { title, description, route, article = false, date, dateModified } = page;
  const image = socialImageFor(page);
  const meta = (property, content, attribute = 'property') => `<meta ${attribute}="${property}" content="${escape(content)}">`;
  return [
    ...(route === undefined ? [] : [`<link rel="canonical" href="${escape(absolute(route))}">`, meta('og:url', absolute(route))]),
    meta('og:type', article ? 'article' : 'website'),
    ...(article && validDate(date) ? [meta('article:published_time', date)] : []),
    ...(article && validDate(dateModified) ? [meta('article:modified_time', dateModified)] : []),
    meta('og:site_name', 'Marionette'), meta('og:title', title), meta('og:description', description),
    meta('og:image', image.url), meta('og:image:type', image.type),
    meta('og:image:width', image.width), meta('og:image:height', image.height), meta('og:image:alt', image.alt),
    meta('twitter:card', 'summary_large_image', 'name'), meta('twitter:title', title, 'name'),
    meta('twitter:description', description, 'name'), meta('twitter:image', image.url, 'name'), meta('twitter:image:alt', image.alt, 'name')
  ].join('\n');
}

export function articleMetadata(page) {
  if (!page.article || !page.route) return '';
  const image = socialImageFor(page);
  const data = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: page.headline || page.title.replace(/ — Marionette$/, ''), description: page.description,
    url: absolute(page.route), mainEntityOfPage: { '@type': 'WebPage', '@id': absolute(page.route) },
    image: { '@type': 'ImageObject', url: image.url, width: image.width, height: image.height },
    publisher: { '@type': 'Organization', name: 'Marionette project', url: siteOrigin },
    ...(page.author ? { author: page.author } : {}),
    ...(page.contributor ? { contributor: page.contributor } : {}),
    ...(validDate(page.date) ? { datePublished: page.date } : {}),
    ...(validDate(page.dateModified) ? { dateModified: page.dateModified } : {})
  };
  // Metadata text must not be able to end its enclosing script element.
  return `<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`;
}

export function sitemapMetadata(entries) {
  const seen = new Set();
  const urls = entries.filter(entry => !entry.noindex && !seen.has(entry.route) && seen.add(entry.route));
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(entry => `<url><loc>${escape(absolute(entry.route))}</loc>${validDate(entry.dateModified) ? `<lastmod>${escape(entry.dateModified)}</lastmod>` : ''}</url>`).join('')}</urlset>`;
}
