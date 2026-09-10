// Real Chromium, pinned browser library, static built artifact, and opaque-origin
// preview. Run npm run build before this command. No production host is involved.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { recipes, recipeRuntime } from '../../site/assets/playground-recipes.js';
import { starter } from '../../site/assets/playground-runtime.js';
import { runnerDocument } from '../../site/assets/playground-runtime.js';
import { compileProject } from '../../tools/demo-project.js';
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
  assert.equal(await page.locator('[data-example-id]').count(), 0, 'Backstage has no example chooser');
  assert.equal(await page.evaluate(() => 'loadExample' in window.MarionettePlayground), false);
  const nextSteps = page.locator('.workshop-next-steps');
  assert.equal(await nextSteps.isVisible(), false);
  await api('run', { title: 'Failed first run', code: 'throw new Error("Startup failed");', css: '' });
  assert.equal(await nextSteps.isVisible(), false);
  await api('run', { ...starter, title: 'My personal app' });
  await api('interact', { id: 'celebrate', action: 'click' });
  assert.equal(await nextSteps.isVisible(), true);
  const personalFrame = await page.locator('.workshop-preview iframe').elementHandle();
  await page.locator('#app-code').fill(starter.code + '\n// Keep this unrun edit.');
  const personalDraft = (await api('inspect', { includeSource: true })).draft;
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator('#playground').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  await page.setViewportSize({ width: 1280, height: 720 });
  console.log('PASS Backstage: personal app only, successful-run exports, mobile layout');

  const galleryPage = await browser.newPage({ reducedMotion: 'reduce' });
  await galleryPage.goto(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(await galleryPage.locator('.home-demo-cards a').count(), 3);
  assert.equal(await galleryPage.locator('.home-demo-cards a[href="/demos/#mission-control"] strong').innerText(), 'Cheese Patrol');
  assert.equal(await galleryPage.evaluate(() => document.querySelector('.night-closing').nextElementSibling.id === 'demos' && document.querySelector('#demos').nextElementSibling.classList.contains('home-support')), true);
  await galleryPage.locator('.home-demo-cards a[href="/demos/#list-detail"]').click();
  await galleryPage.waitForFunction(() => window.MarionetteExamples);
  const exampleApi = async (method, input) => galleryPage.evaluate(({ method, input }) => window.MarionetteExamples[method](input), { method, input });
  const catalog = await exampleApi('list');
  assert.equal(catalog.length, 3);
  assert.deepEqual(catalog[0].runtime, recipeRuntime);
  assert.equal(await galleryPage.locator('#playground').count(), 0, 'Examples has no Backstage dialog');
  assert.equal(await galleryPage.locator('nav[aria-label="Main navigation"] a[aria-current="page"]').innerText(), 'Demos');
  assert.equal(await galleryPage.evaluate(() => document.querySelector('.example-chooser').getBoundingClientRect().bottom <= document.querySelector('.example-workbench').getBoundingClientRect().top), true);
  const preview = () => galleryPage.frames().find(frame => frame.parentFrame());
  async function load(id) {
    const result = await exampleApi('select', { id });
    assert.deepEqual(result.preview.errors, [], JSON.stringify(result.preview));
    assert.equal(result.preview.ready, true);
    assert.equal(result.preview.recipe.checks.length, 0, 'No behavioral checks before interaction');
    return result;
  }
  async function checked(id) {
    const state = await exampleApi('inspect');
    assert.deepEqual(state.preview.errors, []);
    assert.deepEqual(state.preview.recipe.checks.map(item => item.id).sort(), recipes.find(recipe => recipe.id === id).checks.map(item => item.id).sort());
    assert.ok(state.preview.recipe.checks.every(item => item.expected === true && item.observed === true), JSON.stringify(state.preview.recipe));
    return state.preview.recipe;
  }
  await load('list-detail');
  const frame = preview();
  await frame.locator('.notes-experiment > summary').click();
  await frame.locator('#draft').fill('An unsaved idea');
  const input = await frame.locator('#draft').elementHandle();
  const row = await frame.locator('.todo-item').first().elementHandle();
  await frame.locator('#draft').press('Enter');
  assert.equal(await frame.locator('.todo-item').count(), 2);
  await frame.locator('#draft').press('Enter');
  assert.equal(await frame.locator('.todo-item').count(), 1);
  assert.equal(await input.evaluate(el => el === document.querySelector('#draft') && el === document.activeElement && el.value === 'An unsaved idea'), true);
  assert.equal(await row.evaluate(el => el === document.querySelector('.todo-item')), true);
  await checked('list-detail');
  await mkdir('output/playwright', { recursive: true });
  await galleryPage.screenshot({ path: 'output/playwright/agent-workshop.png' });
  console.log('PASS list/detail: actual keyboard focus, draft, DOM and View identity, sibling cleanup');

  await frame.locator('#new-todo').fill('  Learn the tiny framework  ');
  await frame.locator('#new-todo').press('Enter');
  assert.equal(await frame.locator('.todo-item').count(), 2);
  const added = frame.locator('.todo-item').last();
  assert.equal(await added.locator('.todo-title').innerText(), 'Learn the tiny framework');
  await added.locator('.todo-title').dblclick();
  await added.locator('.edit').fill('Never mind');
  await added.locator('.edit').press('Escape');
  assert.equal(await added.locator('.todo-title').innerText(), 'Learn the tiny framework');
  await added.locator('.todo-title').dblclick();
  await added.locator('.edit').fill('<img src=x onerror=alert(1)>');
  await added.locator('.edit').press('Enter');
  assert.equal(await added.locator('.todo-title').innerText(), '<img src=x onerror=alert(1)>');
  assert.equal(await added.locator('img').count(), 0);
  await added.locator('.toggle').check();
  assert.equal(await frame.locator('#todo-count').innerText(), '1 item left');
  await frame.locator('[data-filter="active"]').click();
  assert.equal(await frame.locator('.todo-item:visible').count(), 1);
  assert.equal(await frame.evaluate(() => location.hash), '#/active');
  await frame.locator('[data-filter="completed"]').click();
  assert.equal(await frame.locator('.todo-item:visible').count(), 1);
  await frame.locator('[data-filter="all"]').click();
  await frame.locator('#clear-completed').click();
  assert.equal(await frame.locator('.todo-item').count(), 1);
  await frame.locator('#toggle-all').click();
  assert.equal(await frame.locator('#todo-count').innerText(), '0 items left');
  await frame.locator('#toggle-all').click();
  assert.equal(await frame.locator('#todo-count').innerText(), '1 item left');
  await frame.locator('.todo-item').hover();
  await frame.locator('.delete-todo').click();
  assert.equal(await frame.locator('.todo-item').count(), 0);
  await frame.locator('#new-todo').fill('   ');
  await frame.locator('#new-todo').press('Enter');
  assert.equal(await frame.locator('.todo-item').count(), 0);
  await frame.locator('#new-todo').fill('Test blur');
  await frame.locator('#new-todo').press('Enter');
  await frame.locator('.todo-title').dblclick();
  await frame.locator('.edit').fill('Saved on blur');
  await frame.locator('#new-todo').click();
  assert.equal(await frame.locator('.todo-title').innerText(), 'Saved on blur');
  assert.equal(await frame.locator('#new-todo').evaluate(el => document.activeElement === el), true, 'Blur save preserves the next control focus');
  await frame.locator('.todo-title').press('Space');
  await frame.locator('.edit').fill('Keyboard saved');
  await frame.locator('.edit').press('Enter');
  assert.equal(await frame.locator('.todo-title').evaluate(el => document.activeElement === el), true);
  await frame.locator('.todo-title').press('Enter');
  await frame.locator('.edit').fill('Discard me');
  await frame.locator('.edit').press('Escape');
  assert.equal(await frame.locator('.todo-title').innerText(), 'Keyboard saved');
  assert.equal(await frame.locator('.todo-title').evaluate(el => document.activeElement === el), true);

  await frame.locator('.todo-title').dblclick();
  await frame.locator('.edit').fill('   ');
  await frame.locator('.edit').press('Enter');
  assert.equal(await frame.locator('.todo-item').count(), 0);
  assert.equal(await frame.locator('.todo-footer').isVisible(), false);
  assert.equal(await frame.locator('#draft').inputValue(), 'An unsaved idea');
  console.log('PASS todos: add, trim, edit, escape, safe text, complete, filters, count, clear, toggle all, delete, empty input');

  await load('owned-widget');
  const radio = preview();
  const liveFrames = radio.locator('#experiment .radio-frames');
  const initialFrames = await liveFrames.innerText();
  await radio.waitForFunction(initial => document.querySelector('#experiment .radio-frames').textContent !== initial, initialFrames);
  await radio.locator('.pause-radio').click();
  const pausedFrames = await liveFrames.innerText();
  await radio.locator('.pause-radio').filter({ hasText: 'Resume' }).waitFor();
  await radio.locator('.pause-radio').click();
  await radio.waitForFunction(initial => document.querySelector('#experiment .radio-frames').textContent !== initial, pausedFrames);
  const retiredCounter = await liveFrames.elementHandle();
  await radio.locator('#broadcast-radio').click();
  assert.match(await radio.locator('#experiment .widget').innerText(), /Broadcasts heard: 1/);
  await radio.locator('#replace-widget').click();
  assert.match(await radio.locator('#experiment .widget').innerText(), /Broadcasts heard: 0/);
  assert.match(await radio.locator('.retired-radio .widget').innerText(), /Broadcasts heard: 1/);
  await radio.locator('#broadcast-radio').click();
  await radio.locator('#broadcast-radio').click();
  assert.match(await radio.locator('.retired-radio .widget').innerText(), /Broadcasts heard: 1/);
  assert.match(await radio.locator('.story').innerText(), /Live receiver: 2. Retired receiver: 1/);
  const retiredFrames = await retiredCounter.textContent();
  const expandedHeight = await radio.locator('#app').evaluate(el => Math.ceil(el.getBoundingClientRect().height));
  await galleryPage.waitForFunction(height => document.querySelector('.example-preview iframe').getBoundingClientRect().height >= height, expandedHeight);
  await radio.waitForFunction(() => parseInt(document.querySelector('#experiment .radio-frames').textContent) > 5);
  assert.equal(await retiredCounter.textContent(), retiredFrames, 'Disposed frame loop stays stopped');
  assert.match(await radio.locator('#experiment .widget').innerText(), /Broadcasts heard: 2/);
  await radio.locator('#destroy-owner').click();
  assert.equal(await radio.locator('#experiment').innerText(), '');
  const ownership = await checked('owned-widget');
  assert.ok(ownership.views.every(view => view.destroyed && !view.attached));
  console.log('PASS widget: live motion, pause/resume, disposed frame loop freezes, subscriptions and owner cleanup');

  await load('mission-control');
  const flight = preview();
  assert.equal(await galleryPage.locator('#example-title').innerText(), 'Cheese Patrol');
  assert.equal(await flight.locator('h1').innerText(), 'Cheese Patrol');
  assert.equal(await flight.locator('.lesson-question').count(), 0, 'Mission has one concise introduction');
  assert.equal(await flight.locator('.proof').getAttribute('open'), null);
  assert.equal(await flight.locator('#destroy-station').isVisible(), false);
  await flight.locator('.station-more > summary').click();
  await flight.locator('.station-more > summary').click();
  await flight.locator('#open-station').click();
  assert.equal(await flight.locator('.station-more').getAttribute('open'), null, 'Closed exploration stays closed across state changes');
  await flight.locator('.station-more > summary').click();
  await flight.locator('#close-station').click();
  await flight.locator('.station-status').filter({ hasText: 'CLOSED.' }).waitFor();
  await galleryPage.locator('.example-preview').screenshot({ path: 'output/playwright/mission-preparation.png' });
  await flight.locator('#open-station').click();
  await flight.locator('.station-status').filter({ hasText: '25% · step 1/4' }).waitFor();
  await flight.waitForTimeout(1200);
  assert.deepEqual(await flight.evaluate(() => document.getAnimations().map(animation => ({ time: animation.currentTime, state: animation.playState }))), [{ time: 250, state: 'paused' }, { time: 250, state: 'paused' }]);
  assert.equal(await flight.locator('.flight-deck').count(), 0);
  await flight.locator('#close-station').click();
  await flight.locator('.station-status').filter({ hasText: 'CLOSED.' }).waitFor();
  await flight.locator('#open-station').click();
  await flight.locator('#open-station').click();
  await flight.locator('#fail-preparation').click();
  await flight.locator('.station-status').filter({ hasText: 'FAILED.' }).waitFor();
  assert.equal(await flight.locator('.flight-deck').count(), 0);
  for (let step = 1; step <= 4; step++) {
    await flight.locator('#open-station').click();
    if (step < 4) {
      await flight.locator('.station-status').filter({ hasText: `${step * 25}% · step ${step}/4` }).waitFor();
      assert.equal(await flight.locator('.flight-deck').count(), 0);
      assert.deepEqual(await flight.evaluate(() => document.getAnimations().map(animation => animation.currentTime)), [step * 250, step * 250]);
    }
  }
  await flight.locator('.flight-deck').waitFor({ state: 'attached' });
  assert.equal(await flight.locator('.flight-deck').isVisible(), false);
  await flight.locator('.flight-chapter').click();
  await flight.locator('.flight-deck').waitFor();
  assert.equal(await flight.locator('#open-station').isDisabled(), true);
  await flight.locator('#guided-flight').click();
  await flight.locator('.beam-feedback').filter({ hasText: 'Paused at 50%' }).waitFor();
  await flight.waitForTimeout(3200);
  assert.equal(await flight.locator('.slot .rocket').evaluate(el => el.getAnimations()[0].playState), 'paused');
  assert.equal(await flight.locator('.slot .rocket').evaluate(el => el.getAnimations()[0].currentTime), 1500);
  assert.equal(await flight.locator('.slot .result').filter({ hasText: 'Delivered!' }).count(), 0);
  await flight.locator('#cancel-flight').click();
  assert.equal(await flight.locator('.slot .rocket').count(), 0);
  assert.match(await flight.locator('.beam-feedback').innerText(), /Zero cheese delivered/);
  const guided = (await exampleApi('inspect')).preview.recipe.checks;
  assert.ok(guided.find(check => check.id === 'no-stale-commit').observed);
  assert.ok(guided.find(check => check.id === 'station-survives-cancel').observed);
  await flight.locator('#launch-worker').click();
  await galleryPage.locator('.example-preview').screenshot({ path: 'output/playwright/mission-flight.png' });
  await flight.waitForFunction(() => document.getAnimations()[0]?.currentTime > 400);
  await flight.evaluate(() => { window.cancelledFlightAnimation = document.getAnimations()[0]; });
  await flight.locator('#launch-worker').click();
  assert.equal(await flight.evaluate(() => window.cancelledFlightAnimation.playState), 'idle');
  await flight.locator('.slot .result').filter({ hasText: 'Delivered!' }).waitFor();
  await flight.locator('#launch-worker').click();
  await flight.locator('#fire-beam').click();
  await flight.locator('.beam-feedback').filter({ hasText: 'Miss at' }).waitFor();
  assert.equal(await flight.locator('.slot .rocket').count(), 1);
  await flight.waitForFunction(() => document.querySelector('.slot .rocket').getAnimations()[0]?.currentTime > 2150);
  await flight.locator('#fire-beam').click();
  assert.match(await flight.locator('.beam-feedback').innerText(), /Miss at/);
  await flight.locator('.slot .result').filter({ hasText: 'Delivered!' }).waitFor();
  await flight.locator('#guided-flight').click();
  await flight.locator('.beam-feedback').filter({ hasText: 'Paused at 50%' }).waitFor();
  await flight.locator('#fire-beam').click();
  await flight.locator('.beam-feedback').filter({ hasText: 'Hit at' }).waitFor();
  assert.equal(await flight.locator('.cause-chain li').count(), 5);
  assert.equal(await flight.locator('.cause-chain li').last().innerText(), 'No cheese was delivered.');
  await galleryPage.locator('.example-preview').screenshot({ path: 'output/playwright/mission-learning-hit.png' });
  assert.equal(await flight.locator('.slot .rocket').count(), 0);
  assert.equal(await flight.locator('.retired-flight .rocket').count(), 1);
  assert.equal(await flight.locator('.flight-deck').count(), 1);
  assert.match(await flight.locator('.station-status').textContent(), /^OPEN/);
  await flight.locator('#launch-worker').click();
  await flight.locator('.flight-more > summary').click();
  await flight.locator('#fail-worker').click();
  await flight.locator('.slot .result').filter({ hasText: 'Engine failed' }).waitFor();
  await flight.locator('#launch-worker').click();
  await flight.locator('.readiness-chapter').click();
  await flight.locator('#close-station').click();
  await flight.locator('.station-status').filter({ hasText: 'CLOSED.' }).waitFor();
  assert.equal(await flight.locator('.flight-deck').count(), 0);
  await flight.locator('#destroy-station').click();
  await flight.locator('.station-status').filter({ hasText: 'DESTROYED.' }).waitFor();
  const applicationChecks = await checked('mission-control');
  assert.equal(applicationChecks.views.find(view => view.name === 'flight-screen').destroyed, true);
  assert.equal(applicationChecks.regions.find(region => region.name === 'application.root').hasView, false);
  await flight.locator('#reset-station').click();
  await flight.locator('.station-status').filter({ hasText: 'CLOSED.' }).waitFor();
  assert.equal((await exampleApi('inspect')).preview.recipe.checks.length, 0);
  for (let step = 0; step < 4; step++) await flight.locator('#open-station').click();
  await flight.locator('.flight-deck').waitFor({ state: 'attached' });
  assert.equal(await flight.locator('.flight-deck').isVisible(), false);
  await flight.locator('.flight-chapter').click();
  await flight.locator('.flight-deck').waitFor();
  await galleryPage.locator('.example-source').scrollIntoViewIfNeeded();
  const editorSpacing = await galleryPage.locator('.example-source').evaluate(el => ({
    gap: el.querySelector('.source-editor').getBoundingClientRect().top - el.querySelector('.example-source-tabs').getBoundingClientRect().bottom,
    labelHeight: el.querySelector('label').getBoundingClientRect().height,
    labelClip: getComputedStyle(el.querySelector('label')).clipPath,
  }));
  assert.equal(editorSpacing.gap, 16);
  assert.equal(editorSpacing.labelHeight, 1);
  assert.equal(editorSpacing.labelClip, 'inset(50%)');
  assert.equal(await galleryPage.getByLabel('Example JavaScript', { exact: true }).count(), 1);
  await galleryPage.locator('.example-source').screenshot({ path: 'output/playwright/demo-code-spacing.png' });
  console.log('PASS mission: four manual readiness steps, no automatic progress, cancellation/failure/retry, three-second flight, early/late misses and guided beam hit, delivery/replacement/failure, child cancellation preserves station, parent shutdown aborts flight, destroy and reset');

  // Export must execute the same source, including cleanup, inside the same sandbox.
  await load('owned-widget');
  const downloadEvent = galleryPage.waitForEvent('download');
  await galleryPage.locator('[data-example-download]').click();
  const download = await downloadEvent;
  const exportDirectory = resolve(root, 'downloaded-project');
  await mkdir(exportDirectory, { recursive: true });
  execFileSync('unzip', ['-oq', await download.path(), '-d', exportDirectory]);
  assert.match(await readFile(resolve(exportDirectory, 'app.js'), 'utf8'), /import \{ Radio \} from '\.\/radio-view.js'/);
  const exported = await browser.newPage();
  await exported.goto(`http://127.0.0.1:${server.address().port}/downloaded-project/`);
  await exported.locator('#replace-widget').click();
  await exported.locator('#broadcast-radio').click();
  assert.match(await exported.locator('#experiment .widget').innerText(), /Broadcasts heard: 1/);
  await exported.locator('#destroy-owner').click();
  assert.equal(await exported.locator('#experiment').innerText(), '');
  await exported.close();
  console.log('PASS standalone export: pinned recipe interaction and cleanup');

  await galleryPage.evaluate(() => {
    document.querySelector('#example-codepen').submit = function () { window.capturedPen = JSON.parse(this.elements.data.value); };
  });
  for (const recipe of recipes) {
    await galleryPage.locator(`[data-example-id="${recipe.id}"]`).click();
    await galleryPage.waitForFunction(title => document.querySelector('#example-title').textContent === title && document.querySelector('#example-status').textContent.startsWith('Ready.'), recipe.title);
    const selected = await exampleApi('inspect', { includeSource: true });
    assert.equal(selected.selected, recipe.id);
    assert.deepEqual(selected.draft.files, recipe.sourceFiles);
    assert.deepEqual(selected.preview.errors, []);
    const excerpt = preview().locator('.source-excerpt').first();
    const sourceFile = await excerpt.getAttribute('data-source-file');
    const sourceSymbol = await excerpt.getAttribute('data-source-symbol');
    const shown = await excerpt.locator('code').innerText();
    assert.ok(recipe.sourceFiles[sourceFile].includes(shown), 'The excerpt must be a verbatim part of the executed module');
    assert.ok(await excerpt.locator('.syntax-keyword, .syntax-name').count(), 'Source has syntax highlighting');
    await excerpt.locator('.source-link').click();
    await galleryPage.getByRole('tab', { name: sourceFile, exact: true }).waitFor();
    await galleryPage.waitForFunction(file => [...document.querySelectorAll('[role=tab]')].some(tab => tab.textContent === file && tab.getAttribute('aria-selected') === 'true'), sourceFile);
    await galleryPage.waitForFunction(symbol => document.querySelector('#example-reading-location').textContent.includes(symbol), sourceSymbol);
    for (const entry of recipe.readingGuide) {
      await galleryPage.locator('#example-reading-guide').getByRole('button', { name: entry.label, exact: true }).click();
      assert.equal(await galleryPage.getByRole('tab', { name: entry.file, exact: true }).getAttribute('aria-selected'), 'true');
      assert.match(await galleryPage.locator('#example-reading-location').innerText(), /line \d+/);
    }
    await galleryPage.getByRole('tab', { name: 'app.js', exact: true }).click();
    const fullEditor = galleryPage.locator('#example-js-panel .source-editor');
    assert.equal(await fullEditor.locator('.source-editor-highlight code').textContent(), recipe.sourceFiles['app.js'] + '\n');
    assert.ok(await fullEditor.locator('.syntax-keyword').count());
    assert.equal(await fullEditor.locator('.source-editor-gutter span').count(), recipe.sourceFiles['app.js'].split('\n').length);
    await fullEditor.getByLabel('Go to line in app.js', { exact: true }).fill('40');
    await fullEditor.getByRole('button', { name: 'Go', exact: true }).click();
    assert.equal(await galleryPage.locator('#example-code').evaluate(editor => editor.value.slice(0, editor.selectionStart).split('\n').length), 40);
    await galleryPage.locator('#example-code').evaluate(editor => { editor.scrollTop = 700; editor.scrollLeft = 80; });
    await galleryPage.waitForFunction(() => {
      const editor = document.querySelector('#example-code');
      const highlight = editor.previousElementSibling;
      return highlight.scrollTop === editor.scrollTop && highlight.scrollLeft === editor.scrollLeft;
    });
    await galleryPage.locator('#example-code').press('Tab');
    assert.equal(await galleryPage.locator('#example-code').evaluate(editor => document.activeElement === editor), false, 'Tab leaves the native editor');
    const savedEditorState = await galleryPage.locator('#example-code').evaluate(editor => ({ start: editor.selectionStart, end: editor.selectionEnd, top: editor.scrollTop, left: editor.scrollLeft }));
    await galleryPage.getByRole('tab', { name: 'style.css', exact: true }).click();
    await galleryPage.getByRole('tab', { name: 'app.js', exact: true }).click();
    assert.deepEqual(await galleryPage.locator('#example-code').evaluate(editor => ({ start: editor.selectionStart, end: editor.selectionEnd, top: editor.scrollTop, left: editor.scrollLeft })), savedEditorState, 'File tabs retain selection and scroll');
    assert.deepEqual(await fullEditor.locator('.source-editor-highlight').evaluate(highlight => ({ top: highlight.scrollTop, left: highlight.scrollLeft })), { top: savedEditorState.top, left: savedEditorState.left });
    await galleryPage.locator('[data-example-codepen]').click();
    const pen = await galleryPage.evaluate(() => window.capturedPen);
    assert.equal(pen.title, recipe.title);
    assert.deepEqual(JSON.parse(pen.html.match(/<script[^>]*>([\s\S]*)<\/script>/)[1]).project.entry, 'main.js');
    const penPage = await browser.newPage();
    await penPage.setContent(pen.html);
    await penPage.addStyleTag({ content: pen.css });
    await penPage.addScriptTag({ content: pen.js });
    await penPage.addScriptTag({ type: 'module', content: 'const appModule = await demoReady; window.demoInspection = appModule.inspectRecipe; window.demoModule = appModule;' });
    await penPage.locator('#experiment').waitFor();
    assert.equal(await penPage.locator('h1').textContent(), recipe.title);
    if (recipe.id === 'list-detail') {
      await penPage.evaluate(() => {
        window.todoShell = window.demoInspection().views.find(item => item.name === 'shell').view;
        window.todoFooter = window.todoShell.getChildView('footer');
        window.providerTodo = window.todoShell.collection.add({ id: 'provider-test', title: 'Added through Collection' });
        window.providerRow = window.todoShell.list.children.findByModel(window.providerTodo);
      });
      assert.equal(await penPage.locator('.todo-item').count(), 2);
      await penPage.evaluate(() => window.providerTodo.set({ title: 'Changed through Model', completed: true }));
      assert.equal(await penPage.locator('.todo-item.completed .todo-title').innerText(), 'Changed through Model');
      assert.equal(await penPage.locator('#todo-count').innerText(), '1 item left');
      assert.equal(await penPage.evaluate(() => window.todoShell.list.children.findByModel(window.providerTodo) === window.providerRow), true);
      await penPage.evaluate(() => window.todoShell.collection.remove(window.providerTodo));
      assert.equal(await penPage.locator('.todo-item').count(), 1);
      assert.equal(await penPage.evaluate(() => window.providerRow.isDestroyed()), true);
      assert.equal(await penPage.evaluate(() => window.todoShell.getChildView('footer') === window.todoFooter && !window.todoFooter.isDestroyed()), true, 'Data changes retain the footer View');
      const routeCalls = await penPage.evaluate(() => {
        const view = window.todoShell;
        const region = window.demoModule.region;
        const refresh = view.refresh;
        window.routeRefreshes = 0;
        view.refresh = function () {
          window.routeRefreshes++;
          return refresh.apply(this, arguments);
        };
        const cycles = [];
        for (let cycle = 0; cycle < 3; cycle++) {
          region.detachView();
          window.routeRefreshes = 0;
          window.dispatchEvent(new HashChangeEvent('hashchange'));
          const detached = window.routeRefreshes;
          region.show(view);
          const attached = window.routeRefreshes;
          window.dispatchEvent(new HashChangeEvent('hashchange'));
          cycles.push({ detached, attached, afterHash: window.routeRefreshes });
        }
        return cycles;
      });
      assert.deepEqual(routeCalls, Array(3).fill({ detached: 0, attached: 1, afterHash: 2 }), 'Each attachment owns exactly one hash listener');
    }
    if (recipe.id === 'owned-widget') {
      await penPage.locator('[aria-label="Radio frequency"]').fill('9');
      await penPage.locator('.pause-radio').click();
      assert.equal(await penPage.evaluate(() => window.demoInspection().views.find(item => item.name === 'first-widget').view.widget.getState().frequency), 9);
      const reattachment = await penPage.evaluate(() => {
        const station = window.demoInspection().views.find(item => item.name === 'shell').view;
        const ownedRegion = station.getRegion('widget');
        const radio = ownedRegion.currentView;
        const oldWidget = radio.widget;
        const detached = ownedRegion.detachView();
        const releasedOnDetach = oldWidget.isDestroyed();
        ownedRegion.show(detached);
        document.dispatchEvent(new Event('broadcast:radio'));
        return {
          sameView: ownedRegion.currentView === radio,
          releasedOnDetach,
          disposals: oldWidget.getState().disposals,
          oldDeliveries: oldWidget.getState().deliveries,
          newDeliveries: radio.widget.getState().deliveries,
          freshWidget: radio.widget !== oldWidget && !radio.widget.isDestroyed(),
          frequency: radio.widget.getState().frequency,
          playing: radio.widget.getState().playing,
          frames: radio.widget.getState().frames,
        };
      });
      assert.deepEqual(reattachment, { sameView: true, releasedOnDetach: true, disposals: 1, oldDeliveries: 0, newDeliveries: 1, freshWidget: true, frequency: 9, playing: false, frames: 0 });
      assert.equal(await penPage.locator('[aria-label="Radio frequency"]').inputValue(), '9');
      assert.match(await penPage.locator('.pause-radio').innerText(), /Resume/);
      await penPage.locator('.pause-radio').click();
      await penPage.waitForFunction(() => window.demoInspection().views.find(item => item.name === 'first-widget').view.widget.getState().frames > 0);
      const playingReattachment = await penPage.evaluate(() => {
        const station = window.demoInspection().views.find(item => item.name === 'shell').view;
        const region = station.getRegion('widget');
        const radio = region.detachView();
        region.show(radio);
        return { frequency: radio.widget.getState().frequency, playing: radio.widget.getState().playing };
      });
      assert.deepEqual(playingReattachment, { frequency: 9, playing: true });
      await penPage.waitForFunction(() => window.demoInspection().views.find(item => item.name === 'first-widget').view.widget.getState().frames > 0);
      await penPage.locator('#replace-widget').click();
      const stoppedFrames = await penPage.evaluate(() => window.demoInspection().views.find(item => item.name === 'first-widget').view.widget.getState().frames);
      await penPage.waitForFunction(() => window.demoInspection().views.find(item => item.name === 'replacement-widget').view.widget.getState().frames > 10);
      assert.equal(await penPage.evaluate(() => window.demoInspection().views.find(item => item.name === 'first-widget').view.widget.getState().frames), stoppedFrames);
    }

    if (recipe.id === 'list-detail') {
      assert.equal(await penPage.evaluate(() => {
        const controller = window.demoModule.controller;
        const oldCollection = controller.view.collection;
        controller.reset();
        const fresh = controller.view.collection !== oldCollection;
        controller.view.collection.remove(controller.view.collection.at(0));
        controller.view.changeNeighbor();
        return fresh && !window.demoInspection().checks.some(check => check.id === 'child-identity' && !check.observed);
      }), true, 'Reset owns fresh data and deleting the original row does not fail identity evidence');
      await penPage.locator('#new-todo').fill('Works after controller reset');
      await penPage.locator('#new-todo').press('Enter');
      assert.equal(await penPage.locator('.todo-item').count(), 2);
    }
    if (recipe.id === 'mission-control') {
      assert.deepEqual(await penPage.evaluate(async () => {
        const view = window.demoModule.controller.view;
        const oldApplication = view.application;
        const opening = view.onClickOpen();
        const signal = oldApplication.getState().signal;
        view.render();
        await opening;
        await oldApplication.destroy();
        return { aborted: signal.aborted, destroyed: oldApplication.isDestroyed(), phase: view.phase, fresh: view.application !== oldApplication };
      }), { aborted: true, destroyed: true, phase: 'closed', fresh: true }, 'Rerender retires pending Application readiness');
      assert.equal(await penPage.evaluate(async () => {
        const controller = window.demoModule.controller;
        const view = controller.view;
        const retiredRoots = [];
        for (let cycle = 0; cycle < 3; cycle++) {
          const opening = view.onClickOpen();
          for (let step = 0; step < 3; step++) await view.onClickOpen();
          await opening;
          const listeners = Object.values(controller._rdListeningTo || {});
          if (listeners.some(listener => retiredRoots.includes(listener.obj))) return false;
          retiredRoots.push(view.application.getView());
          await view.onClickClose();
        }
        return true;
      }), true, 'Reopening the same Application releases subscriptions to its retired roots');

      for (let step = 0; step < 4; step++) await penPage.locator('#open-station').click();
      await penPage.locator('.flight-chapter').click();
      await penPage.locator('#guided-flight').click();
      await penPage.locator('#cancel-flight').click();
      await penPage.locator('#guided-flight').click();
      assert.equal(await penPage.evaluate(async () => {
        const controller = window.demoModule.controller;
        if (!controller.retired) throw new Error('Expected a retired flight before rerender');
        const view = controller.view;
        const app = view.application;
        const deck = app.getView();
        if (!Object.values(controller._rdListeningTo || {}).some(listener => listener.obj === deck)) throw new Error('Expected controller subscriptions to the flight screen');
        view.render();
        await app.destroy();
        const detached = !Object.values(controller._rdListeningTo || {}).some(listener => listener.obj === deck);
        return deck.isDestroyed() && view.phase === 'closed' && controller.retired === null && detached;
      }), true, 'Rerender destroys the prior flight screen');
    }
    // The app's module is reusable with no teaching controller mounted.
    await penPage.evaluate(async id => {
      const root = window.demoModule.controller.rootRegion;
      const lesson = root.currentView;
      window.demoModule.controller.destroy();
      if (!root.isDestroyed() || !lesson.isDestroyed()) throw new Error('Lesson root survived controller teardown');
      if (id === 'list-detail') {
        window.routeRefreshes = 0;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        if (window.routeRefreshes !== 0) throw new Error('Destroyed Todos still observes hash changes');
        if (!window.todoFooter.isDestroyed()) throw new Error('Footer survived its owner');
      }
      const imports = JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports;
      const { Region } = await import(imports.marionette);
      const module = await import(imports['demo:app.js']);
      const ViewClass = module.Todos || module.RadioStation || module.StationConsole;
      const options = {};
      if (id === 'list-detail') {
        const { TodoCollection } = await import(imports['demo:todo-views.js']);
        options.collection = new TodoCollection();
      }
      new Region({ el: '#app' }).show(new ViewClass(options));
    }, recipe.id);
    if (recipe.id === 'list-detail') {
      await penPage.locator('#new-todo').fill('No lesson controller needed');
      await penPage.locator('#new-todo').press('Enter');
      assert.equal(await penPage.locator('.todo-item').count(), 1);
    } else if (recipe.id === 'owned-widget') {
      await penPage.locator('#replace-widget').click();
      await penPage.locator('#broadcast-radio').click();
      assert.match(await penPage.locator('.widget').innerText(), /Broadcasts heard: 1/);
    } else {
      for (let step = 0; step < 4; step++) await penPage.locator('#open-station').click();
      await penPage.locator('.flight-chapter').click();
      await penPage.locator('#guided-flight').click();
      await penPage.locator('.beam-feedback').filter({ hasText: 'Paused at 50%' }).waitFor();
      await penPage.locator('#cancel-flight').click();
      assert.match(await penPage.locator('.beam-feedback').innerText(), /Zero cheese delivered/);
    }
    await penPage.close();
    await galleryPage.setViewportSize({ width: 390, height: 844 });
    await galleryPage.waitForFunction(() => {
      const frame = document.querySelector('.example-preview iframe');
      return Number.parseFloat(frame.style.height) > 500;
    });
    assert.equal(await galleryPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, recipe.id + ' mobile page width');
    assert.equal(await preview().evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, recipe.id + ' mobile example width');
    const mobileHeight = await preview().locator('#app').evaluate(app => Math.ceil(app.getBoundingClientRect().height));
    await galleryPage.waitForFunction(height => Number.parseFloat(document.querySelector('.example-preview iframe').style.height) === Math.max(500, Math.min(2800, height)), mobileHeight);
    await galleryPage.setViewportSize({ width: 1280, height: 900 });
  }
  const personal = await api('inspect', { includeSource: true });
  assert.deepEqual(personal.draft, personalDraft);
  assert.match(personal.preview.text, /1 small victory/);
  assert.equal(personal.hasUnrunChanges, true);
  assert.equal(await personalFrame.evaluate(el => el.isConnected && el === document.querySelector('.workshop-preview iframe')), true);
  console.log('PASS separate examples: top chooser, one-click runs, three Pen payloads execute, phone layouts, Backstage iframe/state/unrun edits untouched');
  assert.equal(await galleryPage.locator('#example-code').isVisible(), true, 'Demo source is always expanded');
  const appSource = await galleryPage.locator('#example-code').inputValue();
  assert.doesNotMatch(appSource, /const demoInspector =/);
  await galleryPage.locator('#example-code').fill(appSource + '\n// An example edit.');
  await galleryPage.locator('#example-lesson-tab').click();
  const lessonSource = await galleryPage.locator('#example-lesson').inputValue();
  assert.match(lessonSource, /LessonController\.extend/);
  assert.doesNotMatch(lessonSource, /const demoInspector =/);
  await galleryPage.locator('#example-lesson').fill(lessonSource + '\n// A lesson edit.');
  await galleryPage.locator('#example-lesson-tab').press('End');
  assert.equal(await galleryPage.getByRole('tab', { name: 'readiness.js', exact: true }).getAttribute('aria-selected'), 'true');
  await galleryPage.getByRole('tab', { name: 'readiness.js', exact: true }).press('Home');
  assert.equal(await galleryPage.locator('#example-code').isVisible(), true);
  await galleryPage.getByRole('tab', { name: 'flight.js', exact: true }).click();
  const flightSource = await galleryPage.getByLabel('flight.js JavaScript', { exact: true }).inputValue();
  await galleryPage.getByLabel('flight.js JavaScript', { exact: true }).fill(flightSource + '\n// A feature-file edit.');
  await exampleApi('run');
  assert.deepEqual((await exampleApi('inspect')).preview.errors, []);
  await galleryPage.locator('[data-example-codepen]').click();
  assert.ok((await galleryPage.evaluate(() => window.capturedPen.html)).includes('// An example edit.'));
  assert.ok((await galleryPage.evaluate(() => window.capturedPen.html)).includes('// A lesson edit.'));
  assert.ok((await galleryPage.evaluate(() => window.capturedPen.html)).includes('// A feature-file edit.'));
  // An actual method edit changes behavior and its displayed running excerpt.
  await load('list-detail');
  const beforeEdit = await preview().locator('.source-excerpt code').first().innerText();
  const todoAppSource = await galleryPage.locator('#example-code').inputValue();
  await galleryPage.locator('#example-code').focus();
  await galleryPage.locator('#example-code').evaluate(editor => editor.setSelectionRange(editor.value.length, editor.value.length));
  await galleryPage.keyboard.insertText('\n// One native undo transaction');
  await galleryPage.locator('#example-code').press('ControlOrMeta+Z');
  assert.equal(await galleryPage.locator('#example-code').inputValue(), todoAppSource, 'Highlighting preserves native undo');
  await galleryPage.locator('#example-code').fill("const unfinished = '<img src=x onerror=alert(1)>' +");
  assert.equal(await galleryPage.locator('#example-js-panel .source-editor-highlight img').count(), 0);
  await galleryPage.getByRole('tab', { name: 'lesson.js', exact: true }).click();
  await galleryPage.getByRole('tab', { name: 'app.js', exact: true }).click();
  assert.match(await galleryPage.locator('#example-code').inputValue(), /const unfinished/);
  await galleryPage.locator('#example-code').fill(todoAppSource.replace('return this.collection.add({\n      title', "return this.collection.add({\n      title: 'Edited: ' + title"));
  assert.equal(await preview().locator('.source-excerpt code').first().innerText(), beforeEdit, 'Unrun edits do not change the running-source excerpt');
  await exampleApi('run');
  await preview().locator('#new-todo').fill('Source and behavior agree');
  await preview().locator('#new-todo').press('Enter');
  assert.equal(await preview().locator('.todo-item').last().locator('.todo-title').innerText(), 'Edited: Source and behavior agree');
  assert.match(await preview().locator('.source-excerpt code').first().innerText(), /Edited:/);
  const editedSource = await galleryPage.locator('#example-code').inputValue();
  await galleryPage.locator('#example-code').fill(editedSource + "\nimport './missing.js';");
  await galleryPage.locator('[data-example-run]').click();
  await galleryPage.locator('#example-errors').filter({ hasText: 'app.js: unknown project import ./missing.js' }).waitFor();
  await galleryPage.locator('#example-code').fill(editedSource);
  await exampleApi('run');
  assert.deepEqual((await exampleApi('inspect')).preview.errors, []);
  assert.deepEqual((await api('inspect', { includeSource: true })).draft, personalDraft);
  let galleryLicenseRequests = 0;
  await galleryPage.route('**/vendor/DEMOS-LICENSE.txt', route => ++galleryLicenseRequests === 1 ? route.fulfill({ status: 503, body: 'Retry test' }) : route.continue());
  await galleryPage.reload();
  await galleryPage.locator('#example-errors').waitFor({ state: 'visible' });
  await galleryPage.waitForFunction(() => window.MarionetteExamples);
  await exampleApi('run');
  assert.equal(await galleryPage.locator('[data-example-codepen]').isEnabled(), true);
  assert.deepEqual((await exampleApi('inspect')).preview.errors, []);
  console.log('PASS example edits and transient export-runtime recovery');
  await galleryPage.close();

  // Native linking: cycles, live bindings, dynamic imports, and iframe isolation.
  const nativeProject = compileProject({ title: 'Module linking check', css: '', files: {
    'main.js': `import { View, Region } from 'marionette';
import { count, increment } from './counter.js';
export const amount = 2;
increment();
const delayed = await import('./delayed.js');
if (delayed.ready) increment();
let isolated = false;
try { parent.document.body; } catch { isolated = true; }
export const region = new Region({ el: '#app' });
region.show(new View({ template: () => '<p id="module-result">' + count + ':' + isolated + '</p>' }));
window.resumeImport = () => import('./resumed.js');`,
    'counter.js': `import { amount } from './main.js';
export let count = 0;
export function increment() { count += amount; }`,
    'delayed.js': 'export const ready = true;',
    'resumed.js': 'export const resumed = true;',
  }});
  const linkingPage = await browser.newPage();
  await linkingPage.setContent('<iframe sandbox="allow-scripts"></iframe>');
  const vendorForLinking = await readFile(resolve(root, 'vendor/demos.js'), 'utf8');
  await linkingPage.locator('iframe').evaluate((iframe, doc) => { iframe.srcdoc = doc; }, runnerDocument({ ...nativeProject, vendor: vendorForLinking, token: 'abcd-1234', standalone: true }));
  await linkingPage.frameLocator('iframe').locator('#module-result').filter({ hasText: '4:true' }).waitFor();
  const linkingFrame = linkingPage.frames().find(frame => frame.parentFrame());
  assert.equal(await linkingFrame.evaluate(async () => {
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    return (await window.resumeImport()).resumed;
  }), true, 'BFCache pagehide preserves URLs for deferred modules');
  await linkingPage.close();
  console.log('PASS native module cycles, live bindings, dynamic imports, and opaque iframe isolation');

  const native = await page.evaluate(() => Boolean(document.modelContext?.getTools && document.modelContext?.executeTool));
  assert.equal(native, true, 'Pinned Chromium must expose native WebMCP with experimental features enabled');
  const toolNames = await page.evaluate(async () => (await document.modelContext.getTools()).map(tool => tool.name));
  for (const name of ['open_marionette_playground', 'update_marionette_workshop', 'run_marionette_app', 'inspect_marionette_app', 'interact_with_marionette_app', 'close_marionette_playground']) assert.ok(toolNames.includes(name), name);
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
  console.log('PASS native WebMCP: six personal-app tools, execution and cancellation');
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
  const troubleshooting = await readFile(resolve('content/library-docs/docs/troubleshooting.md'), 'utf8');
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
  console.log('PASS troubleshooting: four exact failing/fixed examples against pinned published beta.2');
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
  await page.goto(`http://127.0.0.1:${server.address().port}/docs/development/`);
  await page.locator('h1').waitFor();
  assert.match(await page.locator('h1').innerText(), /Develop with the starter/);
  await page.screenshot({ path: 'output/playwright/development-guide.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of ['/docs/development/', '/docs/troubleshooting/', '/errors/MN0020/']) {
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
