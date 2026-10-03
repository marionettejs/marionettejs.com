// Provider-neutral boundary. No destination, identity, storage or network is
// enabled here. A reviewed provider adapter must explicitly supply a sender.
const events = new Set([
  'page_view', 'workshop_open', 'workshop_run', 'workshop_ready',
  'workshop_failed', 'workshop_download', 'workshop_codepen',
  'example_select', 'example_run', 'example_ready', 'example_failed',
  'example_download', 'example_codepen', 'docs_search', 'docs_copy_markdown',
  'adoption_copy', 'invitation_copy', 'ownership_select'
]);
// Build replaces this marker with exact public documentation routes.
const publicRoutes = new Set(/* PUBLIC_ANALYTICS_ROUTES */ ['/', '/why/', '/demos/', '/thanks/']);
let sender;
export function pageCategory(pathname) {
  // Deliberately discard query strings, fragments and all arbitrary path parts.
  const path = String(pathname || '').split(/[?#]/, 1)[0];
  if (path === '/') return 'home';
  if (/^\/docs(?:\/|$)/.test(path)) return 'docs';
  if (/^\/errors(?:\/|$)/.test(path)) return 'errors';
  return ({ '/demos/': 'demos', '/why/': 'why', '/thanks/': 'thanks' })[path] || 'other';
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
    if (globalThis.navigator?.globalPrivacyControl || globalThis.navigator?.doNotTrack === '1' ||
        globalThis.localStorage?.getItem('marionette-analytics-opt-out') === '1') return false;
    // No caller-supplied properties are accepted, even for allowed events.
    const pathname = globalThis.location?.pathname;
    sender(name, { page: pageCategory(pathname), path: pagePath(pathname) });
    return true;
  } catch { return false; } // Analytics must never interrupt website actions.
}
