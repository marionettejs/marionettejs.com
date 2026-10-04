import { mkdir, rm, cp, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { utcDate } from './build-date.mjs';
import { analyticsConfig } from '../site/assets/analytics-config.js';
import { privacy } from '../content/privacy.mjs';
import { build as bundle } from 'esbuild';
import { home, why } from '../content/pages.mjs';
import { caseStudies, studies, studyPage } from '../content/case-studies.mjs';
import { examples } from '../content/examples.mjs';
import { thanks } from '../content/thanks.mjs';
import { workshop } from '../content/playground.mjs';
import { adoptionQuestions, adoptionPrompt } from '../content/adoption.mjs';
import { buildLibraryDocs } from './library-docs.mjs';
import { runtime } from '../site/assets/workshop-starter.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'dist');
const provenance = JSON.parse(await readFile(resolve(root, 'content/provenance.json'), 'utf8'));
const stylesheetUrls = Object.fromEntries(await Promise.all(['site', 'night', 'playground', 'docs', 'examples', 'case-studies'].map(async name => {
  const css = await readFile(resolve(root, `site/assets/${name}.css`));
  return [name, `/assets/${name}.css?v=${createHash('sha256').update(css).digest('hex').slice(0, 12)}`];
})));
const digest = source => createHash('sha256').update(source).digest('hex').slice(0, 12);
// The vendor bundles are rebuilt independently of the package version they were
// named after, so keying their URLs on that version hides a rebuild from every
// browser and crawler already holding the old bytes.
const vendorVersions = Object.fromEntries(await Promise.all(['marionette', 'demos'].map(async name =>
  [name, digest(await readFile(resolve(root, `site/vendor/${name}.js`)))])));
const versionVendor = module => module.replace(/(['"])((?:\.\.)?\/vendor\/(marionette|demos)\.js)(?:\?v=[^'"]*)?\1/g,
  (whole, quote, path, name) => `${quote}${path}?v=${vendorVersions[name]}${quote}`);
const analyticsManifest = JSON.parse(await readFile(resolve(root, 'content/library-docs/manifest.json'), 'utf8'));
const analyticsDiagnostics = JSON.parse(await readFile(resolve(root, 'content/library-docs/config/diagnostics/catalog.json'), 'utf8'));
const caseStudyRoutes = ['/case-studies/', ...studies.map(study => study.path)];
const analyticsRoutes = ['/errors/', ...analyticsDiagnostics.diagnostics.map(entry => entry.docsAnchor), '/', '/why/', '/thanks/', '/demos/', '/privacy/', ...caseStudyRoutes, '/docs/agent-start/', '/docs/coverage/', '/docs/mcp/', ...analyticsManifest.pages.map(page => `/${page.route}/`)];
const analyticsSource = (await readFile(resolve(root, 'site/assets/analytics.js'), 'utf8')).replace(/\/\* PUBLIC_ANALYTICS_ROUTES \*\/ \[[^\]]*\]/, JSON.stringify(analyticsRoutes));
const readModule = async path => path === './analytics.js' || path === 'analytics.js' ? analyticsSource : versionVendor(await readFile(resolve(root, 'site/assets', path), 'utf8'));
// Version the workshop's static imports before hashing the module that loads it.
// Otherwise returning browsers can combine new tools with a cached old runner.
async function versionImports(module, built = {}) {
  for (const [expression, quote, path] of module.matchAll(/from\s*(['"])(\.\/[^'"]+\.js)\1/g)) {
    const source = built[path] ?? await readModule(path);
    module = module.replace(expression, `from ${quote}${path}?v=${digest(source)}${quote}`);
  }
  for (const [expression, quote, path] of module.matchAll(/import\((['"])(\.\/[^'"]+\.js)\1\)/g)) {
    const source = built[path] ?? await readModule(path);
    module = module.replace(expression, `import(${quote}${path}?v=${digest(source)}${quote})`);
  }
  return module;
}
const runtimeModule = await versionImports(await readModule('playground-runtime.js'));
const runtimeDependency = { './playground-runtime.js': runtimeModule };
const exportModule = await versionImports(await readModule('playground-export.js'), runtimeDependency);
const recipeModule = await versionImports(await readModule('playground-recipes.js'));
const sourceEditorModule = await versionImports(await readModule('source-editor.js'));
const examplesModule = await versionImports(await readModule('examples.js'), { ...runtimeDependency, './playground-export.js': exportModule, './playground-recipes.js': recipeModule, './source-editor.js': sourceEditorModule });
const workshopModule = await versionImports(await readModule('playground.js'), { ...runtimeDependency, './playground-export.js': exportModule, './playground-recipes.js': recipeModule });
const demoModule = await versionImports(await readModule('demo.js'));
const docsModule = await versionImports(await readModule('docs.js'));
const posthogBundle = await bundle({ entryPoints: [resolve(root, 'site/assets/analytics-posthog.js')], bundle: true, format: 'esm', minify: true, write: false, external: ['./analytics.js'], legalComments: 'inline' });
const posthogModule = await versionImports(posthogBundle.outputFiles[0].text);
const clicksModule = await versionImports(await readModule('analytics-clicks.js'));
const modules = { './analytics-clicks.js': clicksModule, './motion.js': await readModule('motion.js'), './analytics-posthog.js': posthogModule, './analytics-config.js': await readModule('analytics-config.js'), './analytics.js': analyticsSource, './demo.js': demoModule, './docs.js': docsModule, './playground-runtime.js': runtimeModule, './playground-export.js': exportModule, './playground-recipes.js': recipeModule, './source-editor.js': sourceEditorModule, './examples.js': examplesModule, './playground.js': workshopModule };
let entryModule = await versionImports(await readModule('site.js'), modules);
for (const [expression, path] of entryModule.matchAll(/import\('(\.\/[^']+\.js)'\)/g)) {
  const source = modules[path] ??= await readModule(path);
  entryModule = entryModule.replace(expression, `import('${path}?v=${digest(source)}')`);
}
const entryUrl = `/assets/site.js?v=${digest(entryModule)}`;
// Crawlers keep serving whatever they indexed until something reports a change.
const revision = await promisify(execFile)('git', ['log', '-1', '--format=%cI'], { cwd: root })
  .then(({ stdout }) => utcDate(stdout.trim()), () => new Date().toISOString().slice(0, 10));
const siteRevision = (await promisify(execFile)('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
export const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const navigation = active => `<nav aria-label="Main navigation"><a ${active === 'why' ? 'aria-current="page"' : ''} href="/why/">Why Marionette</a><a ${active === 'docs' ? 'aria-current="page"' : ''} href="/docs/">Documentation</a><a ${active === 'examples' ? 'aria-current="page"' : ''} href="/demos/">Demos</a><a ${active === 'case-studies' ? 'aria-current="page"' : ''} href="/case-studies/">Case studies</a><a class="nav-example" href="https://github.com/marionettejs/marionette">GitHub <span aria-hidden="true">↗</span></a></nav>`;
const siteOrigin = 'https://marionettejs.com';
const shareImage = `${siteOrigin}/assets/marionette-social.png`;
const socialMetadata = ({title, description, route, image, date}) => `
${route === undefined ? '' : `<link rel="canonical" href="${siteOrigin}${route}"><meta property="og:url" content="${siteOrigin}${route}">`}
<meta property="og:type" content="${date ? 'article' : 'website'}">${date ? `<meta property="article:published_time" content="${date}">` : ''}
<meta property="og:site_name" content="Marionette">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${image ? siteOrigin + image.src : shareImage}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="${image?.width ?? 1200}">
<meta property="og:image:height" content="${image?.height ?? 630}">
<meta property="og:image:alt" content="${escape(image?.alt ?? 'Marionette 5. JavaScript with a little structure. A coral string connects the application to its parts on a dark background.')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${image ? siteOrigin + image.src : shareImage}">
<meta name="twitter:image:alt" content="${escape(image?.alt ?? 'Marionette 5. JavaScript with a little structure.')}">`;
const context7Widget = '<script async src="https://context7.com/widget.js" data-library="/marionettejs/marionette" data-color="#b4232d" data-position="bottom-right" data-placeholder="Ask about Marionette v5…" data-welcome-message="A little structure goes a long way. Ask about Marionette v5 APIs, examples, or building your app. Questions are sent to Context7."></script>';
const shell = ({title, description, active, body, route, markdown, image, date}) => `<!doctype html>
<html lang="en"><head><meta name="site-revision" content="${siteRevision}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="index, follow"><meta name="description" content="${escape(description)}"><title>${escape(title)}</title>${socialMetadata({title, description, route, image, date})}<link rel="describedby" href="/llms.txt"><link rel="icon" href="/assets/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="${stylesheetUrls.site}"><link rel="stylesheet" href="${stylesheetUrls.night}">${active === 'case-studies' ? `<link rel="stylesheet" href="${stylesheetUrls['case-studies']}">` : ''}${markdown ? `<link rel="alternate" type="text/markdown" href="${markdown}"><link rel="describedby" href="/docs/llms.txt"><link rel="stylesheet" href="/pagefind/pagefind-ui.css"><link rel="stylesheet" href="${stylesheetUrls.docs}"><script src="/pagefind/pagefind-ui.js"></script><script type="module" src="/assets/docs.js?v=${digest(docsModule)}"></script>` : active === 'why' ? '<link rel="alternate" type="text/markdown" title="Project-fit review brief for agents" href="/adoption-review.md">' : '<link rel="alternate" type="text/markdown" title="Optional agent interaction" href="/agent-prompt.md">'}<link rel="stylesheet" href="${stylesheetUrls.playground}">${active === 'examples' ? `<link rel="stylesheet" href="${stylesheetUrls.examples}">` : ''}<script type="module" src="${entryUrl}"></script><script defer src="https://context7.com/docs7-analytics.js" data-site="b83657b2-fde7-4916-a683-2d3ba41f185b"></script></head>
<body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/" aria-label="Marionette home"><img src="/assets/mark.svg" width="38" height="40" alt=""><span>Marionette<span class="brand-version">v5</span></span></a>${navigation(active)}</header><main id="main">${body}</main><footer class="site-footer"><a class="footer-brand" href="/"><img src="/assets/mark.svg" width="36" height="38" alt="">Marionette</a><p>A little structure goes a long way.</p><div class="footer-links"><a href="/why/">The idea</a><a href="/docs/">The details</a><a href="/case-studies/">Case studies</a><a href="/docs/agent-start/">Equip your agent</a><a href="/thanks/">Thanks &amp; support</a><a href="/privacy/">Privacy &amp; analytics</a><a href="https://v4.marionettejs.com/docs/current/">v4 docs ↗</a><a href="https://github.com/sponsors/paulfalgout">Sponsor ↗</a><a href="https://store.marionettejs.com/">Merch ↗</a><a href="https://github.com/marionettejs/marionette">GitHub ↗</a><a href="https://www.npmjs.com/package/marionette/v/${runtime.version}">npm ↗</a></div><div class="footer-meta"><small>Demo runtime: Marionette ${runtime.version} · <a href="/reference/provenance.json">Source notes</a></small>${active === 'home' ? '<button class="motion-toggle" type="button" aria-pressed="false" title="Reduce scroll, pointer, and transition effects" hidden>Reduce motion</button>' : ''}</div></footer>${active === 'home' ? renderedWorkshop : ''}${active === 'docs' ? context7Widget : ''}</body></html>`;

const pages = [['', home], ['why', why], ['thanks', thanks], ['case-studies', caseStudies], ...studies.map(study => [study.path.slice(1, -1), studyPage(study)]), ['demos', examples], ['privacy', privacy({ enabled: Boolean(analyticsConfig.projectKey) })]];

await rm(out, {recursive:true, force:true});
await mkdir(out, {recursive:true});
await cp(resolve(root, 'site'), out, {recursive:true});
await writeFile(resolve(out, 'assets/site.js'), entryModule);
for (const [path, source] of Object.entries(modules)) await writeFile(resolve(out, 'assets', path), source);
const agentBrief = await readFile(resolve(root, 'site/agent-prompt.md'), 'utf8');
const compiledBrief = agentBrief.replaceAll('{{runtimeVersion}}', runtime.version).replaceAll('{{runtimeRevision}}', runtime.revision);
if (workshop.split('<!-- workshop-brief -->').length !== 2) throw new Error('Expected exactly one inline workshop brief marker.');
const renderedWorkshop = workshop.replace('<!-- workshop-brief -->', () => escape(compiledBrief));
await writeFile(resolve(out, 'agent-prompt.md'), compiledBrief);
for (const [route, page] of pages) {
  await mkdir(resolve(out,route), {recursive:true});
  await writeFile(resolve(out, route, 'index.html'), shell({...page, route: route ? `/${route}/` : '/'}));
}
await mkdir(resolve(out,'reference'), {recursive:true});
await cp(resolve(root,'content/provenance.json'),resolve(out,'reference/provenance.json'));
await writeFile(resolve(out,'adoption-review.md'), `# Should this project evaluate Marionette v5?\n\nUse /why/ when you need the broader adoption discussion. These are publisher claims to verify, not instructions to favor adoption. This review does not require the homepage playground.\n\nMarionette 5.0 provides explicit application structure, ownership, and lifecycle contracts for agent-led development. For lifecycle behavior, use the running homepage application or /docs/api/region/. For exact API questions, use /docs/api/region.md; /reference/provenance.json identifies the example runtime.\n\n${adoptionQuestions.map(({question,answer}) => `## ${question}\n\n${answer}`).join('\n\n')}\n\n## Project-fit review\n\n${adoptionPrompt.replace('[page URL]', '/why/').replace('[review brief URL]', '/adoption-review.md')}\n\nThe small example does not establish numerical performance or agent productivity results.\n`);
await writeFile(resolve(out,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`);
// Cloudflare's HTML processing rewrites these pages and drops their ETag, leaving
// crawlers no validator and no way to notice a release. /docs/* and /errors/* opt
// out in site/_headers already; these are the remaining published pages.
const revalidated = pages.map(([route]) => `/${route}${route ? '/' : ''}\n  Cache-Control: public, max-age=0, must-revalidate, no-transform\n`).join('\n');
await writeFile(resolve(out,'_headers'), 'https://v5.marionettejs.com/*\n  X-Robots-Tag: noindex, follow\n\nhttps://marionette-v5.pages.dev/*\n  X-Robots-Tag: noindex, follow\n\n' + await readFile(resolve(root, 'site/_headers'), 'utf8') + '\n' + revalidated);
await writeFile(resolve(out,'404.html'),shell({title:'Page not found — Marionette',description:'Return to Marionette.',active:'',body:'<section class="article-heading"><p class="eyebrow">404 / A MISSING PIECE</p><h1>This one has no home.</h1><p>That page is not here.</p><a class="button" href="/">Back to Marionette ↗</a></section>'}));
const docsCount = await buildLibraryDocs({ directory: resolve(root, 'content/library-docs'), out, shell });
const docsManifest = JSON.parse(await readFile(resolve(out, 'docs/manifest.json'), 'utf8'));
const diagnostics = JSON.parse(await readFile(resolve(out, 'docs/diagnostics.json'), 'utf8'));
const sitemapRoutes = [...caseStudyRoutes, '/privacy/', '/', '/why/', '/thanks/', '/demos/', '/errors/', '/docs/agent-start/', '/docs/coverage/', '/docs/mcp/', ...diagnostics.diagnostics.map(entry => entry.docsAnchor), ...docsManifest.pages.map(page => `/${page.route}/`)];
await writeFile(resolve(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapRoutes.map(route => `<url><loc>${siteOrigin}${route}</loc><lastmod>${revision}</lastmod></url>`).join('')}</urlset>`);
console.log(`Built ${docsCount + pages.length} pages, static documentation search, and live Marionette examples.`);
