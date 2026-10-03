import posthog from 'posthog-js/full/no-external';
import { analyticsAllowed, configureAnalytics, analyticsTestMode, pageCategory } from './analytics.js';

let initialized;
export function postHogOptions(replay = false) {
  return {
    api_host: 'https://e.marionettejs.com',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-01-30',
    person_profiles: 'never',
    persistence: 'cookie',
    cookie_expiration: 1,
    cross_subdomain_cookie: false,
    secure_cookie: true,
    respect_dnt: true,
    ip: true,
    autocapture: true,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    disable_session_recording: !replay,
    session_recording: { maskAllInputs: false, maskInputOptions: { password: true } },
    disable_external_dependency_loading: true,
    // These product UI features are unrelated to website analytics.
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    before_send: event => {
      if (!event || !analyticsAllowed()) return null;
      const path = event.properties?.path !== undefined ? event.properties.path : event.properties?.$pathname ?? globalThis.location?.pathname;
      event.properties = { ...event.properties, path, page: event.properties?.page !== undefined ? event.properties.page : pageCategory(path), analytics_test: analyticsTestMode() };
      return event;
    }
  };
}
export function initializePostHog(config, sdk = posthog) {
  if (!/^phc_[A-Za-z0-9]+$/.test(config?.projectKey || '') || !analyticsAllowed()) return false;
  if (!['marionettejs.com', 'www.marionettejs.com', 'v5.marionettejs.com'].includes(globalThis.location?.hostname)) return false;
  if (initialized && (initialized.projectKey !== config.projectKey || initialized.sdk !== sdk)) return false;
  if (!initialized) {
    sdk.init(config.projectKey, postHogOptions(Boolean(config.replayFreeCapConfirmed)));
    initialized = { projectKey: config.projectKey, sdk };
    const stop = () => {
      if (analyticsAllowed()) return;
      configureAnalytics();
      sdk.opt_out_capturing();
      sdk.stopSessionRecording();
    };
    globalThis.addEventListener?.('marionette-analytics-opt-out', stop);
    globalThis.addEventListener?.('storage', event => { if (event.key === 'marionette-analytics-opt-out') stop(); });
  }
  // Clearing a saved preference resumes capture on the next initialization.
  if (sdk.has_opted_out_capturing?.()) sdk.opt_in_capturing();
  configureAnalytics((name, properties) => sdk.capture(name, properties));
  return true;
}
