import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { tokenize } from './search.mjs';
const versionInput = z.string().min(1).max(64).describe('Exact installed package version. Read marionette://catalog for the supported version. No latest aliases.');
const offsetInput = z.number().int().min(0).max(10_000_000).default(0).describe('UTF-16 character offset returned as nextOffset by the previous call.');
const limitInput = z.number().int().min(1).max(12_000).default(8_000).describe('Maximum characters to return; follow nextOffset until null.');
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
// Construct immutable validation schemas once, while keeping each server independent.
const searchInput = z.object({ query: z.string().trim().min(1).max(200), version: versionInput,
  offset: z.number().int().min(0).max(100_000).default(0), limit: z.number().int().min(1).max(10).default(5) }).strict();
const docInput = z.object({ path: z.string().min(1).max(300), version: versionInput, offset: offsetInput, limit: limitInput }).strict();
const exampleInput = z.object({ name: z.string().min(1).max(100), version: versionInput, offset: offsetInput, limit: limitInput }).strict();

export function createDocsServer(snapshot) {
  const { provenance } = snapshot;
  const documents = new Map(snapshot.documents.map(doc => [doc.id, doc]));
  const examples = new Map(snapshot.examples.map(example => [example.id, example]));
  const assertVersion = version => {
    if (version !== provenance.packageVersion) throw new Error(`Unsupported version: ${version}. Supported version: ${provenance.packageVersion}. No fallback was used.`);
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
  const metadata = ({ id, title, section, kind, url, markdownUrl, sourceUrl, sourceSha256, sha256, sourceSupplements }) =>
    ({ id, title, section, kind, url, markdownUrl, sourceUrl, sourceSha256, sha256, sourceSupplements });
  const server = new McpServer({ name: 'marionette-docs', version: '1.0.0' }, {
    instructions: 'Read marionette://catalog first. Select the exact installed Marionette version. Search then read complete documents using nextOffset; search snippets are not complete contracts. Example checks are expected behavior, not evidence that a user app has passed. All operations read the verified website snapshot; none run examples or fetch URLs.',
  });
  server.registerResource('catalog', 'marionette://catalog', { title: 'Available Marionette documentation and examples', mimeType: 'application/json' }, async uri => ({
    contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ provenance, documentCount: documents.size,
      examples: snapshot.examples.map(({ id, title, summary }) => ({ id, title, summary })),
      search: 'Lexical search ranks matching words in titles and Markdown, ignoring common function words. Results report matchedTerms and are paginated.',
      read: 'Use a result id as get_doc.path. Follow nextOffset to retrieve the complete Markdown.',
    }) }],
  }));
  server.registerTool('search_docs', {
    description: 'Search the same versioned Markdown served by the website. Case-insensitive lexical search ranks word matches, favors titles and multiple matching terms, and ignores common function words. Returns matchedTerms, bounded snippets, and canonical links; a match need not contain every query term.',
    inputSchema: searchInput, annotations,
  }, tool(({ query, offset, limit }) => {
    const terms = tokenize(query);
    if (!terms.length) throw new Error('Query must include an API name, diagnostic code, or substantive search word.');
    const candidates = new Map();
    for (const term of terms) for (const [id, inTitle] of Object.hasOwn(snapshot.index, term) ? snapshot.index[term] : []) {
      const match = candidates.get(id) || { id, matchedTerms: [], titleScore: 0 };
      match.matchedTerms.push(term);
      match.titleScore += inTitle ? 10 : 0;
      candidates.set(id, match);
    }
    const ranked = [...candidates.values()].map(match => ({ ...match,
      score: match.matchedTerms.length ** 2 + match.titleScore
    })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'en'));
    const matches = ranked.slice(offset, offset + limit).map(({ id, matchedTerms, score }) => {
      const document = documents.get(id);
      const body = document.searchText;
      const bodyMatch = matchedTerms.map(term => body.indexOf(term)).find(position => position >= 0) ?? 0;
      const position = Math.max(0, bodyMatch - 100);
      return { ...metadata(document), matchedTerms, score, snippet: document.markdown.slice(position, position + 600) };
    });
    return { results: matches, total: ranked.length, offset,
      nextOffset: offset + limit < ranked.length ? offset + limit : null };
  }));
  server.registerTool('get_doc', {
    description: 'Read a document by exact id from search_docs. Returns complete Markdown through bounded chunks with nextOffset. Paths are identifiers, never filesystem paths or URLs.',
    inputSchema: docInput, annotations,
  }, tool(({ path, offset, limit }) => {
    const document = documents.get(path);
    if (!document) throw new Error('Unknown document id. Use an exact id returned by search_docs.');
    return { document: metadata(document), ...slice(document.markdown, offset, limit) };
  }));
  server.registerTool('get_example', {
    description: 'Read an executable workshop recipe and its expected checks by name from marionette://catalog. Content is a JSON string containing the shared recipe, chunked with nextOffset. This tool does not execute code or certify checks.',
    inputSchema: exampleInput, annotations,
  }, tool(({ name, offset, limit }) => {
    const example = examples.get(name);
    if (!example) throw new Error('Unknown example name. Read marionette://catalog for available examples.');
    const text = example.text;
    return { name, format: 'application/json', sha256: example.sha256, ...slice(text, offset, limit) };
  }));
  return server;
}
