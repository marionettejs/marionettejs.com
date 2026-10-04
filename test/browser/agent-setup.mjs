import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    let file = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (file !== root && !file.startsWith(root + sep)) throw Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.setHeader('Content-Type', types[extname(file)] || 'text/plain');
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
await mkdir('output/playwright', { recursive: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copied = text; } } }));
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/docs/agent-start/`);
    const selector = page.getByLabel('Your coding agent', { exact: true });
    await selector.waitFor({ state: 'visible' });
    await selector.focus();
    await page.keyboard.type('Claude');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    assert.equal(await selector.inputValue(), 'claude', 'Native selector works from keyboard');
    for (const id of ['codex', 'claude', 'copilot', 'cursor', 'other']) {
      await selector.selectOption(id);
      assert.match(await page.locator('#agent-selection-status').textContent(), /setup instructions shown below/);
      const section = page.locator(`[data-agent-client="${id}"]`);
      assert.equal(await section.isVisible(), true);
      assert.equal(await page.locator('[data-agent-client]:visible').count(), 1);
      const controls = section.locator('.agent-copy-controls');
      for (let index = 0; index < await controls.count(); index++) {
        const button = controls.nth(index).getByRole('button');
        await button.focus();
        await page.keyboard.press('Enter');
        await controls.nth(index).getByRole('status').filter({ hasText: 'Copied.' }).waitFor();
        const expected = await section.locator('pre code').nth(index).textContent();
        assert.equal(await page.evaluate(() => window.copied), expected.trimEnd());
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${id} at ${width}px`);
      if (width !== 320 && ['codex', 'claude'].includes(id)) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `output/playwright/agent-setup-${id}-${width}.png`, fullPage: true });
      }
    }
  }
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw Error('Permission denied'); }; });
  const failure = page.locator('[data-agent-client="other"] .agent-copy-controls').first();
  await failure.getByRole('button').click();
  await failure.getByRole('status').filter({ hasText: 'Copy unavailable.' }).waitFor();
  assert.ok(await page.evaluate(() => getSelection().toString().includes('node -e')));
  assert.equal(await page.getByRole('heading', { name: 'Find the contract for your task', exact: false }).isVisible(), true);
  const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await staticPage.goto(`${base}/docs/agent-start/`);
  assert.equal(await staticPage.locator('[data-agent-client]:visible').count(), 5);
  assert.equal(await staticPage.locator('.agent-copy-controls').count(), 0);
  assert.equal(await staticPage.locator('.agent-selector').isVisible(), false);
  assert.equal(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await staticPage.screenshot({ path: 'output/playwright/agent-setup-no-js-390.png', fullPage: true });
  await page.goto(`${base}/#playground`);
  await page.waitForFunction(() => document.querySelector('#playground').open && window.MarionettePlayground);
  const download = page.waitForEvent('download');
  await page.locator('[data-workshop-download]').click();
  assert.match((await download).suggestedFilename(), /\.html$/);
  const next = page.locator('.workshop-next-steps');
  assert.equal(await next.isVisible(), true);
  assert.equal(await next.getByRole('link', { name: 'Equip your agent', exact: true }).getAttribute('href'), '/docs/agent-start/');
  assert.deepEqual(errors, []);
  console.log('PASS 5 clients at 1440/390/320px, keyboard selection and copying, clipboard denial, no-JS reading, workshop download → setup.');
} finally {
  await browser.close();
  server.close();
}
