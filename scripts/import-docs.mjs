import { mkdir, rm, writeFile, rename, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSnapshot } from './library-docs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const exists = path => lstat(path).then(() => true, error => {
  if (error.code === 'ENOENT') return false;
  throw error;
});

// Keep the previous snapshot recoverable across failed or interrupted installs.
export async function importDocs(input, { target = resolve(root, 'content/library-docs'), renamePath = rename } = {}) {
  const staging = `${target}.import`;
  const backup = `${target}.backup`;
  for (const path of [target, staging, backup]) {
    const local = relative(path, resolve(input));
    if (!local || (!isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`))) throw new Error('Import from a separate exported snapshot.');
  }
  if (await exists(backup)) {
    if (!await exists(target)) await renamePath(backup, target);
    else await rm(backup, { recursive: true });
  }
  const { manifest, pages, assets } = await readSnapshot(resolve(input));
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  try {
    for (const item of [...pages, ...assets]) {
      await mkdir(resolve(staging, dirname(item.source)), { recursive: true });
      await writeFile(resolve(staging, item.source), item.markdown ?? item.content);
    }
    await writeFile(resolve(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    const previous = await exists(target);
    if (previous) await renamePath(target, backup);
    try {
      await renamePath(staging, target);
    } catch (error) {
      if (previous) await renamePath(backup, target);
      throw error;
    }
    if (previous) await rm(backup, { recursive: true });
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return { manifest, count: pages.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2] || process.argv.length !== 3) throw new Error('Usage: npm run docs:import -- /absolute/path/to/docs-export');
  const { manifest, count } = await importDocs(process.argv[2]);
  console.log(`Imported ${count} documentation pages at ${manifest.sourceRevision.slice(0, 8)}${manifest.sourceDirty ? ' with local changes' : ''}. Review the content diff before publication.`);
}
