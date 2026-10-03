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
  await context.addCookies([{ name: 'analytics_test_cookie', value: 'PRIVATE', domain: 'e.marionettejs.com', path: '/', secure: true, sameSite: 'None' }]);
  const requests = [];
  const errors = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'e.marionettejs.com') {
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
  assert.equal(requests.length, 0, 'Disabled fixture config must not send analytics');
  await context.close();
  // Privacy signals must stop the real adapter before any proxy request.
  for (const signal of ['globalPrivacyControl', 'doNotTrack']) {
    const privacyContext = await browser.newContext();
    await privacyContext.addInitScript(signal => {
      Object.defineProperty(navigator, signal, { get: () => signal === 'globalPrivacyControl' ? true : '1' });
    }, signal);
    let proxyRequests = 0;
    await privacyContext.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'e.marionettejs.com') { proxyRequests++; return route.abort(); }
      assert.equal(url.hostname, 'marionettejs.com');
      if (url.pathname.startsWith('/assets/')) return route.fulfill({ contentType: 'text/javascript', body: await readFile(resolve('dist', '.' + url.pathname)) });
      return route.fulfill({ contentType: 'text/html', body: '<html><body>Privacy signal fixture</body></html>' });
    });
    const privacyPage = await privacyContext.newPage();
    await privacyPage.goto('https://marionettejs.com/');
    assert.equal(await privacyPage.evaluate(async () => {
      const adapter = await import('/assets/analytics-posthog.js');
      return adapter.initializePostHog({ projectKey: 'phc_synthetic', replayFreeCapConfirmed: false });
    }), false);
    assert.equal(proxyRequests, 0, `${signal} must prevent proxy delivery`);
    assert.deepEqual(await privacyContext.cookies(), []);
    await privacyContext.close();
  }
  console.log('PASS GPC and DNT prevent managed-proxy initialization and delivery');
  // Regression: an indefinitely stalled analytics module must not block controls.
  const slow = await browser.newContext();
  let pendingAdapter, resolveAdapter;
  const adapterObserved = new Promise(resolve => { resolveAdapter = resolve; });
  await slow.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'marionettejs.com') return route.abort();
    if (url.pathname === '/assets/analytics-config.js') return route.fulfill({ contentType: 'text/javascript', body: 'export const analyticsConfig={projectKey:"phc_synthetic",cookielessServerHashConfirmed:true};' });
    if (url.pathname === '/assets/analytics-posthog.js') { pendingAdapter = route; resolveAdapter(); return; }
    const file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    try { return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream', body: await readFile(resolve('dist', '.' + file)) }); }
    catch { return route.abort(); }
  });
  const control = await slow.newPage();
  await control.goto('https://marionettejs.com/privacy/', { waitUntil: 'domcontentloaded' });
  await bounded(adapterObserved, 'stalled SDK request');
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

} finally { await browser.close(); }
