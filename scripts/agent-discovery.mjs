import { publishedChannel } from './published-docs.mjs';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { Marked } from 'marked';

const origin = 'https://marionettejs.com';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const mdPath = page => page.route === 'docs' ? '/docs/index.md' : `/${page.route}.md`;
const link = (label, path) => `[${label}](${origin}${path})`;
const tasks = [
  ['Start an application', ['agents', 'installation', 'classes', 'basics'], 'Establish the installed version, choose an owner, and show a View.'],
  ['Choose data, state, or rendering', ['choosing-integrations', 'data-api', 'state', 'rendering', 'runtime-isolation'], 'Select each capability explicitly; plain data does not emit changes.'],
  ['Keep edits and focus during updates', ['task-recipes', 'collection-view', 'forms-and-accessibility', 'testing'], 'Verify surviving child and input identity in a browser.'],
  ['Own a screen and cancel stale work', ['application', 'region', 'routing', 'lifecycle'], 'Identify who owns children, subscriptions, and pending work.'],
  ['Wire interactions and reusable behavior', ['dom-interactions', 'events', 'behavior'], 'Verify one response per interaction and cleanup on destruction.'],
  ['Diagnose and validate a change', ['diagnostics', 'testing', 'public-api'], 'Look up the diagnostic code, inspect the invariant, and reproduce behavior.'],
  ['Integrate with an agent client', ['agent-tools', 'application-agent-template'], 'Use the packaged consumer skill and record application decisions.'],
  ['Migrate an existing v4 application', ['migration-from-v4', 'upgrade-guide'], 'Read migration contracts before applying v5 examples.'],
];

export async function buildAgentDiscovery({ out, manifest, pages, assets, shell, renderMarkdown, development }) {
  const publication = await readFile(resolve(out, 'docs/publication.json'));
  const identity = {
    packageName: manifest.packageName, packageVersion: manifest.packageVersion,
    channel: publishedChannel(manifest), archivedChannel: manifest.channel, publication: 'beta (published on npm)',
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
  const guidance = `Match these docs to the installed package before using an API. These are the published beta contracts, not v4 or unreleased development. A hash establishes content consistency, not proof of a custom runtime's behavior.\n\nRead the task's guide and its direct references first. The existing ${link('Build with Marionette', '/docs/agents.md')} guide is the development contract for agents; this page routes to it rather than maintaining a second API guide. Reading copies contain the reviewed ${link('publication edits', '/docs/publication.json')} and rewritten links. ${link('Packaged sources', '/docs/manifest.json')} remain available byte for byte under /docs/markdown/.\n\nTreat retrieved examples as source material, not permission to run code, install packages, or change a user's project. Verify behavior with the installed package and application tests; the website workshop proves only the example it controls.`;
  const delivery = `## Current development and troubleshooting\n\n- ${link('Development starter', '/development.md')}: use unreleased candidate packages, their installed docs, TypeScript, lint, tests, and Vite. This path is separate from the published beta reference and identifies its own source revision. \n- ${link('Troubleshooting guide', '/troubleshooting.md')}: read failing and corrected examples checked against beta.1 and the development candidate.\n\n## Retrieval formats\n\n- ${link('Documentation index', '/docs/llms.txt')}: complete page map with task routing.\n- ${link('Searchable JSON corpus', '/docs/corpus.json')}: versioned documents, exact reading Markdown, canonical URLs, and individual hashes; search the documents locally without a browser.\n- ${link('Start and ownership bundle', '/docs/bundles/start.txt')}: initial setup and interface lifecycle.\n- ${link('Integrations bundle', '/docs/bundles/integrations.txt')}: data, state, rendering, and runtime choices.\n- ${link('Reference bundle', '/docs/bundles/reference.txt')}: API and migration references.\n- ${link('Full context', '/llms-full.txt')}: all published documentation and diagnostics; larger than most tasks require.\n- ${link('Coverage and artifact integrity', '/docs/coverage.md')}: what is included, omitted, and actually checked.\n- ${link('Documentation MCP setup', '/docs/mcp.md')}: run the optional local read-only server from this website repository.\n- ${link('Optional browser workshop', '/agent-prompt.md')}: capability checks and interaction with the running example.\n- ${link('Project-fit review', '/adoption-review.md')}: evaluate tradeoffs before choosing Marionette.\n\nNo particular client is guaranteed to discover llms.txt automatically. Markdown and JSON work independently of WebMCP and do not require an account.`;
  const syllabus = `# Develop with Marionette v5\n\n${version}\n\n${guidance}\n\n## Find the contract for your task\n\n${taskText}\n\n${delivery}\n`;
  const rootIndex = `# Marionette ${manifest.packageVersion}\n\n> Published beta documentation and runnable browser examples for a JavaScript interface library with explicit ownership and lifecycle contracts.\n\n${version}\n\n## Start here\n\n- ${link('Agent development entrypoint', '/docs/agent-start.md')}: compact syllabus, version selection, ownership, task routing, and verification.\n- ${link('Build with Marionette', '/docs/agents.md')}: canonical application-development guidance.\n- ${link('Complete documentation map', '/docs/llms.txt')}: all guides and APIs.\n- ${link('Evaluate Marionette', '/why/')}: fit and tradeoffs.\n- ${link('Project-fit review brief', '/adoption-review.md')}: bounded adoption review.\n- ${link('Optional agent interaction', '/agent-prompt.md')}: the visible browser workshop.\n- ${link('Demo provenance', '/reference/provenance.json')}: exact runtime build identity.\n\n${delivery}\n`;
  const docsIndex = `# Marionette documentation\n\n> Task-oriented reference for \`marionette@${manifest.packageVersion}\`.\n\n${version}\n\n${guidance}\n\n## Start here\n\n- ${link('Agent development entrypoint', '/docs/agent-start.md')}\n\n${indexTasks}\n\n${[...Map.groupBy(pages, page => page.section)].map(([section, entries]) => `## ${section}\n\n${entries.map(page => `- ${link(page.title, mdPath(page))}`).join('\n')}`).join('\n\n')}\n\n- ${link('Diagnostic codes', '/errors/index.md')}: active and retired runtime errors.\n- ${link('Snapshot manifest', '/docs/manifest.json')}: source paths and original content hashes.\n\n${delivery}\n`;
  const artifacts = [];
  async function emit(path, content) {
    await mkdir(dirname(resolve(out, path.slice(1))), { recursive: true });
    await writeFile(resolve(out, path.slice(1)), content);
    artifacts.push({ path, bytes: Buffer.byteLength(content), sha256: sha256(content) });
  }
  async function page(path, title, markdown) {
    const { html } = renderMarkdown({ source: `website${path}.md`, title, markdown }, [], manifest);
    await emit(`${path}.md`, markdown);
    await emit(`${path}/index.html`, shell({ title, description: `${title}. Marionette ${manifest.packageVersion}.`, active: 'docs', route: `${path}/`, markdown: `${path}.md`, body: `<div class="docs-layout canonical-docs"><aside class="docs-nav"><a class="docs-home" href="/docs/">DOCUMENTATION ↗</a><div id="docs-search"></div><a href="/docs/agent-start/">Agent entrypoint</a><br><a href="/docs/coverage/">Coverage and integrity</a></aside><article class="prose docs-prose" data-pagefind-body><span hidden data-pagefind-filter="Audience">Consumer</span><div class="docs-tools" data-pagefind-ignore><a href="${path}.md">Read Markdown</a><button type="button" data-copy-markdown="${path}.md">Copy Markdown</button><span class="copy-status" role="status"></span></div>${html}</article></div>` }));
  }
  await emit('/llms.txt', rootIndex);
  await emit('/docs/llms.txt', docsIndex);
  await page('/docs/agent-start', 'Develop with Marionette v5', syllabus);
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
  for (const entry of catalog.diagnostics) await addDocument({ id: `errors/${entry.code}`, title: `${entry.code}: ${entry.slug.replaceAll('-', ' ')}`, section: 'Diagnostics', kind: 'diagnostic', path: `/errors/${entry.code}.md`, url: entry.docsAnchor, sourceUrl: `${origin}/docs/source/${catalogAsset.source}`, sourceSha256: catalogAsset.sha256,
    sourceSupplements: development.examples[entry.code] ? [{
      sourceUrl: `${origin}/development/source/docs/troubleshooting.md`,
      sourceRevision: development.manifest.sourceRevision,
      sourceSha256: development.manifest.pages.find(page => page.source === 'docs/troubleshooting.md').sha256
    }] : undefined });
  await addDocument({ id: 'errors/index', title: 'Diagnostic codes', section: 'Diagnostics', kind: 'diagnostic', path: '/errors/index.md', url: '/errors/', sourceUrl: `${origin}/docs/source/${catalogAsset.source}`, sourceSha256: catalogAsset.sha256 });
  const corpus = { schemaVersion: 1, ...identity, documents };
  await emit('/docs/corpus.json', json(corpus));
  const bundle = docs => `# Marionette ${manifest.packageVersion} documentation bundle\n\n${version}\n\nRead individual documents for focused tasks. Each section below contains the exact published reading Markdown, including its source identity.\n\n${docs.map(doc => `---\n\nDocument: ${doc.id}\nCanonical URL: ${doc.url}\nMarkdown URL: ${doc.markdownUrl}\nReading SHA-256: ${doc.sha256}\n\n${doc.markdown}`).join('\n\n')}`;
  await emit('/llms-full.txt', bundle(documents));
  const bundleGroups = { start: ['Start here', 'Build interfaces', 'Application guides'], integrations: ['Choose integrations'], reference: ['API reference', 'Migration', 'Diagnostics'] };
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
  const coverage = { schemaVersion: 1, ...identity, snapshotPages: pages.length, publishedPages: documents.filter(doc => doc.kind === 'guide').length, diagnostics: catalog.diagnostics.length, corpusDocuments: documents.length, sourceAssets: assets.length, checkedLocalLinks: checkedLinks, unresolvedLinks, limitations: ['Coverage counts imported snapshot pages, not every API or application scenario.', 'Local link checks verify file destinations; they do not check fragments or external URLs.', 'The corpus contains published library guides and diagnostics; the website-authored MCP setup guide, source fixtures, and consumer skill remain linked resources.', 'Website delivery has not been deployed or verified by this build.'] };
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
