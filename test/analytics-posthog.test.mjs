import test from 'node:test';
import assert from 'node:assert/strict';
import { initializePostHog, postHogOptions, sanitizePostHogEvent, sanitizeReplayEvent } from '../dist/assets/analytics-posthog.js';

const id = '00000000-0000-4000-8000-000000000001';
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };

test('PostHog enrichment is replaced by anonymous IDs and the approved wire fields', () => {
  const result = sanitizePostHogEvent({ event: 'workshop_run', uuid: 'synthetic', timestamp: new Date(0), $set: { email: 'PRIVATE' }, properties: { distinct_id: id, path: '/demos/?PRIVATE#PRIVATE', code: 'PRIVATE', $current_url: 'PRIVATE', $referrer: 'PRIVATE', $device_id: 'PRIVATE', $session_id: 'PRIVATE' } }, 'phc_synthetic');
  assert.equal(result.properties.path, '/demos/');
  assert.equal(result.properties.distinct_id, id);
  assert.equal(result.properties.$cookieless_mode, undefined);
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.equal(sanitizePostHogEvent({ event: '$identify' }, 'phc_synthetic'), null);
  assert.equal(sanitizePostHogEvent({ event: '$autocapture' }, 'phc_synthetic'), null);
  assert.equal(sanitizePostHogEvent({ event: 'page_view', properties: { distinct_id: id, path: '/private/secret' } }, 'phc_synthetic').properties.path, null);
});

test('invalid destination or nonpublic page never initializes PostHog', () => {
  const sdk = { init() { assert.fail('SDK must not initialize'); } };
  assert.equal(initializePostHog({ projectKey: 'phc_synthetic' }, sdk), false);
  assert.equal(initializePostHog({ projectKey: 'phx_secret' }, sdk), false);
  assert.equal(initializePostHog({ projectKey: 'phc_synthetic' }, sdk), false); // No approved production hostname.
});

test('SDK own transport is suppressed when an immediate sender owns delivery', () => {
  const sent = [];
  const options = postHogOptions('phc_synthetic', event => sent.push(event));
  assert.equal(options.api_host, 'https://e.marionettejs.com');
  assert.equal(options.ui_host, 'https://eu.posthog.com');
  assert.equal(options.cookieless_mode, undefined);
  assert.equal(options.persistence, 'cookie');
  assert.equal(options.cookie_expiration, 1);
  assert.equal(options.capture_pageview, 'history_change');
  assert.equal(options.capture_pageleave, true);
  assert.equal(options.person_profiles, 'never');
  assert.equal(options.autocapture, false);
  assert.equal(options.disable_session_recording, true);
  assert.equal(options.before_send({ event: 'workshop_run', properties: { distinct_id: id, path: '/' } }), null);
  assert.equal(sent.length, 1);
});

test('SDK transport is suppressed without an owned sender', () => {
  assert.equal(postHogOptions('phc_synthetic').before_send({ event: 'page_view', properties: { distinct_id: id, path: '/' } }), null);
});

test('standard navigation keeps only public page links and bounded timing', () => {
  const event = { event: '$pageleave', properties: { distinct_id: id,
    $pathname: '/docs/api/region/?PRIVATE', $current_url: 'PRIVATE',
    $pageview_id: '00000000-0000-4000-8000-000000000001',
    $prev_pageview_id: '00000000-0000-4000-8000-000000000001',
    $prev_pageview_pathname: '/docs/api/region/#PRIVATE', $prev_pageview_duration: 12.345,
    $prev_pageview_max_scroll: 123, $browser: 'PRIVATE', $referrer: 'PRIVATE'
  }};
  const result = sanitizePostHogEvent(event, 'phc_synthetic');
  assert.equal(result.properties.path, '/docs/api/region/');
  assert.equal(result.properties.$prev_pageview_duration, 12.3);
  assert.equal(result.properties.$prev_pageview_pathname, '/docs/api/region/');
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.equal(result.properties.$prev_pageview_max_scroll, undefined);
  assert.equal(sanitizePostHogEvent({ event: '$pageview', properties: { distinct_id: id, $pathname: '/private/SECRET' } }, 'phc_synthetic'), null);
  assert.equal(sanitizePostHogEvent({ ...event, properties: { ...event.properties, $prev_pageview_duration: Infinity } }, 'phc_synthetic').properties.$prev_pageview_duration, undefined);
});

test('test marker is an explicit boolean and caller flags cannot spoof it', () => {
  const event = { event: 'workshop_run', properties: { distinct_id: id, analytics_test: true } };
  assert.equal(sanitizePostHogEvent(event, 'phc_synthetic').properties.analytics_test, false);
  globalThis.__MARIONETTE_ANALYTICS_TEST__ = true;
  try { assert.equal(sanitizePostHogEvent(event, 'phc_synthetic').properties.analytics_test, true); }
  finally { delete globalThis.__MARIONETTE_ANALYTICS_TEST__; }
});

test('public clicks reject unknown targets and extra properties', () => {
  const result = sanitizePostHogEvent({ event: 'site_click', properties: { distinct_id: id, path: '/', target: 'link.page', target_path: '/docs/api/region/?PRIVATE', placement: 'header', text: 'PRIVATE', code: 'PRIVATE' } }, 'phc_synthetic');
  assert.equal(result.properties.target, 'link.page');
  assert.equal(result.properties.target_path, '/docs/api/region/');
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.equal(sanitizePostHogEvent({ event: 'site_click', properties: { target: 'PRIVATE' } }, 'phc_synthetic'), null);
});

test('replay preserves approved demo contents but removes page URL metadata and unrelated fields', () => {
  globalThis.location = { hostname: 'marionettejs.com', pathname: '/' };
  try {
    const snapshot = sanitizeReplayEvent({ event: '$snapshot', properties: { distinct_id: id, $session_id: id, $window_id: id,
      email: 'PRIVATE', $snapshot_bytes: 12, $snapshot_data: [{ type: 4, data: { href: 'https://marionettejs.com/?PRIVATE#PRIVATE' } },
        { type: 2, data: { node: { attributes: { href: '/docs/api/region/?PRIVATE', srcdoc: 'PRIVATE' }, childNodes: [{ textContent: 'Public demo text' }] } } }]
    } }, 'phc_synthetic');
    assert.equal(snapshot.properties.distinct_id, id);
    assert.equal(snapshot.properties.$snapshot_data[0].data.href, 'https://marionettejs.com/');
    assert.equal(JSON.stringify(snapshot).includes('PRIVATE'), false);
    assert.equal(JSON.stringify(snapshot).includes('Public demo text'), true);
  } finally { delete globalThis.location; }
});
