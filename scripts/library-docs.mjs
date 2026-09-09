import { publishedMarkdown } from './published-docs.mjs';
import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, posix, relative, isAbsolute, sep } from 'node:path';
import { Marked, Renderer } from 'marked';
import * as pagefind from 'pagefind';

const hash = value => createHash('sha256').update(value).digest('hex');
export const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const safePath = value => typeof value === 'string' && /^[a-zA-Z0-9._/-]+$/.test(value) && !value.startsWith('/') && !value.split('/').some(part => part === '..' || part === '.' || !part);

export async function readSnapshot(directory) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.pages) || !manifest.pages.length || !/^[a-f0-9]{40}$/.test(manifest.sourceRevision) || typeof manifest.sourceDirty !== 'boolean' || manifest.channel !== 'next' || typeof manifest.packageVersion !== 'string' || manifest.sourceRepository !== 'https://github.com/marionettejs/marionette') throw new Error('Unsupported documentation manifest.');
  const routes = new Set();
  const sources = new Set();
  const pages = [];
  for (const page of manifest.pages) {
    if (!safePath(page.source) || !page.source.endsWith('.md') || !safePath(page.route) || !(page.route === 'docs' || page.route.startsWith('docs/')) || routes.has(page.route) || sources.has(page.source) || typeof page.title !== 'string' || typeof page.section !== 'string') throw new Error(`Invalid or duplicate documentation page: ${page.source}`);
    const markdown = await readFile(resolve(directory, page.source), 'utf8');
    if (hash(markdown) !== page.sha256) throw new Error(`Documentation hash mismatch: ${page.source}`);
    routes.add(page.route); sources.add(page.source);
    pages.push({ ...page, markdown });
  }
  const assets = [];
  if (!Array.isArray(manifest.assets)) throw new Error('Documentation snapshot assets are required.');
  for (const asset of manifest.assets) {
    if (!safePath(asset.source) || !/\.(?:md|json|mjs)$/.test(asset.source) ||
        !/^(?:config\/diagnostics\/|test\/fixtures\/docs-[a-z-]+\/|skills\/marionette\/|benchmarks\/docs\/)/.test(asset.source) || sources.has(asset.source)) throw new Error('Unsupported documentation asset.');
    const base = await realpath(directory);
    const path = await realpath(resolve(base, asset.source));
    const local = relative(base, path);
    if (local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) throw new Error('Documentation asset escapes snapshot.');
    const content = await readFile(path, 'utf8');
    if (hash(content) !== asset.sha256) throw new Error(`Documentation hash mismatch: ${asset.source}`);
    assets.push({ ...asset, content }); sources.add(asset.source);
  }
  if (!assets.some(asset => asset.source === 'config/diagnostics/catalog.json')) throw new Error('Expected diagnostic catalog asset.');
  const digest = hash([...pages, ...assets].sort((a, b) => a.source.localeCompare(b.source, 'en')).map(page => `${page.source}\0${page.sha256}\n`).join(''));
  if (digest !== manifest.contentSha256) throw new Error('Documentation snapshot digest mismatch.');
  if (!routes.has('docs')) throw new Error('Documentation snapshot has no landing page.');
  return { manifest, pages, assets };
}

export const canonicalSourceUrl = page => `/docs/markdown/${page.source}`;
export const markdownUrl = page => page.route === 'docs' ? '/docs/index.md' : `/${page.route}.md`;
const pageUrl = page => `/${page.route}/`;
const githubUrl = (manifest, source) => `${manifest.sourceRepository}/blob/${manifest.sourceRevision}/${source}`;
function linkResolver(page, pages, manifest, format = 'html') {
  const bySource = new Map(pages.map(item => [item.source, item]));
  const resources = new Set((manifest.assets || []).map(asset => asset.source));
  return href => {
    href = href.replace(/^https:\/\/v5\.marionettejs\.com(?=\/)/, '');
    if (/[\u0000-\u0020]/.test(href) || (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^(?:https?:|mailto:|tel:)/i.test(href))) return '#';
    if (href.startsWith('#')) return href;
    const github = href.match(/^https:\/\/github\.com\/marionettejs\/marionette\/blob\/(master|main|v5|[a-f0-9]{40})\/(.*)$/);
    if (github && /^[a-f0-9]{40}$/.test(github[1]) && github[1] !== manifest.sourceRevision) return href;
    if (/^[a-z]+:|^\/\//i.test(href) && !github) return href;
    if (href.startsWith('/')) {
      if (format === 'markdown' && /^\/errors\/(?:MN[0-9]{4}\/)?$/.test(href)) return href === '/errors/' ? '/errors/index.md' : href.slice(0, -1) + '.md';
      return href;
    }
    const [pathname, fragment] = (github ? github[2] : href).split('#');
    const source = github ? pathname : posix.normalize(posix.join(posix.dirname(page.source), pathname));
    const target = bySource.get(source);
    return `${target ? (format === 'markdown' ? markdownUrl(target) : pageUrl(target)) : resources.has(source) ? `/docs/source/${source}` : githubUrl(manifest, source)}${fragment ? `#${fragment}` : ''}`;
  };
}

export function renderMarkdown(page, pages, manifest) {
  const headings = [];
  const used = new Map();
  const renderer = new Renderer();
  renderer.html = ({ text }) => /^\s*<!--[\s\S]*-->\s*$/.test(text) ? '' : escapeHtml(text);
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const base = text.replace(/<[^>]*>/g, '').replace(/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/gi, '').toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/\s/g, '-');
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    headings.push({ depth, id, text });
    return `<h${depth} id="${escapeHtml(id)}">${text}<a class="heading-anchor" data-pagefind-ignore href="#${escapeHtml(id)}" aria-label="Link to ${escapeHtml(text.replace(/<[^>]*>/g, ''))}">#</a></h${depth}>\n`;
  };
  const rewrite = linkResolver(page, pages, manifest);
  renderer.link = function ({ href, title, tokens }) {
    return `<a href="${escapeHtml(rewrite(href))}"${title ? ` title="${escapeHtml(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
  };
  renderer.image = ({ href, title, text }) => `<img src="${escapeHtml(rewrite(href))}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy">`;
  const parser = new Marked({ renderer });
  let html = parser.parse(publishedMarkdown(page));
  if (!headings.some(heading => heading.depth === 1)) html = `<h1>${escapeHtml(page.title)}</h1>\n${html}`;
  return { html, headings };
}

function sidebar(page, pages) {
  const groups = Map.groupBy(pages, item => item.section);
  return `<aside class="docs-nav" aria-label="Documentation navigation"><a class="docs-home" href="/docs/">DOCUMENTATION <span>↗</span></a><div id="docs-search"></div><noscript><p class="docs-js-note">Browse the contents below. Search requires JavaScript.</p></noscript><details class="docs-menu" open><summary>Browse documentation</summary>${[...groups].map(([section, entries]) => `<details class="docs-group" ${/maintain|release|histor|archive/i.test(section) && section !== page.section ? '' : 'open'}><summary>${escapeHtml(section)}</summary>${entries.map(item => `<a href="${pageUrl(item)}" ${item.source === page.source ? 'aria-current="page"' : ''}>${escapeHtml(item.title)}</a>`).join('')}</details>`).join('')}</details></aside>`;
}

function adjacentPages(page, pages) {
  const section = pages.filter(item => item.section === page.section);
  const index = section.findIndex(item => item.source === page.source);
  const links = [[section[index - 1], 'Previous'], [section[index + 1], 'Next']]
    .filter(([item]) => item)
    .map(([item, label]) => `<a href="${pageUrl(item)}" rel="${label === 'Next' ? 'next' : 'prev'}"><span>${label}</span>${escapeHtml(item.title)}</a>`);
  return links.length ? `<nav class="docs-adjacent" aria-label="Continue reading" data-pagefind-ignore>${links.join('')}</nav>` : '';
}

export async function buildLibraryDocs({ directory, out, shell }) {
  const { manifest, pages, assets } = await readSnapshot(directory);
  for (const page of pages) {
    const { html, headings } = renderMarkdown(page, pages, manifest);
    const provenance = `${manifest.packageVersion} · Published beta · ${manifest.sourceRevision.slice(0, 8)}${manifest.sourceDirty ? ' + local changes' : ''}`;
    const body = `<div class="docs-layout canonical-docs">${sidebar(page, pages)}<article class="prose docs-prose" data-pagefind-body><div class="docs-breadcrumb" data-pagefind-ignore>${escapeHtml(page.section)}</div><div class="docs-tools" data-pagefind-ignore><a href="${markdownUrl(page)}">Read Markdown</a><button type="button" data-copy-markdown="${markdownUrl(page)}">Copy Markdown</button><a href="${canonicalSourceUrl(page)}">Canonical source</a><a href="/docs/manifest.json">Source details</a><span class="copy-status" role="status"></span></div><p class="docs-version" data-pagefind-ignore>${escapeHtml(provenance)}. Published on npm. Match your installed version.</p><span hidden data-pagefind-filter="Audience">${page.section === 'Maintaining Marionette' ? 'Maintainers' : 'Consumer'}</span>${html}${adjacentPages(page, pages)}</article><aside class="docs-margin"><nav aria-label="On this page"><p class="eyebrow">ON THIS PAGE</p>${headings.filter(item => item.depth === 2).map(item => `<a href="#${escapeHtml(item.id)}">${item.text.replace(/<[^>]*>/g, '')}</a>`).join('')}</nav><div class="docs-note"><p>The homepage demo runs this beta. Reading copies include publication wording updates; original packaged sources remain available above.</p><a href="/reference/provenance.json">Demo source notes ↗</a></div></aside></div>`;
    const rendered = shell({ title: page.title, description: `${page.title}. Marionette ${manifest.packageVersion} documentation.`, active: 'docs', body, route: `/${page.route}/`, markdown: markdownUrl(page) });
    await mkdir(resolve(out, page.route), { recursive: true });
    await writeFile(resolve(out, page.route, 'index.html'), rendered);
    await mkdir(resolve(out, 'docs/markdown', posix.dirname(page.source)), { recursive: true });
    await writeFile(resolve(out, 'docs/markdown', page.source), page.markdown);
    await writeFile(resolve(out, markdownUrl(page).slice(1)), deriveMarkdown(page, pages, manifest));
  }
  await writeFile(resolve(out, 'docs/publication.json'), await readFile(new URL('../content/docs-publication-edits.json', import.meta.url)));
  await writeFile(resolve(out, 'docs/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(resolve(out, 'docs/llms.txt'), `# Marionette documentation\n\nVersion: ${manifest.packageVersion}\nChannel: ${manifest.channel}\nPublication: beta (published on npm)\nSource revision: ${manifest.sourceRevision}\nLocal changes: ${manifest.sourceDirty}\nContent SHA-256: ${manifest.contentSha256}\n\nUse the installed package version and source revision to select contracts. These docs ship with the published marionette@${manifest.packageVersion} package. Website reading copies include publication wording updates; original packaged sources retain their original hashes. The reading Markdown rewrites links to this snapshot. Canonical source files remain available byte for byte under /docs/markdown/.\n\n${[...Map.groupBy(pages, page => page.section)].map(([section, entries]) => `## ${section}\n\n${entries.map(page => `- [${page.title}](${markdownUrl(page)})`).join('\n')}`).join('\n\n')}\n\n- [Diagnostic codes](/errors/index.md): active and retired runtime errors.\n- [Snapshot manifest](/docs/manifest.json): page routes, source paths, and original content hashes.\n`);
  for (const asset of assets) {
    const destination = resolve(out, 'docs/source', asset.source);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, asset.content);
  }
  const schema = await readFile(new URL('../content/diagnostics-schema.json', import.meta.url), 'utf8');
  const schemaSource = JSON.parse(await readFile(new URL('../content/diagnostics-schema-provenance.json', import.meta.url), 'utf8'));
  if (schemaSource.sourceRevision !== manifest.sourceRevision || schemaSource.sourceRepository !== manifest.sourceRepository || hash(schema) !== schemaSource.sha256) throw new Error('Review supplemental diagnostic schema for this snapshot.');
  for (const path of ['docs/catalog.schema.json', 'docs/source/config/diagnostics/catalog.schema.json']) {
    await writeFile(resolve(out, path), schema);
  }
  await writeFile(resolve(out, 'docs/schema-provenance.json'), `${JSON.stringify(schemaSource, null, 2)}\n`);
  const catalog = assets.find(asset => asset.source === 'config/diagnostics/catalog.json');
  await buildDiagnostics({ out, shell, manifest, asset: catalog });
  const { index } = await pagefind.createIndex();
  try {
    const added = await index.addDirectory({ path: out, glob: '{docs,errors}/**/*.html' });
    if (added.errors?.length) throw new Error(added.errors.join('\n'));
    const written = await index.writeFiles({ outputPath: resolve(out, 'pagefind') });
    if (written.errors?.length) throw new Error(written.errors.join('\n'));
  } finally { await pagefind.close(); }
  return pages.length + JSON.parse(catalog.content).diagnostics.length + 1;
}

async function buildDiagnostics({ out, shell, manifest, asset }) {
  const catalog = JSON.parse(asset.content);
  if (catalog.schemaVersion !== 2 || !Array.isArray(catalog.diagnostics)) throw new Error('Unsupported diagnostic catalog.');
  await mkdir(resolve(out, 'errors'), { recursive: true });
  await writeFile(resolve(out, 'docs/diagnostics.json'), asset.content);
  await mkdir(resolve(out, 'docs/markdown', posix.dirname(asset.source)), { recursive: true });
  await writeFile(resolve(out, 'docs/markdown', asset.source), asset.content);
  const provenance = `${manifest.packageVersion} · ${manifest.sourceRevision.slice(0, 8)}${manifest.sourceDirty ? ' + local changes' : ''}`;
  const wrap = (body) => `<div class="docs-layout canonical-docs"><aside class="docs-nav"><a class="docs-home" href="/docs/">DOCUMENTATION ↗</a><div id="docs-search"></div><a href="/errors/">Diagnostic codes</a></aside><article class="prose docs-prose" data-pagefind-body><span hidden data-pagefind-filter="Audience">Consumer</span><p class="docs-version">${escapeHtml(provenance)}</p>${body}</article></div>`;
  let index = '# Diagnostic codes\n\n';
  for (const diagnostic of catalog.diagnostics) {
    if (!/^MN[0-9]{4}$/.test(diagnostic.code) || diagnostic.docsAnchor !== `/errors/${diagnostic.code}/`) throw new Error('Invalid diagnostic route.');
    const title = `${diagnostic.code}: ${diagnostic.slug.replaceAll('-', ' ')}`;
    const markdown = `# ${title}\n\nStatus: ${diagnostic.status}\nObjects: ${diagnostic.objects.join(', ')}\nCategory: ${diagnostic.category}\nSeverity: ${diagnostic.severity}\n\n## Remediation\n\n${diagnostic.remediation}\n\n[Diagnostic catalog](/errors/) · [Source identity](/docs/manifest.json)\n`;
    index += `- [${title}](${diagnostic.docsAnchor}): ${diagnostic.status}\n`;
    const page = { source: asset.source, route: `errors/${diagnostic.code}`, title, sha256: asset.sha256, markdown };
    const { html } = renderMarkdown(page, [], manifest);
    await mkdir(resolve(out, 'errors', diagnostic.code), { recursive: true });
    await writeFile(resolve(out, 'errors', `${diagnostic.code}.md`), deriveMarkdown(page, [], manifest));
    await writeFile(resolve(out, 'errors', diagnostic.code, 'index.html'), shell({ title, description: diagnostic.remediation, active: 'docs', route: `/errors/${diagnostic.code}/`, markdown: `/errors/${diagnostic.code}.md`, body: wrap(html) }));
  }
  await writeFile(resolve(out, 'errors/index.md'), deriveMarkdown({ source: asset.source, route: 'errors', title: 'Diagnostic codes', sha256: asset.sha256, markdown: index }, [], manifest));
  const { html } = renderMarkdown({ source: 'docs/diagnostics.md', markdown: index }, [], manifest);
  await writeFile(resolve(out, 'errors/index.html'), shell({ title: 'Diagnostic codes', description: 'Stable diagnostic codes and remediation.', active: 'docs', route: '/errors/', markdown: '/errors/index.md', body: wrap(html) }));
}

export function deriveMarkdown(page, pages, manifest, { sourceUrl = canonicalSourceUrl(page), manifestUrl = '/docs/manifest.json' } = {}) {
  const rewrite = linkResolver(page, pages, manifest, 'markdown');
  let fence;
  const lines = publishedMarkdown(page).split('\n').map(line => {
    const marker = line.match(/^\s*(?:>\s*)?(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      return line;
    }
    if (fence || /^ {4}|^\t/.test(line)) return line;
    const chunks = line.split(/(`+[^`]*`+)/g);
    return chunks.map((chunk, index) => {
      if (index % 2) return chunk;
      return chunk.replace(/(\]\(<?)([^\s)>]+)(>?)(?=[\s)])/g, (_, start, href, end) => `${start}${rewrite(href)}${end}`)
        .replace(/^(\s*\[[^\]]+\]:\s*<?)([^\s>]+)(>?)/, (_, start, href, end) => `${start}${rewrite(href)}${end}`);
    }).join('');
  }).join('\n');
  const title = /^# /m.test(page.markdown) ? '' : `# ${page.title}\n\n`;
  return `<!-- Documentation snapshot: package ${manifest.packageVersion}; channel ${manifest.channel}; base revision ${manifest.sourceRevision}; local changes ${manifest.sourceDirty}; original source SHA-256 ${page.sha256}. -->\n\n${title}${lines}\n\n[Canonical source](${sourceUrl}) · [Source identity](${manifestUrl})\n`;
}
