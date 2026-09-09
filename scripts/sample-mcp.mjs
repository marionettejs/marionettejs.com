import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

if (process.argv.length !== 3) throw new Error('Usage: node scripts/sample-mcp.mjs <MCP endpoint URL>');
const endpoint = new URL(process.argv[2]);
const client = new Client({ name: 'marionette-search-sample', version: '1.0.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const catalog = JSON.parse((await client.readResource({ uri: 'marionette://catalog' })).contents[0].text);
  const queries = ['Region', 'safely textContent', 'preserve draft while another list row changes', 'cancellation async startup', 'how do I diagnose MN0023?', 'zzzznosuchcontract', 'x'.repeat(200), 'view region state data collection events render template lifecycle model application destroy '.repeat(2)];
  const startedAt = new Date().toISOString();
  let maxResponseBytes = 0;
  for (let i = 0; i < 240; i++) {
    const response = await client.callTool({ name: 'search_docs', arguments: { version: catalog.provenance.packageVersion, query: queries[i % queries.length], limit: 10 } });
    assert.ok(!response.isError);
    assert.deepEqual(response.structuredContent.provenance, catalog.provenance);
    maxResponseBytes = Math.max(maxResponseBytes, Buffer.byteLength(JSON.stringify(response)));
  }
  const result = { endpoint: endpoint.href, startedAt, finishedAt: new Date().toISOString(), requests: 240, failures: 0, concurrency: 1, queries, maxResponseBytes, provenance: catalog.provenance,
    measurement: 'Bounded search-only traffic window. Use this time range for Cloudflare CPU metrics; elapsed network time is not CPU time.' };
  await mkdir(new URL('../output/', import.meta.url), { recursive: true });
  await writeFile(new URL('../output/mcp-search-sample.json', import.meta.url), JSON.stringify(result, null, 2)+'\n');
  console.log(JSON.stringify(result, null, 2));
} finally { await client.close(); }
