import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tokenize } from './search.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
export async function loadSnapshot() {
  const { recipes, recipeRuntime } = await import('../site/assets/playground-recipes.js');
  const corpusBytes = await read('../dist/docs/corpus.json');
  const corpus = JSON.parse(corpusBytes);
  const manifest = JSON.parse(await read('../content/library-docs/manifest.json'));
  const publicationEditsSha256 = hash(await read('../content/docs-publication-edits.json'));
  if (corpus.schemaVersion !== 1 || !Array.isArray(corpus.documents) || !corpus.documents.length ||
      corpus.packageVersion !== manifest.packageVersion || corpus.sourceRevision !== manifest.sourceRevision ||
      corpus.sourceContentSha256 !== manifest.contentSha256 || corpus.publicationEditsSha256 !== publicationEditsSha256 ||
      corpus.sourceDirty !== manifest.sourceDirty || corpus.sourceRepository !== manifest.sourceRepository ||
      recipeRuntime.version !== corpus.packageVersion || recipeRuntime.revision !== corpus.sourceRevision) {
    throw new Error('Documentation or example provenance differs from the snapshot. Run npm run build.');
  }
  const documents = new Map();
  for (const document of corpus.documents) {
    if (typeof document.id !== 'string' || documents.has(document.id) || typeof document.markdown !== 'string' ||
        hash(document.markdown) !== document.sha256) throw new Error('Invalid documentation corpus. Run npm run build.');
    documents.set(document.id, { ...document, searchText: document.markdown.toLocaleLowerCase('en') });
  }
  const provenance = {
    packageVersion: corpus.packageVersion, channel: corpus.channel, publication: corpus.publication,
    sourceRepository: corpus.sourceRepository, sourceRevision: corpus.sourceRevision, sourceDirty: corpus.sourceDirty,
    sourceContentSha256: corpus.sourceContentSha256, publicationEditsSha256,
    corpusSha256: hash(corpusBytes),
  };
  const index = Object.create(null);
  for (const [id, document] of documents) {
    const titleWords = new Set(tokenize(document.title));
    for (const word of tokenize(`${document.title}\n${document.markdown}`)) {
      (index[word] ??= []).push([id, titleWords.has(word)]);
    }
  }
  return { provenance, documents: [...documents.values()], index,
    examples: recipes.map(recipe => { const text = JSON.stringify(recipe, null, 2);
      return { id: recipe.id, title: recipe.title, summary: recipe.summary, text, sha256: hash(text) }; }) };
}
