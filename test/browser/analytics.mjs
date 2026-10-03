// All requests are intercepted. No test traffic is delivered to PostHog or the website.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); Object.defineProperty(navigator, 'userAgentData', { get: () => undefined }); });
  const requests = [];
  const errors = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'eu.i.posthog.com') {
      requests.push({ path: url.pathname, body: route.request().postData() });
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status":1}' });
    }
    if (url.hostname === 'context7.com') return route.abort();
    assert.equal(url.hostname, 'marionettejs.com', 'Unexpected external request');
    if (url.pathname.startsWith('/assets/')) return route.fulfill({ contentType: ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(url.pathname)] || 'application/octet-stream', body: await readFile(resolve('dist', '.' + url.pathname)) });
    if (url.pathname === '/privacy/') return route.fulfill({ contentType: 'text/html', body: await readFile('dist/privacy/index.html') });
    return route.fulfill({ contentType: 'text/html', body: '<html><body>Synthetic analytics fixture</body></html>' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://marionettejs.com/docs/api/region/?prompt=PRIVATE#PRIVATE');
  await page.evaluate(async () => {
    const source = await (await fetch('/assets/analytics-posthog.js')).text();
    const dependency = /from\s*["'](\.\/analytics\.js\?v=[a-f0-9]+)["']/.exec(source)[1];
    const tracker = await import('/assets/' + dependency.slice(2));
    const adapter = await import('/assets/analytics-posthog.js');
    window.fixture = { tracker, adapter };
    if (!adapter.initializePostHog({ projectKey: 'phc_synthetic', cookielessServerHashConfirmed: true })) throw new Error('Not initialized');
    if (!tracker.track('workshop_run', { code: 'PRIVATE', prompt: 'PRIVATE' })) throw new Error('Not tracked');
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal(requests.length, 1, JSON.stringify(requests.map(request => request.path)));
  assert.match(requests[0].path, /^\/i\/v0\/e\/$/);
  assert.ok(!requests[0].body.includes('PRIVATE'));
  const raw = JSON.parse(requests[0].body);
  const event = Array.isArray(raw) ? raw[0] : raw;
  assert.equal(event.event, 'workshop_run');
  assert.equal(event.api_key, 'phc_synthetic');
  assert.equal(event.distinct_id, '$posthog_cookieless');
  assert.deepEqual(event.properties, {
    token: 'phc_synthetic', distinct_id: '$posthog_cookieless', $cookieless_mode: true,
    $process_person_profile: false, $geoip_disable: true, $host: 'marionettejs.com', $raw_user_agent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36',
    $current_url: 'https://marionettejs.com/docs/api/region/', $pathname: '/docs/api/region/',
    path: '/docs/api/region/', page: 'docs'
  });
  assert.deepEqual(await context.cookies(), []);
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), []);
  assert.deepEqual(await page.evaluate(() => Object.keys(sessionStorage)), []);
  await page.evaluate(() => {
    fixture.tracker.setAnalyticsOptOut(true);
    fixture.tracker.track('workshop_download');
  });
  assert.equal(requests.length, 1);
  assert.deepEqual(errors, []);
  await page.goto('https://marionettejs.com/privacy/');
  await page.getByRole('button', { name: 'Turn off PostHog analytics' }).click();
  await page.locator('#analytics-choice-status').filter({ hasText: 'Preference saved' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('marionette-analytics-opt-out')), '1');
  await mkdir('output/analytics', { recursive: true });
  await page.screenshot({ path: 'output/analytics/privacy-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/analytics/privacy-phone.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Clear my PostHog opt-out' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('marionette-analytics-opt-out')), null);
  assert.equal(requests.length, 1, 'Disabled published config must not send analytics');
  await context.close();
  console.log('PASS real PostHog SDK: EU-only request, cookieless sentinel, public path only, no identity storage, no private content, opt-out stops capture');
} finally { await browser.close(); }
