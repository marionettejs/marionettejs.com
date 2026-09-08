import { mkdir, rm, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSnapshot } from './library-docs.mjs';

const input = process.argv[2];
if (!input || process.argv.length !== 3) throw new Error('Usage: npm run docs:import -- /absolute/path/to/docs-export');
const root = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(root, 'content/library-docs');
const staging = resolve(root, 'content/.library-docs-import');
if (resolve(input) === target || resolve(input) === staging) throw new Error('Import from a separate exported snapshot.');
const { manifest, pages, assets } = await readSnapshot(resolve(input));
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
for (const page of pages) {
  await mkdir(resolve(staging, dirname(page.source)), { recursive: true });
  await writeFile(resolve(staging, page.source), page.markdown);
}
for (const asset of assets) {
  await mkdir(resolve(staging, dirname(asset.source)), { recursive: true });
  await writeFile(resolve(staging, asset.source), asset.content);
}
await writeFile(resolve(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await rm(target, { recursive: true, force: true });
await rename(staging, target);
console.log(`Imported ${pages.length} documentation pages at ${manifest.sourceRevision.slice(0, 8)}${manifest.sourceDirty ? ' with local changes' : ''}. Review the content diff before publication.`);
