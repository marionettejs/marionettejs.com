// Intercepted SDK/replay regression: no real events or recordings are sent.
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
function decode(request) {
  const bytes = request.postDataBuffer();
  if (bytes[0] === 31 && bytes[1] === 139) return JSON.parse(gunzipSync(bytes));
  const body = bytes.toString();
  if (body.startsWith('data=')) {
    const data = new URLSearchParams(body).get('data');
    return JSON.parse(new URL(request.url()).searchParams.get('compression') === 'base64' ? Buffer.from(data, 'base64').toString() : data);
  }
  return JSON.parse(body);
}
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
    window.__MARIONETTE_ANALYTICS_TEST__ = true;
  });
  const requests = [], errors = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === 'e.marionettejs.com') {
      if (url.pathname.startsWith('/array/')) return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ autocapture_opt_out: false, sessionRecording: { endpoint: '/s/', sampleRate: 1, minimumDurationMilliseconds: 0, consoleLogRecordingEnabled: false } }) });
      requests.push({ path: url.pathname, data: decode(request), headers: await request.allHeaders() });
      return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status":1}' });
    }
    assert.equal(url.hostname, 'marionettejs.com');
    if (url.pathname.startsWith('/assets/')) return route.fulfill({ contentType: extname(url.pathname) === '.js' ? 'text/javascript' : 'text/css', body: await readFile(resolve('dist', '.' + url.pathname)) });
    return route.fulfill({ contentType: 'text/html', body: `<html><head><style>body{color:rgb(12,34,56)}</style></head><body><header class="site-header"><a href="/docs/api/region/?PRIVATE_QUERY#PRIVATE_FRAGMENT">Arbitrary link text</a></header><main><textarea id="app-code">Public demo source</textarea><input id="demo-value" value="Public demo input"><input type="password" id="password"><a href="/private/PERSON">Private link</a><button id="unknown">Unknown</button></main><dialog id="playground" open><button data-workshop-stop>Arbitrary button text</button><input class="pagefind-ui__search-input" type="text"><div id="workshop-notes">PRIVATE_AGENT_LOG</div></dialog><aside id="chat">UNRELATED_CHAT</aside><iframe sandbox="allow-scripts" srcdoc="UNRELATED_PREVIEW"></iframe><footer class="site-footer"></footer></body></html>` });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://marionettejs.com/?utm_source=synthetic&utm_medium=referral#fixture', { referer: 'https://example.com/referral' });
  await page.evaluate(async () => {
    const adapterSource = await (await fetch('/assets/analytics-posthog.js')).text();
    const dependency = /from\s*["'](\.\/analytics\.js\?v=[a-f0-9]+)["']/.exec(adapterSource)[1];
    const tracker = await import('/assets/' + dependency.slice(2));
    const adapter = await import('/assets/analytics-posthog.js');
    window.fixture = { tracker, adapter };
    const clicks = await import('/assets/analytics-clicks.js');
    clicks.installPublicClicks();
    document.querySelector('a').addEventListener('click', event => event.preventDefault());
    adapter.initializePostHog({ projectKey: 'phc_synthetic', replayFreeCapConfirmed: true });
  });
  await page.waitForTimeout(1200);
  await page.locator('#demo-value').fill('Visible demo input');
  await page.locator('#password').fill('PRIVATE_PASSWORD');
  await page.locator('.pagefind-ui__search-input').fill('PRIVATE_SEARCH');
  await page.locator('#app-code').fill('Visible demo source');
  await page.locator('[data-workshop-stop]').click();
  await page.locator('header a').click();
  await page.locator('#unknown').click();
  await page.evaluate(() => history.pushState({}, '', '/docs/api/region/?PRIVATE_QUERY#PRIVATE_FRAGMENT'));
  await page.waitForTimeout(3500);
  await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(1500);
  const events = requests.filter(request => request.path === '/e/').flatMap(request => request.data.batch || request.data);
  assert.equal(events.filter(event => event.event === '$pageview').length, 2);
  assert.ok(events.some(event => event.event === '$pageleave'));
  assert.equal(events.filter(event => event.event === 'site_click').length, 2);
  assert.ok(events.some(event => event.event === '$autocapture'), 'ordinary controls must autocapture');
  assert.ok(events.every(event => event.properties.analytics_test === true));
  const view = events.find(event => event.event === '$pageview');
  assert.equal(view.properties.$referrer, 'https://example.com/referral');
  assert.equal(view.properties.utm_source, 'synthetic');
  assert.ok(view.properties.$browser);
  assert.ok(view.properties.$browser_language);
  assert.ok(view.properties.$device_type);
  assert.ok(view.properties.$timezone);
  assert.notEqual(view.properties.$geoip_disable, true);
  const replay = requests.filter(request => request.path === '/s/');
  assert.ok(replay.length > 0, 'real bundled recorder must produce replay');
  const snapshots = replay.flatMap(request => Array.isArray(request.data) ? request.data : [request.data]).flatMap(event => event.properties.$snapshot_data);
  for (const event of snapshots) {
    if (typeof event.data === 'string' && event.cv) event.data = JSON.parse(gunzipSync(Buffer.from(event.data, 'latin1')));
    else if (event.cv) for (const [key, value] of Object.entries(event.data)) {
      if (typeof value === 'string') event.data[key] = JSON.parse(gunzipSync(Buffer.from(value, 'latin1')));
    }
  }
  assert.ok(snapshots.some(event => event.type === 4), 'player needs page metadata');
  assert.ok(snapshots.some(event => event.type === 2 && event.data.node), 'player needs initial full snapshot');
  const recordings = JSON.stringify(snapshots);
  assert.ok(/rgb\(12,\s*34,\s*56\)/.test(recordings), 'replay CSS must retain visual styling');
  assert.ok(recordings.includes('Visible demo input'));
  assert.ok(recordings.includes('Visible demo source'));
  assert.ok(!recordings.includes('PRIVATE_PASSWORD'), 'built-in password protections');
  assert.ok(replay.flatMap(request => Array.isArray(request.data) ? request.data : [request.data]).every(event => event.properties.analytics_test === true));
  const count = requests.length;
  const otherTab = await context.newPage();
  await otherTab.goto('https://marionettejs.com/');
  await otherTab.evaluate(() => localStorage.setItem('marionette-analytics-opt-out', '1'));
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => fixture.tracker.track('workshop_run')), false, 'cross-tab preference stops named events');
  await page.locator('#unknown').click();
  await page.locator('#demo-value').fill('AFTER_OPT_OUT');
  await page.waitForTimeout(2500);
  assert.equal(requests.length, count, 'opt-out must stop event and replay delivery');
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS standard SDK: attribution, campaigns, device/language, autocapture, page views/leaves, test marker');
  console.log('PASS replay: styling/input/source retained, passwords protected, opt-out stops recorder');
} finally { await browser.close(); }
