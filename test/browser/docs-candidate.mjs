// Inspect the actual built imported corpus; no deployment or workshop execution.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
const root = resolve('dist');
const manifest = JSON.parse(await readFile(resolve(root, 'docs/manifest.json'), 'utf8'));
const supplemental = JSON.parse(await readFile(resolve(root, 'docs/supplemental-manifest.json'), 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    let file = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(root + sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.setHeader('Content-Type', types[extname(file)] || 'text/plain');
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
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
      const response = await page.goto(`http://127.0.0.1:${server.address().port}/${item.route}/`);
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
      if (['docs/api/application.md', 'docs/guides/production.md'].includes(item.source)) await page.screenshot({ path: `output/playwright/${item.source.replaceAll('/', '-').replace('.md', '')}-${width}.png`, fullPage: true });
    }
  }
  await page.goto(`http://127.0.0.1:${server.address().port}/docs/`);
  const search = page.locator('#docs-search input');
  await search.fill('prepareStart');
  await page.locator('.pagefind-ui__result-link').first().waitFor();
  assert.ok(await page.locator('.pagefind-ui__result-link[href$="/docs/api/application/"]').count(),
    'Searching prepareStart returns the Application API page.');
  await search.fill('Migrate from another UI framework');
  await page.locator('.pagefind-ui__result-link[href$="/docs/guides/framework-migration/"]').first().waitFor();
  // Native disclosures keep reading, navigation and provenance usable without scripts.
  const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  for (const route of ['/docs/api/region/', '/docs/agent-start/']) {
    await staticPage.goto(`http://127.0.0.1:${server.address().port}${route}`);
    const heading = await staticPage.locator('.docs-prose h1').boundingBox();
    assert.ok(heading.y + heading.height < 844, `${route}: no-script mobile title fits the first screen`);
    assert.equal(await staticPage.locator('.docs-release').isVisible(), true);
    await staticPage.locator('.docs-source>summary').click();
    assert.equal(await staticPage.getByRole('link', { name: 'Read Markdown', exact: true }).isVisible(), true);
    assert.ok((await staticPage.locator('.docs-version').textContent()).includes(manifest.sourceRevision));
    await staticPage.locator('.docs-menu>summary').click();
    assert.equal(await staticPage.locator('.docs-shortcuts').isVisible(), true);
  }
  await staticPage.goto(`http://127.0.0.1:${server.address().port}/docs/api/region/`);
  await staticPage.locator('.docs-page-index>summary').click();
  const section = staticPage.locator('.docs-page-index a').first();
  const fragment = await section.getAttribute('href');
  await section.click();
  assert.equal(new URL(staticPage.url()).hash, fragment);
  await staticPage.setViewportSize({ width: 1280, height: 900 });
  await staticPage.goto(`http://127.0.0.1:${server.address().port}/docs/api/region/`);
  assert.equal(await staticPage.locator('.docs-menu').getAttribute('open'), null);
  await staticPage.locator('.docs-menu>summary').click();
  assert.equal(await staticPage.locator('.docs-shortcuts').isVisible(), true, 'Desktop navigation opens without JavaScript');
  await staticPage.close();
  assert.deepEqual(errors, []);
  console.log(`Verified ${(manifest.pages.length + supplemental.pages.length) * 2} documentation page/viewport combinations and rendered search.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
