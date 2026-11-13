// Focused renderer migration checks against the built site on an ephemeral port.
// Run npm run build first. One isolated headless browser per suite.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { builtSite } from './built-site.mjs';
import AdmZip from 'adm-zip';
import { recipes, recipeRuntime } from '../../site/assets/playground-recipes.js';
import { projectArchive, projectPen } from '../../tools/demo-project.js';
import { starter } from '../../site/assets/playground-runtime.js';

const { base, close } = await builtSite();
const vendor = await readFile('site/vendor/demos.js', 'utf8');
const license = await readFile('site/vendor/DEMOS-LICENSE.txt', 'utf8');
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir('output/playwright', { recursive: true });
  if (process.env.HTML_DEMOS_SECTION !== 'exports') {
    await page.goto(base);
    await page.waitForFunction(() => window.MarionetteHero?.inspect().ready);
    assert.equal(await page.locator('h1').first().innerText(), 'Pull a few\nstrings.');
    await page.locator('[data-feature="panel"]').click();
    const controls = await page.locator('.hero-panel-navigation').elementHandle();
    await page.getByRole('button', { name: 'Next panel', exact: true }).click();
    assert.equal(await page.locator('.hero-panel-detail h2').innerText(), 'A new answer. The same place.');
    assert.equal(await controls.evaluate(el => el === document.querySelector('.hero-panel-navigation')), true);
    await page.locator('[data-phase="1"][type="button"]').click();
    assert.match(await page.locator('#lifecycle-events').innerText(), /NotesView: destroy.*TasksView: attach/);
    await page.locator('[data-phase="2"][type="button"]').click();
    assert.equal(await page.locator('.lifecycle-slot').locator('.diagram-view').count(), 0);
    console.log('PASS homepage: retained controls, owned panel replacement and real lifecycle replacement');

    await page.goto(base + '/demos/#list-detail');
    const api = (method, input) => page.evaluate(({ method, input }) => window.MarionetteExamples[method](input), { method, input });
    const frame = () => page.frameLocator('.example-preview iframe');
    const literal = '<img src=x onerror="window.injected=true"> & "\'';
    await frame().locator('#new-todo').fill(literal);
    await frame().locator('#new-todo').press('Enter');
    const row = frame().locator('.todo-item').last();
    const label = row.locator('.todo-title');
    const edit = row.locator('.edit');
    assert.equal(await label.textContent(), literal);
    assert.equal(await row.locator('img').count(), 0);
    await label.press('Enter');
    const originalEdit = await edit.elementHandle();
    for (let attempt = 0; attempt < 3; attempt++) {
      assert.equal(await edit.inputValue(), literal);
      await edit.fill('A cancelled draft ' + attempt);
      await edit.press('Escape');
      assert.equal(await label.textContent(), literal);
      await label.press('Enter');
      assert.equal(await originalEdit.evaluate(el => el === document.activeElement), true);
    }
    await edit.fill('Saved title');
    await edit.press('Enter');
    assert.equal(await label.textContent(), 'Saved title');
    const checkbox = row.locator('.toggle');
    const originalCheckbox = await checkbox.elementHandle();
    await checkbox.press('Space');
    assert.equal(await checkbox.isChecked(), true);
    assert.equal(await originalCheckbox.evaluate(el => el === document.activeElement), true);
    await frame().locator('[data-filter="active"]').click();
    assert.equal(await frame().locator('.todo-item').count(), 1);
    await frame().locator('[data-filter="completed"]').click();
    assert.equal(await frame().locator('.todo-item').count(), 1);
    await frame().locator('#clear-completed').click();
    assert.equal(await frame().locator('.todo-item').count(), 0);
    await frame().locator('[data-filter="all"]').click();
    await frame().locator('.notes-experiment > summary').click();
    const notes = frame().locator('#draft');
    await notes.fill('My <unfinished> plan');
    await notes.evaluate(el => el.setSelectionRange(3, 9));
    await notes.press('Enter');
    assert.deepEqual(await notes.evaluate(el => [el.value, el.selectionStart, el.selectionEnd, el === document.activeElement]), ['My <unfinished> plan', 3, 9, true]);
    assert.ok((await api('inspect')).preview.recipe.checks.every(check => check.observed));
    assert.ok(await frame().locator('.source-excerpt .syntax-name').count());
    assert.match(await frame().locator('.source-lines code').first().textContent(), /changeNeighbor/);
    await page.locator('.example-preview').screenshot({ path: 'output/playwright/html-todos-desktop.png' });
    console.log('PASS TodoMVC: literal text, repeated Escape, retained controls, filters, removal, notes selection and highlighted excerpts');

    await api('select', { id: 'owned-widget' });
    const pause = frame().locator('.pause-radio');
    const slider = frame().locator('.tuner input');
    const originalPause = await pause.elementHandle();
    const originalSlider = await slider.elementHandle();
    await slider.focus();
    await slider.press('ArrowRight');
    assert.equal(await slider.inputValue(), '5');
    await pause.focus();
    for (const key of ['Space', 'Enter', 'Space', 'Enter']) await pause.press(key);
    assert.equal(await originalPause.evaluate(el => el === document.activeElement && el === document.querySelector('.pause-radio')), true);
    assert.equal(await originalSlider.evaluate(el => el === document.querySelector('.tuner input')), true);
    assert.equal(await slider.inputValue(), '5');
    for (let attempt = 0; attempt < 2; attempt++) {
      await frame().locator('#replace-widget').click();
      await frame().locator('#broadcast-radio').click();
    }
    await frame().locator('#destroy-owner').click();
    assert.ok((await api('inspect')).preview.recipe.checks.every(check => check.observed));
    console.log('PASS Radio: tuner identity and keyboard focus, repeated swaps, broadcast isolation and cleanup');

    await api('select', { id: 'mission-control' });
    await frame().locator('.station-more > summary').click();
    await frame().locator('#open-station').click();
    assert.equal(await frame().locator('.flight-deck').count(), 0);
    await frame().locator('#close-station').click();
    await frame().locator('#open-station').click();
    await frame().locator('#fail-preparation').click();
    await frame().locator('.station-status').filter({ hasText: 'FAILED.' }).waitFor();
    assert.equal(await frame().locator('.flight-deck').count(), 0);
    for (let step = 0; step < 4; step++) await frame().locator('#open-station').click();
    await frame().locator('.flight-chapter').click();
    await frame().locator('#guided-flight').click();
    await frame().locator('.beam-feedback').filter({ hasText: 'Paused at 50%' }).waitFor();
    await frame().locator('#cancel-flight').click();
    assert.equal(await frame().locator('.flight-slot .rocket').count(), 0);
    await frame().locator('#launch-worker').click();
    await frame().locator('.flight-slot .result').filter({ hasText: 'Delivered!' }).waitFor();
    const proof = (await api('inspect')).preview.recipe.checks;
    for (const id of ['no-stale-commit', 'old-work-aborted', 'fresh-start-true', 'replacement-completed']) {
      assert.equal(proof.find(check => check.id === id)?.observed, true, id);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await frame().locator('body').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.locator('.example-preview').screenshot({ path: 'output/playwright/html-mission-mobile.png' });
    console.log('PASS Cheese Patrol: cancel/fail/retry readiness, cancelled flight and one successful delivery, narrow layout');

  }
  // Execute actual ZIP modules and generated CodePen panels, including source excerpts.
  const literal = '<img src=x onerror="window.injected=true"> & "\'';
  const exportPage = await browser.newPage();
  exportPage.on('pageerror', error => errors.push(error.message));
  for (const recipe of recipes) {
    const files = { ...recipe.sourceFiles };
    if (recipe.id === 'list-detail') files['app.js'] = files['app.js'].replace('return this.collection.add({', '// <img src=x onerror="window.injected=true">\n    return this.collection.add({');
    const input = { title: recipe.title, css: recipe.css, files };
    const zip = new AdmZip(Buffer.from(await projectArchive(input, vendor, license, recipeRuntime).arrayBuffer()));
    for (const target of ['ZIP', 'CodePen']) {
      await exportPage.goto('about:blank');
      if (target === 'ZIP') {
        const prefix = base + '/__html-demo-export/';
        await exportPage.route(prefix + '**', route => {
          const name = route.request().url().slice(prefix.length);
          const entry = zip.getEntry(name);
          if (!entry) return route.fulfill({ status: 404, body: 'Missing export file' });
          return route.fulfill({ contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html', body: entry.getData() });
        });
        await exportPage.goto(prefix + 'index.html');
      } else {
        const pen = projectPen(input, vendor, license, recipeRuntime);
        await exportPage.setContent(pen.html);
        await exportPage.addStyleTag({ content: pen.css });
        await exportPage.addScriptTag({ type: 'module', content: pen.js });
      }
      try {
        // TodoMVC intentionally hides the teaching hero in its own stylesheet.
        await exportPage.locator('.lesson h1').waitFor({ state: 'attached' });
        assert.equal(await exportPage.locator('.lesson h1').textContent(), recipe.title);
      } catch (error) {
        console.error(target, recipe.id, errors, await exportPage.locator('body').innerText());
        throw error;
      }
      if (recipe.id === 'list-detail') {
        await exportPage.locator('#new-todo').fill(literal);
        await exportPage.locator('#new-todo').press('Enter');
        assert.equal(await exportPage.locator('.todo-title').last().textContent(), literal);
        assert.match(await exportPage.locator('.source-lines code').first().textContent(), /<img src=x onerror=/);
        assert.ok(await exportPage.locator('.source-lines .syntax-comment').count());
        assert.equal(await exportPage.locator('.source-lines img, .todo-item img').count(), 0);
      } else if (recipe.id === 'owned-widget') {
        await exportPage.locator('#replace-widget').click();
        await exportPage.locator('#broadcast-radio').click();
        assert.equal(await exportPage.locator('.retired-radio .equalizer i').count(), 9);
      } else {
        for (let step = 0; step < 4; step++) await exportPage.locator('#open-station').click();
        await exportPage.locator('.flight-chapter').click();
        assert.equal(await exportPage.locator('#guided-flight').isVisible(), true);
      }
      await exportPage.unrouteAll();
      console.log(`PASS ${recipe.id} ${target}: configured adapters, real modules, rendered interaction`);
    }
  }
  await exportPage.close();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/#playground');
  await page.waitForFunction(() => window.MarionettePlayground);
  await page.evaluate(() => window.MarionettePlayground.open());
  const checks = await readFile('test/browser/workshop-checks.js', 'utf8');
  const hostileId = 'x" autofocus onfocus="window.injected=true';
  const fixture = starter.code + '\n' + checks + `
const record = region.currentView.collection.at(0);
record.set('id', ${JSON.stringify(hostileId)});
const button = region.currentView.getChildView('list').children.findByModel(record).el.querySelector('button');
if (button.id !== 'victory-' + ${JSON.stringify(hostileId)} || button.hasAttribute('onfocus') || button.hasAttribute('autofocus')) throw new Error('Attribute interpolation escaped its boundary');
record.set('id', 'first');`;
  await page.evaluate(app => window.MarionettePlayground.run(app), { ...starter, code: fixture });
  await page.frameLocator('.workshop-preview iframe').locator('body').evaluate(() => window.dispatchEvent(new Event('run-workshop-checks')));
  const personal = await page.evaluate(() => window.MarionettePlayground.inspect());
  assert.deepEqual(personal.preview.errors, []);
  assert.equal(personal.preview.recipe.checks.length, 18);
  assert.ok(personal.preview.recipe.checks.every(check => check.observed));
  assert.deepEqual(errors, []);
  console.log('PASS Backstage: 18 ownership checks plus hostile attribute interpolation, no page errors');
} finally {
  await browser?.close();
  await close();
}
