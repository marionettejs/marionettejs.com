import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { staticServer } from './static-server.mjs';
import { resolve } from 'node:path';

const { base, close } = process.env.NEWS_PREVIEW_URL ? { base: process.env.NEWS_PREVIEW_URL, close: async () => {} } : await staticServer({ root: resolve('dist'), types: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' } });
const browser = await chromium.launch({ headless: true });
await mkdir('output/playwright/news', { recursive: true });
try {
  const page = await browser.newPage();
  await page.route('https://**/*', route => route.abort());
  const decodeImages = async () => page.locator('main img').evaluateAll(async images => {
    await Promise.all(images.map(async img => { img.loading = 'eager'; await img.decode(); }));
    return images.every(img => img.naturalWidth > 0);
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/news/`);
  const filter = name => page.getByRole('button', { name, exact: true });
  const stories = page.locator('[data-news-item]:visible');
  await filter('All').waitFor();
  const unchangedHistory = await page.evaluate(() => history.length);
  await filter('All').click();
  assert.equal(await page.evaluate(() => history.length), unchangedHistory);
  assert.equal(await stories.count(), 5);
  assert.equal(await page.locator('.news-feature').count(), 1);
  assert.equal(await page.locator('.news-feature').getAttribute('data-news-path'), '/news/introducing-marionette-5/');
  assert.deepEqual(await page.locator('[data-news-chronological] [data-news-item]').evaluateAll(items => items.map(item => item.dataset.newsPath)), ['/case-studies/vikunja/', '/case-studies/roundingwell/', '/case-studies/realworld/', '/news/wear-your-very-specific-opinions/']);
  assert.equal(await filter('Interview').count(), 0);
  assert.equal(await filter('Experiment').count(), 0);
  assert.equal(await page.getByRole('navigation', { name: 'Main navigation' }).locator('[aria-current=page]').innerText(), 'News');
  for (const [category, count] of [['Release', 1], ['Case Study', 3], ['Research', 2], ['Story', 2]]) {
    await filter(category).focus();
    await page.keyboard.press('Enter');
    assert.equal(await stories.count(), count);
    assert.equal(await filter(category).getAttribute('aria-pressed'), 'true');
    assert.ok((await page.getByRole('status').innerText()).includes(category));
  }
  assert.equal(await page.locator('[data-news-empty]').isVisible(), false);
  // Exercise the existing empty/reset flow with a feed fixture that has no research.
  await page.route('**/news/?empty-fixture=1', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replaceAll('Case Study|Research', 'Case Study') });
  });
  await page.goto(`${base}/news/?empty-fixture=1`);
  await filter('Research').click();
  assert.equal(await stories.count(), 0);
  assert.equal(await page.locator('[data-news-empty]').isVisible(), true);
  await filter('See all news').click();
  assert.equal(await stories.count(), 5);
  assert.equal(await filter('All').evaluate(el => el === document.activeElement), true);
  await page.goto(`${base}/news/`);
  await filter('Case Study').click();
  const selectedHistory = await page.evaluate(() => history.length);
  await filter('Case Study').click();
  assert.equal(await page.evaluate(() => history.length), selectedHistory);
  await page.reload();
  await filter('Case Study').waitFor();
  assert.equal(await stories.count(), 3);
  await filter('Release').click();
  await page.goBack();
  assert.equal(await stories.count(), 3);
  await page.goto(`${base}/news/?category=Unknown`);
  await filter('All').waitFor();
  assert.equal(await stories.count(), 5);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['/news/', '/news/introducing-marionette-5/', '/news/wear-your-very-specific-opinions/']) {
      await page.goto(base + route);
      assert.equal(await decodeImages(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route} at ${width}`);
      assert.equal(await page.locator('h1').count(), 1);
      const current = page.getByRole('navigation', { name: 'Main navigation' }).locator('[aria-current=page]');
      assert.equal(await current.count(), route === '/news/' ? 1 : 0);
      assert.equal(await page.locator('.news-draft').count(), 0);
      if (route === '/news/introducing-marionette-5/') {
        assert.equal(await page.locator('.news-prose figure').count(), 2);
        assert.equal(await page.locator('.news-pullquote blockquote').innerText(), 'The human ergonomics of the code were about code review and not saving keystrokes.');
        const capture = page.locator('.news-case-capture img');
        assert.equal(await capture.getAttribute('src'), '/assets/case-studies/vikunja/task-dark.png');
        await capture.scrollIntoViewIfNeeded();
        await capture.evaluate(img => img.decode());
        assert.equal(await capture.evaluate(img => Math.abs(img.getBoundingClientRect().width / img.getBoundingClientRect().height - 1.6) < 0.01), true);
        assert.equal(await page.locator('.news-case-capture figcaption a').getAttribute('href'), '/case-studies/vikunja/');
        await page.locator('.news-pullquote').screenshot({ path: `output/playwright/news/pullquote-${width}.png` });
        await page.locator('.news-case-capture').screenshot({ path: `output/playwright/news/capture-${width}.png` });
      }
      await page.screenshot({ path: `output/playwright/news/${route === '/news/' ? 'feed' : route.includes('opinions') ? 'story' : 'article'}-${width}.png`, fullPage: true });
    }
  }
  assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'index, follow');
  assert.equal(await page.locator('meta[property="article:published_time"]').getAttribute('content'), '2026-09-08');
  assert.equal(await page.locator('.news-byline time').innerText(), 'September 8, 2026');
  await page.goto(`${base}/news/introducing-marionette-5/`);
  const interview = JSON.parse(await readFile('content/news/launch-interview.json', 'utf8'));
  const expectedSpeakers = interview.turns.filter((turn, index, turns) => !index || turn.speaker !== turns[index - 1].speaker).map(turn => turn.speaker);
  assert.deepEqual(await page.locator('.news-speaker').allTextContents(), expectedSpeakers);
  assert.deepEqual(await page.locator('.news-prose section h2').allTextContents(), [...interview.turns.filter(turn => turn.question).map(turn => turn.text), 'Try it in your project.']);
  assert.equal(await page.locator('.news-prose section h2').first().innerText(), 'What brought you back to v5?');
  assert.ok(!(await page.locator('.news-prose').innerText()).includes('This interview has been edited from our conversations.'));
  assert.ok((await page.locator('.news-prose').innerText()).includes('Well, I noticed agents were doing more and more of my coding, and I started wondering whether I should abandon Marionette and move to one of the major frameworks.'));
  assert.ok(!(await page.locator('.news-prose').innerText()).includes('I don’t know much about Svelte'));
  const contents = page.getByRole('navigation', { name: 'In this conversation' });
  for (const link of await contents.getByRole('link').all()) {
    assert.equal(await page.locator(await link.getAttribute('href')).count(), 1);
  }
  const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await staticPage.route('https://**/*', route => route.abort());
  await staticPage.goto(`${base}/news/`);
  assert.equal(await staticPage.locator('[data-news-item]:visible').count(), 5);
  assert.equal(await staticPage.locator('[data-news-controls]').isVisible(), false);
  for (const route of ['/case-studies/realworld/', '/case-studies/roundingwell/', '/case-studies/vikunja/']) {
    assert.equal((await staticPage.goto(base + route)).status(), 200);
    assert.equal(await staticPage.locator('link[rel=canonical]').getAttribute('href'), `https://marionettejs.com${route}`);
    assert.equal(await staticPage.getByRole('navigation', { name: 'Main navigation' }).locator('[aria-current=page]').count(), 0);
  }
  await staticPage.goto(base + '/');
  assert.ok(await staticPage.locator('main a[href^="/case-studies/"]').count());
  await page.route('**/__broken-lazy.png', route => route.abort());
  await page.evaluate(() => {
    const img = new Image(); img.loading = 'lazy'; img.style.marginTop = '100000px'; img.src = '/__broken-lazy.png';
    document.querySelector('main').append(img);
  });
  await assert.rejects(decodeImages());
  assert.deepEqual(errors, []);
  console.log('PASS News: editorial feature, chronological feed, multi-tags, Story article, speaker transitions, all filters, keyboard/focus, empty/reset, URL/reload/back, four widths, article anchors/metadata, no-JS, canonical case studies and homepage links.');
} finally { await browser.close(); await close(); }
