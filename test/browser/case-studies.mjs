import assert from 'node:assert/strict';
import { staticServer } from './static-server.mjs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const { base, close } = await staticServer({ root, types });
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
  await page.locator('.study-hero img').evaluate(image => image.decode());
  return page;
};
const layout = async page => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow');
  const image = await page.locator('.study-hero img').evaluate(image => ({
    naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
    width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height,
    alt: image.alt
  }));
  assert.equal(image.naturalWidth, 1440, 'Uses the original full-resolution capture');
  assert.equal(image.naturalHeight, 900);
  assert.ok(image.width <= image.naturalWidth, 'The hero is not upscaled');
  assert.ok(Math.abs(image.width / image.height - 1440 / 900) < .01, 'The full capture keeps its aspect ratio');
  assert.match(image.alt, /task.*dark/i);
  assert.equal(await page.locator('input[type="range"], [data-image-comparison]').count(), 0);
  assert.match(await page.locator('.study-chart-bars').getAttribute('aria-label'), /0 to 4 seconds/);
  for (const [selector, expected] of [['.study-chart-vue', 92.98575], ['.study-chart-marionette', 25.89425]]) {
    const width = await page.locator(selector).evaluate(node => parseFloat(node.style.width));
    assert.ok(Math.abs(width - expected) < .001, 'Bar width retains the frozen measurement');
  }
  const spacing = await page.locator('.study-heading').evaluate(header => {
    const back = header.querySelector('.study-back').getBoundingClientRect();
    const label = header.querySelector('.eyebrow').getBoundingClientRect();
    return { gap: label.top - back.bottom, height: back.height, label: header.querySelector('.study-back').textContent };
  });
  assert.ok(spacing.gap >= 20, `Back-link gap ${spacing.gap}px`);
  assert.ok(spacing.height >= 44, 'Back link has a 44px target');
  assert.equal(spacing.label, '← News');
  assert.ok(await page.locator('.study-chart-legend').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 14, 'Chart labels remain readable');
};
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await setup(desktop);
  await layout(page);
  const heroLink = page.getByRole('link', { name: 'Open the full hero image' });
  await heroLink.focus();
  assert.equal(await heroLink.evaluate(link => document.activeElement === link), true);
  assert.equal(await heroLink.getAttribute('href'), '/assets/case-studies/vikunja/task-dark.png');
  await page.locator('.study-hero').screenshot({ path: `${evidence}/hero-desktop.png` });
  await page.locator('.study-heading').screenshot({ path: `${evidence}/heading-desktop.png` });
  await page.locator('.study-task-chart').screenshot({ path: `${evidence}/chart-desktop.png` });
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const phone = await setup(mobile);
  await layout(phone);
  await phone.locator('.study-hero').screenshot({ path: `${evidence}/hero-mobile.png` });
  await phone.locator('.study-heading').screenshot({ path: `${evidence}/heading-mobile.png` });
  await phone.locator('.study-task-chart').screenshot({ path: `${evidence}/chart-mobile.png` });
  await Promise.all([phone.waitForURL('**/assets/case-studies/vikunja/task-dark.png'), phone.getByRole('link', { name: 'View full size', exact: true }).tap()]);
  assert.equal(new URL(phone.url()).pathname, '/assets/case-studies/vikunja/task-dark.png', 'The mobile full-size link opens the original');
  await mobile.close();

  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await staticContext.route('https://**/*', request => request.abort());
  const staticPage = await staticContext.newPage();
  await staticPage.goto(base + route);
  await staticPage.locator('.study-hero img').evaluate(image => image.decode());
  await layout(staticPage);
  assert.equal(await staticPage.getByRole('link', { name: 'View full size', exact: true }).getAttribute('href'), '/assets/case-studies/vikunja/task-dark.png');
  await staticPage.locator('.study-hero').screenshot({ path: `${evidence}/hero-no-js.png` });
  await staticContext.close();
  assert.deepEqual(errors, []);
  console.log('PASS focused case-study check: original full-resolution static hero, desktop keyboard and mobile full-size link, responsive chart/navigation, accessible 0–4-second scale, no-JS rendering.');
} finally {
  await browser.close();
  await close();
}
