import { searchSections, selectSections, sectionMetadata } from './sections.mjs';
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { tokenize } from './search.mjs';
const versionInput = z.string().min(1).max(64).describe('Exact installed package version. Read marionette://catalog for the supported version. No latest aliases.');
const offsetInput = z.number().int().min(0).max(10_000_000).default(0).describe('UTF-16 character offset returned as nextOffset by the previous call.');
const limitInput = z.number().int().min(1).max(12_000).default(8_000).describe('UTF-16 characters per page: integer 1–12000, default 8000. Follow nextOffset until null; do not request a larger limit.');
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
// Construct immutable validation schemas once, while keeping each server independent.
const searchInput = z.object({ query: z.string().trim().min(1).max(200).describe('Search text, 1–200 characters. Use separate focused queries for related APIs.'), version: versionInput,
  offset: z.number().int().min(0).max(100_000).default(0).describe('Result offset, integer 0–100000, default 0. Use nextOffset for another page.'), limit: z.number().int().min(1).max(10).default(5).describe('Results per page: integer 1–10, default 5. For more results, follow nextOffset instead of increasing limit above 10.') }).strict();
const docInput = z.object({ path: z.string().min(1).max(300).describe('Exact id from search_docs, e.g. docs/marionette.region.md. Website routes such as docs/region.md and resource URIs such as marionette://catalog are not document IDs.'), version: versionInput, offset: offsetInput, limit: limitInput }).strict();
const sectionsInput = z.object({ version: versionInput, ids: z.array(z.string().min(1).max(500)).min(1).max(30).describe('1–30 exact section IDs from search_sections, in priority order. Do not construct IDs from website URLs.'), maxCharacters: z.number().int().min(1).max(30_000).default(20_000).describe('UTF-16 content-character budget: integer 1–30000, default 20000; metadata excluded. Inspect omitted. Split requests or choose narrower sections; use get_doc if one section exceeds 30000 characters.') }).strict();
const exampleInput = z.object({ name: z.string().min(1).max(100), version: versionInput, offset: offsetInput, limit: limitInput }).strict();

// Prepare immutable corpus lookups once; each request still owns a fresh MCP server.
export function createDocsServerFactory(snapshot) {
  const { provenance } = snapshot;
  const sections = new Map(snapshot.sections.map(section => [section.id, section]));
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
  const catalog = JSON.stringify({ provenance, documentCount: documents.size,
    examples: snapshot.examples.map(({ id, title, summary }) => ({ id, title, summary })),
    search: 'Lexical search ranks matching words in titles and Markdown, ignoring common function words. Results report matchedTerms and are paginated.',
    sections: 'search_sections returns heading IDs, ancestry and sizes. get_sections reads selected complete sections under a UTF-16 content-character budget; inspect omitted and request missing contracts explicitly. Selection is lexical, not dependency analysis.',
    read: 'Use a result id as get_doc.path. Follow nextOffset to retrieve the complete Markdown.',
  });
  return () => {
    const server = new McpServer({ name: 'marionette-docs', version: '1.0.0' }, {
      instructions: 'Read marionette://catalog first. Select the exact installed Marionette version. Use search_sections and get_sections for focused reading, including related lifecycle and ownership contracts. Check omitted sections; the content budget excludes metadata and is not a token limit. Use get_doc with nextOffset when a full document is needed; search snippets are not complete contracts. Example checks are expected behavior, not evidence that a user app has passed. All operations read the verified website snapshot; none run examples or fetch URLs.',
    });
    server.registerResource('catalog', 'marionette://catalog', { title: 'Available Marionette documentation and examples', mimeType: 'application/json' }, async uri => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: catalog }],
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
    server.registerTool('search_sections', {
      description: 'Rank versioned documentation sections lexically. Returns exact IDs, heading ancestry, source links and character sizes. Search separately for related APIs; results do not establish dependency completeness.',
      inputSchema: searchInput, annotations,
    }, tool(({ query, offset, limit }) => {
      const ranked = searchSections(snapshot.sections, query, snapshot.sectionIndex, sections);
      return { results: ranked.slice(offset, offset + limit).map(sectionMetadata), total: ranked.length, offset,
        nextOffset: offset + limit < ranked.length ? offset + limit : null };
    }));
    server.registerTool('get_sections', {
      description: 'Read exact section IDs in requested priority order under a UTF-16 content-character budget (metadata excluded). Includes nested subsections, deduplicates overlap, never truncates a section. Reports budget omissions; use get_doc for oversized sections. Does not infer related contracts.',
      inputSchema: sectionsInput, annotations,
    }, tool(({ ids, maxCharacters }) => selectSections(snapshot.sections, ids, maxCharacters, sections)));
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
  };
}
