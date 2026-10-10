import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
  const server = createServer((req, res) => {
    res.setHeader('etag', '"fixture"');
    res.setHeader('cache-control', 'public, max-age=0, must-revalidate, no-transform');
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/reference/provenance.json') return res.end(JSON.stringify(provenance));
    if (path === '/sitemap.xml') return res.end(sitemap);
    const bundle = path.match(/^\/vendor\/(marionette|demos)\.js$/)?.[1];
    if (bundle) return res.end(bundles[bundle]);
    const marker = path === staleRoute ? 'b'.repeat(40) : served;
    res.end(`<html><head><meta name="site-revision" content="${marker}"></head><body>${provenance.packageVersion}</body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const run = (...args) => exec(process.execPath, ['scripts/check-deployment.mjs', `http://127.0.0.1:${server.address().port}`, ...args], { cwd: root });
  await run('--revision', revision);
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
