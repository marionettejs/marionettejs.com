// Verify what the deployment actually serves. A release can be correct in this
// repository, on npm and in a maintainer's browser while crawlers and returning
// visitors still receive an earlier beta.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.argv[2] ?? 'https://marionettejs.com';
const provenance = JSON.parse(await readFile(resolve(root, 'content/provenance.json'), 'utf8'));
const demos = JSON.parse(await readFile(resolve(root, 'site/vendor/demos.provenance.json'), 'utf8'));

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const request = path => fetch(new URL(path, origin), { headers: { 'user-agent': 'marionettejs.com deployment check' } });

for (const route of ['/', '/why/', '/thanks/', '/demos/', '/docs/']) {
  const response = await request(route);
  const html = await response.text();
  expect(response.ok, `${route}: HTTP ${response.status}`);
  expect(html.includes(provenance.packageVersion), `${route}: does not name ${provenance.packageVersion}`);
  // Without a validator a crawler cannot ask whether its indexed copy still holds.
  expect(response.headers.has('etag'), `${route}: no ETag`);
  expect((response.headers.get('cache-control') ?? '').includes('no-transform'), `${route}: no no-transform, so the ETag can be stripped`);
}

const published = await (await request('/reference/provenance.json')).json();
expect(published.packageVersion === provenance.packageVersion, `/reference/provenance.json serves ${published.packageVersion}`);

const sitemap = await (await request('/sitemap.xml')).text();
expect(sitemap.includes('<lastmod>'), '/sitemap.xml reports no lastmod');

for (const [path, expected] of [['/vendor/marionette.js', provenance.bundleSha256], ['/vendor/demos.js', demos.bundleSha256]]) {
  const response = await request(path);
  const served = createHash('sha256').update(new Uint8Array(await response.arrayBuffer())).digest('hex');
  expect(response.ok, `${path}: HTTP ${response.status}`);
  expect(served === expected, `${path}: serves ${served.slice(0, 12)}, expected ${expected.slice(0, 12)}`);
}

if (failures.length) {
  console.error(`${origin} does not match this revision:\n${failures.map(failure => `  - ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log(`${origin} serves ${provenance.packageVersion}, with revalidatable pages and the expected bundles.`);
