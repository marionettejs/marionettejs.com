import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createDocsServer } from '../mcp/tools.mjs';
import { loadSnapshot } from '../mcp/load.mjs';

// Preflight estimate: Node thread CPU for the SDK handler, not edge CPU or
// network latency. Cloudflare deployment metrics must be checked separately.
const snapshot = await loadSnapshot();
const handler = createMcpHandler(() => createDocsServer(snapshot), { responseMode: 'json' });
const queries = ['Region', 'safely textContent', 'preserve draft while another list row changes',
  'cancellation async startup', 'how do I diagnose MN0023?', 'zzzznosuchcontract', 'x'.repeat(200),
  'view region state data collection events render template lifecycle model application destroy '.repeat(2)];
const summaries = [];
for (const query of queries) {
  const samples = []; let maxBytes = 0;
  for (let i = 0; i < 120; i++) {
    const started = process.threadCpuUsage();
    const response = await handler.fetch(new Request('http://localhost/mcp', { method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: i + 1, method: 'tools/call', params: { name: 'search_docs', arguments: { query, version: snapshot.provenance.packageVersion, limit: 10 } } }),
    }));
    const bytes = await response.arrayBuffer();
    const cpu = process.threadCpuUsage(started);
    assert.equal(response.status, 200);
    const text = new TextDecoder().decode(bytes);
    const result = JSON.parse(text.startsWith('event:') ? text.split('\n').find(line => line.startsWith('data: ')).slice(6) : text);
    assert.ok(result.result && !result.result.isError, JSON.stringify(result).slice(0,300));
    samples.push((cpu.user + cpu.system) / 1000); maxBytes = Math.max(maxBytes, bytes.byteLength);
  }
  const sorted = samples.slice(20).sort((a,b) => a-b);
  summaries.push({ query, firstMs: samples[0], warmupRequests: 20, measuredRequests: sorted.length,
    cpuMs: { median: sorted[49], p95: sorted[94], p99: sorted[98], max: sorted[99] }, maxResponseBytes: maxBytes });
}
const report = { measuredAt: new Date().toISOString(), runtime: process.version, platform: `${process.platform}/${process.arch}`,
  measurement: 'Node thread CPU for fresh SDK server creation, HTTP handling, search, response serialization and consumption. Excludes module import and snapshot preparation. Not Cloudflare edge CPU.',
  provenance: snapshot.provenance, freeLimitMs: 10, summaries };
await mkdir(new URL('../output/', import.meta.url), { recursive: true });
await writeFile(new URL('../output/mcp-cpu-local.json', import.meta.url), JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify(report, null, 2));
