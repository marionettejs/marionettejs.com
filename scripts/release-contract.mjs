import { readFile } from 'node:fs/promises';
import { verifyRuntimeBytes } from './runtime-archives.mjs';
import { resolve } from 'node:path';

// Documentation staging retains its separately certified release targets.
export const stableRelease = '5.1.0';
export const preparedRelease = '5.1.0';
// Browser examples can take a patch without replacing the documentation archive.
export const runtimeRelease = '5.1.1';
export const runtimePackages = ['marionette', '@mnjs/data', '@mnjs/utils', '@mnjs/radio'];

// Metadata checks are necessary but not sufficient: readRuntimeRelease also
// compares installed bytes with integrity-verified registry archives.
function validateManifest(version, manifest) {
  const checks = {
    'version format': (/^(?:5\.0\.0(?:-rc\.\d+)?|5\.1\.[01])$/.test(version)),
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
}

export function validateRuntimeRelease({ version, manifest, packages, lock, pins }) {
  validateManifest(version, manifest);
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

// Metadata-only reads are useful after a clean install or in offline tests.
// Publication/staging callers must use readRuntimeRelease for byte verification.
export async function readRuntimeMetadata(root, { expectedVersion = runtimeRelease } = {}) {
  const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
  const pkg = await json('package.json');
  const lock = await json('package-lock.json');
  const manifest = await json('node_modules/marionette/docs-manifest.json');
  const packages = Object.fromEntries(await Promise.all(runtimePackages.map(async name => [name, await json(`node_modules/${name}/package.json`)])));
  const version = pkg.devDependencies.marionette;
  if (version !== expectedVersion) throw new Error(`Expected installed ${expectedVersion}; found ${version}. Install the published stable packages before staging.`);
  validateRuntimeRelease({ version, manifest, packages, lock, pins: pkg.devDependencies });
  return { version, manifest, lock };
}

export async function readRuntimeRelease(root, options) {
  const release = await readRuntimeMetadata(root, options);
  await verifyRuntimeBytes(root, runtimePackages, release.lock, options);
  return release;
}

// Documentation is supplied by its own pinned core archive. Demo packages and
// npm-installed dependencies inside that alias do not enter the docs export.
export async function readDocumentationRelease(root, { expectedVersion = stableRelease, ...options } = {}) {
  const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
  const pkg = await json('package.json');
  const lock = await json('package-lock.json');
  const name = 'marionette-docs';
  const packageRoot = resolve(root, 'node_modules', name);
  const installed = await json(`node_modules/${name}/package.json`);
  const manifest = await json(`node_modules/${name}/docs-manifest.json`);
  const version = installed.version;
  if (version !== expectedVersion) throw new Error(`Expected installed documentation ${expectedVersion}; found ${version}. Install the pinned documentation alias before staging.`);
  const pin = `npm:marionette@${version}`;
  if (pkg.devDependencies[name] !== pin || lock.packages[''].devDependencies[name] !== pin) throw new Error(`Expected exact documentation pin: ${name}@${pin}`);
  validateManifest(version, manifest);
  const entry = lock.packages[`node_modules/${name}`];
  if (installed.name !== 'marionette' || entry?.name !== 'marionette' || entry.version !== version ||
      entry.resolved !== `https://registry.npmjs.org/marionette/-/marionette-${version}.tgz` ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry.integrity ?? '') ||
      Buffer.from(entry.integrity.slice(7), 'base64').toString('base64') !== entry.integrity.slice(7)) {
    throw new Error(`Expected locked published documentation archive: marionette@${version}`);
  }
  await verifyRuntimeBytes(root, [name], lock, { ...options, ignoreInstalledDependencies: true });
  const { resolved, integrity } = entry;
  return { version, manifest, packageRoot, archive: { version, resolved, integrity } };
}
