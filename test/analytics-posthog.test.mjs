import test from 'node:test';
import assert from 'node:assert/strict';
import { initializePostHog, postHogOptions } from '../dist/assets/analytics-posthog.js';
globalThis.localStorage = { getItem() { return null; } };
test('standard SDK retains attribution, geography and replay CSS', () => {
  const options = postHogOptions(true);
  assert.equal(options.persistence, 'cookie');
  assert.equal(options.cookie_expiration, 1);
  assert.equal(options.capture_pageview, 'history_change');
  assert.equal(options.capture_pageleave, true);
  assert.equal(options.person_profiles, 'never');
  assert.equal(options.cross_subdomain_cookie, false);
  assert.equal(options.secure_cookie, true);
  assert.equal(options.respect_dnt, true);
  assert.equal(options.autocapture, true);
  assert.equal(options.ip, true);
  assert.equal(options.save_referrer, undefined);
  assert.equal(options.save_campaign_params, undefined);
  assert.equal(options.disable_session_recording, false);
  assert.equal(options.session_recording.maskAllInputs, false);
  assert.equal(options.session_recording.maskInputOptions.password, true);
  const event = { event: '$autocapture', properties: { $pathname: '/docs/', $referrer: 'https://example.com/', utm_source: 'test', $browser: 'Chrome', $snapshot_data: [{ data: { _cssText: 'body{color:red}' } }] } };
  assert.equal(options.before_send(event), event);
  assert.equal(event.properties.$referrer, 'https://example.com/');
  assert.equal(event.properties.path, '/docs/');
  assert.equal(event.properties.page, 'docs');
  assert.equal(event.properties.$snapshot_data[0].data._cssText, 'body{color:red}');
  assert.equal(event.properties.analytics_test, false);
  globalThis.__MARIONETTE_ANALYTICS_TEST__ = true;
  try { assert.equal(options.before_send(event).properties.analytics_test, true); }
  finally { delete globalThis.__MARIONETTE_ANALYTICS_TEST__; }
});
test('explicit opt-out prevents all SDK event types', () => {
  const storage = globalThis.localStorage;
  globalThis.localStorage = { getItem() { return '1'; } };
  try { for (const event of ['$snapshot', '$autocapture', '$pageview']) assert.equal(postHogOptions(true).before_send({ event }), null); }
  finally { globalThis.localStorage = storage; }
});
test('invalid project and development host cannot initialize', () => {
  const sdk = { init() { assert.fail('must not initialize'); } };
  assert.equal(initializePostHog({ projectKey: 'secret' }, sdk), false);
  globalThis.location = { hostname: 'localhost', pathname: '/' };
  try { assert.equal(initializePostHog({ projectKey: 'phc_synthetic' }, sdk), false); }
  finally { delete globalThis.location; }
});
