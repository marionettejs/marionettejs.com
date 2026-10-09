import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const stableRelease = '5.0.0';
export const runtimePackages = ['marionette', '@mnjs/data', '@mnjs/utils', '@mnjs/radio'];

// Only exact registry archives qualify. A local build, tag, or version field alone
// cannot establish publication. npm ci verifies these locked archive integrities.
export function validateRuntimeRelease({ version, manifest, packages, lock, pins }) {
  if (!/^5\.0\.0(?:-rc\.\d+)?$/.test(version) || manifest.packageVersion !== version ||
      manifest.packageName !== 'marionette' || manifest.sourceDirty !== false ||
      manifest.sourceRepository !== 'https://github.com/marionettejs/marionette' ||
      !/^[a-f0-9]{40}$/.test(manifest.sourceRevision) || !/^[a-f0-9]{64}$/.test(manifest.contentSha256)) {
    throw new Error('Expected matching clean published Marionette documentation.');
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

export async function readRuntimeRelease(root) {
  const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
  const pkg = await json('package.json');
  const lock = await json('package-lock.json');
  const manifest = await json('node_modules/marionette/docs-manifest.json');
  const packages = Object.fromEntries(await Promise.all(runtimePackages.map(async name => [name, await json(`node_modules/${name}/package.json`)])));
  const version = pkg.devDependencies.marionette;
  validateRuntimeRelease({ version, manifest, packages, lock, pins: pkg.devDependencies });
  return { version, manifest, lock };
}
