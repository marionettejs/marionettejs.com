// Intercepted SDK/replay regression: no real events or recordings are sent.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
    window.__MARIONETTE_ANALYTICS_TEST__ = true;
  });
  const requests = [], errors = [];
  await context.addCookies([{ name: 'parent_cookie', value: 'PRIVATE_COOKIE', domain: '.marionettejs.com', path: '/', secure: true, sameSite: 'None' }]);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === 'e.marionettejs.com') {
      if (url.pathname.startsWith('/array/')) return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ sessionRecording: { endpoint: '/s/', sampleRate: 1, minimumDurationMilliseconds: 0, consoleLogRecordingEnabled: false } }) });
      requests.push({ path: url.pathname, data: JSON.parse(request.postData()), headers: await request.allHeaders() });
      return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status":1}' });
    }
    assert.equal(url.hostname, 'marionettejs.com');
    if (url.pathname.startsWith('/assets/')) return route.fulfill({ contentType: extname(url.pathname) === '.js' ? 'text/javascript' : 'text/css', body: await readFile(resolve('dist', '.' + url.pathname)) });
    return route.fulfill({ contentType: 'text/html', body: `<html><body><header class="site-header"><a href="/docs/api/region/?PRIVATE_QUERY#PRIVATE_FRAGMENT">Arbitrary link text</a></header><main><button data-workshop-stop>Arbitrary button text</button><textarea id="app-code">Public demo source</textarea><input id="demo-value" value="Public demo input"><input type="password" id="password"><a href="/private/PERSON">Private link</a><button id="unknown">Unknown</button></main><aside id="chat">UNRELATED_CHAT</aside><iframe sandbox="allow-scripts" srcdoc="UNRELATED_PREVIEW"></iframe><footer class="site-footer"></footer></body></html>` });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://marionettejs.com/?PRIVATE_QUERY#PRIVATE_FRAGMENT');
  await page.evaluate(async () => {
    const adapterSource = await (await fetch('/assets/analytics-posthog.js')).text();
    const dependency = /from\s*["'](\.\/analytics\.js\?v=[a-f0-9]+)["']/.exec(adapterSource)[1];
    const tracker = await import('/assets/' + dependency.slice(2));
    const adapter = await import('/assets/analytics-posthog.js');
    window.fixture = { tracker, adapter };
    const clickSource = await (await fetch('/assets/analytics-clicks.js')).text();
    const clicks = await import('/assets/analytics-clicks.js');
    clicks.installPublicClicks();
    document.querySelector('a').addEventListener('click', event => event.preventDefault());
    adapter.initializePostHog({ projectKey: 'phc_synthetic', replayFreeCapConfirmed: true });
  });
  await page.waitForTimeout(1200);
  await page.locator('#demo-value').fill('Visible demo input');
  await page.locator('#password').fill('PRIVATE_PASSWORD');
  await page.locator('#app-code').fill('Visible demo source');
  await page.locator('[data-workshop-stop]').click();
  await page.locator('header a').click();
  await page.locator('#unknown').click();
  await page.evaluate(() => history.pushState({}, '', '/docs/api/region/?PRIVATE_QUERY#PRIVATE_FRAGMENT'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(1500);
  const events = requests.filter(request => request.path === '/i/v0/e/').map(request => request.data);
  assert.equal(events.filter(event => event.event === '$pageview').length, 2);
  assert.ok(events.some(event => event.event === '$pageleave'));
  assert.equal(events.filter(event => event.event === 'site_click').length, 2);
  assert.ok(events.some(event => event.properties.target === 'workshop.stop'));
  const link = events.find(event => event.properties.target === 'link.page');
  assert.equal(link.properties.target_path, '/docs/api/region/');
  assert.equal(link.properties.placement, 'header');
  assert.ok(events.every(event => event.properties.analytics_test === true));
  assert.ok(events.every(event => event.distinct_id === events[0].distinct_id));
  assert.ok(events.some(event => event.properties.$prev_pageview_duration > 0));
  assert.ok(requests.every(request => request.headers.cookie === undefined && request.headers.referer === undefined));
  assert.ok(!JSON.stringify(events).includes('PRIVATE_'));
  const replay = requests.filter(request => request.path === '/s/');
  assert.ok(replay.length > 0, 'real bundled recorder must produce replay');
  const snapshots = replay.flatMap(request => request.data.properties.$snapshot_data);
  assert.ok(snapshots.some(event => event.type === 4 && event.data.href === 'https://marionettejs.com/'), 'player needs public page metadata');
  assert.ok(snapshots.some(event => event.type === 2 && event.data.node), 'player needs initial full snapshot');
  const recordings = JSON.stringify(replay.map(request => request.data));
  assert.ok(recordings.includes('Visible demo input'));
  assert.ok(recordings.includes('Visible demo source'));
  for (const value of ['PRIVATE_PASSWORD', 'PRIVATE_QUERY', 'PRIVATE_FRAGMENT', 'UNRELATED_CHAT', 'UNRELATED_PREVIEW']) assert.ok(!recordings.includes(value), value);
  const count = requests.length;
  await page.evaluate(() => { fixture.tracker.setAnalyticsOptOut(true); document.querySelector('#demo-value').value = 'AFTER_OPT_OUT'; });
  await page.waitForTimeout(2500);
  assert.equal(requests.length, count, 'opt-out must stop event and replay delivery');
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS standard reports: page views/leaves/duration, public link/button labels, anonymous session linkage, explicit test marker, no query/form values in events');
  console.log('PASS replay: public demo input/source visible, passwords/chat/opaque preview excluded, no URL query or cookie/referrer forwarding, opt-out stops recorder');
} finally { await browser.close(); }
