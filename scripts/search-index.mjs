import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';

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
  // Validate generation and all paths before removing the previous bundle.
  await rm(root, { recursive: true, force: true });
  for (const { destination, content } of files) {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}
