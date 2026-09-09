import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

if (process.argv.length !== 3) throw new Error('Usage: node scripts/import-development-docs.mjs /path/to/marionette');
const source = resolve(process.argv[2]);
const git = args => execFileSync('git', args, { cwd: source, encoding: 'utf8' });
const remotes = git(['remote']).trim().split('\n').filter(Boolean);
const canonical = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)marionettejs\/marionette(?:\.git)?$/;
if (!remotes.some(name => canonical.test(git(['remote', 'get-url', name]).trim()))) {
  throw new Error('Source checkout requires a canonical marionettejs/marionette remote.');
}
const sourceRevision = git(['rev-parse', 'HEAD']).trim();
const packageVersion = JSON.parse(git(['show', `${sourceRevision}:package.json`])).version;
const destination = new URL('../content/development-docs/', import.meta.url);
const pages = [];
const inputs = [['development', 'Develop with the current candidate'], ['troubleshooting', 'Troubleshoot an application']];
// Read the immutable commit, never mix its label with working-tree edits.
for (const [name, title] of inputs) {
  const path = `docs/${name}.md`;
  const markdown = git(['show', `${sourceRevision}:${path}`]);
  pages.push({ source: path, route: name, title, sha256: createHash('sha256').update(markdown).digest('hex'), markdown });
}
await mkdir(new URL('docs/', destination), { recursive: true });
for (const page of pages) await writeFile(new URL(page.source, destination), page.markdown);
const manifest = { packageVersion, sourceRepository: 'https://github.com/marionettejs/marionette', sourceRevision,
  sourceDirty: false, pages: pages.map(({ markdown, ...page }) => page) };
await writeFile(new URL('manifest.json', destination), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Imported two supplemental guides from ${sourceRevision}; published beta snapshot unchanged.`);
