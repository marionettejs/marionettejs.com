import posthog from 'posthog-js/full/no-external';
import { analyticsAllowed, configureAnalytics, allowedEvent, pagePath, pageCategory, analyticsTestMode, safePublicClick } from './analytics.js';

let initialized;
const canonicalHost = 'marionettejs.com';
export function sanitizePostHogEvent(event, projectKey) {
  if (!event || !allowedEvent(event.event) || !analyticsAllowed() || !validId(event.properties?.distinct_id)) return null;
  const navigation = event.event === '$pageview' || event.event === '$pageleave';
  const path = pagePath(navigation ? event.properties?.$pathname ?? globalThis.location?.pathname : event.properties?.path);
  if (navigation && !path) return null;
  const click = event.event === 'site_click' ? safePublicClick({ ...event.properties, targetPath: event.properties?.target_path }) : null;
  if (event.event === 'site_click' && !click) return null;
  const pageFields = {};
  if (navigation) {
    for (const key of ['$pageview_id', '$prev_pageview_id']) {
      const value = event.properties?.[key];
      if (validId(value)) pageFields[key] = value;
    }
    const previous = pagePath(event.properties?.$prev_pageview_pathname);
    if (previous) pageFields.$prev_pageview_pathname = previous;
    const duration = event.properties?.$prev_pageview_duration;
    if (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 && duration <= 86400) pageFields.$prev_pageview_duration = Math.round(duration * 10) / 10;
  }
  // Replace SDK enrichment rather than trying to enumerate every unwanted field.
  // Anonymous IDs link events to replay; never identify visitors by name or email.
  return {
    api_key: projectKey,
    distinct_id: event.properties?.distinct_id,
    event: event.event,
    uuid: event.uuid,
    timestamp: event.timestamp,
    properties: {
      token: projectKey,
      distinct_id: event.properties?.distinct_id,
      $process_person_profile: false,
      $geoip_disable: true,
      analytics_test: analyticsTestMode(),
      ...pageFields,
      ...(click || {}),
      $host: canonicalHost,
      ...anonymousSessionFields(event.properties),
      ...(path ? { $current_url: `https://${canonicalHost}${path}`, $pathname: path } : {}),
      path,
      page: path ? pageCategory(path) : 'other'
    }
  };
}
export function postHogOptions(projectKey, send, replay = false) {
  return {
    api_host: 'https://e.marionettejs.com',
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'never',
    persistence: 'cookie',
    cookie_expiration: 1,
    cross_subdomain_cookie: false,
    secure_cookie: true,
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_performance: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_dead_swipes: false,
    rageclick: false,
    disable_session_recording: !replay,
    disable_capture_url_hashes: true,
    enable_recording_console_log: false,
    get_current_url: () => { const path = pagePath(globalThis.location?.pathname); return path ? `https://${canonicalHost}${path}` : `https://${canonicalHost}/`; },
    session_recording: {
      maskAllInputs: false, maskInputOptions: { password: true, search: true },
      blockSelector: 'iframe, body > :not(header):not(main):not(footer):not(#playground)',
      recordCrossOriginIframes: false, recordHeaders: false, recordBody: false,
      captureCanvas: { enabled: false }, compress_events: false,
      // SDK also calls this hook with only `name` for rrweb page metadata.
      // Preserve its reduced public URL; drop actual network timing/body records.
      maskCapturedNetworkRequestFn: request => {
        if (Object.keys(request).length !== 1 || typeof request.name !== 'string') return null;
        const name = safeReplayUrl(request.name);
        return name ? { name } : null;
      }
    },
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    save_campaign_params: false,
    debug: false,
    disable_external_dependency_loading: true,
    advanced_disable_flags: !replay,
    advanced_disable_feature_flags: true,
    remote_config_refresh_interval_ms: 0,
    disable_scroll_properties: true,
    save_referrer: false,
    store_google: false,
    ip: false,
    request_batching: false,
    disable_compression: true,
    before_send: event => {
      const clean = event?.event === '$snapshot' && replay ? sanitizeReplayEvent(event, projectKey) : sanitizePostHogEvent(event, projectKey);
      if (clean && send) send(clean);
      // Own immediate transport has no batching or retries that could survive opt-out.
      return null;
    }
  };
}
export function initializePostHog(config, sdk = posthog) {
  if (!/^phc_[A-Za-z0-9]+$/.test(config?.projectKey || '') || !analyticsAllowed() || !pagePath(globalThis.location?.pathname)) return false;
  if (!['marionettejs.com', 'www.marionettejs.com', 'v5.marionettejs.com'].includes(globalThis.location?.hostname)) return false;
  if (initialized) {
    if (initialized.projectKey !== config.projectKey || initialized.sdk !== sdk) return false;
    configureAnalytics((name, properties) => sdk.capture(name, properties));
    return true;
  }
  const pending = new Set();
  const stop = () => {
    if (analyticsAllowed()) return;
    for (const controller of pending) controller.abort();
    pending.clear();
    configureAnalytics();
    sdk.stopSessionRecording?.();
  };
  globalThis.addEventListener?.('marionette-analytics-opt-out', stop);
  globalThis.addEventListener?.('storage', event => { if (event.key === 'marionette-analytics-opt-out') stop(); });
  sdk.init(config.projectKey, postHogOptions(config.projectKey, event => {
    if (!analyticsAllowed()) return;
    const controller = new AbortController();
    pending.add(controller);
    const body = JSON.stringify(event);
    void fetch(event.event === '$snapshot' ? 'https://e.marionettejs.com/s/' : 'https://e.marionettejs.com/i/v0/e/', {
      method: 'POST', body,
      headers: { 'Content-Type': 'text/plain' }, credentials: 'omit',
      referrerPolicy: 'no-referrer', keepalive: new TextEncoder().encode(body).byteLength < 60000, signal: controller.signal
    }).catch(() => {}).finally(() => pending.delete(controller));
  }, Boolean(config.replayFreeCapConfirmed)));
  initialized = { projectKey: config.projectKey, sdk };
  configureAnalytics((name, properties) => sdk.capture(name, properties));
  return true;
}

const validId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
function anonymousSessionFields(properties) {
  return Object.fromEntries(['$session_id', '$window_id'].filter(key => validId(properties?.[key])).map(key => [key, properties[key]]));
}
function safeReplayUrl(value) {
  try {
    const url = new URL(value, `https://${canonicalHost}`);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (!['marionettejs.com', 'www.marionettejs.com', 'v5.marionettejs.com'].includes(url.hostname)) return '';
    const path = pagePath(url.pathname);
    if (path) return `https://${canonicalHost}${path}`;
    if (/^\/(?:assets|vendor|pagefind)\/[A-Za-z0-9_./-]+$/.test(url.pathname)) return `https://${canonicalHost}${url.pathname}`;
    return '';
  } catch { return ''; }
}
// rrweb is left uncompressed so URLs can be scrubbed at the final boundary.
// Public demo text/inputs are deliberately retained; no console/network payloads.
function scrubReplay(value) {
  if (Array.isArray(value)) return value.map(scrubReplay);
  if (!value || typeof value !== 'object') return value;
  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    if (['srcdoc', 'action', 'formaction', 'data', 'integrity'].includes(key) && typeof item === 'string') continue;
    if (['href', 'src', 'url'].includes(key) && typeof item === 'string') clean[key] = safeReplayUrl(item);
    else clean[key] = scrubReplay(item);
  }
  return clean;
}
export function sanitizeReplayEvent(event, projectKey) {
  if (!analyticsAllowed() || !pagePath(globalThis.location?.pathname) || !validId(event?.properties?.distinct_id) || !Array.isArray(event.properties.$snapshot_data)) return null;
  return { api_key: projectKey, event: '$snapshot', uuid: event.uuid, timestamp: event.timestamp,
    distinct_id: event.properties.distinct_id,
    properties: { token: projectKey, distinct_id: event.properties.distinct_id,
      ...anonymousSessionFields(event.properties), $snapshot_data: scrubReplay(event.properties.$snapshot_data),
      $snapshot_bytes: event.properties.$snapshot_bytes, $lib: 'web', $lib_version: '1.435.8',
      $snapshot_host: canonicalHost, $process_person_profile: false, $geoip_disable: true,
      analytics_test: analyticsTestMode() }
  };
}
