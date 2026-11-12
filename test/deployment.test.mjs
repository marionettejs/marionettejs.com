import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, mkdir, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root));
const exec = promisify(execFile);

test('post-publish verification rejects stale pages with unchanged library bundles', async t => {
  const provenance = JSON.parse(await read('content/provenance.json'));
  const bundles = { marionette: await read('site/vendor/marionette.js'), demos: await read('site/vendor/demos.js') };
  const revision = 'a'.repeat(40);
  let served = revision;
  let staleRoute;
  const builtSitemap = await read('dist/sitemap.xml');
  let sitemap = builtSitemap;
  const releaseAssets = new Map(await Promise.all([['/news/marionette-5-1/', 'dist/news/marionette-5-1/index.html'], ['/news/', 'dist/news/index.html'], ['/assets/news/marionette-5.1.webp', 'site/assets/news/marionette-5.1.webp']].map(async ([path, file]) => [path, await read(file)])));
  let changedRelease;
  let injectedAnalytics = false;
  const server = createServer((req, res) => {
    res.setHeader('etag', '"fixture"');
    res.setHeader('cache-control', 'public, max-age=0, must-revalidate, no-transform');
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/reference/provenance.json') return res.end(JSON.stringify(provenance));
    if (path === '/sitemap.xml') return res.end(sitemap);
    if (releaseAssets.has(path)) {
      let content = releaseAssets.get(path);
      if (injectedAnalytics && path.startsWith('/news/')) content = Buffer.from(content.toString().replace('</body>', `<!-- Cloudflare Pages Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "${'a'.repeat(32)}"}'></script><!-- Cloudflare Pages Analytics --></body>`));
      return res.end(path === changedRelease ? Buffer.concat([content, Buffer.from('stale release artifact')]) : content);
    }
    const bundle = path.match(/^\/vendor\/(marionette|demos)\.js$/)?.[1];
    if (bundle) return res.end(bundles[bundle]);
    const marker = path === staleRoute ? 'b'.repeat(40) : served;
    res.end(`<html><head><meta name="site-revision" content="${marker}"></head><body>${provenance.packageVersion}</body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const run = (...args) => exec(process.execPath, ['scripts/check-deployment.mjs', `http://127.0.0.1:${server.address().port}`, ...args], { cwd: root });
  await run('--revision', revision);
  injectedAnalytics = true;
  await run('--revision', revision);
  for (const path of releaseAssets.keys()) {
    changedRelease = path;
    await assert.rejects(run('--revision', revision), error => error.code === 1 && /article\/feed artifact|hero differs/.test(error.stderr));
  }
  changedRelease = undefined;
  served = 'b'.repeat(40);
  await assert.rejects(run('--revision', revision), error => error.code === 1 && error.stderr.includes('does not serve website revision'));
  await run('--health-only');
  served = revision;
  sitemap = '<urlset><url><loc>https://example.test/</loc><lastmod>2020-01-01</lastmod></url></urlset>';
  await assert.rejects(run('--revision', revision), error => error.code === 1 && error.stderr.includes('/sitemap.xml does not match'));
  await assert.rejects(run('--health-only'), error => error.code === 1 && error.stderr.includes('invalid canonical URL'));
  for (const date of ['2026-02-31', new Date(Date.now() + 3600000).toISOString()]) {
    sitemap = `<urlset><url><loc>https://marionettejs.com/</loc><lastmod>${date}</lastmod></url></urlset>`;
    await assert.rejects(run('--health-only'), error => error.code === 1 && /invalid lastmod|future lastmod/.test(error.stderr));
  }
  sitemap = builtSitemap;
  served = revision;
  staleRoute = '/docs/';
  await assert.rejects(run('--revision', revision), error => error.code === 1 && error.stderr.includes('/docs/: does not serve website revision'));
  await assert.rejects(run(), error => error.code === 1 && error.stderr.includes('Usage:'));
});

test('generated pages identify the website commit', async () => {
  const revision = (await exec('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
  for (const path of ['index.html', 'why/index.html', 'thanks/index.html', 'demos/index.html', 'docs/index.html']) {
    assert.ok((await read(`dist/${path}`)).toString().includes(`<meta name="site-revision" content="${revision}">`), path);
  }
});

// The scheduled workflow intentionally performs no npm install.
test('deployment health checker starts without installed dependencies', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'deployment-no-deps-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const path of ['scripts/check-deployment.mjs', 'scripts/seo.mjs', 'scripts/html.mjs', 'release/drafts/marionette-5.1-metadata.mjs']) {
    await mkdir(join(directory, path, '..'), { recursive: true });
    await cp(new URL(path, root), join(directory, path));
  }
  await assert.rejects(exec(process.execPath, ['scripts/check-deployment.mjs'], { cwd: directory }), error => {
    assert.match(error.stderr, /Usage: check-deployment/);
    assert.doesNotMatch(error.stderr, /ERR_MODULE_NOT_FOUND/);
    return error.code === 1;
  });
});
