// Provider-neutral boundary. No destination, identity, storage or network is
// enabled here. A reviewed provider adapter must explicitly supply a sender.
const events = new Set([
  '$pageview', '$pageleave', 'site_click', 'page_view', 'workshop_open', 'workshop_run', 'workshop_ready',
  'workshop_failed', 'workshop_download', 'workshop_codepen',
  'example_select', 'example_run', 'example_ready', 'example_failed',
  'example_download', 'example_codepen', 'docs_search', 'docs_copy_markdown',
  'adoption_copy', 'invitation_copy', 'ownership_select'
]);
// Build replaces this marker with exact public documentation routes.
const publicRoutes = new Set(/* PUBLIC_ANALYTICS_ROUTES */ ['/', '/why/', '/demos/', '/thanks/']);
let sender;
export const allowedEvent = name => events.has(name);
export function analyticsAllowed() {
  try {
    if (!globalThis.localStorage) return false;
    return !globalThis.navigator?.globalPrivacyControl && globalThis.navigator?.doNotTrack !== '1' &&
      globalThis.localStorage?.getItem('marionette-analytics-opt-out') !== '1';
  } catch { return false; }
}
export function setAnalyticsOptOut(value) {
  try {
    if (!globalThis.localStorage) return false;
    if (value) {
      globalThis.localStorage?.setItem('marionette-analytics-opt-out', '1');
      globalThis.dispatchEvent?.(new Event('marionette-analytics-opt-out'));
    }
    else globalThis.localStorage?.removeItem('marionette-analytics-opt-out');
    return true;
  } catch { return false; }
}
export function pageCategory(pathname) {
  // Deliberately discard query strings, fragments and all arbitrary path parts.
  const path = String(pathname || '').split(/[?#]/, 1)[0];
  if (path === '/') return 'home';
  if (/^\/docs(?:\/|$)/.test(path)) return 'docs';
  if (/^\/errors(?:\/|$)/.test(path)) return 'errors';
  if (/^\/case-studies(?:\/|$)/.test(path)) return 'case-studies';
  return ({ '/demos/': 'demos', '/why/': 'why', '/thanks/': 'thanks', '/privacy/': 'privacy' })[path] || 'other';
}
export function pagePath(pathname) {
  const path = String(pathname || '').split(/[?#]/, 1)[0];
  return publicRoutes.has(path) ? path : null;
}
export function configureAnalytics(send) {
  sender = typeof send === 'function' ? send : undefined;
}
export function track(name) {
  if (!sender || !events.has(name)) return false;
  try {
    if (!analyticsAllowed()) return false;
    // No caller-supplied properties are accepted, even for allowed events.
    const pathname = globalThis.location?.pathname;
    sender(name, { page: pageCategory(pathname), path: pagePath(pathname) });
    return true;
  } catch { return false; } // Analytics must never interrupt website actions.
}

// Only an explicit test harness marks testing. No identifier or preference is stored.
export const analyticsTestMode = () => globalThis.__MARIONETTE_ANALYTICS_TEST__ === true;
const clickTargets = new Set([
  'lifecycle.show', 'lifecycle.replace', 'lifecycle.empty', 'lifecycle.play', 'motion.toggle',
  'ownership.select', 'invitation.copy', 'adoption.copy', 'workshop.close', 'workshop.run',
  'workshop.stop', 'workshop.download', 'workshop.codepen', 'workshop.source-js', 'workshop.source-css',
  'example.select', 'example.restart', 'example.run', 'example.download', 'example.codepen',
  'example.source-js', 'example.source-css', 'example.source-lesson', 'example.reading-step',
  'docs.copy-markdown', 'details.toggle', 'link.page', 'link.workshop', 'link.markdown', 'link.reference',
  'link.github', 'link.npm', 'link.store', 'link.archive', 'link.sponsor', 'link.openai',
  'link.coderabbit', 'link.cubic', 'link.greptile', 'link.cloudflare', 'link.posthog', 'link.context7'
]);
export function safePublicClick(properties) {
  if (!clickTargets.has(properties?.target)) return null;
  const placement = ['header', 'footer', 'docs-sidebar', 'content'].includes(properties.placement) ? properties.placement : 'content';
  const targetPath = pagePath(properties.targetPath);
  return { target: properties.target, placement, ...(targetPath ? { target_path: targetPath } : {}) };
}
export function trackPublicClick(properties) {
  const click = safePublicClick(properties);
  if (!sender || !click || !analyticsAllowed()) return false;
  const path = pagePath(globalThis.location?.pathname);
  if (!path) return false;
  try { sender('site_click', { page: pageCategory(path), path, ...click }); return true; }
  catch { return false; }
}
