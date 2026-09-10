// Focused, offline personal-app export and visual review against the pinned bundle.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { starter, standaloneDocument } from '../../site/assets/playground-runtime.js';
const vendor = await readFile('site/vendor/demos.js', 'utf8');
const license = await readFile('site/vendor/DEMOS-LICENSE.txt', 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 820, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(standaloneDocument(starter, vendor, license, randomUUID()));
  const app = page.frameLocator('iframe');
  await app.getByRole('heading', { name: 'That counts.' }).waitFor();
  await app.locator('#victory-first span').click();
  assert.equal(await app.locator('#victory-first').getAttribute('aria-pressed'), 'true');
  await app.getByRole('textbox', { name: 'A small victory', exact: true }).fill('Made something personal');
  await app.getByRole('button', { name: 'Add' }).click();
  assert.equal(await app.locator('.victory').count(), 3);
  await app.locator('#new-victory').fill('Keyboard counts too');
  await app.locator('#new-victory').press('Enter');
  assert.equal(await app.locator('.victory').count(), 4);
  await mkdir('output/playwright', { recursive: true });
  for (const [name, width] of [['desktop', 820], ['mobile', 390]]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await app.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ path: `output/playwright/personal-export-${name}.png` });
  }
  assert.deepEqual(errors, []);
  assert.equal(await app.locator('#runner-errors').isVisible(), false);
  let externalRequests = 0;
  await page.route('https://example.invalid/**', route => { externalRequests++; return route.abort(); });
  await app.locator('body').evaluate(() => {
    const form = document.createElement('form');
    form.action = 'https://example.invalid/blocked';
    document.body.append(form);
    form.submit();
  });
  await app.locator('#runner-errors').filter({ hasText: 'form-action' }).waitFor();
  assert.equal(externalRequests, 0);
  assert.equal(await app.getByRole('heading', { name: 'That counts.' }).count(), 1);
  console.log('PASS sandbox form boundary: normal submit events work, external submission blocked before request');
  console.log('PASS personal standalone export: native data, add/toggle controls, desktop/mobile layout; screenshots saved');
} finally { await browser.close(); }
