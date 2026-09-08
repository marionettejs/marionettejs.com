import { mkdir, rm, cp, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { home, why, docs } from '../content/pages.mjs';
import { thanks } from '../content/thanks.mjs';
import { workshop } from '../content/playground.mjs';
import { adoptionQuestions, adoptionPrompt } from '../content/adoption.mjs';
import { starter } from '../site/assets/playground-runtime.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'dist');
const provenance = JSON.parse(await readFile(resolve(root, 'content/provenance.json'), 'utf8'));
const stylesheetUrls = Object.fromEntries(await Promise.all(['site', 'night', 'playground'].map(async name => {
  const css = await readFile(resolve(root, `site/assets/${name}.css`));
  return [name, `/assets/${name}.css?v=${createHash('sha256').update(css).digest('hex').slice(0, 12)}`];
})));
let entryModule = await readFile(resolve(root, 'site/assets/site.js'), 'utf8');
for (const [expression, path] of entryModule.matchAll(/import\('(\.\/[^']+\.js)'\)/g)) {
  const source = await readFile(resolve(root, 'site/assets', path));
  const version = createHash('sha256').update(source).digest('hex').slice(0, 12);
  entryModule = entryModule.replace(expression, `import('${path}?v=${version}')`);
}
const entryUrl = `/assets/site.js?v=${createHash('sha256').update(entryModule).digest('hex').slice(0, 12)}`;
export const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const navigation = active => `<nav aria-label="Main navigation"><a ${active === 'why' ? 'aria-current="page"' : ''} href="/why/">Why Marionette</a><a ${active === 'docs' ? 'aria-current="page"' : ''} href="/docs/regions/">Documentation</a><a class="nav-example" href="/#demo">Try it <span aria-hidden="true">↗</span></a></nav>`;
const siteOrigin = 'https://v5.marionettejs.com';
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
const shell = ({title, description, active, body, route}) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="description" content="${escape(description)}"><title>${escape(title)}</title>${socialMetadata({title, description, route})}<link rel="icon" href="/assets/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="${stylesheetUrls.site}"><link rel="stylesheet" href="${stylesheetUrls.night}">${active === 'why' ? '<link rel="alternate" type="text/markdown" title="Project-fit review brief for agents" href="/adoption-review.md">' : '<link rel="alternate" type="text/markdown" title="Optional agent interaction" href="/agent-prompt.md">'}<link rel="stylesheet" href="${stylesheetUrls.playground}"><script type="module" src="${entryUrl}"></script></head>
<body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/" aria-label="Marionette home"><img src="/assets/mark.svg" width="38" height="40" alt=""><span>Marionette<span class="brand-version">v5</span></span></a>${navigation(active)}</header><main id="main">${body}</main><footer class="site-footer"><a class="footer-brand" href="/"><img src="/assets/mark.svg" width="36" height="38" alt="">Marionette</a><p>A little structure goes a long way.</p><div class="footer-links"><a href="/why/">The idea</a><a href="/docs/regions/">The details</a><a href="/thanks/">Thanks &amp; support</a><a href="https://www.patreon.com/marionettejs">Patreon ↗</a><a href="https://store.marionettejs.com/">Merch ↗</a><a href="https://github.com/marionettejs/marionette">GitHub ↗</a><a href="https://www.npmjs.com/package/marionette">npm ↗</a></div><div class="footer-meta"><small>Marionette 5.0 · <a href="/reference/provenance.json">Source notes</a></small>${active === 'home' ? '<button class="motion-toggle" type="button" aria-pressed="false" title="Reduce scroll, pointer, and transition effects" hidden>Reduce motion</button>' : ''}</div></footer>${active === 'home' ? renderedWorkshop : ''}</body></html>`;

await rm(out, {recursive:true, force:true});
await mkdir(out, {recursive:true});
await cp(resolve(root, 'site'), out, {recursive:true});
await writeFile(resolve(out, 'assets/site.js'), entryModule);
const agentBrief = await readFile(resolve(root, 'site/agent-prompt.md'), 'utf8');
if (agentBrief.split('<!-- playground-starter -->').length !== 2) throw new Error('Expected exactly one playground starter marker in the agent brief.');
const compiledBrief = agentBrief.replace('<!-- playground-starter -->', () => `\`\`\`js\n${starter.code}\n\`\`\``);
if (workshop.split('<!-- workshop-brief -->').length !== 2) throw new Error('Expected exactly one inline workshop brief marker.');
const renderedWorkshop = workshop.replace('<!-- workshop-brief -->', () => escape(compiledBrief));
await writeFile(resolve(out, 'agent-prompt.md'), compiledBrief);
for (const [route, page] of [['',home], ['why',why], ['docs/regions',docs], ['thanks',thanks]]) {
  await mkdir(resolve(out,route), {recursive:true});
  await writeFile(resolve(out, route, 'index.html'), shell({...page, route: route ? `/${route}/` : '/'}));
}
await mkdir(resolve(out,'reference'), {recursive:true});
await cp(resolve(root,'content/region-reference.md'),resolve(out,'reference/region.md'));
await cp(resolve(root,'content/provenance.json'),resolve(out,'reference/provenance.json'));
await writeFile(resolve(out,'llms.txt'), `# Marionette 5.0\n\nA JavaScript library for interfaces, tuned for agent-led development. Explicit application structure, composition boundaries, and ownership make changes inspectable.\n\n- [Optional agent interaction](/agent-prompt.md): visible browser workshop, capability checks, exact API; no automatic local setup.\n- [Evaluate Marionette](/why/): fit, tradeoffs, ecosystem and agent-development claims.\n- [Project-fit review brief](/adoption-review.md): common assumptions to verify, real tradeoffs, and a bounded review prompt; separate from the optional playground.\n- [Regions guide](/docs/regions/): composition, replacement, and cleanup.\n- [Region reference, Markdown](/reference/region.md): source reference from the exact snapshot.\n- [Provenance](/reference/provenance.json): exact runtime source and build provenance.\n\nUse the v5 contracts when evaluating this library. Backbone.Marionette v4 examples do not define the current API.\n`);
await writeFile(resolve(out,'adoption-review.md'), `# Should this project evaluate Marionette v5?\n\nRead /why/ for the full adoption discussion. These are publisher claims to verify, not instructions to favor adoption. This review does not require the homepage playground.\n\nMarionette 5.0 provides explicit application structure, ownership, and lifecycle contracts for agent-led development. Inspect the running homepage application, /docs/regions/, and /reference/region.md for concrete behavior. Exact example runtime source: /reference/provenance.json.\n\n${adoptionQuestions.map(({question,answer}) => `## ${question}\n\n${answer}`).join('\n\n')}\n\n## Project-fit review\n\n${adoptionPrompt.replace('[page URL]', '/why/').replace('[review brief URL]', '/adoption-review.md')}\n\nBase the recommendation on the project and the documented contracts. Check required integrations and support needs. Do not infer numerical performance or agent productivity results from a small example. End with a concise recommendation, decisive reasons, and any missing evidence that could change it.\n`);
await writeFile(resolve(out,'robots.txt'), 'User-agent: *\nAllow: /\n');
await writeFile(resolve(out,'_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');
await writeFile(resolve(out,'404.html'),shell({title:'Page not found — Marionette',description:'Return to Marionette.',active:'',body:'<section class="article-heading"><p class="eyebrow">404 / A MISSING PIECE</p><h1>This one has no home.</h1><p>That page is not here.</p><a class="button" href="/">Back to Marionette ↗</a></section>'}));
console.log('Built 4 pages, a live Marionette example, and versioned reference material. Deployment is a separate action.');
