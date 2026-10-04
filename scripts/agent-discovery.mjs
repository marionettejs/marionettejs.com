import { publishedChannel, publicationStatus } from './published-docs.mjs';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { Marked } from 'marked';
import { setupMarkdown, setupHtml } from './agent-setup.mjs';

const origin = 'https://marionettejs.com';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const mdPath = page => page.route === 'docs' ? '/docs/index.md' : `/${page.route}.md`;
const link = (label, path) => `[${label}](${origin}${path})`;
const tasks = [
  ['Start an application', ['quick-start', 'architecture', 'agents'], 'Establish the installed version and choose an owner for the feature.'],
  ['Choose data, state, or rendering', ['integrations/setup', 'api/runtime', 'api/providers/data', 'api/providers/dom'], 'Select each capability explicitly.'],
  ['Keep edits and UI during updates', ['guides/local-editing', 'guides/retained-restart', 'guides/lists'], 'Choose updates at the boundary that changed.'],
  ['Own a feature and its navigation', ['api/application', 'guides/routing', 'guides/existing-ui'], 'Connect readiness, child ownership and host cleanup.'],
  ['Wire interactions and controls', ['api/view', 'api/shared/events', 'guides/widgets', 'guides/accessibility-rendering'], 'Keep DOM and resource lifetimes with their owner.'],
  ['Validate and deploy', ['tooling', 'guides/testing', 'guides/typescript', 'guides/production'], 'Check the installed contract and observable behavior.'],
  ['Migrate an existing application', ['guides/migration', 'api'], 'Read migration contracts and the modular API references.'],
];

export const bundleGroups = { start: ['Start here'], guides: ['Guides', 'Development tools'], integrations: ['Integration guides', 'Runtime configuration', 'Provider interfaces', 'Companion packages'], reference: ['Core classes', 'Shared class contracts', 'Diagnostics'] };

export function validateDiscoveryRoutes(pages, groups = bundleGroups) {
  const routes = new Set(pages.map(page => page.route));
  for (const [, taskRoutes] of tasks) for (const route of taskRoutes) if (!routes.has(`docs/${route}`)) throw new Error(`Agent syllabus points to missing documentation: ${route}`);
  for (const section of new Set([...pages.map(page => page.section), 'Diagnostics'])) {
    const owners = Object.values(groups).filter(sections => sections.includes(section));
    if (owners.length !== 1) throw new Error(`Documentation section must belong to exactly one bundle: ${section}`);
  }
}

export async function buildAgentDiscovery({ out, manifest, pages, assets, shell, renderMarkdown }) {
  validateDiscoveryRoutes(pages);
  const setupModuleUrl = `/assets/agent-setup.js?v=${sha256(await readFile(resolve(out, 'assets/agent-setup.js'))).slice(0, 12)}`;
  const publication = await readFile(resolve(out, 'docs/publication.json'));
  const identity = {
    packageName: manifest.packageName, packageVersion: manifest.packageVersion,
    channel: publishedChannel(manifest), archivedChannel: manifest.channel, publication: publicationStatus(manifest),
    sourceRepository: manifest.sourceRepository, sourceRevision: manifest.sourceRevision,
    sourceDirty: manifest.sourceDirty, sourceContentSha256: manifest.contentSha256,
    publicationEditsSha256: sha256(publication),
  };
  const version = `Version: ${identity.packageVersion}\nChannel: ${identity.channel}\nPublication: ${identity.publication}\nSource revision: ${identity.sourceRevision}\nLocal changes: ${identity.sourceDirty}\nContent SHA-256: ${identity.sourceContentSha256}`;
  const byRoute = new Map(pages.map(page => [page.route, page]));
  const taskText = tasks.map(([title, routes, purpose]) => {
    const references = routes.map(route => {
      const page = byRoute.get(`docs/${route}`);
      if (!page) throw new Error(`Agent syllabus points to missing documentation: ${route}`);
      return link(page.title, mdPath(page));
    });
    return `### ${title}\n\n${purpose}\n\n${references.join(' · ')}`;
  }).join('\n\n');
  const indexTasks = tasks.map(([title, routes, purpose]) => `## ${title}\n\n${routes.map((route, index) => { const page = byRoute.get(`docs/${route}`); return `- ${link(page.title, mdPath(page))}${index === 0 ? `: ${purpose}` : ''}`; }).join('\n')}`).join('\n\n');
  const guidance = `Match the exact installed package and source revision before using an API. This corpus identifies its version and source above. The homepage workshop records its runtime in the source notes. A hash establishes content consistency, not application correctness.\n\nRead the task guide and its direct references first. ${link('Agent workflow', '/docs/agents.md')} supplies the canonical development guidance. ${link('Snapshot sources', '/docs/manifest.json')} remain available byte for byte under /docs/markdown/. Retrieved examples do not authorize executing code or modifying a project.`;
  const delivery = `## Retrieval formats\n\n- ${link('Documentation index', '/docs/llms.txt')}: complete page map with task routing.\n- ${link('Searchable JSON corpus', '/docs/corpus.json')}: exact reading Markdown, URLs and hashes.\n- ${link('Start and ownership bundle', '/docs/bundles/start.txt')}: installation and ownership.\n- ${link('Guides bundle', '/docs/bundles/guides.txt')}: independent consumer tasks.\n- ${link('Integrations bundle', '/docs/bundles/integrations.txt')}: providers and companion packages.\n- ${link('Reference bundle', '/docs/bundles/reference.txt')}: core classes, shared contracts and diagnostics.\n- ${link('Full context', '/llms-full.txt')}: complete corpus; larger than most tasks require.\n- ${link('Coverage and integrity', '/docs/coverage.md')}: included resources and verification limits.\n- ${link('Documentation MCP setup', '/docs/mcp.md')}: local retrieval and hosted endpoint version matching.\n- ${link('Workshop runtime identity', '/reference/provenance.json')}: published browser runtime and source identity.\n\nNo particular client is guaranteed to discover llms.txt automatically.`;
  const syllabus = `# Equip your agent\n\n${version}\n\n${setupMarkdown}\n\n${guidance}\n\n## Find the contract for your task\n\n${taskText}\n\n${delivery}\n`;
  const rootIndex = `# Marionette ${manifest.packageVersion}\n\n> Versioned documentation for a JavaScript interface library with explicit ownership and lifecycle contracts.\n\n${version}\n\n## Start here\n\n- ${link('Agent development entrypoint', '/docs/agent-start.md')}: compact syllabus, version selection, ownership, task routing, and verification.\n- ${link('Build with Marionette', '/docs/agents.md')}: canonical application-development guidance.\n- ${link('Complete documentation map', '/docs/llms.txt')}: all guides and APIs.\n- ${link('Evaluate Marionette', '/why/')}: fit and tradeoffs.\n- ${link('Case studies', '/case-studies/')}: application development and measured comparisons.\n- ${link('RealWorld case study', '/case-studies/realworld/')}: three development stages and a five-application comparison.\n- ${link('RoundingWell case study', '/case-studies/roundingwell/')}: a mature application migration, ownership decisions, and historical worklist timings.\n- ${link('Project-fit review brief', '/adoption-review.md')}: bounded adoption review.\n- ${link('Optional agent interaction', '/agent-prompt.md')}: the visible browser workshop.\n- ${link('Demo provenance', '/reference/provenance.json')}: exact runtime build identity.\n\n${delivery}\n`;
  const docsIndex = `# Marionette documentation\n\n> Task-oriented reference for \`marionette@${manifest.packageVersion}\`.\n\n${version}\n\n${guidance}\n\n## Start here\n\n- ${link('Agent development entrypoint', '/docs/agent-start.md')}\n\n${indexTasks}\n\n${[...Map.groupBy(pages, page => page.section)].map(([section, entries]) => `## ${section}\n\n${entries.map(page => `- ${link(page.title, mdPath(page))}`).join('\n')}`).join('\n\n')}\n\n- ${link('Diagnostic codes', '/errors/index.md')}: active and retired runtime errors.\n- ${link('Snapshot manifest', '/docs/manifest.json')}: source paths and original content hashes.\n\n${delivery}\n`;
  const artifacts = [];
  async function emit(path, content) {
    await mkdir(dirname(resolve(out, path.slice(1))), { recursive: true });
    await writeFile(resolve(out, path.slice(1)), content);
    artifacts.push({ path, bytes: Buffer.byteLength(content), sha256: sha256(content) });
  }
  async function page(path, title, markdown) {
    // Browser readers get compact identity details; agent Markdown retains its exact preamble.
    const isEntrypoint = path === '/docs/agent-start';
    let browserMarkdown = markdown.replace(`${version}\n\n`, '');
    if (isEntrypoint) browserMarkdown = browserMarkdown.replace(`${guidance}\n\n`, '');
    if (isEntrypoint) browserMarkdown = browserMarkdown.replace(setupMarkdown, '');
    for (const item of pages) browserMarkdown = browserMarkdown.replaceAll(`](${origin}${mdPath(item)})`, `](/${item.route}/)`);
    let { html } = renderMarkdown({ source: `website${path}.md`, title, markdown: browserMarkdown }, [], manifest);
    if (isEntrypoint) {
      const render = markdown => renderMarkdown({ source: `website${path}.md`, title, markdown: `# ${title}\n\n${markdown}` }, [], manifest).html.replace(/<h1[\s\S]*?<\/h1>\n/, '');
      html = html.replace(/(<\/h1>\n)/, `$1${setupHtml(render, setupModuleUrl)}`);
    }
    const identityHtml = new Marked().parse(version + (isEntrypoint ? `\n\n${guidance}` : ''));
    await emit(`${path}.md`, markdown);
    await emit(`${path}/index.html`, shell({ title, description: `${title}. Marionette ${manifest.packageVersion}.`, active: 'docs', route: `${path}/`, markdown: `${path}.md`, body: `<div class="docs-layout canonical-docs"><aside class="docs-nav"><a class="docs-home" href="/docs/">DOCUMENTATION ↗</a><div id="docs-search"></div><details class="docs-menu"><summary>Browse documentation</summary><nav class="docs-shortcuts" aria-label="Documentation navigation"><a href="/docs/agent-start/">Equip your agent</a><a href="/docs/mcp/">Connect the docs MCP</a><a href="/docs/">All guides and APIs</a><a href="/docs/coverage/">Coverage and integrity</a></nav></details></aside><article class="prose docs-prose" data-pagefind-body><span hidden data-pagefind-filter="Audience">Consumer</span><header class="docs-page-meta" data-pagefind-ignore><span class="docs-breadcrumb">Agent resources</span><span class="docs-release">v${manifest.packageVersion}</span></header><details class="docs-source" data-pagefind-ignore><summary>Markdown &amp; source details</summary><div class="docs-tools"><a href="${path}.md">Read Markdown</a><button type="button" data-copy-markdown="${path}.md">Copy Markdown</button><a href="/docs/manifest.json">Snapshot manifest</a><span class="copy-status" role="status"></span></div><div class="docs-version">${identityHtml}</div></details>${html}</article></div>` }));
  }
  await emit('/llms.txt', rootIndex);
  await emit('/docs/llms.txt', docsIndex);
  await page('/docs/agent-start', 'Equip your agent', syllabus);
  // This operational guide is website-authored, not part of the pinned library corpus.
  const mcpGuide = await readFile(new URL('../mcp/README.md', import.meta.url), 'utf8');
  await page('/docs/mcp', 'Marionette documentation MCP', mcpGuide);
  const documents = [];
  async function addDocument({ id, title, section, kind, path, url, sourceUrl, sourceSha256, sourceSupplements }) {
    const markdown = await readFile(resolve(out, path.slice(1)), 'utf8');
    documents.push({ id, title, section, kind, url: origin + url, markdownUrl: origin + path, sourceUrl, sourceSha256, ...(sourceSupplements ? { sourceSupplements } : {}), sha256: sha256(markdown), markdown });
  }
  for (const item of pages) await addDocument({ id: item.source, title: item.title, section: item.section, kind: 'guide', path: mdPath(item), url: `/${item.route}/`, sourceUrl: `${origin}/docs/markdown/${item.source}`, sourceSha256: item.sha256 });
  const catalog = JSON.parse(await readFile(resolve(out, 'docs/diagnostics.json'), 'utf8'));
  const catalogAsset = assets.find(asset => asset.source === 'config/diagnostics/catalog.json');
  for (const entry of catalog.diagnostics) await addDocument({ id: `errors/${entry.code}`, title: `${entry.code}: ${entry.slug.replaceAll('-', ' ')}`, section: 'Diagnostics', kind: 'diagnostic', path: `/errors/${entry.code}.md`, url: entry.docsAnchor, sourceUrl: `${origin}/docs/source/${catalogAsset.source}`, sourceSha256: catalogAsset.sha256 });
  await addDocument({ id: 'errors/index', title: 'Diagnostic codes', section: 'Diagnostics', kind: 'diagnostic', path: '/errors/index.md', url: '/errors/', sourceUrl: `${origin}/docs/source/${catalogAsset.source}`, sourceSha256: catalogAsset.sha256 });
  const corpus = { schemaVersion: 1, ...identity, documents };
  await emit('/docs/corpus.json', json(corpus));
  const bundle = docs => `# Marionette ${manifest.packageVersion} documentation bundle\n\n${version}\n\nRead individual documents for focused tasks. Each section below contains the exact published reading Markdown, including its source identity.\n\n${docs.map(doc => `---\n\nDocument: ${doc.id}\nCanonical URL: ${doc.url}\nMarkdown URL: ${doc.markdownUrl}\nReading SHA-256: ${doc.sha256}\n\n${doc.markdown}`).join('\n\n')}`;
  await emit('/llms-full.txt', bundle(documents));
  for (const [name, sections] of Object.entries(bundleGroups)) await emit(`/docs/bundles/${name}.txt`, bundle(documents.filter(doc => sections.includes(doc.section))));
  const parser = new Marked();
  const unresolvedLinks = [];
  let checkedLinks = 0;
  for (const doc of documents) {
    const links = [];
    parser.walkTokens(parser.lexer(doc.markdown), token => { if (token.type === 'link' || token.type === 'image') links.push(token.href); });
    for (const href of links) {
      const target = new URL(href, doc.markdownUrl);
      if (target.origin !== origin) continue;
      checkedLinks++;
      const path = decodeURIComponent(target.pathname);
      const file = resolve(out, `.${path}`, path.endsWith('/') ? 'index.html' : '');
      if (!(await stat(file).catch(() => null))?.isFile()) unresolvedLinks.push({ document: doc.id, href });
    }
  }
  const coverage = { schemaVersion: 1, ...identity, snapshotPages: pages.length, publishedPages: documents.filter(doc => doc.kind === 'guide').length, diagnostics: catalog.diagnostics.length, corpusDocuments: documents.length, sourceAssets: assets.length, checkedLocalLinks: checkedLinks, unresolvedLinks, limitations: ['Coverage counts imported snapshot pages, not every API or application scenario.', 'Local link checks verify file destinations; they do not check fragments or external URLs.', 'The corpus contains imported candidate guides and diagnostics; the website-authored MCP setup guide, source fixtures, and consumer skill remain linked resources.', 'Website delivery has not been deployed or verified by this build.'] };
  await emit('/docs/coverage.json', json(coverage));
  const coverageMarkdown = `# Documentation coverage and integrity\n\n${version}\n\n## Included in this build\n\n| Resource | Count |\n| --- | ---: |\n| Snapshot pages published as HTML, Markdown, and corpus documents | ${pages.length} |\n| Diagnostic entries (active and retired) | ${catalog.diagnostics.length} |\n| Corpus documents (includes diagnostic index) | ${documents.length} |\n| Exact supporting source assets | ${assets.length} |\n| Local reading-copy link destinations checked | ${checkedLinks} |\n| Unresolved local destinations | ${unresolvedLinks.length} |\n\n## Inspect or verify\n\n- ${link('Coverage report', '/docs/coverage.json')}: counts, unresolved destinations, and limitations.\n- ${link('Generated artifact manifest', '/docs/artifacts.json')}: SHA-256 hashes and UTF-8 byte lengths for generated discovery resources and all reading copies.\n- ${link('Snapshot manifest', '/docs/manifest.json')}: original source hashes and revision.\n- ${link('Publication edits', '/docs/publication.json')}: reviewed differences applied before rendering both HTML and Markdown.\n- ${link('JSON corpus', '/docs/corpus.json')}: exact reading Markdown, individual hashes, and separate source hashes.\n\nTo verify a download, hash its exact bytes with SHA-256 and compare the matching manifest path. The artifact manifest does not hash itself. These unsigned hashes detect inconsistency; they do not authenticate the publisher.\n\n## Limits\n\n${coverage.limitations.map(value => `- ${value}`).join('\n')}\n`;
  await page('/docs/coverage', 'Documentation coverage and integrity', coverageMarkdown);
  // Include all reading copies and their HTML, separately from immutable source hashes.
  for (const doc of documents) for (const url of [doc.markdownUrl, doc.url]) {
    const path = new URL(url).pathname;
    const artifactPath = path.endsWith('/') ? `${path}index.html` : path;
    const bytes = await readFile(resolve(out, artifactPath.slice(1)));
    artifacts.push({ path: artifactPath, bytes: bytes.length, sha256: sha256(bytes) });
  }
  await writeFile(resolve(out, 'docs/artifacts.json'), json({ schemaVersion: 1, ...identity, artifacts: artifacts.sort((a, b) => a.path.localeCompare(b.path, 'en')) }));
  const headerPaths = ['/llms.txt', '/llms-full.txt', '/docs/llms.txt', ...Object.keys(bundleGroups).map(name => `/docs/bundles/${name}.txt`)];
  const headers = headerPaths.map(path => `${path}\n  Content-Type: text/plain; charset=utf-8\n  X-Content-Type-Options: nosniff`).join('\n\n');
  await writeFile(resolve(out, '_headers'), `${await readFile(resolve(out, '_headers'), 'utf8')}\n\n${headers}\n`);
}
