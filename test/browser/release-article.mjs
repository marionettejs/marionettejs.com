import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { staticServer } from './static-server.mjs';
import '../../scripts/preview-release-article.mjs';

const { base, close } = await staticServer({ root: resolve('output/release-preview'), types: { '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' } });
const browser = await chromium.launch({ headless: true });
const evidence = [];
await mkdir('output/playwright/release-article', { recursive: true });
try {
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.goto(base);
    assert.equal(await page.locator('h1').innerText(), 'Marionette 5.1: Two more opinions.');
    assert.match(await page.locator('.draft-note').innerText(), /Not published/);
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex');
    const image = page.locator('img');
    assert.equal(await image.evaluate(async img => { await img.decode(); return img.naturalWidth; }), 1672);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px overflow`);
    assert.equal(await page.locator('a[href="https://marionettejs.com/docs/packages/html/"]').count(), 1);
    assert.equal(await page.locator('a[href="https://marionettejs.com/docs/packages/router/"]').count(), 1);
    await page.screenshot({ path: `output/playwright/release-article/${width}.png`, fullPage: true });
    // Chromium also makes the overflowing code block a keyboard stop.
    // Follow the real tab sequence rather than assuming the first stop is a link.
    let reachedLink = false;
    for (let stop = 0; stop < 5; stop++) {
      await page.keyboard.press('Tab');
      if (await page.locator('a').first().evaluate(a => a === document.activeElement)) { reachedLink = true; break; }
    }
    assert.equal(reachedLink, true, 'First reading link must be reachable without a focus trap');
    assert.deepEqual(errors, []);
    evidence.push({ width, imageDecoded: true, horizontalOverflow: false, keyboardFocus: true });
    await page.close();
  }
  // A preview test must not accidentally put release-day content into production.
  const feed = await readFile('dist/news/index.html', 'utf8');
  assert.ok(!feed.includes('Two more opinions.'));
  await writeFile('output/playwright/release-article/evidence.json', JSON.stringify(evidence, null, 2));
  console.log('Held article: desktop/intermediate/mobile screenshots, image, overflow and keyboard checks passed.');
} finally { await browser.close(); await close(); }

