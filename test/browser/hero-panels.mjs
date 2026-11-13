import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { builtSite } from './built-site.mjs';
import { mkdir } from 'node:fs/promises';
const { base, close } = await builtSite();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  await mkdir('output/playwright', { recursive: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const inspect = () => page.evaluate(() => window.MarionetteHero.inspect());
  const footprint = () => page.locator('.hero-interaction-stage').evaluate(el => {
    const r = el.getBoundingClientRect(); return { x:r.x, y:r.y+scrollY, width:r.width, height:r.height };
  });
  for (const [width, font] of [[1440,16],[760,16],[640,16],[444,16],[390,16],[320,16],[320,24],[320,32]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    await page.waitForFunction(() => window.MarionetteHero?.inspect().ready);
    await page.evaluate(size => document.documentElement.style.fontSize = size+'px', font);
    const initial = await footprint();
    assert.match(await page.locator('.hero-initial-purpose').innerText(), /Your agent learns the patterns\.\nYou direct the application\.\nThe code stays yours to follow\./);
    await page.locator('[data-feature="panel"]').click();
    const before = await inspect();
    const controls = await page.locator('.hero-panel-navigation').elementHandle();
    const content = await page.locator('.hero-panel-detail').elementHandle();
    const firstTitle = await page.locator('.hero-panel-detail h2').innerText();
    const next = page.getByRole('button', { name:'Next panel', exact:true });
    await next.focus(); await next.press('Enter');
    const after = await inspect();
    assert.equal(after.answer, before.answer, 'The parent View and its controls stay owned');
    assert.notEqual(after.panel, before.panel, 'The Region replaces its child View');
    assert.equal(after.previousPanelDestroyed, true);
    assert.equal(await content.evaluate(el => el.isConnected), false);
    assert.equal(await controls.evaluate(el => el === document.querySelector('.hero-panel-navigation')), true);
    assert.equal(await next.evaluate(el => el === document.activeElement), true);
    assert.notEqual(await page.locator('.hero-panel-detail h2').innerText(), firstTitle);
    await page.getByRole('button', { name:'Previous panel', exact:true }).press('Enter');
    assert.equal(await page.locator('.hero-panel-detail h2').innerText(), firstTitle);
    assert.deepEqual(await footprint(), initial, 'Panel replacement keeps the app footprint');
    for (const feature of ['list', 'idea']) {
      await page.locator(`[data-feature="${feature}"]`).click();
      if (feature === 'idea') await page.locator('.hero-another-idea').waitFor();
      assert.deepEqual(await footprint(), initial, `${feature} shares the reserved footprint`);
    }
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    if (width <= 420) await page.locator('.hero-code-toggle').click();
    const tabsFit = await page.locator('.hero-code-tabs').evaluate(el => {
      const box = el.getBoundingClientRect();
      return el.scrollWidth <= el.clientWidth && [...el.children].every(tab => {
        const r = tab.getBoundingClientRect(); return r.left >= box.left-1 && r.right <= box.right+1 && tab.scrollWidth <= tab.clientWidth;
      });
    });
    assert.equal(tabsFit, true, 'Every file tab and label fits');
    await page.getByRole('tab', { name:'Events.js', exact:true }).click();
    await page.locator('.hero-code-frame').screenshot({ path:`output/playwright/hero-files-${width}-${font}.png` });
    await page.locator('[data-feature="panel"]').click();
    await page.locator('.interactive-hero').screenshot({ path:`output/playwright/hero-panels-${width}-${font}.png` });
    console.log(`PASS ${width}px/${font}px text: real Region replacement and destruction, retained controls/focus, previous/next, exact footprint, fitting file tabs.`);
  }
  await page.goto(base+'/why/');
  assert.match(await page.locator('.integration-ledger').innerText(), /@mnjs\/html, based on Lit HTML/);
  await page.screenshot({ path:'output/playwright/why-rendering-320.png', fullPage:true });
  assert.deepEqual(errors, []);
  const staticPage = await browser.newPage({ javaScriptEnabled:false });
  await staticPage.goto(base);
  assert.equal(await staticPage.locator('h1').innerText(), 'Pull a few\nstrings.');
  assert.equal(await staticPage.getByRole('link', { name:/Explore Marionette/ }).count(), 1);
  assert.match(await staticPage.locator('.hero-initial-purpose').innerText(), /The code stays yours to follow/);
  console.log('PASS normal homepage remains readable without JavaScript; Lit wording rendered; no page exceptions.');
} finally { await browser?.close(); await close(); }
