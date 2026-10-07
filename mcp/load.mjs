import { publishedChannel, publicationStatus } from '../scripts/published-docs.mjs';
import { indexSections } from './sections.mjs';
import { documentSections } from './index-sections.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { tokenize } from './search.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
export async function loadSnapshot() {
  const { readSnapshot, validateDiagnostics } = await import('../scripts/library-docs.mjs');
  const { manifest, assets, pages } = await readSnapshot(fileURLToPath(new URL('../content/library-docs/', import.meta.url)));
  const sourceUrl = source => `${manifest.sourceRepository}/blob/${manifest.sourceRevision}/${source}`;
  const documents = new Map(pages.map(page => [page.source, {
    id: page.source, title: page.title, section: page.section, kind: 'packaged-document',
    markdown: page.markdown, searchText: page.markdown.toLocaleLowerCase('en'),
    url: sourceUrl(page.source), sourceUrl: sourceUrl(page.source),
    markdownUrl: `https://raw.githubusercontent.com/marionettejs/marionette/${manifest.sourceRevision}/${page.source}`,
    sourceRevision: manifest.sourceRevision, sourceSha256: page.sha256, sha256: page.sha256,
  }]));
  const assetJson = source => {
    const asset = assets.find(asset => asset.source === source);
    if (!asset) throw new Error(`Missing packaged lookup asset: ${source}`);
    return JSON.parse(asset.content);
  };
  const lookupSections = assetJson('docs-sections.json').sections;
  const diagnostics = validateDiagnostics(assetJson('config/diagnostics/catalog.json'), assetJson('config/diagnostics/catalog.schema.json'), new Set(lookupSections.map(section => section.id)));
  for (const diagnostic of diagnostics) {
    const id = `errors/${diagnostic.code}`;
    const markdown = `# ${diagnostic.code}\n\n${diagnostic.slug}. Status: ${diagnostic.status}.\n\n${diagnostic.remediation}\n`;
    documents.set(id, { id, title: diagnostic.code, section: 'Diagnostics', kind: 'packaged-diagnostic',
      markdown, searchText: markdown.toLocaleLowerCase('en'), sha256: hash(markdown),
      sourceSha256: assets.find(asset => asset.source === 'config/diagnostics/catalog.json').sha256,
      sourceRevision: manifest.sourceRevision, sourceUrl: sourceUrl('config/diagnostics/catalog.json'),
      url: sourceUrl('config/diagnostics/catalog.json'), markdownUrl: sourceUrl('config/diagnostics/catalog.json'),
    });
  }
  const provenance = {
    packageVersion: manifest.packageVersion, channel: publishedChannel(manifest), publication: publicationStatus(manifest),
    sourceRepository: manifest.sourceRepository, sourceRevision: manifest.sourceRevision, sourceDirty: manifest.sourceDirty,
    sourceContentSha256: manifest.contentSha256, corpusKind: 'package-artifact',
    corpusSha256: hash(JSON.stringify([...documents.values()])),
  };
  const symbols = assetJson('docs-symbols.json');
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
  return { provenance, symbols, diagnostics, lookupSections, documents: [...documents.values()], index,
    sections, sectionIndex: indexSections(sections, [...documents.values()]),
    examples: [{ id: recipe.id, title: recipe.title, summary: recipe.summary, text, sha256: hash(text) }] };
}
