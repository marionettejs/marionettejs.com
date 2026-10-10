import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runtimePackages } from '../../scripts/release-contract.mjs';

// Synthetic archives exercise the real verification path; never publication evidence.
export async function runtimeFixture(t, version = '5.0.0', mutate) {
  const root = await mkdtemp(join(tmpdir(), 'runtime-fixture-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const json = (path, value) => writeFile(path, JSON.stringify(value));
  const pins = { marionette: version, '@mnjs/data': version };
  const lock = { packages: { '': { devDependencies: pins } } };
  const responses = new Map();
  let manifest;
  for (const name of runtimePackages) {
    const installed = join(root, 'node_modules', name);
    await mkdir(join(installed, 'dist'), { recursive: true });
    await json(join(installed, 'package.json'), { name, version });
    await writeFile(join(installed, 'dist/index.js'), 'export const fixture = true;\n');
    if (name === 'marionette') {
      await cp(new URL('../../content/library-docs/', import.meta.url), installed, { recursive: true });
      manifest = JSON.parse(await readFile(join(installed, 'manifest.json')));
      manifest.packageVersion = version;
      await json(join(installed, 'docs-manifest.json'), manifest);
      await rm(join(installed, 'manifest.json'));
      if (mutate) await mutate(installed);
    }
    const packed = await mkdtemp(join(root, 'pack-'));
    await cp(installed, join(packed, 'package'), { recursive: true });
    execFileSync('tar', ['-czf', join(packed, 'archive.tgz'), '-C', packed, 'package']);
    const bytes = await readFile(join(packed, 'archive.tgz'));
    const resolved = `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${version}.tgz`;
    lock.packages[`node_modules/${name}`] = { version, resolved, integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` };
    responses.set(resolved, bytes);
  }
  await json(join(root, 'package.json'), { devDependencies: pins });
  await json(join(root, 'package-lock.json'), lock);
  // Matching hidden metadata must not make changed bytes pass.
  await json(join(root, 'node_modules/.package-lock.json'), lock);
  const request = async url => {
    if (!responses.has(url)) throw new Error(`Unexpected fixture URL: ${url}`);
    return new Response(responses.get(url));
  };
  return { root, request, manifest, lock };
}
