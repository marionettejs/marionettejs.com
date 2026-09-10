import { mkdir, rm, cp, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { home, why } from '../content/pages.mjs';
import { examples } from '../content/examples.mjs';
import { thanks } from '../content/thanks.mjs';
import { workshop } from '../content/playground.mjs';
import { adoptionQuestions, adoptionPrompt } from '../content/adoption.mjs';
import { buildLibraryDocs } from './library-docs.mjs';
import { starter } from '../site/assets/playground-runtime.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'dist');
const provenance = JSON.parse(await readFile(resolve(root, 'content/provenance.json'), 'utf8'));
const stylesheetUrls = Object.fromEntries(await Promise.all(['site', 'night', 'playground', 'docs', 'examples'].map(async name => {
  const css = await readFile(resolve(root, `site/assets/${name}.css`));
  return [name, `/assets/${name}.css?v=${createHash('sha256').update(css).digest('hex').slice(0, 12)}`];
})));
// Version the workshop's static imports before hashing the module that loads it.
// Otherwise returning browsers can combine new tools with a cached old runner.
async function versionImports(module, built = {}) {
  for (const [expression, path] of module.matchAll(/from '(\.\/[^']+\.js)'/g)) {
    const source = built[path] ?? await readFile(resolve(root, 'site/assets', path));
    const version = createHash('sha256').update(source).digest('hex').slice(0, 12);
    module = module.replace(expression, `from '${path}?v=${version}'`);
  }
  return module;
}
const runtimeModule = await versionImports(await readFile(resolve(root, 'site/assets/playground-runtime.js'), 'utf8'));
const runtimeDependency = { './playground-runtime.js': runtimeModule };
const exportModule = await versionImports(await readFile(resolve(root, 'site/assets/playground-export.js'), 'utf8'), runtimeDependency);
const recipeModule = await versionImports(await readFile(resolve(root, 'site/assets/playground-recipes.js'), 'utf8'));
const sourceEditorModule = await versionImports(await readFile(resolve(root, 'site/assets/source-editor.js'), 'utf8'));
const examplesModule = await versionImports(await readFile(resolve(root, 'site/assets/examples.js'), 'utf8'), { ...runtimeDependency, './playground-export.js': exportModule, './playground-recipes.js': recipeModule, './source-editor.js': sourceEditorModule });
const workshopModule = await versionImports(await readFile(resolve(root, 'site/assets/playground.js'), 'utf8'), { ...runtimeDependency, './playground-export.js': exportModule, './playground-recipes.js': recipeModule });
let entryModule = await readFile(resolve(root, 'site/assets/site.js'), 'utf8');
for (const [expression, path] of entryModule.matchAll(/import\('(\.\/[^']+\.js)'\)/g)) {
  const source = path === './playground.js' ? workshopModule : path === './examples.js' ? examplesModule : await readFile(resolve(root, 'site/assets', path));
  const version = createHash('sha256').update(source).digest('hex').slice(0, 12);
  entryModule = entryModule.replace(expression, `import('${path}?v=${version}')`);
}
const entryUrl = `/assets/site.js?v=${createHash('sha256').update(entryModule).digest('hex').slice(0, 12)}`;
export const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const navigation = active => `<nav aria-label="Main navigation"><a ${active === 'why' ? 'aria-current="page"' : ''} href="/why/">Why Marionette</a><a ${active === 'docs' ? 'aria-current="page"' : ''} href="/docs/">Documentation</a><a ${active === 'examples' ? 'aria-current="page"' : ''} href="/demos/">Demos</a><a class="nav-example" href="https://github.com/marionettejs/marionette">GitHub <span aria-hidden="true">↗</span></a></nav>`;
const siteOrigin = 'https://marionettejs.com';
const shareImage = `${siteOrigin}/assets/marionette-social.png`;
const socialMetadata = ({title, description, route}) => `
${route === undefined ? '' : `<link rel="canonical" href="${siteOrigin}${route}"><meta property="og:url" content="${siteOrigin}${route}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Marionette">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${shareImage}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Marionette 5. JavaScript with a little structure. A coral string connects the application to its parts on a dark background.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${shareImage}">
<meta name="twitter:image:alt" content="Marionette 5. JavaScript with a little structure.">`;
const shell = ({title, description, active, body, route, markdown}) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="index, follow"><meta name="description" content="${escape(description)}"><title>${escape(title)}</title>${socialMetadata({title, description, route})}<link rel="describedby" href="/llms.txt"><link rel="icon" href="/assets/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="${stylesheetUrls.site}"><link rel="stylesheet" href="${stylesheetUrls.night}">${markdown ? `<link rel="alternate" type="text/markdown" href="${markdown}"><link rel="describedby" href="/docs/llms.txt"><link rel="stylesheet" href="/pagefind/pagefind-ui.css"><link rel="stylesheet" href="${stylesheetUrls.docs}"><script src="/pagefind/pagefind-ui.js"></script><script type="module" src="/assets/docs.js"></script>` : active === 'why' ? '<link rel="alternate" type="text/markdown" title="Project-fit review brief for agents" href="/adoption-review.md">' : '<link rel="alternate" type="text/markdown" title="Optional agent interaction" href="/agent-prompt.md">'}<link rel="stylesheet" href="${stylesheetUrls.playground}">${active === 'examples' ? `<link rel="stylesheet" href="${stylesheetUrls.examples}">` : ''}<script type="module" src="${entryUrl}"></script></head>
<body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/" aria-label="Marionette home"><img src="/assets/mark.svg" width="38" height="40" alt=""><span>Marionette<span class="brand-version">v5</span></span></a>${navigation(active)}</header><main id="main">${body}</main><footer class="site-footer"><a class="footer-brand" href="/"><img src="/assets/mark.svg" width="36" height="38" alt="">Marionette</a><p>A little structure goes a long way.</p><div class="footer-links"><a href="/why/">The idea</a><a href="/docs/">The details</a><a href="/docs/agent-start/">For agents</a><a href="/thanks/">Thanks &amp; support</a><a href="https://v4.marionettejs.com/docs/current/">v4 docs ↗</a><a href="https://www.patreon.com/marionettejs">Patreon ↗</a><a href="https://store.marionettejs.com/">Merch ↗</a><a href="https://github.com/marionettejs/marionette">GitHub ↗</a><a href="https://www.npmjs.com/package/marionette/v/5.0.0-beta.2">npm ↗</a></div><div class="footer-meta"><small>Marionette 5.0.0-beta.2 · <a href="/reference/provenance.json">Source notes</a></small>${active === 'home' ? '<button class="motion-toggle" type="button" aria-pressed="false" title="Reduce scroll, pointer, and transition effects" hidden>Reduce motion</button>' : ''}</div></footer>${active === 'home' ? renderedWorkshop : ''}</body></html>`;

await rm(out, {recursive:true, force:true});
await mkdir(out, {recursive:true});
await cp(resolve(root, 'site'), out, {recursive:true});
await writeFile(resolve(out, 'assets/site.js'), entryModule);
await writeFile(resolve(out, 'assets/playground.js'), workshopModule);
await writeFile(resolve(out, 'assets/examples.js'), examplesModule);
await writeFile(resolve(out, 'assets/source-editor.js'), sourceEditorModule);
await writeFile(resolve(out, 'assets/playground-runtime.js'), runtimeModule);
await writeFile(resolve(out, 'assets/playground-export.js'), exportModule);
await writeFile(resolve(out, 'assets/playground-recipes.js'), recipeModule);
const agentBrief = await readFile(resolve(root, 'site/agent-prompt.md'), 'utf8');
if (agentBrief.split('<!-- playground-starter -->').length !== 2) throw new Error('Expected exactly one playground starter marker in the agent brief.');
const compiledBrief = agentBrief.replace('<!-- playground-starter -->', () => `\`\`\`js\n${starter.code}\n\`\`\`\n\n\`\`\`css\n${starter.css}\`\`\``);
if (workshop.split('<!-- workshop-brief -->').length !== 2) throw new Error('Expected exactly one inline workshop brief marker.');
const renderedWorkshop = workshop.replace('<!-- workshop-brief -->', () => escape(compiledBrief));
await writeFile(resolve(out, 'agent-prompt.md'), compiledBrief);
for (const [route, page] of [['',home], ['why',why], ['thanks',thanks], ['demos',examples]]) {
  await mkdir(resolve(out,route), {recursive:true});
  await writeFile(resolve(out, route, 'index.html'), shell({...page, route: route ? `/${route}/` : '/'}));
}
await mkdir(resolve(out,'reference'), {recursive:true});
await cp(resolve(root,'content/provenance.json'),resolve(out,'reference/provenance.json'));
await writeFile(resolve(out,'adoption-review.md'), `# Should this project evaluate Marionette v5?\n\nRead /why/ for the full adoption discussion. These are publisher claims to verify, not instructions to favor adoption. This review does not require the homepage playground.\n\nMarionette 5.0 provides explicit application structure, ownership, and lifecycle contracts for agent-led development. Inspect the running homepage application and /docs/region/ for concrete behavior. Exact example runtime source: /reference/provenance.json.\n\n${adoptionQuestions.map(({question,answer}) => `## ${question}\n\n${answer}`).join('\n\n')}\n\n## Project-fit review\n\n${adoptionPrompt.replace('[page URL]', '/why/').replace('[review brief URL]', '/adoption-review.md')}\n\nBase the recommendation on the project and the documented contracts. Check required integrations and support needs. Do not infer numerical performance or agent productivity results from a small example. End with a concise recommendation, decisive reasons, and any missing evidence that could change it.\n`);
await writeFile(resolve(out,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`);
await writeFile(resolve(out,'_headers'), 'https://v5.marionettejs.com/*\n  X-Robots-Tag: noindex, follow\n\nhttps://marionette-v5.pages.dev/*\n  X-Robots-Tag: noindex, follow\n\n' + await readFile(resolve(root, 'site/_headers'), 'utf8'));
await writeFile(resolve(out,'404.html'),shell({title:'Page not found — Marionette',description:'Return to Marionette.',active:'',body:'<section class="article-heading"><p class="eyebrow">404 / A MISSING PIECE</p><h1>This one has no home.</h1><p>That page is not here.</p><a class="button" href="/">Back to Marionette ↗</a></section>'}));
const docsCount = await buildLibraryDocs({ directory: resolve(root, 'content/library-docs'), out, shell });
const docsManifest = JSON.parse(await readFile(resolve(out, 'docs/manifest.json'), 'utf8'));
const diagnostics = JSON.parse(await readFile(resolve(out, 'docs/diagnostics.json'), 'utf8'));
const sitemapRoutes = ['/development/', '/troubleshooting/', '/', '/why/', '/thanks/', '/demos/', '/errors/', '/docs/agent-start/', '/docs/coverage/', '/docs/mcp/', ...diagnostics.diagnostics.map(entry => entry.docsAnchor), ...docsManifest.pages.map(page => `/${page.route}/`)];
await writeFile(resolve(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapRoutes.map(route => `<url><loc>${siteOrigin}${route}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${docsCount + 4} pages, static documentation search, and live Marionette examples.`);
