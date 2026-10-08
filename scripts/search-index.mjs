import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';

// Own the disk writes: closing the native service must not interrupt buffered I/O.
export async function writeSearchFiles(index, directory) {
  const generated = await index.getFiles();
  if (generated.errors?.length) throw new Error(generated.errors.join('\n'));
  if (!generated.files?.length) throw new Error('No documentation search files were generated.');
  const root = resolve(directory);
  for (const file of generated.files) {
    const destination = resolve(root, file.path);
    if (!destination.startsWith(root + sep)) throw new Error('Search output path escapes its directory.');
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.content);
  }
}
