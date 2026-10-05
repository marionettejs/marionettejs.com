import { publishedChannel, publicationStatus, readingRevision } from '../scripts/published-docs.mjs';
import { indexSections } from './sections.mjs';
import { documentSections } from './index-sections.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { tokenize } from './search.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
export async function loadSnapshot() {
  const { readSnapshot, readSupplementalPages, supplementalManifestBytes } = await import('../scripts/library-docs.mjs');
  const { assets, pages } = await readSnapshot(fileURLToPath(new URL('../content/library-docs/', import.meta.url)));
  const supplementalPages = await readSupplementalPages(fileURLToPath(new URL('../content/supplemental-docs/', import.meta.url)), pages);
  const supplementalManifestSha256 = hash(supplementalManifestBytes(supplementalPages));
  const corpusBytes = await read('../dist/docs/corpus.json');
  const corpus = JSON.parse(corpusBytes);
  const manifest = JSON.parse(await read('../content/library-docs/manifest.json'));
  const publicationEditsSha256 = hash(await read('../content/docs-publication-edits.json'));
  if (corpus.schemaVersion !== 1 || !Array.isArray(corpus.documents) || !corpus.documents.length ||
      corpus.packageVersion !== manifest.packageVersion || corpus.channel !== publishedChannel(manifest) || corpus.publication !== publicationStatus(manifest) || corpus.sourceRevision !== manifest.sourceRevision ||
      corpus.sourceContentSha256 !== manifest.contentSha256 || corpus.publicationEditsSha256 !== publicationEditsSha256 ||
      corpus.supplementalManifestSha256 !== supplementalManifestSha256 || corpus.sourceDirty !== manifest.sourceDirty || corpus.sourceRepository !== manifest.sourceRepository) {
    throw new Error('Documentation or example provenance differs from the snapshot. Run npm run build.');
  }
  const documents = new Map();
  for (const document of corpus.documents) {
    if (typeof document.id !== 'string' || documents.has(document.id) || typeof document.markdown !== 'string' ||
        hash(document.markdown) !== document.sha256) throw new Error('Invalid documentation corpus. Run npm run build.');
    documents.set(document.id, { ...document, searchText: document.markdown.toLocaleLowerCase('en') });
  }
  for (const page of supplementalPages) {
    const document = documents.get(page.source);
    if (!document || document.sourceRevision !== readingRevision(page, manifest) || document.sourceSha256 !== page.sha256) throw new Error('Supplemental documentation provenance differs. Run npm run build.');
  }
  const provenance = {
    packageVersion: corpus.packageVersion, channel: corpus.channel, publication: corpus.publication,
    sourceRepository: corpus.sourceRepository, sourceRevision: corpus.sourceRevision, sourceDirty: corpus.sourceDirty,
    sourceContentSha256: corpus.sourceContentSha256, publicationEditsSha256,
    corpusSha256: hash(corpusBytes), supplementalManifestSha256,
  };
  const index = Object.create(null);
  for (const [id, document] of documents) {
    const titleWords = new Set(tokenize(document.title));
    for (const word of tokenize(`${document.title}\n${document.markdown}`)) {
      (index[word] ??= []).push([id, titleWords.has(word)]);
    }
  }
  const sections = [...documents.values()].flatMap(documentSections);
  const recordAssets = assets.filter(asset => asset.source.startsWith('examples/records/'));
  if (!recordAssets.some(asset => asset.source === 'examples/records/src/main.js')) throw new Error('Missing packaged records example.');
  const recipe = {
    id: 'records', title: 'Records feature', summary: 'Packaged composed feature with readiness, selection, child ownership and retry.',
    runtime: provenance,
    sourceFiles: Object.fromEntries(recordAssets.map(asset => [asset.source.replace('examples/records/', ''), asset.content])),
    sourceHashes: Object.fromEntries(recordAssets.map(asset => [asset.source.replace('examples/records/', ''), asset.sha256])),
    relatedDocs: ['docs/architecture.md', 'docs/records.md', 'docs/api/application.md'],
    verification: 'Source retrieval only. Read the packaged README and tests; MCP does not run the example or establish reader effectiveness.',
  };
  for (const id of recipe.relatedDocs) if (!documents.has(id)) throw new Error(`Example references missing documentation: ${id}`);
  const text = JSON.stringify(recipe, null, 2);
  return { provenance, documents: [...documents.values()], index,
    sections, sectionIndex: indexSections(sections, [...documents.values()]),
    examples: [{ id: recipe.id, title: recipe.title, summary: recipe.summary, text, sha256: hash(text) }] };
}
