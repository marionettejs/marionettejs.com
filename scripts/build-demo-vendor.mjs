import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// npm verifies every installed tarball against the lockfile before bundling.
execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--ignore-scripts'], { cwd: root, stdio: 'inherit' });
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const lock = JSON.parse(await read('package-lock.json'));
const provenance = JSON.parse(await read('content/provenance.json'));
const core = await read('site/vendor/marionette.js');
const data = lock.packages['node_modules/@mnjs/data'];
if (data.version !== provenance.packageVersion || createHash('sha256').update(core).digest('hex') !== provenance.bundleSha256) {
  throw new Error('Demos require the verified core snapshot and matching @mnjs/data release.');
}
const result = await build({
  stdin: { contents: "export * from './site/vendor/marionette.js'; export { Model, Collection, DataApi, StateApi } from '@mnjs/data';", resolveDir: root },
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false, legalComments: 'inline'
});
const bundle = result.outputFiles[0].text;
await writeFile(new URL('../site/vendor/demos.js', import.meta.url), bundle);
await writeFile(new URL('../site/vendor/DEMOS-LICENSE.txt', import.meta.url),
  await read('site/vendor/MARIONETTE-LICENSE.txt') + '\n\n@mnjs/data@' + data.version + '\n' + await read('node_modules/@mnjs/data/license.txt'));
await writeFile(new URL('../site/vendor/demos.provenance.json', import.meta.url), JSON.stringify({
  coreSha256: provenance.bundleSha256, dataVersion: data.version, dataIntegrity: data.integrity,
  bundleSha256: createHash('sha256').update(bundle).digest('hex')
}, null, 2) + '\n');
console.log(`Bundled the verified core snapshot with @mnjs/data@${data.version}.`);
