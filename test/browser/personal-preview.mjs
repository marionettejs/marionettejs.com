// Focused, offline personal-app export and visual review against the pinned bundle.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { starter, runnerDocument, standaloneDocument } from '../../site/assets/playground-runtime.js';
import { codePenData } from '../../site/assets/playground-export.js';
const vendor = await readFile('site/vendor/demos.js', 'utf8');
const license = await readFile('site/vendor/DEMOS-LICENSE.txt', 'utf8');
const browser = await chromium.launch();
try {
  const penPage = await browser.newPage();
  const penErrors = [];
  penPage.on('pageerror', error => penErrors.push(error.message));
  async function loadPen(app) {
    const pen = codePenData(app, vendor, license);
    await penPage.goto('about:blank');
    await penPage.setContent(pen.html);
    await penPage.addStyleTag({ content: pen.css });
    // Execute the actual generated panel as a module, as in the current CodePen runtime.
    await penPage.addScriptTag({ type: 'module', content: pen.js });
  }
  await loadPen(starter);
  await penPage.getByRole('heading', { name: 'That counts.' }).waitFor();
  assert.equal(await penPage.locator('.victory').count(), 2);
  await penPage.locator('#victory-first span').click();
  assert.equal(await penPage.locator('#victory-first').getAttribute('aria-pressed'), 'true');
  assert.match(await penPage.locator('.tally').innerText(), /1\s+small victory/);
  await penPage.locator('#new-victory').fill('The exported app works');
  await penPage.locator('#new-victory').press('Enter');
  assert.equal(await penPage.locator('.victory').count(), 3);
  assert.equal(await penPage.locator('.victory-title').last().innerText(), 'The exported app works');
  await penPage.locator('#victory-added-1').click();
  assert.match(await penPage.locator('.tally').innerText(), /2\s+small victories/);
  // Exercise every supplied binding in both paths, including those unused by the starter.
  const bindings = { title: 'Runtime bindings', css: '', code: `
await Promise.resolve();
const bindings = { View, Region, CollectionView, Behavior, Application, MnObject, Events, Model, Collection, DataApi, StateApi };
for (const [name, value] of Object.entries(bindings)) {
  if (value == null) throw new Error('Missing runtime binding: ' + name);
}
export const region = new Region({ el: '#app' });
region.show(new View({ template: () => '<p id="bindings">' + Object.keys(bindings).join(', ') + '</p>' }));
` };
  await loadPen(bindings);
  const exportedBindings = await penPage.locator('#bindings').innerText();
  await penPage.goto('about:blank');
  await penPage.setContent(runnerDocument({ app: bindings, vendor, token: randomUUID(), standalone: true }));
  await penPage.locator('#bindings').waitFor();
  assert.equal(await penPage.locator('#bindings').innerText(), exportedBindings);
  assert.equal(await penPage.locator('#runner-errors').isVisible(), false);
  assert.deepEqual(penErrors, []);
  await penPage.close();
  console.log('PASS personal CodePen export: unchanged starter, module JS panel, all workshop bindings, rendered data interactions');
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
