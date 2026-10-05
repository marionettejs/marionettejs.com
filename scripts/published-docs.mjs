import { isCandidatePublication } from './publication-status.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const publication = JSON.parse(readFileSync(new URL('../content/docs-publication-edits.json', import.meta.url), 'utf8'));

// Correct publication prose and editorial issues without rewriting the archived package source or code.
export function publishedMarkdown(page) {
  let markdown = page.markdown;
  for (const { source, before, after, readingSha256, sourceRevision, sourceSha256 } of publication.edits) {
    if (source !== page.source) continue;
    if (readingSha256 && (!/^[a-f0-9]{40}$/.test(sourceRevision) || !/^[a-f0-9]{64}$/.test(sourceSha256) || createHash('sha256').update(after).digest('hex') !== readingSha256)) throw new Error(`Invalid reading-copy provenance for ${source}`);
    if (!before || markdown.split(before).length !== 2) throw new Error(`Review publication wording for ${source}`);
    markdown = markdown.replace(before, () => after);
  }
  return markdown;
}

// Website title edits stay separate from the immutable archive and source-text sync.
export function publishedTitles(pages) {
  const titles = new Map();
  for (const edit of publication.titles || []) {
    const page = pages.find(page => page.source === edit.source);
    if (!page || titles.has(edit.source) || edit.before !== page.title ||
        typeof edit.after !== 'string' || !edit.after.trim()) throw new Error(`Review publication title for ${edit.source}`);
    titles.set(edit.source, edit.after);
  }
  return pages.map(page => ({ ...page, title: titles.get(page.source) || page.title }));
}

// A dist-tag is a routing label; publication needs independent package evidence.
export function validatePublication(manifest, declaration, installed) {
  const candidate = isCandidatePublication(declaration.status);
  const published = ['release candidate (published on npm)', 'stable release (published on npm)'].includes(declaration.status);
  if (manifest.packageVersion !== declaration.packageVersion || declaration.channel !== manifest.channel || (!candidate && !published)) throw new Error('Review published documentation channel.');
  if (published) {
    const prerelease = manifest.packageVersion.split('+')[0].includes('-');
    const integrity = installed?.integrity;
    const validIntegrity = typeof integrity === 'string' && /^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity) &&
      Buffer.from(integrity.slice(7), 'base64').toString('base64') === integrity.slice(7);
    if (manifest.sourceDirty !== false || prerelease !== (declaration.status === 'release candidate (published on npm)') || !installed ||
        installed.packageVersion !== manifest.packageVersion || installed.sourceRevision !== manifest.sourceRevision ||
        installed.contentSha256 !== manifest.contentSha256 || installed.sourceDirty !== false ||
        !installed.registryArchive || !validIntegrity) throw new Error('Published documentation requires matching clean installed npm archive evidence.');
  }
  return declaration.channel;
}

function installedPublicationEvidence() {
  const pkg = JSON.parse(readFileSync(new URL('../node_modules/marionette/package.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(readFileSync(new URL('../node_modules/marionette/docs-manifest.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')).packages['node_modules/marionette'];
  return { ...manifest, registryArchive: lock.version === pkg.version &&
    lock.resolved === `https://registry.npmjs.org/marionette/-/marionette-${pkg.version}.tgz`, integrity: lock.integrity };
}

export function publishedChannel(manifest) {
  const evidence = publication.status.endsWith('(published on npm)') ? installedPublicationEvidence() : undefined;
  return validatePublication(manifest, publication, evidence);
}

export function readingRevision(page, manifest) {
  return publication.edits.find(edit => edit.source === page.source && edit.sourceRevision)?.sourceRevision || page.sourceRevision || manifest.sourceRevision;
}

export function publicationStatus(manifest) {
  publishedChannel(manifest);
  return publication.status;
}
