import Ajv from 'ajv';
import { headingId } from './heading-ids.mjs';
import { buildAgentDiscovery } from './agent-discovery.mjs';
import { publishedMarkdown, publishedTitles, publishedChannel, publicationStatus, readingRevision } from './published-docs.mjs';
import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, posix, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked, Renderer, Lexer } from 'marked';
import * as pagefind from 'pagefind';

const hash = value => createHash('sha256').update(value).digest('hex');
export const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const safePath = value => typeof value === 'string' && /^[a-zA-Z0-9._/-]+$/.test(value) && !value.startsWith('/') && !value.split('/').some(part => part === '..' || part === '.' || !part);

export async function readSnapshot(directory) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.pages) || !manifest.pages.length || !/^[a-f0-9]{40}$/.test(manifest.sourceRevision) || typeof manifest.sourceDirty !== 'boolean' || manifest.channel !== 'latest' || manifest.packageName !== 'marionette' || typeof manifest.packageVersion !== 'string' || manifest.sourceRepository !== 'https://github.com/marionettejs/marionette') throw new Error('Unsupported documentation manifest.');
  const base = await realpath(directory);
  const readSource = async source => {
    const path = await realpath(resolve(base, source));
    const local = relative(base, path);
    if (local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) throw new Error('Documentation source escapes snapshot.');
    return readFile(path, 'utf8');
  };
  const routes = new Set();
  const sources = new Set();
  const pages = [];
  for (const page of manifest.pages) {
    if (!safePath(page.source) || !page.source.endsWith('.md') || !safePath(page.route) || !(page.route === 'docs' || page.route.startsWith('docs/')) || routes.has(page.route) || sources.has(page.source) || typeof page.title !== 'string' || typeof page.section !== 'string') throw new Error(`Invalid or duplicate documentation page: ${page.source}`);
    const markdown = await readSource(page.source);
    if (hash(markdown) !== page.sha256) throw new Error(`Documentation hash mismatch: ${page.source}`);
    routes.add(page.route); sources.add(page.source);
    pages.push({ ...page, markdown });
  }
  const assets = [];
  if (!Array.isArray(manifest.assets)) throw new Error('Documentation snapshot assets are required.');
  // Only canonical consumer skill, diagnostics, lookup indexes, and packaged example sources are served.
  for (const asset of manifest.assets) {
    const supported = /^(?:config\/diagnostics\/catalog(?:\.schema)?\.json|docs-(?:sections|symbols)\.json|skills\/marionette\/(?:SKILL\.md|agents\/openai\.yaml|scripts\/(?:docs|search|symbols)\.mjs)|examples\/records\/[a-zA-Z0-9._/-]+\.(?:md|json|m?js|html|css))$/.test(asset.source);
    if (!safePath(asset.source) || !supported || sources.has(asset.source)) throw new Error('Unsupported documentation asset.');
    const content = await readSource(asset.source);
    if (hash(content) !== asset.sha256) throw new Error(`Documentation hash mismatch: ${asset.source}`);
    assets.push({ ...asset, content }); sources.add(asset.source);
  }
  if (!assets.some(asset => asset.source === 'config/diagnostics/catalog.json')) throw new Error('Expected diagnostic catalog asset.');
  for (const source of ['docs/agents.md', 'docs/quick-start.md', 'docs/architecture.md', 'docs/tooling.md', 'docs/api/errors.md']) {
    if (!sources.has(source)) throw new Error(`Expected consumer documentation page: ${source}`);
  }
  if (!assets.some(asset => asset.source === 'config/diagnostics/catalog.schema.json')) throw new Error('Expected diagnostic schema asset.');
  const digest = hash([...pages, ...assets].sort((a, b) => a.source.localeCompare(b.source, 'en')).map(page => `${page.source}\0${page.sha256}\n`).join(''));
  if (digest !== manifest.contentSha256) throw new Error('Documentation snapshot digest mismatch.');
  if (!routes.has('docs')) throw new Error('Documentation snapshot has no landing page.');
  return { manifest, pages, assets };
}

// Additional reviewed guides are independent of the immutable npm archive.
export async function readSupplementalPages(directory, archivedPages) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.pages) || !manifest.pages.length) throw new Error('Unsupported supplemental documentation manifest.');
  const routes = new Set(archivedPages.map(page => page.route));
  const sources = new Set(archivedPages.map(page => page.source));
  const base = await realpath(directory);
  const pages = [];
  for (const page of manifest.pages) {
    if (!safePath(page.source) || !page.source.startsWith('docs/') || !page.source.endsWith('.md') ||
        !safePath(page.route) || !page.route.startsWith('docs/') || sources.has(page.source) || routes.has(page.route) ||
        typeof page.title !== 'string' || typeof page.section !== 'string' || !/^[a-f0-9]{40}$/.test(page.sourceRevision)) throw new Error('Invalid supplemental documentation page.');
    const path = await realpath(resolve(base, page.source));
    const local = relative(base, path);
    if (local.startsWith(`..${sep}`) || local === '..' || isAbsolute(local)) throw new Error('Supplemental source escapes snapshot.');
    const markdown = await readFile(path, 'utf8');
    if (hash(markdown) !== page.sha256) throw new Error(`Supplemental documentation hash mismatch: ${page.source}`);
    pages.push({ ...page, markdown });
    routes.add(page.route); sources.add(page.source);
  }
  return pages;
}

export const supplementalManifestBytes = pages => `${JSON.stringify({ schemaVersion: 1, pages: pages.map(({ markdown, ...page }) => page) }, null, 2)}\n`;
const pageManifestUrl = page => page.sourceRevision ? '/docs/supplemental-manifest.json' : '/docs/manifest.json';

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
    if (github && /^[a-f0-9]{40}$/.test(github[1])) return href;
    if (/^[a-z]+:|^\/\//i.test(href) && !github) return href;
    if (href.startsWith('/')) {
      if (format === 'markdown' && /^\/errors\/(?:MN[0-9]{4}\/)?$/.test(href)) return href === '/errors/' ? '/errors/index.md' : href.slice(0, -1) + '.md';
      return href;
    }
    const [pathname, fragment] = (github ? github[2] : href).split('#');
    const source = github ? pathname : posix.normalize(posix.join(posix.dirname(page.source), pathname));
    const target = bySource.get(source);
    return `${target ? (format === 'markdown' ? markdownUrl(target) : pageUrl(target)) : resources.has(source) ? `/docs/source/${source}` : githubUrl({ ...manifest, sourceRevision: readingRevision(page, manifest) }, source)}${fragment ? `#${fragment}` : ''}`;
  };
}

function diagnosticHref(href, tokens = []) {
  const label = tokens.length === 1 && tokens[0].type === 'codespan' ? tokens[0].text : '';
  return href === 'diagnostic-catalog.md#look-up-a-code' && /^MN[0-9]{4}$/.test(label) ? `/errors/${label}/` : href;
}

export function renderMarkdown(page, pages, manifest) {
  const headings = [];
  const used = new Map();
  const renderer = new Renderer();
  renderer.html = ({ text }) => /^\s*<!--[\s\S]*-->\s*$/.test(text) ? '' : escapeHtml(text);
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = headingId(text, used);
    headings.push({ depth, id, text });
    return `<h${depth} id="${escapeHtml(id)}">${text}<a class="heading-anchor" data-pagefind-ignore href="#${escapeHtml(id)}" aria-label="Link to ${escapeHtml(text.replace(/<[^>]*>/g, ''))}">#</a></h${depth}>\n`;
  };
  const rewrite = linkResolver(page, pages, manifest);
  renderer.link = function ({ href, title, tokens }) {
    return `<a href="${escapeHtml(rewrite(diagnosticHref(href, tokens)))}"${title ? ` title="${escapeHtml(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
  };
  renderer.image = ({ href, title, text }) => `<img src="${escapeHtml(rewrite(href))}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy">`;
  const parser = new Marked({ renderer });
  let html = parser.parse(publishedMarkdown(page));
  if (!headings.some(heading => heading.depth === 1)) html = `<h1>${escapeHtml(page.title)}</h1>\n${html}`;
  return { html, headings };
}

function sidebar(page, pages) {
  const groups = Map.groupBy(pages, item => item.section);
  return `<aside class="docs-nav" aria-label="Documentation navigation"><a class="docs-home" href="/docs/">DOCUMENTATION <span>↗</span></a><div id="docs-search"></div><noscript><p class="docs-js-note">Browse the contents below. Search requires JavaScript.</p></noscript><details class="docs-menu"><summary>Browse documentation</summary><nav class="docs-shortcuts" aria-label="Start here"><a href="/docs/agent-start/">Equip your agent</a><a href="/docs/mcp/">Connect the docs MCP</a><a href="/docs/quick-start/">Install and render</a><a href="/docs/tooling/">Check and debug</a></nav>${[...groups].map(([section, entries]) => `<details class="docs-group" open><summary>${escapeHtml(section)}</summary>${entries.map(item => `<a href="${pageUrl(item)}" ${item.source === page.source ? 'aria-current="page"' : ''}>${escapeHtml(item.title)}</a>`).join('')}</details>`).join('')}</details></aside>`;
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
  const { manifest, pages: archivedPages, assets } = await readSnapshot(directory);
  const supplementalPages = await readSupplementalPages(fileURLToPath(new URL('../content/supplemental-docs/', import.meta.url)), archivedPages);
  const pages = publishedTitles([...archivedPages, ...supplementalPages]);
  for (const page of pages) {
    const { html, headings } = renderMarkdown(page, pages, manifest);
    const provenance = `${manifest.packageVersion} · ${publicationStatus(manifest)} · ${manifest.sourceRevision.slice(0, 8)}${manifest.sourceDirty ? ' + local changes' : ''}`;
    const sectionLinks = headings.filter(item => item.depth === 2).map(item => `<a href="#${escapeHtml(item.id)}">${item.text.replace(/<[^>]*>/g, '')}</a>`).join('');
    const body = `<div class="docs-layout canonical-docs">${sidebar(page, pages)}<article class="prose docs-prose" data-pagefind-body><header class="docs-page-meta" data-pagefind-ignore><span class="docs-breadcrumb">${escapeHtml(page.section)}</span><span class="docs-release">v${escapeHtml(manifest.packageVersion)}</span></header><details class="docs-source" data-pagefind-ignore><summary>Markdown &amp; source details</summary><div class="docs-tools"><a href="${markdownUrl(page)}">Read Markdown</a><button type="button" data-copy-markdown="${markdownUrl(page)}">Copy Markdown</button><a href="${canonicalSourceUrl(page)}">Canonical source</a><a href="${pageManifestUrl(page)}">Snapshot manifest</a><span class="copy-status" role="status"></span></div><p class="docs-version">${escapeHtml(provenance)} snapshot. Reading source: ${readingRevision(page, manifest)}. Match APIs to your installed version.</p></details>${sectionLinks ? `<details class="docs-page-index" data-pagefind-ignore><summary>On this page</summary><nav aria-label="On this page">${sectionLinks}</nav></details>` : ''}<span hidden data-pagefind-filter="Audience">Consumer</span>${html}${adjacentPages(page, pages)}</article><aside class="docs-margin"><nav aria-label="On this page"><p class="eyebrow">ON THIS PAGE</p>${sectionLinks}</nav><div class="docs-note"><p>The homepage demo and workshops identify their runtime in the source notes.</p><a href="/reference/provenance.json">Demo source notes ↗</a></div></aside></div>`;
    const rendered = shell({ title: page.title, description: `${page.title}. Marionette ${manifest.packageVersion} documentation.`, active: 'docs', body, route: `/${page.route}/`, markdown: markdownUrl(page) });
    await mkdir(resolve(out, page.route), { recursive: true });
    await writeFile(resolve(out, page.route, 'index.html'), rendered);
    await mkdir(resolve(out, 'docs/markdown', posix.dirname(page.source)), { recursive: true });
    await writeFile(resolve(out, 'docs/markdown', page.source), page.markdown);
    await writeFile(resolve(out, markdownUrl(page).slice(1)), deriveMarkdown(page, pages, manifest));
  }
  await writeFile(resolve(out, 'docs/publication.json'), await readFile(new URL('../content/docs-publication-edits.json', import.meta.url)));
  await writeFile(resolve(out, 'docs/supplemental-manifest.json'), supplementalManifestBytes(supplementalPages));
  await writeFile(resolve(out, 'docs/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const asset of assets) {
    const destination = resolve(out, 'docs/source', asset.source);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, asset.content);
  }
  const schema = assets.find(asset => asset.source === 'config/diagnostics/catalog.schema.json');
  const schemaSource = { sourceRepository: manifest.sourceRepository, sourceRevision: manifest.sourceRevision, sourceDirty: manifest.sourceDirty, sha256: schema.sha256 };
  for (const path of ['docs/catalog.schema.json', 'docs/source/config/diagnostics/catalog.schema.json', 'docs/markdown/config/diagnostics/catalog.schema.json']) {
    const destination = resolve(out, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, schema.content);
  }
  await writeFile(resolve(out, 'docs/schema-provenance.json'), `${JSON.stringify(schemaSource, null, 2)}\n`);
  const catalog = assets.find(asset => asset.source === 'config/diagnostics/catalog.json');
  await buildDiagnostics({ out, shell, manifest, asset: catalog,
    schema: JSON.parse(assets.find(asset => asset.source === 'config/diagnostics/catalog.schema.json').content),
    sectionIds: new Set(JSON.parse(assets.find(asset => asset.source === 'docs-sections.json').content).sections.map(section => section.id)) });
  await buildAgentDiscovery({ out, manifest, pages, assets, shell, renderMarkdown });
  const searchUrls = [...pages.map(page => `/${page.route}/`),
    ...JSON.parse(catalog.content).diagnostics.map(diagnostic => diagnostic.docsAnchor),
    '/errors/', '/docs/agent-start/', '/docs/coverage/', '/docs/mcp/'];
  const { index } = await pagefind.createIndex();
  try {
    for (const url of searchUrls) {
      const added = await index.addHTMLFile({ url, content: await readFile(resolve(out, '.' + url, 'index.html'), 'utf8') });
      if (added.errors?.length) throw new Error(added.errors.join('\n'));
      if (added.file?.url !== url || !added.file.uniqueWords) throw new Error(`Documentation page was not indexed: ${url}`);
    }
    const written = await index.writeFiles({ outputPath: resolve(out, 'pagefind') });
    if (written.errors?.length) throw new Error(written.errors.join('\n'));
  } finally { await pagefind.close(); }
  await verifySearchIndex(resolve(out, 'pagefind'), searchUrls.length);
  return pages.length + JSON.parse(catalog.content).diagnostics.length + 4;
}

export async function verifySearchIndex(directory, expectedPages) {
  try {
    const metadata = JSON.parse(await readFile(resolve(directory, 'pagefind-entry.json'), 'utf8'));
    const english = metadata.languages?.en;
    if (!Number.isInteger(english?.page_count) || english.page_count !== expectedPages || !/^en_[a-f0-9]+$/.test(english.hash)) throw new Error('English index differs from the expected generated pages.');
    if (!(await readFile(resolve(directory, `pagefind.${english.hash}.pf_meta`))).length) throw new Error('Referenced English metadata is empty.');
  } catch (error) {
    throw new Error('Generated documentation search metadata is invalid.', { cause: error });
  }
}

// Schema 2 belongs to the currently served rc.2 archive; keep it until that archive is retired.
export function validateDiagnostics(catalog, schema, sectionIds = new Set()) {
  if (![2, 3].includes(catalog?.schemaVersion) || !Array.isArray(catalog.diagnostics) || !catalog.diagnostics.length) {
    throw new Error('Unsupported or incomplete diagnostic catalog.');
  }
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  if (!validate(catalog)) throw new Error(`Invalid diagnostic catalog: ${ajv.errorsText(validate.errors)}`);
  const codes = new Set();
  const slugs = new Set();
  for (const diagnostic of catalog.diagnostics) {
    if (codes.has(diagnostic.code) || slugs.has(diagnostic.slug) || diagnostic.docsAnchor !== `/errors/${diagnostic.code}/`) {
      throw new Error('Invalid diagnostic catalog: duplicate identity or mismatched route.');
    }
    if (catalog.schemaVersion === 3 && (diagnostic.docsSection !== `docs/api/errors.md#${diagnostic.code.toLowerCase()}` ||
        !sectionIds.has(diagnostic.docsSection))) {
      throw new Error('Invalid packaged diagnostic section.');
    }
    codes.add(diagnostic.code);
    slugs.add(diagnostic.slug);
  }
  for (const diagnostic of catalog.diagnostics) {
    if (diagnostic.status === 'deprecated' && (diagnostic.replacementCode === diagnostic.code || !codes.has(diagnostic.replacementCode))) {
      throw new Error('Invalid diagnostic replacement code.');
    }
  }
  return catalog.diagnostics;
}

async function buildDiagnostics({ out, shell, manifest, asset, schema, sectionIds }) {
  const catalog = JSON.parse(asset.content);
  validateDiagnostics(catalog, schema, sectionIds);
  await mkdir(resolve(out, 'errors'), { recursive: true });
  await writeFile(resolve(out, 'docs/diagnostics.json'), asset.content);
  await mkdir(resolve(out, 'docs/markdown', posix.dirname(asset.source)), { recursive: true });
  await writeFile(resolve(out, 'docs/markdown', asset.source), asset.content);
  const provenance = `${manifest.packageVersion} · ${manifest.sourceRevision.slice(0, 8)}${manifest.sourceDirty ? ' + local changes' : ''}`;
  const wrap = (body) => `<div class="docs-layout canonical-docs"><aside class="docs-nav"><a class="docs-home" href="/docs/">DOCUMENTATION ↗</a><div id="docs-search"></div><a href="/errors/">Diagnostic codes</a></aside><article class="prose docs-prose" data-pagefind-body><span hidden data-pagefind-filter="Audience">Consumer</span><p class="docs-version">${escapeHtml(provenance)}</p>${body}</article></div>`;
  let index = '# Diagnostic codes\n\n';
  const referenceSources = { Radio: 'docs/packages/radio.md', StateApi: 'docs/api/providers/data.md' };
  for (const diagnostic of catalog.diagnostics) {
    const title = `${diagnostic.code}: ${diagnostic.slug.replaceAll('-', ' ')}`;
    const references = diagnostic.objects.map(name => manifest.pages.find(page =>
      referenceSources[name] ? page.source === referenceSources[name] : page.title === name))
      .filter(Boolean).map(page => `[${page.title}](/${page.route}/)`).join(' · ');
    const markdown = `# ${title}\n\nStatus: ${diagnostic.status}\nReported by: ${diagnostic.surfaces.join(', ')}\nObjects: ${diagnostic.objects.join(', ')}\nCategory: ${diagnostic.category}\nSeverity: ${diagnostic.severity}\n\n## Remediation\n\n${diagnostic.remediation}\n\n${references}\n\n[Check and debug an application](/docs/tooling/)\n\n[Diagnostic catalog](/errors/) · [Source identity](/docs/manifest.json)\n`;
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

// Preserve raw formatting and code spans while changing only parsed link targets.
function rewriteInlineLinks(tokens, rewrite) {
  return tokens.map(token => {
    if (token.type === 'link' || token.type === 'image') {
      return token.raw.replace(/(\]\(<?)([^\s)>]+)(>?)(?=[\s)])/,
        (_, start, href, end) => `${start}${rewrite(diagnosticHref(href, token.tokens))}${end}`);
    }
    if (token.tokens?.length) {
      const raw = token.tokens.map(child => child.raw).join('');
      return token.raw.replace(raw, () => rewriteInlineLinks(token.tokens, rewrite));
    }
    if (token.type === 'text') {
      return token.raw.replace(/^(\s*\[[^\]]+\]:\s*<?)([^\s>]+)(>?)/gm,
        (_, start, href, end) => `${start}${rewrite(href)}${end}`);
    }
    return token.raw;
  }).join('');
}

export function deriveMarkdown(page, pages, manifest, { sourceUrl = canonicalSourceUrl(page), manifestUrl = pageManifestUrl(page) } = {}) {
  const rewrite = linkResolver(page, pages, manifest, 'markdown');
  let fence;
  let pending = [];
  const chunks = [];
  const flush = () => {
    if (pending.length) chunks.push(rewriteInlineLinks(Lexer.lexInline(pending.join('\n')), rewrite));
    pending = [];
  };
  for (const line of publishedMarkdown(page).split('\n')) {
    const marker = line.match(/^\s*(?:>\s*)?(`{3,}|~{3,})/);
    if (marker || fence || /^ {4}|^\t/.test(line)) {
      flush();
      chunks.push(line);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      }
    } else pending.push(line);
  }
  flush();
  const lines = chunks.join('\n');
  const title = /^# /m.test(page.markdown) ? '' : `# ${page.title}\n\n`;
  return `<!-- Documentation snapshot: package ${manifest.packageVersion}; channel ${publishedChannel(manifest)}; archived channel ${manifest.channel}; base revision ${page.sourceRevision || manifest.sourceRevision}; local changes ${manifest.sourceDirty}; original source SHA-256 ${page.sha256}; reading source revision ${readingRevision(page, manifest)}; publication edits /docs/publication.json. -->\n\n${title}${lines}\n\n[Canonical source](${sourceUrl}) · [Source identity](${manifestUrl})\n`;
}
