// Real Chromium, pinned browser library, static built artifact, and opaque-origin
// preview. Run npm run build before this command. No production host is involved.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { recipes, recipeRuntime } from '../../site/assets/playground-recipes.js';
import { starter } from '../../site/assets/playground-runtime.js';
const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let file = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (file !== root && !file.startsWith(root + sep)) throw Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, args: ['--enable-experimental-web-platform-features'] });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/#playground`);
  await page.waitForFunction(() => window.MarionettePlayground && document.querySelector('#playground').open);
  const api = async (method, input) => page.evaluate(({ method, input }) => window.MarionettePlayground[method](input), { method, input });
  const catalog = await api('listExamples');
  assert.equal(catalog.length, 4);
  assert.deepEqual(catalog[0].runtime, recipeRuntime);
  assert.ok(catalog.every(recipe => !('code' in recipe)));
  const preview = () => page.frames().find(frame => frame.parentFrame());
  async function load(id) {
    const loaded = await api('loadExample', { id });
    assert.equal(loaded.executed, false);
    const result = await api('run', { title: loaded.title, code: loaded.code, css: loaded.css });
    assert.deepEqual(result.preview.errors, [], JSON.stringify(result.preview));
    assert.equal(result.preview.ready, true);
    assert.equal(result.preview.recipe.checks.length, 0, 'No behavioral checks claimed before interaction');
    return result;
  }
  async function checked(id) {
    const state = await api('inspect');
    assert.deepEqual(state.preview.errors, []);
    const expected = recipes.find(recipe => recipe.id === id).checks.map(item => item.id).sort();
    assert.deepEqual(state.preview.recipe.checks.map(item => item.id).sort(), expected);
    assert.ok(state.preview.recipe.checks.every(item => item.expected === true && item.observed === true), JSON.stringify(state.preview.recipe));
    return state.preview.recipe;
  }
  const nextSteps = page.locator('.workshop-next-steps');
  assert.equal(await nextSteps.isVisible(), false);
  await api('run', { title: 'Failed first run', code: 'throw new Error("Startup failed");', css: '' });
  assert.equal(await nextSteps.isVisible(), false, 'A failed startup does not reveal next steps');
  await load('list-detail');
  assert.equal(await nextSteps.isVisible(), true);
  assert.equal(await nextSteps.locator('[data-workshop-codepen]').isVisible(), true);
  await api('update', { note: 'Try another title', title: 'An edited draft' });
  assert.equal(await nextSteps.isVisible(), true, 'Editing keeps next steps available');
  await nextSteps.screenshot({ path: 'output/playwright/next-steps-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await nextSteps.screenshot({ path: 'output/playwright/next-steps-mobile.png' });
  assert.equal(await page.locator('#playground').evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Mobile workshop does not overflow horizontally');
  await page.setViewportSize({ width: 1280, height: 720 });
  console.log('PASS next steps: hidden before success, visible after run and editing, mobile layout');
  const frame = preview();
  await frame.locator('#draft').fill('An unsaved idea');
  const input = await frame.locator('#draft').elementHandle();
  const row = await frame.locator('li').first().elementHandle();
  await frame.locator('#draft').press('Enter');
  assert.equal(await frame.locator('li').count(), 2);
  await frame.locator('#draft').press('Enter');
  assert.equal(await frame.locator('li').count(), 1);
  assert.equal(await input.evaluate(el => el === document.querySelector('#draft') && el === document.activeElement && el.value === 'An unsaved idea'), true);
  assert.equal(await row.evaluate(el => el === document.querySelector('li')), true);
  await checked('list-detail');
  await mkdir('output/playwright', { recursive: true });
  await page.screenshot({ path: 'output/playwright/agent-workshop.png' });
  console.log('PASS list/detail: actual keyboard focus, draft, DOM and View identity, sibling cleanup');

  await load('owned-widget');
  await preview().locator('#replace-widget').click();
  assert.match(await preview().locator('.widget').innerText(), /deliveries: 1/);
  await preview().locator('#destroy-owner').click();
  assert.equal(await preview().locator('#app').innerText(), '');
  const ownership = await checked('owned-widget');
  assert.ok(ownership.views.every(view => view.destroyed && !view.attached));
  assert.equal(ownership.lifecycle.filter(event => event === 'first-widget:destroy').length, 1);
  assert.equal(ownership.lifecycle.filter(event => event === 'replacement-widget:destroy').length, 1);
  console.log('PASS widget: real replacement, subscription release, owner and child destruction');

  await load('cancellable-work');
  await api('interact', { id: 'replace-worker', action: 'click' });
  await preview().locator('.result').filter({ hasText: 'Completed local work' }).waitFor();
  await checked('cancellable-work');
  console.log('PASS cancellation: aborted old task, no stale commit, replacement completed');

  await load('application-startup');
  await preview().locator('#verify-application').click();
  await preview().locator('#application-outcomes').filter({ hasText: /"destroyed": true|Check failed:/ }).waitFor();
  const outcomes = JSON.parse(await preview().locator('#application-outcomes').innerText());
  assert.deepEqual(outcomes, { cancelledStart: false, stopped: true, freshStart: true, failure: 'Local startup failed', destroyed: true, writes: ['fresh'] });
  const applicationChecks = await checked('application-startup');
  assert.equal(applicationChecks.views.find(view => view.name === 'application-root').destroyed, true);
  assert.equal(applicationChecks.regions.find(region => region.name === 'application.root').hasView, false);
  assert.equal(await preview().locator('.feature').innerText(), '');
  console.log('PASS Application startup: false cancellation, guarded writes, true readiness, failure rejection and cleanup');

  // Export must execute the same source, including cleanup, inside the same sandbox.
  await load('owned-widget');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('[data-workshop-download]').click();
  const download = await downloadEvent;
  const exported = await browser.newPage();
  await exported.setContent(await readFile(await download.path(), 'utf8'));
  await exported.locator('iframe').waitFor();
  const exportFrame = exported.frames().find(frame => frame.parentFrame());
  await exportFrame.locator('#replace-widget').click();
  assert.match(await exportFrame.locator('.widget').innerText(), /deliveries: 1/);
  await exportFrame.locator('#destroy-owner').click();
  assert.equal(await exportFrame.locator('#app').innerText(), '');
  await exported.close();
  console.log('PASS standalone export: pinned recipe interaction and cleanup');

  const native = await page.evaluate(() => Boolean(document.modelContext?.getTools && document.modelContext?.executeTool));
  assert.equal(native, true, 'Pinned Chromium must expose native WebMCP with experimental features enabled');
  const toolNames = await page.evaluate(async () => (await document.modelContext.getTools()).map(tool => tool.name));
  for (const name of ['list_marionette_examples', 'load_marionette_example', 'open_marionette_playground', 'update_marionette_workshop', 'run_marionette_app', 'inspect_marionette_app', 'interact_with_marionette_app', 'close_marionette_playground']) assert.ok(toolNames.includes(name), name);
  const nativeCatalog = await page.evaluate(async () => {
    const tool = (await document.modelContext.getTools()).find(tool => tool.name === 'list_marionette_examples');
    return document.modelContext.executeTool(tool, '{}');
  });
  assert.ok(JSON.stringify(nativeCatalog).includes('list-detail'));
  // Cancel a pending native tool execution; it must remove that run's iframe.
  await page.evaluate(async () => {
    const tool = (await document.modelContext.getTools()).find(tool => tool.name === 'run_marionette_app');
    const controller = new AbortController();
    const pending = document.modelContext.executeTool(tool, JSON.stringify({ title: 'Pending startup', code: 'await new Promise(() => {});', css: '' }), { signal: controller.signal });
    setTimeout(() => controller.abort(), 100);
    let deadline;
    try { await Promise.race([pending, new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Native cancellation did not settle within 2 seconds')), 2000); })]); } catch (error) { if (error.name !== 'AbortError') throw error; } finally { clearTimeout(deadline); }
  });
  await page.waitForFunction(() => !document.querySelector('.workshop-preview iframe'));
  assert.equal((await api('inspect')).previewActive, false);
  console.log('PASS native WebMCP: eight registered tools, discovery, execution and cancellation');
  // A late cancellation belongs to A even after B replaces it. Use native
  // executeTool for both runs and the subsequent interaction, not mocked hooks.
  await page.evaluate(async () => {
    const tool = (await document.modelContext.getTools()).find(tool => tool.name === 'run_marionette_app');
    const controller = new AbortController();
    const pending = document.modelContext.executeTool(tool, JSON.stringify({ title: 'Superseded A', code: 'await new Promise(() => {});', css: '' }), { signal: controller.signal }).catch(error => {
      if (error.name !== 'AbortError') throw error;
    });
    window.supersededRunTest = { controller, pending };
  });
  await page.locator('iframe[title="App preview: Superseded A"]').waitFor();
  await page.evaluate(async app => {
    const tool = (await document.modelContext.getTools()).find(tool => tool.name === 'run_marionette_app');
    await document.modelContext.executeTool(tool, JSON.stringify(app));
  }, { ...starter, title: 'Replacement B' });
  const replacementFrame = await page.locator('iframe[title="App preview: Replacement B"]').elementHandle();
  await page.evaluate(async () => {
    window.supersededRunTest.controller.abort();
    let deadline;
    try { await Promise.race([window.supersededRunTest.pending, new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Superseded execution did not settle within 2 seconds')), 2000); })]); } finally { clearTimeout(deadline); }
    delete window.supersededRunTest;
    const tool = (await document.modelContext.getTools()).find(tool => tool.name === 'interact_with_marionette_app');
    await document.modelContext.executeTool(tool, JSON.stringify({ id: 'celebrate', action: 'click' }));
  });
  const replacementState = await api('inspect');
  assert.equal(replacementState.title, 'Replacement B');
  assert.equal(replacementState.previewActive, true);
  assert.equal(replacementState.preview.region.hasView, true);
  assert.deepEqual(replacementState.preview.errors, []);
  assert.match(replacementState.preview.text, /1 small victory/);
  assert.equal(await replacementFrame.evaluate(el => el === document.querySelector('.workshop-preview iframe') && el.isConnected), true);
  console.log('PASS superseded native run: late abort leaves replacement iframe and interaction alive');

  const brokenInspector = await api('run', { title: 'Inspector failure', code: 'export function inspectRecipe() { throw new Error("Recipe inspection failed"); }', css: '' });
  assert.equal(brokenInspector.preview.ready, true);
  assert.equal(brokenInspector.preview.recipe.inspectionError, 'Recipe inspection failed');
  const bounded = await api('run', { title: 'Bounded observation', code: 'export function inspectRecipe() { return { lifecycle: Array(100).fill("x".repeat(500)), checks: Array(100).fill({ id: "y".repeat(200), expected: true, observed: true }) }; }', css: '' });
  assert.equal(bounded.preview.recipe.truncated, true);
  assert.equal(bounded.preview.recipe.lifecycle.length, 40);
  assert.equal(bounded.preview.recipe.lifecycle[0].length, 120);
  assert.equal(bounded.preview.recipe.checks[0].id.length, 80);
  console.log('PASS inspection boundaries: thrown inspectors and oversized app observations');
  const troubleshooting = await readFile(resolve('content/development-docs/docs/troubleshooting.md'), 'utf8');
  const examples = [...troubleshooting.matchAll(/<!-- troubleshooting-example: (MN\d{4}) -->\s*```javascript\n([\s\S]*?)\n```/g)];
  assert.equal(examples.length, 4);
  const expected = { MN0020: 'Ready', MN0003: true, MN0023: 'Save', MN0007: 'New' };
  for (const [, code, source] of examples) {
    const result = await page.evaluate(async source => {
      const vendor = new URL('/vendor/marionette.js', location.href).href;
      const url = URL.createObjectURL(new Blob([source.replace("'marionette'", JSON.stringify(vendor))], { type: 'text/javascript' }));
      try {
        const example = await import(url);
        try {
          let failure;
          try { example.fail(); } catch (error) { failure = error.code; }
          return { failure, fixed: example.fix() };
        } finally { example.cleanup(); }
      } finally { URL.revokeObjectURL(url); }
    }, source);
    assert.deepEqual(result, { failure: code, fixed: expected[code] });
  }
  console.log('PASS troubleshooting: four exact failing/fixed examples against pinned published beta.1');
  let licenseRequests = 0;
  await page.route('**/vendor/MARIONETTE-LICENSE.txt', route => {
    licenseRequests++;
    return licenseRequests === 1 ? route.fulfill({ status: 503, body: 'Temporary failure' }) : route.continue();
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => document.querySelector('#codepen-help').textContent.includes('could not load') && window.MarionettePlayground);
  assert.equal(await page.locator('[data-workshop-codepen]').isDisabled(), true);
  await api('open');
  assert.equal(licenseRequests, 2);
  assert.equal(await page.locator('[data-workshop-codepen]').isEnabled(), true);
  assert.match(await page.locator('#codepen-help').innerText(), /Free Pens are public/);
  await page.unroute('**/vendor/MARIONETTE-LICENSE.txt');
  console.log('PASS CodePen recovery: transient preload failure, workshop retry, enabled export and restored help');
  await page.goto(`http://127.0.0.1:${server.address().port}/development/`);
  await page.locator('h1').waitFor();
  assert.match(await page.locator('h1').innerText(), /Develop against the current candidate/);
  await page.screenshot({ path: 'output/playwright/development-guide.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of ['/development/', '/troubleshooting/', '/errors/MN0020/']) {
    await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${route} fits a phone viewport`);
  }
  await page.screenshot({ path: 'output/playwright/diagnostic-mobile.png', fullPage: true });
  console.log('PASS development reading path: desktop guide and three phone-width pages');
  assert.deepEqual(pageErrors, []);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
