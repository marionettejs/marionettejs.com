import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readRuntimeRelease } from './release-contract.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { version, manifest: docs, lock } = await readRuntimeRelease(root);
const pkg = { version };
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
  sourceStatus: pkg.version.includes('-') ? 'Published npm release candidate' : 'Published npm stable release',
  libraryBuild: 'Browser ESM bundle of the exact npm core, radio, and utils packages pinned in package-lock.json; built with esbuild',
  packageIntegrity: lock.packages['node_modules/marionette'].integrity,
  brandSource: previous.brandSource,
  publication: `Marionette ${pkg.version} public website`,
  bundleSha256: createHash('sha256').update(vendor).digest('hex'),
  documentationManifest: '/docs/manifest.json',
  documentationNote: 'The browser demos and documentation use the matching published package. /docs/manifest.json records the documentation source identity.'
}, null, 2) + '\n');
console.log(`Bundled marionette@${pkg.version} and matching radio/utils from npm.`);
