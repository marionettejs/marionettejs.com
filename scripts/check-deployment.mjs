// Verify what the deployment actually serves. A release can be correct in this
// repository, on npm and in a maintainer's browser while crawlers and returning
// visitors still receive an earlier beta. Use --revision SHA after publishing, or --health-only for scheduled checks.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.argv[2] ?? 'https://marionettejs.com';
const mode = process.argv.slice(3);
const expectedRevision = mode[0] === '--revision' && mode.length === 2 && /^[a-f0-9]{40}$/.test(mode[1]) ? mode[1] : undefined;
const healthOnly = mode.length === 1 && mode[0] === '--health-only';
if (!expectedRevision && !healthOnly) {
  console.error('Usage: check-deployment.mjs ORIGIN (--revision SHA | --health-only)');
  process.exit(1);
}
const provenance = JSON.parse(await readFile(resolve(root, 'content/provenance.json'), 'utf8'));
const demos = JSON.parse(await readFile(resolve(root, 'site/vendor/demos.provenance.json'), 'utf8'));
const digest = source => createHash('sha256').update(source).digest('hex');

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
// A deployment that never answers should fail the run, not hold it open.
const request = async path => {
  try {
    return await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'marionettejs.com deployment check' } });
  } catch (error) {
    failures.push(`${path}: ${error.message}`);
    return undefined;
  }
};
const body = async (path, read = 'text') => {
  const response = await request(path);
  if (!response) return undefined;
  if (!response.ok) return void expect(false, `${path}: HTTP ${response.status}`);
  try {
    return { response, content: await response[read]() };
  } catch (error) {
    expect(false, `${path}: unreadable ${read} (${error.message})`);
  }
};

for (const route of ['/', '/why/', '/thanks/', '/demos/', '/docs/']) {
  const page = await body(route);
  if (!page) continue;
  expect(page.content.includes(provenance.packageVersion), `${route}: does not name ${provenance.packageVersion}`);
  if (expectedRevision) {
    expect(page.content.includes(`<meta name="site-revision" content="${expectedRevision}">`), `${route}: does not serve website revision ${expectedRevision}`);
  }
  // Without a validator a crawler cannot ask whether its indexed copy still holds,
  // and Cloudflare strips the ETag from any page it is allowed to transform.
  expect(page.response.headers.has('etag'), `${route}: no ETag`);
  expect((page.response.headers.get('cache-control') ?? '').includes('no-transform'), `${route}: no no-transform, so the ETag can be stripped`);
}

const published = await body('/reference/provenance.json', 'json');
for (const field of ['packageVersion', 'libraryRevision', 'bundleSha256', 'packageIntegrity']) {
  if (published) expect(published.content[field] === provenance[field], `/reference/provenance.json serves ${field} ${published.content[field]}`);
}

// Every entry needs the date, not just the first one: a partial sitemap reports
// no change for the pages it omits. The date is not compared with this checkout,
// which can hold commits that were deliberately not deployed.
const sitemap = await body('/sitemap.xml');
if (sitemap) {
  if (expectedRevision) {
    const expectedSitemap = await readFile(resolve(root, 'dist/sitemap.xml'), 'utf8');
    expect(sitemap.content === expectedSitemap, '/sitemap.xml does not match the published artifact');
  }
  const entries = [...sitemap.content.matchAll(/<url>(.*?)<\/url>/g)].map(([, entry]) => entry);
  const dated = entries.filter(entry => /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(entry));
  expect(entries.length > 0, '/sitemap.xml lists no URLs');
  expect(dated.length === entries.length, `/sitemap.xml reports lastmod for ${dated.length} of ${entries.length} URLs`);
  const today = new Date().toISOString().slice(0, 10);
  for (const [, date] of sitemap.content.matchAll(/<lastmod>(.*?)<\/lastmod>/g)) {
    expect(date <= today, `/sitemap.xml reports a future lastmod: ${date}`);
  }
}

// Request the keyed URL the deployed pages themselves use, so the check covers
// the cache variant a browser asks for rather than a path nothing requests.
for (const [name, expected] of [['marionette', provenance.bundleSha256], ['demos', demos.bundleSha256]]) {
  const bundle = await body(`/vendor/${name}.js?v=${expected.slice(0, 12)}`, 'arrayBuffer');
  if (!bundle) continue;
  const served = digest(new Uint8Array(bundle.content));
  expect(served === expected, `/vendor/${name}.js: serves ${served.slice(0, 12)}, expected ${expected.slice(0, 12)}`);
}

if (failures.length) {
  console.error(`${origin} failed deployment checks:\n${failures.map(failure => `  - ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log(`${origin} serves ${provenance.packageVersion}${expectedRevision ? ` at website revision ${expectedRevision}` : ' (health only; website revision not verified)'}, with revalidatable pages, a dated sitemap and the expected bundles.`);
