import { readFile } from 'node:fs/promises';
import { verifyRuntimeBytes } from './runtime-archives.mjs';
import { resolve } from 'node:path';

export const stableRelease = '5.0.0';
export const runtimePackages = ['marionette', '@mnjs/data', '@mnjs/utils', '@mnjs/radio'];

// Metadata checks are necessary but not sufficient: readRuntimeRelease also
// compares installed bytes with integrity-verified registry archives.
export function validateRuntimeRelease({ version, manifest, packages, lock, pins }) {
  const checks = {
    'version format': /^5\.0\.0(?:-rc\.\d+)?$/.test(version),
    'docs manifest version': manifest.packageVersion === version,
    'package name': manifest.packageName === 'marionette',
    'clean source': manifest.sourceDirty === false,
    'source repository': manifest.sourceRepository === 'https://github.com/marionettejs/marionette',
    'source revision format': /^[a-f0-9]{40}$/.test(manifest.sourceRevision),
    'content digest format': /^[a-f0-9]{64}$/.test(manifest.contentSha256)
  };
  for (const [label, valid] of Object.entries(checks)) {
    if (!valid) throw new Error(`Invalid runtime documentation: ${label}`);
  }
  for (const name of ['marionette', '@mnjs/data']) {
    if (pins[name] !== version || lock.packages[''].devDependencies[name] !== version) throw new Error(`Expected exact runtime pin: ${name}@${version}`);
  }
  for (const name of runtimePackages) {
    const entry = lock.packages[`node_modules/${name}`];
    const archive = `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${version}.tgz`;
    if (packages[name]?.version !== version || entry?.version !== version || entry.resolved !== archive ||
        !/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry.integrity ?? '') ||
        Buffer.from(entry.integrity.slice(7), 'base64').toString('base64') !== entry.integrity.slice(7)) {
      throw new Error(`Expected locked published archive: ${name}@${version}`);
    }
  }
  return manifest;
}

export async function readRuntimeRelease(root, options) {
  const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
  const pkg = await json('package.json');
  const lock = await json('package-lock.json');
  const manifest = await json('node_modules/marionette/docs-manifest.json');
  const packages = Object.fromEntries(await Promise.all(runtimePackages.map(async name => [name, await json(`node_modules/${name}/package.json`)])));
  const version = pkg.devDependencies.marionette;
  validateRuntimeRelease({ version, manifest, packages, lock, pins: pkg.devDependencies });
  await verifyRuntimeBytes(root, runtimePackages, lock, options);
  return { version, manifest, lock };
}
