import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { builtSite } from './built-site.mjs';

const { base, close } = await builtSite();
let browser;
try {
  browser = await chromium.launch({ channel: 'chromium', headless: true });
  await mkdir('output/playwright', { recursive: true });
  const errors = [];
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route('**/assets/hero.js*', async route => { await held; await route.continue(); });
    await page.addInitScript(() => {
      new MutationObserver(() => {
        const code = document.querySelector('.hero-code-slot .hero-code-panel:not([hidden]) pre');
        if (code && !window.firstLiveCode) window.firstLiveCode = {
          text: code.innerText, whitespace: getComputedStyle(code).whiteSpace,
          width: code.clientWidth, height: code.clientHeight,
        };
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(base);
    const fallback = page.locator('[data-static-code] .hero-code-panel:not([hidden]) pre');
    const first = await fallback.evaluate(el => ({ text: el.innerText, whitespace: getComputedStyle(el).whiteSpace, width: el.clientWidth, height: el.clientHeight }));
    assert.match(first.text, /const Heading = View.extend\(\{\n/);
    assert.match(first.text, /html`<h1>Pull a few strings\.<\/h1>`/);
    assert.doesNotMatch(first.text, /simplified Marionette sketch|loadCoolIdeas/);
    assert.equal(first.whitespace, 'pre');
    assert.equal(await page.locator('[data-static-code] [role="tab"]:disabled').count(), 5);
    await page.locator('.hero-code-frame').screenshot({ path: `output/playwright/hero-opening-static-${width}.png` });
    let scroll = 0;
    if (width === 390) {
      await fallback.focus();
      scroll = await fallback.evaluate(el => { el.scrollTop = 32; return el.scrollTop; });
    }
    release();
    await page.waitForFunction(() => window.firstLiveCode);
    assert.deepEqual(await page.evaluate(() => window.firstLiveCode), first, 'The first live code and formatting match the first paint');
    await page.waitForFunction(() => window.MarionetteHero?.inspect().ready);
    if (width === 390) {
      assert.equal(await page.locator('.hero-live-code').evaluate(el => el.open), true);
      const code = page.locator('.hero-code-panel:not([hidden]) pre');
      assert.equal(await code.evaluate(el => el === document.activeElement), true);
      assert.equal(await code.evaluate(el => el.scrollTop), scroll);
      assert.equal(await code.innerText(), first.text);
      assert.equal(await page.evaluate(() => MarionetteHero.inspect().following), false);
    }
    assert.equal(await page.locator('.hero-code-tabs [role="tab"]:disabled').count(), 0);
    await page.locator('.hero-code-frame').screenshot({ path: `output/playwright/hero-opening-live-${width}.png` });
    await page.close();
  }
  console.log('PASS opening: matching first/static/live View trace at desktop and 390px; delayed hydration retains reading focus, scroll and disclosure');

  for (const javaScriptEnabled of [false, true]) {
    const page = await browser.newPage({ javaScriptEnabled, viewport: { width: 390, height: 844 } });
    page.on('pageerror', error => errors.push(error.message));
    if (javaScriptEnabled) await page.route('**/assets/hero-code.js*', route => route.abort());
    await page.goto(base);
    if (javaScriptEnabled) {
      await page.locator('.hero-unavailable').waitFor();
      await page.locator('.lifecycle-live').waitFor();
    }
    const code = page.locator('[data-static-code] .hero-code-panel:not([hidden]) pre');
    assert.match(await code.innerText(), /const Heading = View.extend\(\{\n/);
    assert.equal(await code.evaluate(el => getComputedStyle(el).whiteSpace), 'pre');
    await code.focus();
    await code.press('PageDown');
    assert.equal(await code.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `output/playwright/hero-opening-${javaScriptEnabled ? 'module-failure' : 'no-js'}.png` });
    await page.close();
  }
  console.log('PASS no-JS and failed code-module fallback: readable indented code, keyboard access and no horizontal overflow');

  for (const width of [1440, 980, 792, 760, 640, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1400 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => window.MarionetteHero?.inspect().ready);
    if (width === 640) await page.addStyleTag({ content: '.site-header { position:sticky; top:12px; z-index:10; }' });
    if (width <= 420) await page.locator('.hero-code-toggle').click();
    const open = await page.locator('.hero-live-code').evaluate(el => el.open);
    for (const [index, id] of ['list', 'panel', 'idea', 'list'].entries()) {
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      const action = page.locator(`[data-feature="${id}"]`);
      if (index % 2) {
        await action.evaluate(el => el.focus({ preventScroll: true }));
        await action.press('Enter');
      } else await action.click();
      if (width <= 760) {
        const gap = await page.evaluate(() => {
          const header = document.querySelector('.site-header');
          const position = getComputedStyle(header).position;
          const bottom = ['fixed', 'sticky'].includes(position) ? header.getBoundingClientRect().bottom : 0;
          return document.querySelector('.hero-features-slot').getBoundingClientRect().top - bottom;
        });
        assert.ok(Math.abs(gap - 16) < 1, `${width}px actions sit below the navigation (${gap})`);
      } else assert.equal(await page.evaluate(() => scrollY), 0, 'Desktop selection does not scroll');
      assert.equal(await action.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator('.hero-live-code').evaluate(el => el.open), open);
    }
    await page.screenshot({ path: `output/playwright/hero-mobile-selection-${width}.png` });
    await page.close();
  }
  const smooth = await browser.newPage({ viewport: { width: 390, height: 844 } });
  smooth.on('pageerror', error => errors.push(error.message));
  await smooth.goto(base);
  await smooth.waitForFunction(() => window.MarionetteHero?.inspect().ready);
  await smooth.locator('[data-feature="list"]').click();
  await smooth.waitForFunction(() => Math.abs(document.querySelector('.hero-features-slot').getBoundingClientRect().top - 16) < 1);
  await smooth.close();
  assert.deepEqual(errors, []);
  console.log('PASS mobile actions: all three options, repeated pointer/keyboard selection, reduced/smooth motion, sticky-nav clearance, preserved focus/disclosure; desktop stays put');
} finally {
  await browser?.close();
  await close();
}
