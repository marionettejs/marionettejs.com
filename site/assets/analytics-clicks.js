import { pagePath, trackPublicClick } from './analytics.js';

// Fixed classifications only: never read text, form values, arbitrary attributes,
// source editor contents, or the contents of preview/chat frames.
const controls = [
  ['[data-phase="0"]', 'lifecycle.show'], ['[data-phase="1"]', 'lifecycle.replace'],
  ['[data-phase="2"]', 'lifecycle.empty'], ['.sequence-play', 'lifecycle.play'],
  ['.motion-toggle', 'motion.toggle'], ['#application-slot button', 'ownership.select'],
  ['[data-agent-copy]', 'invitation.copy'], ['#copy-adoption-prompt', 'adoption.copy'],
  ['[data-workshop-close]', 'workshop.close'], ['[data-workshop-run]', 'workshop.run'],
  ['[data-workshop-stop]', 'workshop.stop'], ['[data-workshop-download]', 'workshop.download'],
  ['[data-workshop-codepen]', 'workshop.codepen'], ['#code-tab', 'workshop.source-js'],
  ['#css-tab', 'workshop.source-css'], ['[data-example-id]', 'example.select'],
  ['[data-example-restart]', 'example.restart'], ['[data-example-run]', 'example.run'],
  ['[data-example-download]', 'example.download'], ['[data-example-codepen]', 'example.codepen'],
  ['#example-js-tab', 'example.source-js'], ['#example-css-tab', 'example.source-css'],
  ['#example-lesson-tab', 'example.source-lesson'], ['#example-reading-guide button', 'example.reading-step'],
  ['[data-copy-markdown]', 'docs.copy-markdown']
];
const externalLinks = new Map([
  ['github.com', 'link.github'], ['www.npmjs.com', 'link.npm'],
  ['store.marionettejs.com', 'link.store'], ['v4.marionettejs.com', 'link.archive'],
  ['openai.com', 'link.openai'], ['www.coderabbit.ai', 'link.coderabbit'],
  ['www.cubic.dev', 'link.cubic'], ['www.greptile.com', 'link.greptile'],
  ['developers.cloudflare.com', 'link.cloudflare'], ['www.cloudflare.com', 'link.cloudflare'],
  ['posthog.com', 'link.posthog'], ['context7.com', 'link.context7']
]);
export function publicClick(element) {
  if (!element?.closest || element.closest('form, [contenteditable], #docs-chat, [data-ph-no-autocapture], .ph-no-autocapture')) return null;
  if (!element.closest('main, .site-header, .site-footer, .workshop-header, .workshop-export')) return null;
  const placement = element.closest('.site-header') ? 'header' : element.closest('.site-footer') ? 'footer' : element.closest('.docs-menu') ? 'docs-sidebar' : 'content';
  for (const [selector, target] of controls) if (element.matches(selector)) return { target, placement };
  if (element.matches('summary')) return { target: 'details.toggle', placement };
  if (!element.matches('a[href]')) return null;
  let url;
  try { url = new URL(element.getAttribute('href'), globalThis.location?.href); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (['marionettejs.com', 'www.marionettejs.com', 'v5.marionettejs.com'].includes(url.hostname)) {
    const targetPath = pagePath(url.pathname);
    if (targetPath) return { target: url.hash === '#playground' && targetPath === '/' ? 'link.workshop' : 'link.page', targetPath, placement };
    if (url.pathname.endsWith('.md')) {
      const route = url.pathname.replace(/^\/docs\/markdown/, '').replace(/\.md$/, '/');
      if (pagePath(route)) return { target: 'link.markdown', targetPath: route, placement };
    }
    if (['/llms.txt', '/docs/llms.txt', '/agent-prompt.md', '/adoption-review.md', '/docs/manifest.json', '/reference/provenance.json'].includes(url.pathname)) return { target: 'link.reference', placement };
    return null;
  }
  const target = url.hostname === 'github.com' && url.pathname === '/sponsors/paulfalgout' ? 'link.sponsor' : externalLinks.get(url.hostname);
  return target ? { target, placement } : null;
}
export function installPublicClicks(document = globalThis.document) {
  document?.addEventListener('click', event => {
    const element = event.target?.closest?.('a, button, summary');
    if (!element || element.disabled) return;
    const click = publicClick(element);
    if (click) trackPublicClick(click);
  }, { capture: true });
}
