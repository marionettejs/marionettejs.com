import fs, { mkdir, writeFile, mkdtemp, rename } from 'node:fs/promises';
import { resolve, dirname, sep, join, relative } from 'node:path';

/** Write a fresh Pagefind bundle and await every Node disk write.
 * @param {object} index Pagefind index exposing getFiles().
 * @param {string} directory Generated bundle directory, replaced after validation.
 */
export async function writeSearchFiles(index, directory) {
  const generated = await index.getFiles();
  if (generated.errors?.length) throw new Error(generated.errors.join('\n'));
  if (!generated.files?.length) throw new Error('No documentation search files were generated.');
  const root = resolve(directory);
  const files = generated.files.map(file => {
    const destination = resolve(root, file.path);
    if (!destination.startsWith(root + sep)) throw new Error('Search output path escapes its directory.');
    return { destination, content: file.content };
  });
  // Complete all writes in a sibling directory before replacing the old bundle.
  await mkdir(dirname(root), { recursive: true });
  const transaction = await mkdtemp(join(dirname(root), '.search-index-'));
  const next = join(transaction, 'next');
  const backup = join(transaction, 'previous');
  let keepBackup = false;
  try {
    for (const { destination, content } of files) {
      const staged = join(next, relative(root, destination));
      await mkdir(dirname(staged), { recursive: true });
      await writeFile(staged, content);
    }
    let hadPrevious = false;
    try { await rename(root, backup); hadPrevious = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await rename(next, root); }
    catch (error) {
      if (hadPrevious) {
        try { await rename(backup, root); }
        catch (restoreError) {
          keepBackup = true;
          throw new AggregateError([error, restoreError], `Search replacement failed; previous bundle retained at ${backup}.`);
        }
      }
      throw error;
    }
  } finally {
    // Cleanup cannot veto an installed bundle or hide the original write error.
    if (!keepBackup) await fs.rm(transaction, { recursive: true, force: true }).catch(() => {});
  }
}
