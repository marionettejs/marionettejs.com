import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRuntimeRelease, stableRelease } from './release-contract.mjs';
import { readSnapshot } from './library-docs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const revision = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(revision ?? '') || process.argv.length !== 3) {
  throw new Error('Usage: npm run docs:stage-stable -- <certified published source revision>');
}
const { version, manifest, lock } = await readRuntimeRelease(root);
if (version !== stableRelease || manifest.sourceRevision !== revision) {
  throw new Error(`Install published ${stableRelease} with its certified source revision before staging. No source checkout substitutes for the archive.`);
}
const destination = resolve(root, 'output/stable-docs');
const staging = await mkdtemp(join(tmpdir(), 'marionette-stable-docs-'));
try {
  // Work in isolation: never add manifest.json to the installed package or alter
  // the current snapshot. readSnapshot checks containment and every asset hash.
  const packageRoot = resolve(root, 'node_modules/marionette');
  await cp(packageRoot, staging, { recursive: true });
  await writeFile(join(staging, 'manifest.json'), await readFile(join(packageRoot, 'docs-manifest.json')));
  const snapshot = await readSnapshot(staging);
  await mkdir(resolve(root, 'output'), { recursive: true });
  // Refuse to overwrite an earlier export: a reviewer may still need its bytes.
  await mkdir(destination);
  for (const item of [...snapshot.pages, ...snapshot.assets]) {
    const target = join(destination, item.source);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, item.markdown ?? item.content);
  }
  await writeFile(join(destination, 'manifest.json'), await readFile(join(staging, 'manifest.json')));
  await writeFile(resolve(root, 'output/stable-docs-evidence.json'), JSON.stringify({
    packageVersion: version, sourceRevision: revision, contentSha256: manifest.contentSha256,
    archives: Object.fromEntries(Object.entries(lock.packages).filter(([key]) =>
      ['node_modules/marionette', 'node_modules/@mnjs/data', 'node_modules/@mnjs/utils', 'node_modules/@mnjs/radio'].includes(key)).map(([key, value]) =>
      [key, { version: value.version, resolved: value.resolved, integrity: value.integrity }]))
  }, null, 2) + '\n');
  console.log(`Verified ${snapshot.pages.length} pages from published ${version} at ${revision}. Review output/stable-docs-evidence.json, then import output/stable-docs and reconcile publication edits.`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
