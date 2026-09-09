import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const versionInput = z.string().min(1).max(64).describe('Exact installed package version. Read marionette://catalog for the supported version. No latest aliases.');
const offsetInput = z.number().int().min(0).max(10_000_000).default(0).describe('UTF-16 character offset returned as nextOffset by the previous call.');
const limitInput = z.number().int().min(1).max(12_000).default(8_000).describe('Maximum characters to return; follow nextOffset until null.');
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const stopWords = new Set('a an and are as at be by can do does for from how i in is it me my of on or our should that the their this to use we what when where which while with would you your'.split(' '));
const tokenize = text => [...new Set((text.toLocaleLowerCase('en').match(/[\p{L}\p{N}_]+/gu) || []).filter(term => !stopWords.has(term)))];

async function main() {
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
    documents.set(document.id, document);
  }
  const examples = new Map(recipes.map(recipe => [recipe.id, recipe]));
  const provenance = {
    packageVersion: corpus.packageVersion, channel: corpus.channel, publication: corpus.publication,
    sourceRepository: corpus.sourceRepository, sourceRevision: corpus.sourceRevision, sourceDirty: corpus.sourceDirty,
    sourceContentSha256: corpus.sourceContentSha256, publicationEditsSha256,
    corpusSha256: hash(corpusBytes),
  };
  const assertVersion = version => {
    if (version !== corpus.packageVersion) throw new Error(`Unsupported version: ${version}. Supported version: ${corpus.packageVersion}. No fallback was used.`);
  };
  const result = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
  const tool = handler => async args => {
    try {
      assertVersion(args.version);
      return result({ provenance, ...handler(args) });
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  };
  const slice = (text, offset, limit) => {
    if (offset > text.length) throw new Error(`Offset exceeds content length (${text.length}).`);
    const end = Math.min(offset + limit, text.length);
    return { content: text.slice(offset, end), offset, nextOffset: end < text.length ? end : null, totalCharacters: text.length };
  };
  const metadata = ({ id, title, section, kind, url, markdownUrl, sourceUrl, sourceSha256, sha256 }) =>
    ({ id, title, section, kind, url, markdownUrl, sourceUrl, sourceSha256, sha256 });
  const server = new McpServer({ name: 'marionette-docs', version: '1.0.0' }, {
    instructions: 'Read marionette://catalog first. Select the exact installed Marionette version. Search then read complete documents using nextOffset; search snippets are not complete contracts. Example checks are expected behavior, not evidence that a user app has passed. All operations read the local website snapshot; none run examples or fetch URLs.',
  });
  server.registerResource('catalog', 'marionette://catalog', { title: 'Available Marionette documentation and examples', mimeType: 'application/json' }, async uri => ({
    contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ provenance, documentCount: documents.size,
      examples: recipes.map(({ id, title, summary }) => ({ id, title, summary })),
      search: 'Lexical search ranks matching words in titles and Markdown, ignoring common function words. Results report matchedTerms and are paginated.',
      read: 'Use a result id as get_doc.path. Follow nextOffset to retrieve the complete Markdown.',
    }) }],
  }));
  server.registerTool('search_docs', {
    description: 'Search the same versioned Markdown served by the website. Case-insensitive lexical search ranks word matches, favors titles and multiple matching terms, and ignores common function words. Returns matchedTerms, bounded snippets, and canonical links; a match need not contain every query term.',
    inputSchema: z.object({ query: z.string().trim().min(1).max(200), version: versionInput,
      offset: z.number().int().min(0).max(100_000).default(0), limit: z.number().int().min(1).max(10).default(5) }).strict(), annotations,
  }, tool(({ query, offset, limit }) => {
    const terms = tokenize(query);
    if (!terms.length) throw new Error('Query must include an API name, diagnostic code, or substantive search word.');
    const matches = [...documents.values()].map(document => {
      const title = document.title.toLocaleLowerCase('en');
      const body = document.markdown.toLocaleLowerCase('en');
      const words = new Set(tokenize(`${title}\n${body}`));
      const titleWords = new Set(tokenize(title));
      const matchedTerms = terms.filter(term => words.has(term));
      if (!matchedTerms.length) return null;
      const bodyMatch = matchedTerms.map(term => body.indexOf(term)).find(position => position >= 0) ?? 0;
      const position = Math.max(0, bodyMatch - 100);
      return { ...metadata(document), matchedTerms, score: matchedTerms.length ** 2 + matchedTerms.reduce((score, term) => score + (titleWords.has(term) ? 10 : 0), 0),
        snippet: document.markdown.slice(position, position + 600) };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'en'));
    return { results: matches.slice(offset, offset + limit), total: matches.length, offset,
      nextOffset: offset + limit < matches.length ? offset + limit : null };
  }));
  server.registerTool('get_doc', {
    description: 'Read a document by exact id from search_docs. Returns complete Markdown through bounded chunks with nextOffset. Paths are identifiers, never filesystem paths or URLs.',
    inputSchema: z.object({ path: z.string().min(1).max(300), version: versionInput, offset: offsetInput, limit: limitInput }).strict(), annotations,
  }, tool(({ path, offset, limit }) => {
    const document = documents.get(path);
    if (!document) throw new Error('Unknown document id. Use an exact id returned by search_docs.');
    return { document: metadata(document), ...slice(document.markdown, offset, limit) };
  }));
  server.registerTool('get_example', {
    description: 'Read an executable workshop recipe and its expected checks by name from marionette://catalog. Content is a JSON string containing the shared recipe, chunked with nextOffset. This tool does not execute code or certify checks.',
    inputSchema: z.object({ name: z.string().min(1).max(100), version: versionInput, offset: offsetInput, limit: limitInput }).strict(), annotations,
  }, tool(({ name, offset, limit }) => {
    const example = examples.get(name);
    if (!example) throw new Error('Unknown example name. Read marionette://catalog for available examples.');
    const text = JSON.stringify(example, null, 2);
    return { name, format: 'application/json', sha256: hash(text), ...slice(text, offset, limit) };
  }));
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.once('end', () => { void server.close(); });
}

main().catch(() => {
  // Keep protocol stdout clean and avoid exposing local paths in startup failures.
  console.error('Unable to load Marionette documentation. In the website checkout, run npm ci and npm run build; check that the snapshot and recipes match.');
  process.exitCode = 1;
});
