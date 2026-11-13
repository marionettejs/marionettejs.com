import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage(); const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.emulateMedia({ reducedMotion: 'reduce' });
 const inspect = () => page.evaluate(() => window.MarionetteHero.inspect());
 const footprint = () => page.locator('.hero-interaction-stage').evaluate(el => {const r=el.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height};});
 for (const width of [1440,792,390,320]) {
  await page.setViewportSize({ width, height: 1080 });
  await page.goto('http://127.0.0.1:4175/');
  await page.waitForFunction(() => window.MarionetteHero?.inspect().ready);
  const initial = await footprint();
  for (const index of [0,1,2]) {
   await page.locator('[data-feature="list"]').click();
   assert.equal((await inspect()).list.count, 2);
   assert.ok((await inspect()).list.models.every(model => model.realModel));
   await page.locator('.hero-add-row').click();
   assert.equal(await page.locator('.hero-sample-row').count(),3);
   assert.equal((await inspect()).list.count,3);
   assert.equal(new Set((await inspect()).list.models.map(model=>model.label)).size,3);
   assert.equal(await page.locator('.hero-add-row').isVisible(),false);
   const rows = await page.locator('.hero-sample-row').elementHandles();
   const removedId = (await inspect()).list.models[index].id;
   await page.locator('.hero-remove-row').nth(index).click();
   assert.equal(await page.locator('.hero-sample-row').count(),2);
   const state = (await inspect()).list;
   assert.equal(state.count,2); assert.equal(state.previousRowDestroyed,true);
   assert.ok(state.models.every(model=>model.id!==removedId));
   assert.equal(await rows[index].evaluate(el=>el.isConnected),false);
   for (let other=0;other<rows.length;other++) if(other!==index) assert.equal(await rows[other].evaluate(el=>el.isConnected),true);
   assert.equal(await page.locator('.hero-add-row').isVisible(),true);
   await page.locator('.hero-add-row').click();
   assert.equal((await inspect()).list.count,3);
   assert.equal(new Set((await inspect()).list.models.map(model=>model.label)).size,3);
   assert.equal(await page.locator('.hero-add-row').isVisible(),false);
   await page.locator('.hero-add-row').evaluate(el=>el.click());
   assert.equal((await inspect()).list.count,3,'The cap is also enforced in the handler');
   assert.deepEqual(await footprint(),initial);
  }
  while (await page.locator('.hero-remove-row').count()) await page.locator('.hero-remove-row').first().click();
  assert.equal((await inspect()).list.count,0);
  await page.locator('.hero-add-row').click(); assert.equal((await inspect()).list.count,1);
  await page.locator('[data-feature="panel"]').click();
  await page.locator('[data-feature="list"]').click();
  assert.equal((await inspect()).list.count,2);
  await page.locator('.hero-add-row').click();
  await page.locator('.hero-remove-row').last().click();
  assert.equal((await inspect()).list.count,2);
  assert.deepEqual(await footprint(),initial);
  assert.equal(await page.locator('.hero-sample-rows').evaluate(el=>el.clientHeight),170);
  assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.locator('.interactive-hero').screenshot({path:`output/playwright/hero-data-list-${width}.png`});
  console.log(`PASS ${width}px: real Models/Collection, distinct labels, cap 3, first/middle/last remove, row destruction, re-add, empty/refill and switch away/back; exact footprint.`);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS no list/page exceptions.');
} finally { await browser.close(); }
