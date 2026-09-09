import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(resolve(root, 'node_modules/marionette/package.json'), 'utf8'));
const docs = JSON.parse(await readFile(resolve(root, 'content/library-docs/manifest.json'), 'utf8'));
const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
if (pkg.version !== '5.0.0-beta.2' || docs.packageVersion !== pkg.version || docs.sourceDirty) throw new Error('Expected the published beta package and matching clean documentation.');
for (const name of ['marionette', '@mnjs/utils', '@mnjs/radio']) {
  if (lock.packages[`node_modules/${name}`].version !== pkg.version) throw new Error(`Mismatched package: ${name}`);
}
const result = await build({ entryPoints: [resolve(root, 'node_modules/marionette/dist/marionette.js')], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false, legalComments: 'inline' });
const vendor = result.outputFiles[0].text;
await writeFile(resolve(root, 'site/vendor/marionette.js'), vendor);
const licenses = await Promise.all(['marionette', '@mnjs/utils', '@mnjs/radio'].map(async name => `${name}@${pkg.version}\n${await readFile(resolve(root, `node_modules/${name}/license.txt`), 'utf8')}`));
await writeFile(resolve(root, 'site/vendor/MARIONETTE-LICENSE.txt'), licenses.join('\n\n'));
const previous = JSON.parse(await readFile(resolve(root, 'content/provenance.json'), 'utf8'));
await writeFile(resolve(root, 'content/provenance.json'), JSON.stringify({
  libraryRepository: docs.sourceRepository,
  libraryRevision: docs.sourceRevision,
  packageVersion: pkg.version,
  sourceStatus: 'Published npm beta release',
  libraryBuild: 'Browser ESM bundle of the exact npm core, radio, and utils packages pinned in package-lock.json; built with esbuild',
  packageIntegrity: lock.packages['node_modules/marionette'].integrity,
  brandSource: previous.brandSource,
  publication: 'Marionette 5.0.0-beta.2 public website',
  bundleSha256: createHash('sha256').update(vendor).digest('hex'),
  documentationManifest: '/docs/manifest.json',
  documentationNote: 'The demos and documentation use the same published beta. Original packaged documentation is preserved; website release wording is recorded separately.'
}, null, 2) + '\n');
console.log(`Bundled marionette@${pkg.version} and matching radio/utils from npm.`);
