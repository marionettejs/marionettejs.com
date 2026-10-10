import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const exec = promisify(execFile);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function files(directory, prefix = '') {
  if (!(await lstat(directory)).isDirectory()) throw new Error(`Expected a real package directory: ${directory}`);
  const result = new Map();
  for (const name of (await readdir(directory)).sort()) {
    const path = join(directory, name);
    const relative = prefix + name;
    const stat = await lstat(path);
    if (stat.isDirectory()) {
      for (const entry of await files(path, `${relative}/`)) result.set(...entry);
    } else if (stat.isFile()) result.set(relative, digest(await readFile(path)));
    else throw new Error(`Unsupported package entry (links are not allowed): ${relative}`);
  }
  return result;
}

// Do not trust the hidden npm lockfile: it can survive edits to installed files.
// Fetch the exact locked archive, verify its SHA-512 before extracting, then
// compare the complete file set and bytes, including dist, docs and metadata.
export async function verifyRuntimeBytes(root, names, lock, { request = fetch } = {}) {
  const modules = await realpath(resolve(root, 'node_modules'));
  for (const name of names) {
    const installed = join(modules, name);
    if (await realpath(installed) !== installed) throw new Error(`Linked runtime package is not a registry install: ${name}`);
    const staging = await mkdtemp(join(tmpdir(), 'marionette-archive-'));
    try {
      const entry = lock.packages[`node_modules/${name}`];
      const response = await request(entry.resolved, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Registry archive request failed (${response.status}): ${name}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (`sha512-${createHash('sha512').update(bytes).digest('base64')}` !== entry.integrity) {
        throw new Error(`Registry archive integrity mismatch: ${name}`);
      }
      const archive = join(staging, 'archive.tgz');
      await writeFile(archive, bytes);
      await exec('tar', ['-xzf', archive, '-C', staging, '--no-same-owner', '--no-same-permissions']);
      const expected = await files(join(staging, 'package'));
      const actual = await files(installed);
      for (const path of new Set([...expected.keys(), ...actual.keys()])) {
        if (expected.get(path) !== actual.get(path)) {
          throw new Error(`Installed registry bytes differ: ${name}/${path}. Run npm ci before retrying.`);
        }
      }
    } catch (error) {
      throw new Error(`Cannot verify installed runtime ${name}: ${error.message}`, { cause: error });
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }
}
