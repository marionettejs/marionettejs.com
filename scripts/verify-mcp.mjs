import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

export async function verifyMcp(endpoint) {
  const corpus = JSON.parse(await readFile(new URL('../dist/docs/corpus.json', import.meta.url), 'utf8'));
  const version = corpus.packageVersion;
  const clients = [new Client({ name: 'marionette-http-verification', version: '1.0.0' }), new Client({ name: 'marionette-stdio-verification', version: '1.0.0' })];
  const responses = [];
  const http = new StreamableHTTPClientTransport(new URL(endpoint), { fetch: async (url, options) => {
    const response = await fetch(url, options);
    assert.equal(response.headers.get('mcp-session-id'), null);
    const bytes = (await response.clone().arrayBuffer()).byteLength;
    assert.ok(bytes <= 131_072, `Response exceeded 128 KiB: ${bytes}`);
    responses.push({ status: response.status, bytes });
    return response;
  } });
  const stdio = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../mcp/server.mjs', import.meta.url))], stderr: 'pipe' });
  let calls = 0;
  try {
    await clients[0].connect(http); await clients[1].connect(stdio);
    assert.deepEqual(clients[0].getServerVersion(), clients[1].getServerVersion());
    const tools = await clients[0].listTools();
    assert.deepEqual(tools, await clients[1].listTools());
    assert.deepEqual(tools.tools.map(t => t.name).sort(), ['get_doc', 'get_example', 'search_docs']);
    assert.ok(tools.tools.every(t => t.annotations.readOnlyHint && !t.annotations.openWorldHint));
    assert.deepEqual(await clients[0].listResources(), await clients[1].listResources());
    const catalogs = await Promise.all(clients.map(c => c.readResource({ uri: 'marionette://catalog' })));
    assert.deepEqual(catalogs[0], catalogs[1]);
    const catalog = JSON.parse(catalogs[0].contents[0].text);
    assert.equal(catalog.provenance.packageVersion, version);
    const call = async (name, args, error = false) => {
      const results = await Promise.all(clients.map(c => c.callTool({ name, arguments: { version, ...args } })));
      assert.deepEqual(results[0], results[1], `${name} transport parity`); calls++;
      assert.equal(results[0].isError === true, error, JSON.stringify(results[0].content).slice(0,500));
      if (error) return results[0];
      assert.deepEqual(JSON.parse(results[0].content[0].text), results[0].structuredContent);
      assert.deepEqual(results[0].structuredContent.provenance, catalog.provenance);
      return results[0].structuredContent;
    };
    for (const query of ['Region', 'safely textContent', 'preserve draft while another list row changes', 'cancellation async startup', 'how do I diagnose MN0023?', 'zzzznosuchcontract', '__proto__', 'constructor', 'a'.repeat(200), 'View Region state data collection events render template lifecycle model application destroy '.repeat(2)]) {
      await call('search_docs', { query, limit: 10 });
    }
    let offset = 0, ids = [];
    do {
      const page = await call('search_docs', { query: 'Region', offset, limit: 2 });
      assert.ok(page.results.every(r => r.snippet.length <= 600 && new Set(r.matchedTerms).size === r.matchedTerms.length));
      ids.push(...page.results.map(r => r.id)); offset = page.nextOffset;
      if (offset === null) assert.equal(ids.length, page.total);
    } while (offset !== null);
    assert.equal(new Set(ids).size, ids.length);
    // Reconstruct every document, not just a search snippet or first page.
    for (const doc of corpus.documents) {
      let text = ''; offset = 0;
      do {
        const page = await call('get_doc', { path: doc.id, offset, limit: 12_000 });
        assert.equal(page.document.sha256, doc.sha256);
        assert.deepEqual(page.document.sourceSupplements, doc.sourceSupplements);
        assert.ok(page.content.length <= 12_000);
        text += page.content; offset = page.nextOffset;
      } while (offset !== null);
      assert.equal(text, doc.markdown);
    }
    const { recipes } = await import('../site/assets/playground-recipes.js');
    for (const example of catalog.examples) {
      let text = ''; offset = 0;
      do {
        const page = await call('get_example', { name: example.id, offset, limit: 1000 });
        text += page.content; offset = page.nextOffset;
      } while (offset !== null);
      assert.deepEqual(JSON.parse(text), recipes.find(r => r.id === example.id));
    }
    for (const unsupported of ['latest', 'next', '5', '4.1.3', '5.0.0-beta.2', `${version} `]) {
      for (const [name, args] of [['search_docs', { query: 'Region' }], ['get_doc', { path: corpus.documents[0].id }], ['get_example', { name: catalog.examples[0].id }]]) {
        const error = await call(name, { ...args, version: unsupported }, true);
        assert.match(error.content[0].text, /Unsupported version:.*Supported version: 5.0.0-beta.1.*No fallback/);
      }
    }
    for (const [name, args] of [
      ['search_docs', { query: '' }], ['search_docs', { query: 'the and' }], ['search_docs', { query: 'x'.repeat(201) }],
      ['search_docs', { query: 'Region', limit: 11 }], ['search_docs', { query: 'Region', offset: -1 }],
      ['search_docs', { query: 'Region', version: undefined }], ['search_docs', { query: 'Region', extra: true }],
      ['get_doc', { path: '../package.json' }], ['get_doc', { path: '__proto__' }], ['get_doc', { path: 'https://example.com/' }],
      ['get_doc', { path: corpus.documents[0].id, limit: 12_001 }], ['get_doc', { path: corpus.documents[0].id, offset: 10_000_000 }],
      ['get_example', { name: '__proto__' }], ['get_example', { name: '../package.json' }],
    ]) await call(name, args, true);
    await assert.rejects(clients[0].readResource({ uri: 'file:///etc/passwd' }));
    const modern = new Client({ name: 'marionette-modern-verification', version: '1.0.0' }, { versionNegotiation: { mode: { pin: '2026-07-28' } } });
    try {
      await modern.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
      assert.deepEqual((await modern.listTools()).tools, tools.tools);
      const result = await modern.callTool({ name: 'search_docs', arguments: { query: 'Region', version } });
      assert.deepEqual(result.structuredContent, await call('search_docs', { query: 'Region' }));
    } finally { await modern.close(); }
    const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    for (const [method, expected] of [['GET', 405], ['DELETE', 405], ['PUT', 405]]) {
      assert.equal((await fetch(endpoint, { method, headers })).status, expected);
    }
    for (const origin of ['https://untrusted.example', 'null', 'invalid', 'file:///']) {
      assert.equal((await fetch(endpoint, { method: 'POST', headers: { ...headers, origin }, body })).status, 403);
    }
    assert.equal((await fetch(endpoint, { method: 'OPTIONS', headers: { origin: 'https://marionettejs.com', 'access-control-request-method': 'POST' } })).status, 200);
    for (const [payload, expected] of [['{',400], ['null',400], ['[]',400], ['x'.repeat(16_385),413]]) {
      assert.equal((await fetch(endpoint, { method: 'POST', headers, body: payload })).status, expected);
    }
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('x'.repeat(16_385))); controller.close(); } });
    assert.equal((await fetch(endpoint, { method: 'POST', headers, body: stream, duplex: 'half' })).status, 413);
    assert.equal((await fetch(new URL('/other', endpoint))).status, 404);
    return { endpoint, verifiedAt: new Date().toISOString(), provenance: catalog.provenance, documents: corpus.documents.length, examples: catalog.examples.length, equivalentToolCalls: calls, httpResponses: responses.length, maxResponseBytes: Math.max(...responses.map(r => r.bytes)), sessions: false, checks: ['initialization', 'discovery', 'search pagination', 'every complete document', 'every complete example', 'content and provenance parity', 'version mismatch', 'invalid inputs', 'HTTP methods', 'Origins', 'body size including streaming'] };
  } finally { await Promise.allSettled(clients.map(c => c.close())); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/verify-mcp.mjs <MCP endpoint URL>');
  const result = await verifyMcp(process.argv[2]);
  await mkdir(new URL('../output/', import.meta.url), { recursive: true });
  await writeFile(new URL('../output/mcp-verification.json', import.meta.url), JSON.stringify(result, null, 2)+'\n');
  console.log(JSON.stringify(result, null, 2));
}
