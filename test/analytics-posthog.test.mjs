import test from 'node:test';
import assert from 'node:assert/strict';
import { initializePostHog, postHogOptions, sanitizePostHogEvent } from '../dist/assets/analytics-posthog.js';

globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };

test('PostHog enrichment and identification are replaced by the approved wire fields', () => {
  const result = sanitizePostHogEvent({ event: 'workshop_run', uuid: 'synthetic', timestamp: new Date(0), $set: { email: 'PRIVATE' }, properties: { path: '/demos/?PRIVATE#PRIVATE', code: 'PRIVATE', $current_url: 'PRIVATE', $referrer: 'PRIVATE', distinct_id: 'PRIVATE', $device_id: 'PRIVATE', $session_id: 'PRIVATE' } }, 'phc_synthetic');
  assert.equal(result.properties.path, '/demos/');
  assert.equal(result.properties.distinct_id, '$posthog_cookieless');
  assert.equal(result.properties.$cookieless_mode, true);
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.equal(sanitizePostHogEvent({ event: '$identify' }, 'phc_synthetic'), null);
  assert.equal(sanitizePostHogEvent({ event: '$autocapture' }, 'phc_synthetic'), null);
  assert.equal(sanitizePostHogEvent({ event: 'page_view', properties: { path: '/private/secret' } }, 'phc_synthetic').properties.path, null);
});

test('unverified configuration never initializes PostHog', () => {
  const sdk = { init() { assert.fail('SDK must not initialize'); } };
  assert.equal(initializePostHog({ projectKey: 'phc_synthetic' }, sdk), false);
  assert.equal(initializePostHog({ projectKey: 'phx_secret', cookielessServerHashConfirmed: true }, sdk), false);
  assert.equal(initializePostHog({ projectKey: 'phc_synthetic', cookielessServerHashConfirmed: true }, sdk), false); // No approved production hostname.
});

test('SDK own transport is suppressed when an immediate sender owns delivery', () => {
  const sent = [];
  const options = postHogOptions('phc_synthetic', event => sent.push(event));
  assert.equal(options.cookieless_mode, 'always');
  assert.equal(options.person_profiles, 'never');
  assert.equal(options.autocapture, false);
  assert.equal(options.disable_session_recording, true);
  assert.equal(options.before_send({ event: 'workshop_run', properties: { path: '/' } }), null);
  assert.equal(sent.length, 1);
});

test('SDK transport is suppressed without an owned sender', () => {
  assert.equal(postHogOptions('phc_synthetic').before_send({ event: 'page_view', properties: { path: '/' } }), null);
});
