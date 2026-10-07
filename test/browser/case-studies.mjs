import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    let file = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (file !== root && !file.startsWith(root + sep)) throw Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const evidence = 'output/playwright/case-studies';
await mkdir(evidence, { recursive: true });
const errors = [];
const route = '/case-studies/vikunja/';
const setup = async context => {
  await context.route('https://**/*', request => request.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + route);
  await page.locator('.study-comparison-controls').waitFor({ state: 'visible' });
  await page.locator('.study-comparison-frame').scrollIntoViewIfNeeded();
  await page.locator('.study-comparison-frame img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  return page;
};
const value = page => page.locator('[data-comparison-range]').inputValue().then(Number);
const assertValue = async (page, expected) => {
  assert.equal(await value(page), expected);
  assert.equal(await page.locator('[data-comparison-frame]').evaluate(frame => frame.style.getPropertyValue('--comparison-split')), `${expected}%`);
};
const layout = async page => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow');
  const crops = await page.locator('.study-comparison-crop img').evaluateAll(images => images.map(image => {
    const imageBounds = image.getBoundingClientRect();
    const frameBounds = image.parentElement.getBoundingClientRect();
    return { x: (frameBounds.left - imageBounds.left) / imageBounds.width * image.naturalWidth,
      y: (frameBounds.top - imageBounds.top) / imageBounds.height * image.naturalHeight,
      width: frameBounds.width / imageBounds.width * image.naturalWidth,
      height: frameBounds.height / imageBounds.height * image.naturalHeight };
  }));
  for (const [index, crop] of crops.entries()) {
    const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < .2, `crop ${index}: ${actual} vs ${expected}`);
    near(crop.x, index === 0 ? 760 : 40); near(crop.y, 183); near(crop.width, 720); near(crop.height, 451);
  }
  const spacing = await page.locator('.study-heading').evaluate(header => {
    const back = header.querySelector('.study-back').getBoundingClientRect();
    const label = header.querySelector('.eyebrow').getBoundingClientRect();
    return { gap: label.top - back.bottom, height: back.height, label: header.querySelector('.study-back').textContent };
  });
  assert.ok(spacing.gap >= 20, `Back-link gap ${spacing.gap}px`);
  assert.ok(spacing.height >= 44, 'Back link has a 44px target');
  assert.equal(spacing.label, '← Case Studies');
  assert.ok(await page.locator('.study-chart-legend').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 14, 'Chart labels remain readable');
};
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await setup(desktop);
  await assertValue(page, 50);
  const frame = await page.locator('[data-comparison-frame]').boundingBox();
  const handle = await page.locator('[data-comparison-handle]').boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(frame.x + frame.width * .25, handle.y + handle.height / 2, { steps: 5 });
  await page.mouse.up();
  await assertValue(page, 25);
  const input = page.locator('[data-comparison-range]');
  await input.focus();
  await page.keyboard.press('Home'); await assertValue(page, 0);
  await page.keyboard.press('ArrowRight'); await assertValue(page, 1);
  await page.keyboard.press('End'); await assertValue(page, 100);
  await page.keyboard.press('ArrowLeft'); await assertValue(page, 99);
  assert.match(await input.getAttribute('aria-valuetext'), /99% Vue \/ 1% Marionette v5 RC2/);
  assert.equal(await page.locator('.study-comparison-frame').evaluate(frame => getComputedStyle(frame).outlineStyle), 'solid');
  await layout(page);
  // Native keyboard positions exercise both endpoints and preserve a useful paired screenshot.
  await page.keyboard.press('Home');
  for (let index = 0; index < 50; index++) await page.keyboard.press('ArrowRight');
  await page.locator('.study-comparison-hero').screenshot({ path: `${evidence}/comparison-desktop.png` });
  await page.locator('.study-heading').screenshot({ path: `${evidence}/heading-desktop.png` });
  await page.locator('.study-task-chart').screenshot({ path: `${evidence}/chart-desktop.png` });
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const phone = await setup(mobile);
  const touchFrame = await phone.locator('[data-comparison-frame]').boundingBox();
  const touchHandle = await phone.locator('[data-comparison-handle]').boundingBox();
  const session = await mobile.newCDPSession(phone);
  const y = touchHandle.y + touchHandle.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchHandle.x + touchHandle.width / 2, y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchFrame.x + touchFrame.width * .75, y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await assertValue(phone, 75);
  await phone.locator('[data-comparison-range]').scrollIntoViewIfNeeded();
  const mobileInput = await phone.locator('[data-comparison-range]').boundingBox();
  await phone.touchscreen.tap(mobileInput.x + mobileInput.width * .25, mobileInput.y + mobileInput.height / 2);
  assert.ok(Math.abs(await value(phone) - 25) <= 3, `Native range responds to touch: value=${await value(phone)}, y=${mobileInput.y}`);
  await layout(phone);
  await phone.locator('.study-comparison-hero').screenshot({ path: `${evidence}/comparison-mobile.png` });
  await phone.locator('.study-heading').screenshot({ path: `${evidence}/heading-mobile.png` });
  await phone.locator('.study-task-chart').screenshot({ path: `${evidence}/chart-mobile.png` });
  await mobile.close();

  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await staticContext.route('https://**/*', request => request.abort());
  const staticPage = await staticContext.newPage();
  await staticPage.goto(base + route);
  assert.equal(await staticPage.locator('[data-comparison-controls]').isVisible(), false);
  assert.equal(await staticPage.locator('[data-comparison-before]').isVisible(), false);
  assert.equal(await staticPage.locator('.study-comparison-crop').first().isVisible(), true);
  const link = staticPage.getByRole('link', { name: 'Open the original paired capture' });
  assert.equal(await link.getAttribute('href'), '/assets/case-studies/vikunja/hero.png');
  assert.equal(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await staticPage.locator('.study-comparison-hero').screenshot({ path: `${evidence}/comparison-no-js.png` });
  await staticContext.close();
  assert.deepEqual(errors, []);
  console.log('PASS focused case-study check: desktop pointer drag, native keyboard/endpoints/focus, mobile touch drag/range, equal authentic crops, responsive chart/navigation, no-JS fallback.');
} finally {
  await browser.close();
  server.close();
}
