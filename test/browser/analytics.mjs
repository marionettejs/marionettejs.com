// All requests are intercepted. No test traffic is delivered to PostHog or the website.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
async function bounded(promise, label) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 5000); })]); }
  finally { clearTimeout(timer); }
}
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); Object.defineProperty(navigator, 'userAgentData', { get: () => undefined }); });
  await context.addCookies([{ name: 'analytics_test_cookie', value: 'PRIVATE', domain: 'eu.i.posthog.com', path: '/', secure: true, sameSite: 'None' }]);
  const requests = [];
  const errors = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'eu.i.posthog.com') {
      requests.push({ path: url.pathname, body: route.request().postData(), headers: await route.request().allHeaders() });
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status":1}' });
    }
    if (url.hostname === 'context7.com') return route.abort();
    if (url.pathname === '/assets/analytics-config.js') return route.fulfill({ contentType: 'text/javascript', body: 'export const analyticsConfig={projectKey:"",cookielessServerHashConfirmed:false};' });
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
  assert.equal(requests[0].headers.referer, undefined);
  assert.equal(requests[0].headers.cookie, undefined);
  assert.deepEqual(await context.cookies('https://marionettejs.com'), []);
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
  assert.equal(requests.length, 1, 'Disabled fixture config must not send analytics');
  await context.close();
  console.log('PASS real PostHog SDK: EU-only request, cookieless sentinel, public path only, no identity storage, no private content, opt-out stops capture');
  // Regression: an indefinitely stalled analytics module must not block controls.
  const slow = await browser.newContext();
  let pendingAdapter;
  await slow.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'marionettejs.com') return route.abort();
    if (url.pathname === '/assets/analytics-config.js') return route.fulfill({ contentType: 'text/javascript', body: 'export const analyticsConfig={projectKey:"phc_synthetic",cookielessServerHashConfirmed:true};' });
    if (url.pathname === '/assets/analytics-posthog.js') { pendingAdapter = route; return; }
    const file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    try { return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream', body: await readFile(resolve('dist', '.' + file)) }); }
    catch { return route.abort(); }
  });
  const control = await slow.newPage();
  await control.goto('https://marionettejs.com/privacy/', { waitUntil: 'domcontentloaded' });
  await control.getByRole('button', { name: 'Turn off PostHog analytics' }).click({ timeout: 3000 });
  assert.equal(await control.evaluate(() => localStorage.getItem('marionette-analytics-opt-out')), '1');
  assert.ok(pendingAdapter, 'Configured adapter should remain pending');
  await control.evaluate(() => localStorage.removeItem('marionette-analytics-opt-out'));
  const demo = await slow.newPage();
  await demo.goto('https://marionettejs.com/', { waitUntil: 'domcontentloaded' });
  await demo.locator('#application-slot button').first().waitFor({ timeout: 3000 });
  await slow.close();
  console.log('PASS stalled analytics module: opt-out and real homepage demo work immediately');

  // Missing optional boundary/config modules must not disable core UI.
  const unavailable = await browser.newContext();
  await unavailable.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'marionettejs.com' || /\/analytics(?:-config)?\.js$/.test(url.pathname)) return route.abort();
    const file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    try { return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream', body: await readFile(resolve('dist', '.' + file)) }); }
    catch { return route.abort(); }
  });
  const independent = await unavailable.newPage();
  await independent.goto('https://marionettejs.com/privacy/');
  await independent.getByRole('button', { name: 'Turn off PostHog analytics' }).click();
  assert.equal(await independent.evaluate(() => localStorage.getItem('marionette-analytics-opt-out')), '1');
  await independent.goto('https://marionettejs.com/');
  await independent.locator('#application-slot button').first().waitFor();
  await independent.locator('#application-slot button').last().click();
  await unavailable.close();
  console.log('PASS missing analytics boundary/config: privacy controls and homepage demo remain available');

  const transport = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' });
  await transport.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); Object.defineProperty(navigator, 'userAgentData', { get: () => undefined }); });
  let resolvePending, resolveAborted, resolveFailed;
  const pendingObserved = new Promise(resolve => { resolvePending = resolve; });
  const abortedObserved = new Promise(resolve => { resolveAborted = resolve; });
  const failedObserved = new Promise(resolve => { resolveFailed = resolve; });
  const deliveries = [];
  await transport.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'eu.i.posthog.com') {
      const event = JSON.parse(route.request().postData());
      deliveries.push(event.event);
      if (event.event === 'workshop_run') { resolvePending(); return; }
      resolveFailed();
      return route.abort('failed');
    }
    assert.equal(url.hostname, 'marionettejs.com');
    if (url.pathname.startsWith('/assets/')) return route.fulfill({ contentType: 'text/javascript', body: await readFile(resolve('dist', '.' + url.pathname)) });
    return route.fulfill({ contentType: 'text/html', body: '<html><body>Synthetic transport fixture</body></html>' });
  });
  const sending = await transport.newPage();
  sending.on('requestfailed', request => { if (request.url().includes('eu.i.posthog.com')) resolveAborted(); });
  await sending.goto('https://marionettejs.com/demos/');
  await sending.evaluate(async () => {
    const source = await (await fetch('/assets/analytics-posthog.js')).text();
    const dependency = /from\s*["'](\.\/analytics\.js\?v=[a-f0-9]+)["']/.exec(source)[1];
    const tracker = await import('/assets/' + dependency.slice(2));
    const adapter = await import('/assets/analytics-posthog.js');
    window.fixture = { tracker, adapter };
    adapter.initializePostHog({ projectKey: 'phc_synthetic', cookielessServerHashConfirmed: true });
    tracker.track('workshop_run');
  });
  await bounded(pendingObserved, 'pending capture');
  const otherTab = await transport.newPage();
  await otherTab.goto('https://marionettejs.com/');
  await otherTab.evaluate(() => localStorage.setItem('marionette-analytics-opt-out', '1'));
  await bounded(abortedObserved, 'opt-out cancellation');
  assert.equal(await sending.evaluate(() => fixture.tracker.track('workshop_download')), false);
  assert.deepEqual(deliveries, ['workshop_run']);
  // Reload is required to allow capture after clearing an opt-out.
  await otherTab.evaluate(() => localStorage.removeItem('marionette-analytics-opt-out'));
  await sending.evaluate(() => {
    fixture.adapter.initializePostHog({ projectKey: 'phc_synthetic', cookielessServerHashConfirmed: true });
    fixture.tracker.track('workshop_download');
  });
  await bounded(failedObserved, 'failed delivery');
  await new Promise(resolve => setTimeout(resolve, 6500));
  assert.deepEqual(deliveries, ['workshop_run', 'workshop_download'], 'Failed delivery must not retry');
  await transport.close();
  console.log('PASS pending transport: cross-tab opt-out aborts in-flight capture, stops new events; failures have no retry');

} finally { await browser.close(); }
