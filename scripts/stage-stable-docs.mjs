import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRuntimeRelease, runtimePackages, stableRelease } from './release-contract.mjs';
import { readSnapshot } from './library-docs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function stageStableDocs(revision, { directory = root, request, write = writeFile, publish = rename } = {}) {
  if (!/^[a-f0-9]{40}$/.test(revision ?? '')) {
    throw new Error('Usage: npm run docs:stage-stable -- <certified published source revision>');
  }
  const { version, manifest, lock } = await readRuntimeRelease(directory, { request });
  if (version !== stableRelease) throw new Error(`Expected installed ${stableRelease}; found ${version}. Install the published stable packages before staging.`);
  if (manifest.sourceRevision !== revision) throw new Error(`Certified source revision mismatch: requested ${revision}; installed ${manifest.sourceRevision}. Check the release owner’s published evidence.`);
  const destination = resolve(directory, 'output/stable-docs');
  const exists = await lstat(destination).then(() => true, error => {
    if (error.code === 'ENOENT') return false;
    throw error;
  });
  if (exists) throw new Error(`Refusing to overwrite existing export: ${destination}`);
  await mkdir(dirname(destination), { recursive: true });
  const staging = await mkdtemp(join(tmpdir(), 'marionette-stable-docs-'));
  let exported;
  try {
    // Never add manifest.json to the installed package or alter the snapshot.
    const packageRoot = resolve(directory, 'node_modules/marionette');
    await cp(packageRoot, staging, { recursive: true });
    await write(join(staging, 'manifest.json'), await readFile(join(packageRoot, 'docs-manifest.json')));
    const snapshot = await readSnapshot(staging);
    // The evidence and docs share one atomic rename on the destination filesystem.
    // Interrupted runs can leave only uniquely named temporary siblings; retries
    // ignore those and never mistake them for a completed export.
    exported = await mkdtemp(join(dirname(destination), '.stable-docs-'));
    for (const item of [...snapshot.pages, ...snapshot.assets]) {
      const target = join(exported, item.source);
      await mkdir(dirname(target), { recursive: true });
      await write(target, item.markdown ?? item.content);
    }
    await write(join(exported, 'manifest.json'), await readFile(join(staging, 'manifest.json')));
    await write(join(exported, 'stable-docs-evidence.json'), JSON.stringify({
      packageVersion: version, sourceRevision: revision, contentSha256: manifest.contentSha256,
      archives: Object.fromEntries(runtimePackages.map(name => {
        const key = `node_modules/${name}`;
        const { version, resolved, integrity } = lock.packages[key];
        return [key, { version, resolved, integrity }];
      }))
    }, null, 2) + '\n');
    await publish(exported, destination);
    return { version, count: snapshot.pages.length, destination };
  } finally {
    await rm(staging, { recursive: true, force: true });
    if (exported) await rm(exported, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: npm run docs:stage-stable -- <certified published source revision>');
  const { version, count } = await stageStableDocs(process.argv[2]);
  console.log(`Verified ${count} pages from published ${version} at ${process.argv[2]}. Review output/stable-docs/stable-docs-evidence.json, then import output/stable-docs and reconcile publication edits.`);
}
