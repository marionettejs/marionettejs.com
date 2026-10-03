import posthog from 'posthog-js/no-external';
import { analyticsAllowed, configureAnalytics, allowedEvent, pagePath, pageCategory } from './analytics.js';

const canonicalHost = 'marionettejs.com';
export function sanitizePostHogEvent(event, projectKey) {
  if (!event || !allowedEvent(event.event) || !analyticsAllowed()) return null;
  const path = pagePath(event.properties?.path);
  // Replace SDK enrichment rather than trying to enumerate every unwanted field.
  // The fixed sentinel is required by PostHog's server-side daily hashing mode.
  return {
    api_key: projectKey,
    distinct_id: '$posthog_cookieless',
    event: event.event,
    uuid: event.uuid,
    timestamp: event.timestamp,
    properties: {
      token: projectKey,
      distinct_id: '$posthog_cookieless',
      $cookieless_mode: true,
      $process_person_profile: false,
      $geoip_disable: true,
      $host: canonicalHost,
      $raw_user_agent: String(globalThis.navigator?.userAgent || '').slice(0, 1000),
      ...(path ? { $current_url: `https://${canonicalHost}${path}`, $pathname: path } : {}),
      path,
      page: path ? pageCategory(path) : 'other'
    }
  };
}
export function postHogOptions(projectKey, send) {
  return {
    api_host: 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    cookieless_mode: 'always',
    person_profiles: 'never',
    persistence: 'memory',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_performance: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_dead_swipes: false,
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    save_campaign_params: false,
    debug: false,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    advanced_disable_feature_flags: true,
    remote_config_refresh_interval_ms: 0,
    disable_scroll_properties: true,
    save_referrer: false,
    store_google: false,
    ip: false,
    request_batching: false,
    disable_compression: true,
    before_send: event => {
      const clean = sanitizePostHogEvent(event, projectKey);
      if (!send) return clean;
      if (clean) send(clean);
      // Own immediate transport has no batching or retries that could survive opt-out.
      return null;
    }
  };
}
export function initializePostHog(config, sdk = posthog) {
  if (!config?.cookielessServerHashConfirmed || !/^phc_[A-Za-z0-9]+$/.test(config.projectKey || '') || !analyticsAllowed()) return false;
  if (!['marionettejs.com', 'www.marionettejs.com', 'v5.marionettejs.com'].includes(globalThis.location?.hostname)) return false;
  const pending = new Set();
  const stop = () => {
    if (analyticsAllowed()) return;
    for (const controller of pending) controller.abort();
    pending.clear();
    configureAnalytics();
  };
  globalThis.addEventListener?.('marionette-analytics-opt-out', stop);
  globalThis.addEventListener?.('storage', event => { if (event.key === 'marionette-analytics-opt-out') stop(); });
  sdk.init(config.projectKey, postHogOptions(config.projectKey, event => {
    if (!analyticsAllowed()) return;
    const controller = new AbortController();
    pending.add(controller);
    void fetch('https://eu.i.posthog.com/i/v0/e/', {
      method: 'POST', body: JSON.stringify(event),
      headers: { 'Content-Type': 'text/plain' }, credentials: 'omit',
      referrerPolicy: 'no-referrer', keepalive: true, signal: controller.signal
    }).catch(() => {}).finally(() => pending.delete(controller));
  }));
  configureAnalytics((name, properties) => sdk.capture(name, properties));
  return true;
}
