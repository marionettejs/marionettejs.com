// Focused homepage Application check against the built site on an ephemeral port.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { builtSite } from './built-site.mjs';
const { base, close } = await builtSite();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  await mkdir('output/playwright', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.heroRevealOrder = [];
    new MutationObserver(() => {
      for (const [name, selector] of [['code', '.hero-code-panel:not([hidden]) [data-active="true"]'], ['heading', '.hero-heading h1'], ['ready', '.hero-answer-view-slot .hero-answer']]) {
        if (!window.heroRevealOrder.some(item => item.name === name) && document.querySelector(selector)) window.heroRevealOrder.push({ name, time: performance.now() });
      }
    }).observe(document, { subtree: true, childList: true, attributes: true });
  });
  const inspect = () => page.evaluate(() => window.MarionetteHero.inspect());
  const ready = () => page.waitForFunction(() => window.MarionetteHero?.inspect().ready);
  const feature = id => page.locator(`[data-feature="${id}"]`);
  const tab = name => page.getByRole('tab', { name: name + '.js', exact: true });
  const source = () => page.locator('.hero-code-panel:not([hidden]) .hero-code-source');
  const geometry = () => page.locator('.interactive-hero').evaluate(el => {
    const stage = document.querySelector('.hero-interaction-stage').getBoundingClientRect();
    const slot = document.querySelector('.hero-answer-slot').getBoundingClientRect();
    return { height: el.getBoundingClientRect().height, next: document.querySelector('.agent-invitation').getBoundingClientRect().top + scrollY,
      stage: { x:stage.left, y:stage.top+scrollY, width:stage.width, height:stage.height }, slot: { x:slot.left, y:slot.top+scrollY, width:slot.width,height:slot.height } };
  });
  async function stable(expected, label) {
    const actual = await geometry();
    for (const part of ['stage','slot']) for (const axis of ['x','y','width','height']) assert.ok(Math.abs(actual[part][axis] - expected[part][axis]) < 1, `${label}: ${part} ${axis} stays exact (${expected[part][axis]} → ${actual[part][axis]})`);
    assert.ok(Math.abs(actual.height - expected.height) < 2 && Math.abs(actual.next - expected.next) < 2,
      `${label} stays stable: ${JSON.stringify({ expected, actual })}`);
  }
  await page.goto(base);
  await page.locator('.hero-heading h1').waitFor();
  const loadingGeometry = await geometry();
  await page.locator('.hero-loader').waitFor();
  await page.screenshot({ path: 'output/playwright/hero-loading-desktop.png' });
  await ready();
  await stable(loadingGeometry, 'Startup loader → ready');
  const order = await page.evaluate(() => window.heroRevealOrder);
  assert.deepEqual(order.map(item => item.name), ['code', 'heading', 'ready']);
  assert.ok(order[1].time - order[0].time < 700, 'First reveal is quick');
  assert.ok(order[2].time - order[1].time >= 1400, 'Loader is readable');
  assert.equal(await page.locator('.hero-heading h1').evaluate(el => getComputedStyle(el).clipPath), 'none');
  assert.equal(await page.locator('.hero-heading h1').innerText(), 'Pull a few\nstrings.');
  assert.match(await page.locator('.night-intro').innerText(), /agent-led development/);
  // The connector is checked visually and geometrically below the complete hero.
  assert.match(await source().textContent(), /simplified Marionette sketch/);
  assert.doesNotMatch(await source().textContent(), /dataset|revealHeading/);
  assert.match(await source().textContent(), /prepareStart\(_options, \{ signal \}\)/);
  await page.waitForFunction(() => document.querySelector('.phase-controls button:not(:disabled)'));
  const mark = page.locator('.hero-live-code .rig-control img');
  const markBefore = await mark.evaluate(el => getComputedStyle(el).transform);
  await page.locator('.hero-live-code').hover({ position: { x: 30, y: 30 } });
  await page.waitForTimeout(120);
  assert.notEqual(await mark.evaluate(el => getComputedStyle(el).transform), markBefore, 'The suspension mark responds to the pointer');
  await page.mouse.move(0, 0);
  const initial = await inspect();
  const originalReplay = await page.locator('.hero-replay').elementHandle();
  await page.waitForFunction(() => window.MarionetteHero.inspect().stage === 'onStart');
  await page.waitForTimeout(450);
  await page.screenshot({ path: 'output/playwright/hero-interactive-desktop.png' });
  await page.locator('.agent-invitation').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY - 550));
  await page.screenshot({ path: 'output/playwright/hero-transition-desktop.png' });
  const clearance = await page.locator('.hero-live-code').evaluate(el => {
    const caption = el.getBoundingClientRect();
    const next = document.querySelector('.agent-invitation').getBoundingClientRect();
    return next.top - caption.bottom;
  });
  assert.ok(clearance >= 32, 'The sticky editor retains lower clearance from the next section');
  await page.evaluate(() => scrollTo(0, 0));

  await feature('panel').click();
  await page.waitForFunction(() => window.MarionetteHero.inspect().stage === 'region');
  const panelBefore = await inspect();
  const answerBefore = await page.locator('.hero-answer').textContent();
  const aria = await page.locator('.hero-code-tabs [role="tab"]').evaluateAll(tabs => tabs.map(tab => {
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    return panel?.getAttribute('role') === 'tabpanel' && panel.getAttribute('aria-labelledby') === tab.id;
  }));
  assert.equal(aria.length, 5); assert.ok(aria.every(Boolean));
  await feature('panel').click();
  await tab('Application').click();
  const pinned = await source().textContent();
  await page.waitForTimeout(800);
  assert.equal((await inspect()).codeTab, 'application'); assert.equal((await inspect()).following, false);
  assert.equal(await source().textContent(), pinned);
  assert.match(pinned, /prepareStart/);
  await tab('View').click(); assert.match(await source().textContent(), /heading.getState/);
  await tab('View').press('End'); assert.equal(await tab('Startup').getAttribute('aria-selected'), 'true');
  await tab('Startup').press('ArrowRight'); assert.equal(await tab('Application').getAttribute('aria-selected'), 'true');
  await tab('Application').press('ArrowRight'); assert.equal(await tab('View').getAttribute('aria-selected'), 'true');
  await tab('View').press('Home'); assert.equal(await tab('Application').evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('.hero-code-tabs [tabindex="0"]').count(), 1);
  assert.equal(await page.getByRole('tabpanel').count(), 1);
  const unchanged = await inspect();
  assert.equal(unchanged.shell, panelBefore.shell); assert.equal(unchanged.actions, panelBefore.actions);
  // Only the intentional app interaction replaced the answer, tab clicks did not.
  assert.notEqual(unchanged.answer, panelBefore.answer); assert.notEqual(await page.locator('.hero-answer').textContent(), answerBefore);
  const sameAnswer = unchanged.answer;
  await tab('List').click(); assert.equal((await inspect()).answer, sameAnswer);
  await feature('panel').click(); assert.equal((await inspect()).codeTab, 'events');
  assert.equal((await inspect()).following, true, 'A new app action retakes code control');
  await tab('View').click();
  await page.locator('.hero-follow').click(); assert.equal((await inspect()).following, true);
  console.log('PASS code tabs: editor file tabs, ARIA links, keyboard, retained sketches, manual pin and explicit follow');

  const baseline = await geometry();
  await feature('list').click();
  const originalRow = await page.locator('.hero-sample-row').first().elementHandle();
  await page.locator('.hero-add-row').press('Enter');
  assert.equal(await page.locator('.hero-sample-row').count(), 3);
  assert.equal(await page.locator('.hero-add-row').isVisible(), false, 'Add hides at the three-row cap');
  assert.equal((await inspect()).list.count, 3);
  assert.ok((await inspect()).list.models.every(model => model.realModel));
  await stable(baseline, 'Three data rows');
  assert.equal(await page.locator('.hero-sample-rows').evaluate(el => el.clientHeight), 170);
  const listState = await inspect();
  const beforeCancelTime = await page.evaluate(() => performance.timeOrigin);
  let documents = 0;
  const countDocuments = request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; };
  page.on('request', countDocuments);
  await feature('idea').click();
  await page.locator('.hero-cancel-idea').waitFor();
  assert.equal(await page.locator('.hero-cancel-idea').getAttribute('type'), 'button');
  await stable(baseline, 'Idea preloader');
  const loaderHeight = await page.locator('.hero-idea-loading-slot .hero-loader').evaluate(el => el.getBoundingClientRect().height);
  assert.equal(loaderHeight, await page.locator('.hero-answer').evaluate(el => el.getBoundingClientRect().height), 'Loader exactly matches the reserved content panel');
  assert.notEqual(await page.locator('.hero-word-window>span').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.screenshot({ path: 'output/playwright/hero-sentence-loader-desktop.png' });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.hero-cancel-idea').isVisible(), true, 'Loader remains readable');
  await page.locator('.hero-cancel-idea').press('Enter');
  assert.equal((await inspect()).application, listState.application);
  assert.equal((await inspect()).shell, listState.shell);
  assert.equal((await inspect()).answer, listState.answer, 'Cancel retains the prior View');
  assert.equal((await inspect()).selection, 'list');
  assert.ok((await inspect()).ideaApplication, 'The idea wait has its own actual Application');
  assert.equal((await inspect()).ideaRunning, false, 'Cancel stops only the idea Application');
  assert.equal(await page.locator('.hero-sample-row').count(), 3);
  assert.equal(await originalRow.evaluate(el => el === document.querySelector('.hero-sample-row')), true);
  await page.waitForTimeout(1800);
  assert.equal((await inspect()).answer, listState.answer, 'Canceled work cannot replace the prior panel');
  assert.equal(await page.evaluate(() => performance.timeOrigin), beforeCancelTime);
  assert.equal(documents, 0, 'Cancel makes no document request or reload');
  page.off('request', countDocuments);
  await stable(baseline, 'Canceled list');
  await page.locator('.hero-remove-row').last().press('Enter');
  assert.equal(await page.locator('.hero-add-row').evaluate(el => el === document.activeElement), true);
  await feature('idea').press('Enter');
  await page.locator('.hero-cancel-idea').waitFor();
  await feature('panel').click();
  assert.match(await page.locator('.hero-answer h2').textContent(), /panel changes|new answer/);
  await page.waitForTimeout(1800);
  assert.equal((await inspect()).selection, 'panel', 'Changing direction is immediate and cancels stale work');
  await feature('idea').click();
  await page.locator('.hero-another-idea').waitFor();
  await stable(baseline, 'Loaded idea');
  assert.equal(await page.locator('.hero-answer').evaluate(el => el.getBoundingClientRect().height), loaderHeight);
  const firstIdea = await page.locator('.hero-answer h2').textContent();
  await page.locator('.hero-another-idea').press('Enter');
  await page.locator('.hero-cancel-idea').waitFor();
  await page.locator('.hero-another-idea').waitFor();
  assert.notEqual(await page.locator('.hero-answer h2').textContent(), firstIdea);
  assert.match(await page.locator('.hero-answer h2').textContent(), /^A (curious|sleepy|dramatic|delighted|suspicious) /);
  assert.equal(await page.locator('.hero-another-idea').evaluate(el => el === document.activeElement), true);
  await tab('Events').click();
  assert.match(await source().textContent(), /onAnotherSentence\(\).*sentences.restart\(\)/s);
  await page.locator('.hero-follow').click();
  assert.equal(await source().evaluate(el => getComputedStyle(el).whiteSpace), 'pre');
  console.log('PASS state and loading: readable wait, stable height, preserved rows/identity on Cancel, no reload or stale result, responsive panel switches');

  await tab('View').click();
  await page.locator('.hero-replay').press('Enter');
  await ready();
  assert.equal((await inspect()).shell, initial.shell);
  assert.equal((await inspect()).following, true);
  assert.equal(await originalReplay.evaluate(el => el === document.activeElement && el === document.querySelector('.hero-replay')), true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.hero-replay').press('Enter'); await ready();
  assert.equal((await inspect()).queued, 0);
  assert.equal(await page.locator('.hero-heading-text').evaluate(el => getComputedStyle(el).animationName), 'none');
  console.log('PASS replay and reduced motion: real app restart, retained keyboard control and immediate content');

  for (const width of [980, 792, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo(0, 0));
    if (width <= 420) await page.waitForFunction(() => !document.querySelector('.hero-live-code').open);
    const size = await geometry();
    await feature('panel').click(); await stable(size, `${width}px panel`);
    await feature('list').click();
    await page.locator('.hero-add-row').click();
    assert.equal(await page.locator('.hero-sample-row').count(), 3);
    assert.equal(await page.locator('.hero-add-row').isVisible(), false);
    await stable(size, `${width}px data list`);
    await page.locator('.hero-remove-row').last().click();
    assert.equal(await page.locator('.hero-add-row').isVisible(), true);
    assert.equal(await page.locator('.hero-sample-rows').evaluate(el => el.clientHeight), 170);
    const alignment = await page.locator('.hero-list-answer').evaluate(el => {
      const row = el.querySelector('.hero-sample-row').getBoundingClientRect();
      const add = el.querySelector('.hero-add-row').getBoundingClientRect();
      const card = el.getBoundingClientRect();
      return Math.abs(row.left - add.left) < 1 && row.right <= card.right + 1 && row.right <= innerWidth;
    });
    assert.ok(alignment, `${width}px cards/Add align and fit`);
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    const textFits = await page.locator('.hero-heading h1,.night-intro,.hero-purpose,.hero-choices').evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth + 1));
    assert.ok(textFits, `${width}px headline/body/actions fit`);
    await page.locator('.interactive-hero').screenshot({ path: `output/playwright/hero-list-${width}.png` });
    await feature('idea').click(); await page.locator('.hero-another-idea').waitFor(); await stable(size, `${width}px idea`);
    if (width <= 420) {
      await page.locator('.hero-code-toggle').click();
      await tab('View').click();
      await source().focus();
      const scroll = await source().evaluate(el => { el.scrollTop = Math.min(40, el.scrollHeight - el.clientHeight); return el.scrollTop; });
      assert.ok(scroll > 0, 'Narrow code pane scrolls');
      await tab('Application').click(); await tab('View').click();
      assert.equal(await source().evaluate(el => el.scrollTop), scroll);
      await page.locator('.interactive-hero').screenshot({ path: `output/playwright/hero-code-${width}.png` });
      await page.locator('.hero-code-toggle').click();
    }
    await page.locator('.interactive-hero').screenshot({ path: `output/playwright/hero-interactive-${width}.png` });
  }
  console.log('PASS visual/responsive checks: 980/792/390/320px exact interaction footprints, fitting type, aligned list/cards, optional small-screen code and retained scroll');

  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.route('**/hero-answers.json', route => route.fulfill({ status: 503, body: 'Test failure' }));
  await page.locator('.hero-replay').click();
  await page.locator('.hero-answer h2').filter({ hasText: 'couldn’t prepare' }).waitFor();
  await page.unroute('**/hero-answers.json');
  await page.locator('.hero-replay').click(); await ready();
  console.log('PASS failed preparation and replay recovery');

  await page.goto(base); await ready();
  assert.equal(await page.locator('.interactive-hero').count(), 1);
  assert.equal(await page.locator('#application-slot').count(), 0);
  assert.equal(await page.locator('.night-copy h1').innerText(), 'Pull a few\nstrings.');
  assert.equal(await page.locator('.night-actions a[href="/why/"]').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS normal homepage uses the Application with no legacy header or page errors');
  await page.close();

  // The lifecycle story works before either the hero module or its data is ready.
  // Releasing the module also exercises motion binding to the newly mounted rig.
  for (const resource of ['module', 'answers']) {
    const delayed = await browser.newPage({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
    delayed.on('pageerror', error => errors.push(error.message));
    let release;
    let markHeld;
    const held = new Promise(resolve => { markHeld = resolve; });
    await delayed.route(resource === 'module' ? '**/assets/hero.js*' : '**/hero-answers.json', route => {
      release = () => route.continue();
      markHeld();
    });
    await delayed.goto(base);
    await held;
    await delayed.locator('.lifecycle-live').waitFor();
    assert.equal(await delayed.evaluate(() => Boolean(window.MarionetteHero?.inspect().ready)), false);
    await delayed.locator('[data-phase="1"][type="button"]').click();
    assert.match(await delayed.locator('#lifecycle-events').innerText(), /NotesView: destroy.*TasksView: attach/);
    await release();
    await delayed.waitForFunction(() => window.MarionetteHero?.inspect().ready);
    await delayed.locator('.interactive-opening.thread-connected').waitFor();
    assert.equal(await delayed.evaluate(() => {
      const opening = document.querySelector('.opening-act');
      const card = opening.querySelector('.demo').getBoundingClientRect();
      const bounds = opening.getBoundingClientRect();
      const path = opening.querySelector('.opening-thread path').getAttribute('d');
      const [, x, y] = path.match(/^M ([\d.]+) ([\d.]+)/).map(Number);
      return Math.abs(x - (card.right - bounds.left - 6)) < 1 && Math.abs(y - (card.top - bounds.top)) < 1;
    }), true, 'Connector uses the mounted live code panel');
    await delayed.evaluate(() => scrollTo(0, 150));
    await delayed.waitForFunction(() => {
      const opening = document.querySelector('.opening-act');
      const [, , y] = opening.querySelector('.opening-thread path').getAttribute('d').match(/^M ([\d.]+) ([\d.]+)/).map(Number);
      return Math.abs(y - (opening.querySelector('.demo').getBoundingClientRect().top - opening.getBoundingClientRect().top)) < 1;
    });
    await delayed.close();
  }
  console.log('PASS delayed hero module/data: independent lifecycle controls, live rig binding and sticky connector');

  const failed = await browser.newPage({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce' });
  failed.on('pageerror', error => errors.push(error.message));
  await failed.route('**/hero-answers.json', route => route.fulfill({ status: 503, body: 'Test failure' }));
  await failed.goto(base);
  await failed.getByRole('heading', { name: 'The header couldn’t prepare its answers.' }).waitFor();
  await failed.locator('.lifecycle-live').waitFor();
  const retry = failed.getByRole('button', { name: 'Retry startup', exact: true });
  assert.equal(await failed.locator('.hero-live-code').evaluate(el => el.open), false);
  assert.equal(await retry.isVisible(), true, 'Retry is outside the collapsed code disclosure');
  assert.equal(await retry.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const slot = el.closest('.hero-answer-slot').getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= slot.bottom + 1;
  }), true, 'Narrow retry fits the reserved panel');
  await failed.locator('[data-phase="1"][type="button"]').click();
  assert.match(await failed.locator('#lifecycle-events').innerText(), /TasksView: attach/);
  await failed.screenshot({ path: 'output/playwright/hero-retry-320.png', fullPage: true });
  const timeOrigin = await failed.evaluate(() => performance.timeOrigin);
  await failed.unroute('**/hero-answers.json');
  await retry.focus();
  await retry.press('Enter');
  await failed.waitForFunction(() => window.MarionetteHero?.inspect().ready);
  assert.equal(await failed.evaluate(() => performance.timeOrigin), timeOrigin);
  assert.match(await failed.locator('.hero-initial-purpose').innerText(), /Your agent learns the patterns/);
  await failed.close();
  console.log('PASS failed startup: independent lifecycle and visible 320px keyboard retry without reload');

  // Real links: no timer/preventDefault; modified click opens a new tab.
  const navContext = await browser.newContext();
  const nav = await navContext.newPage();
  nav.on('pageerror', error => errors.push(error.message));
  await nav.emulateMedia({ reducedMotion: 'reduce' });
  await navContext.route('**/why/', route => route.fulfill({ contentType: 'text/html', body: '<h1>Why Marionette</h1>' }));
  await navContext.route('**/docs/agent-start/', route => route.fulfill({ contentType: 'text/html', body: '<h1>Agent setup</h1>' }));
  await nav.goto(base); await nav.waitForFunction(() => window.MarionetteHero?.inspect().ready);
  await nav.waitForFunction(() => getComputedStyle(document.querySelector('.hero-support')).opacity === '1');
  const popupPromise = navContext.waitForEvent('page');
  await nav.locator('.hero-explore').click({ button: 'middle' });
  const popup = await popupPromise; await popup.bringToFront(); await popup.waitForURL('**/why/'); assert.equal(new URL(popup.url()).pathname, '/why/');
  assert.equal(new URL(nav.url()).search, ''); await popup.close();
  await nav.locator('.hero-equip').focus();
  await Promise.all([nav.waitForURL('**/docs/agent-start/'), nav.locator('.hero-equip').press('Enter')]);
  await nav.goto(base); await nav.waitForFunction(() => window.MarionetteHero?.inspect().ready);
  await Promise.all([nav.waitForURL('**/why/'), nav.locator('.hero-explore').click()]);
  await navContext.close();
  assert.deepEqual(errors, []);
  console.log('PASS navigation: ordinary Explore link, keyboard Equip link, modified-click new tab');


} finally { await browser?.close(); await close(); }
