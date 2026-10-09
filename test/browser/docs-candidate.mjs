// Inspect the actual built imported corpus; no deployment or workshop execution.
import assert from 'node:assert/strict';
import { staticServer } from './static-server.mjs';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
const root = resolve('dist');
const manifest = JSON.parse(await readFile(resolve(root, 'docs/manifest.json'), 'utf8'));
const supplemental = JSON.parse(await readFile(resolve(root, 'docs/supplemental-manifest.json'), 'utf8'));
const publication = JSON.parse(await readFile(resolve(root, 'docs/publication.json'), 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png' };
const { base, close } = await staticServer({ root, types, fallbackType: 'text/plain' });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  // Documentation and search must work when the optional chat service is unavailable.
  await page.route('https://context7.com/widget.js', route => route.abort());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir('output/playwright', { recursive: true });
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const item of [...manifest.pages, ...supplemental.pages]) {
      const response = await page.goto(`${base}/${item.route}/`);
      assert.equal(response.status(), 200, item.source);
      assert.equal(await page.locator('.docs-prose h1').count(), 1, item.source);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${item.source} at ${width}px`);
      assert.equal(await page.locator('.docs-version').textContent().then(text => text.includes(manifest.packageVersion)), true);
      if (width === 375) {
        const heading = await page.locator('.docs-prose h1').boundingBox();
        assert.ok(heading.y + heading.height < 900, `${item.source}: article title fits the first mobile screen`);
        assert.equal(await page.locator('.docs-menu').getAttribute('open'), null);
      } else {
        assert.equal(await page.locator('.docs-menu').getAttribute('open'), '', 'Desktop navigation opens when JavaScript is available');
      }
      if (item.source === 'docs/api/application.md') await page.screenshot({ path: `output/playwright/docs-first-screen-${width}.png` });
      if (['docs/api/application.md', 'docs/guides/production.md', 'docs/guides/framework-migration.md'].includes(item.source)) await page.screenshot({ path: `output/playwright/${item.source.replaceAll('/', '-').replace('.md', '')}-${width}.png`, fullPage: true });
    }
  }
  await page.goto(`${base}/docs/`);
  const search = page.getByRole('textbox', { name: 'Search', exact: true });
  await search.fill('prepareStart');
  await page.locator('.pagefind-ui__result-link').first().waitFor();
  assert.ok(await page.locator('.pagefind-ui__result-link[href$="/docs/api/application/"]').count(),
    'Searching prepareStart returns the Application API page.');
  await search.fill('Migrate from another UI framework');
  await page.locator('.pagefind-ui__result-link[href$="/docs/guides/framework-migration/"]').first().waitFor();
  // Native disclosures keep reading, navigation and provenance usable without scripts.
  const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  for (const route of ['/docs/api/region/', '/docs/agent-start/']) {
    await staticPage.goto(`${base}${route}`);
    const heading = await staticPage.locator('.docs-prose h1').boundingBox();
    assert.ok(heading.y + heading.height < 844, `${route}: no-script mobile title fits the first screen`);
    assert.equal(await staticPage.locator('.docs-release').isVisible(), true);
    await staticPage.locator('.docs-source>summary').click();
    assert.equal(await staticPage.getByRole('link', { name: 'Read Markdown', exact: true }).isVisible(), true);
    const item = [...manifest.pages, ...supplemental.pages].find(item => `/${item.route}/` === route);
    const readingRevision = publication.edits.find(edit => edit.source === item?.source && edit.sourceRevision)?.sourceRevision || item?.sourceRevision || manifest.sourceRevision;
    const provenance = await staticPage.locator('.docs-version').textContent();
    assert.ok(provenance.includes(manifest.sourceRevision.slice(0, 8)), `${route}: archive revision remains identified`);
    if (item) {
      assert.ok(provenance.includes(`Reading source: ${readingRevision}.`), `${route}: exact reading-copy revision is accessible without JavaScript`);
    } else {
      assert.ok(provenance.includes(manifest.sourceRevision), `${route}: generated setup page identifies the full archive revision`);
    }
    await staticPage.locator('.docs-menu>summary').click();
    assert.equal(await staticPage.locator('.docs-shortcuts').isVisible(), true);
  }
  await staticPage.goto(`${base}/docs/api/region/`);
  await staticPage.locator('.docs-page-index>summary').click();
  const section = staticPage.locator('.docs-page-index a').first();
  const fragment = await section.getAttribute('href');
  await section.click();
  assert.equal(new URL(staticPage.url()).hash, fragment);
  await staticPage.setViewportSize({ width: 1280, height: 900 });
  await staticPage.goto(`${base}/docs/api/region/`);
  assert.equal(await staticPage.locator('.docs-menu').getAttribute('open'), null);
  await staticPage.locator('.docs-menu>summary').click();
  assert.equal(await staticPage.locator('.docs-shortcuts').isVisible(), true, 'Desktop navigation opens without JavaScript');
  await staticPage.close();
  assert.deepEqual(errors, []);
  console.log(`Verified ${(manifest.pages.length + supplemental.pages.length) * 2} documentation page/viewport combinations and rendered search.`);
} finally {
  await browser.close();
  await close();
}
