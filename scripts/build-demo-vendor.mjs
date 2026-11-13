import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, mkdir, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { readRuntimeMetadata } from './release-contract.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const provenance = JSON.parse(await read('content/provenance.json'));
const { version, manifest, lock } = await readRuntimeMetadata(root);
if (version !== provenance.packageVersion || manifest.sourceRevision !== provenance.libraryRevision) throw new Error('Rebuild core from the matching published package first.');
const core = await read('site/vendor/marionette.js');
const data = lock.packages['node_modules/@mnjs/data'];
const html = lock.packages['node_modules/@mnjs/html'];
if (html?.version !== '1.0.0' || html.resolved !== 'https://registry.npmjs.org/@mnjs/html/-/html-1.0.0.tgz' ||
    lock.packages[''].devDependencies['@mnjs/html'] !== html.version) throw new Error('Expected exact published @mnjs/html@1.0.0.');
if (createHash('sha256').update(core).digest('hex') !== provenance.bundleSha256) {
  throw new Error('Demos require the verified core snapshot and matching @mnjs/data release.');
}
// The core hash is already tied to verified vendor:build output. Build data
// only from a fresh script-free npm ci, which verifies the exact locked archive
// integrities. No locally modified installed runtime files enter this bundle.
const staging = await mkdtemp(join(tmpdir(), 'marionette-demo-vendor-'));
let bundle, dataLicense, htmlLicense;
try {
  await cp(join(root, 'package.json'), join(staging, 'package.json'));
  await cp(join(root, 'package-lock.json'), join(staging, 'package-lock.json'));
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['ci', '--ignore-scripts', '--prefer-offline', '--no-audit', '--no-fund'],
    { cwd: staging, stdio: 'inherit' });
  await mkdir(join(staging, 'site/vendor'), { recursive: true });
  await writeFile(join(staging, 'site/vendor/marionette.js'), core);
  const result = await build({
    absWorkingDir: staging,
    stdin: { contents: "export * from './site/vendor/marionette.js'; export { Model, Collection, DataApi, StateApi } from '@mnjs/data'; export { html } from '@mnjs/html'; export { HtmlDomApi } from '@mnjs/html/marionette';", resolveDir: staging },
    bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false, legalComments: 'inline'
  });
  bundle = result.outputFiles[0].text;
  dataLicense = await readFile(join(staging, 'node_modules/@mnjs/data/license.txt'), 'utf8');
  htmlLicense = await readFile(join(staging, 'node_modules/@mnjs/html/THIRD_PARTY_NOTICES.md'), 'utf8');
} finally {
  await rm(staging, { recursive: true, force: true });
}
await writeFile(new URL('../site/vendor/demos.js', import.meta.url), bundle);
await writeFile(new URL('../site/vendor/DEMOS-LICENSE.txt', import.meta.url),
  await read('site/vendor/MARIONETTE-LICENSE.txt') + '\n\n@mnjs/data@' + data.version + '\n' + dataLicense + '\n\n@mnjs/html@' + html.version + '\n' + htmlLicense);
await writeFile(new URL('../site/vendor/demos.provenance.json', import.meta.url), JSON.stringify({
  coreSha256: provenance.bundleSha256, dataVersion: data.version, dataIntegrity: data.integrity,
  htmlVersion: html.version, htmlIntegrity: html.integrity,
  bundleSha256: createHash('sha256').update(bundle).digest('hex')
}, null, 2) + '\n');
console.log(`Bundled the verified core snapshot with @mnjs/data@${data.version}.`);
