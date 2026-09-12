import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createHash } from 'node:crypto';
import { tmpdir, cpus } from 'node:os';
import { join, resolve } from 'node:path';
import { unstable_dev } from 'wrangler';

// Profile the actual entrypoint in local workerd, including the Cloudflare
// adapter and body wrapper. Loopback elapsed time is not billed edge CPU.
const label = process.argv[2] ?? 'local';
assert.match(label, /^[a-z0-9-]+$/);
const snapshot = JSON.parse(await readFile('output/mcp/snapshot.json', 'utf8'));
const version = snapshot.provenance.packageVersion;
const tool = (name, args) => ({ method: 'tools/call', params: { name, arguments: { version, ...args } } });
const cases = [
  ['initialize', { method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'cpu-profile', version: '1' } } }],
  ['catalog', { method: 'resources/read', params: { uri: 'marionette://catalog' } }],
  ['tools-list', { method: 'tools/list' }],
  ['document', tool('get_doc', { path: snapshot.documents.reduce((a,b) => a.markdown.length > b.markdown.length ? a : b).id, limit: 12000 })],
  ['example', tool('get_example', { name: snapshot.examples[0].id, limit: 12000 })],
  ...['Region', 'preserve draft while another list row changes', 'zzzznosuchcontract', 'x'.repeat(200),
    'view region state data collection events render template lifecycle model application destroy '.repeat(2)]
    .map((query, i) => [`search-${i}`, tool('search_docs', { query, limit: 10 })]),
];
const directory = await mkdtemp(join(tmpdir(), 'mcp-profile-'));
let worker, socket, modernClient;
let modernRequest;
try {
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  delete config.build; delete config.routes; delete config.account_id;
  config.main = resolve('mcp/worker.mjs');
  const configPath = join(directory, 'wrangler.json');
  await writeFile(configPath, JSON.stringify(config));
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const inspectorPort = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  worker = await unstable_dev(config.main, { config: configPath, ip: '127.0.0.1', port: 0, inspectorPort,
    local: true, logLevel: 'error', experimental: { disableExperimentalWarning: true, watch: false } });
  const targets = await (await fetch(`http://127.0.0.1:${inspectorPort}/json/list`)).json();
  assert.equal(targets.length, 1, 'Expected one Worker inspector target');
  socket = new WebSocket(targets[0].webSocketDebuggerUrl, { headers: { Origin: `http://127.0.0.1:${inspectorPort}` } });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let commandId = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id); clearTimeout(waiter.timer);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 10000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  modernClient = new Client({ name: 'cpu-profile', version: '1' }, { versionNegotiation: { mode: { pin: '2026-07-28' } } });
  await modernClient.connect(new StreamableHTTPClientTransport(new URL(`http://${worker.address}:${worker.port}/mcp`), {
    fetch: async (url, options) => {
      if (options.body) modernRequest = { body: JSON.parse(options.body), headers: Object.fromEntries(new Headers(options.headers)) };
      return fetch(url, options);
    },
  }));
  await send('Profiler.enable');
  const summaries = [];
  await mkdir('output', { recursive: true });
  for (const [name, request, protocol] of cases.flatMap(([name, request]) => [
    [`legacy-${name}`, request, '2025-03-26'],
    ...(name === 'initialize' ? [] : [[`modern-${name}`, request, '2026-07-28']]),
  ])) {
    let wire = { body: request, headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': protocol } };
    if (protocol === '2026-07-28') {
      if (request.method === 'resources/read') await modernClient.readResource(request.params);
      else if (request.method === 'tools/list') await modernClient.listTools();
      else await modernClient.callTool(request.params);
      wire = modernRequest;
    }
    const elapsed = []; let maxResponseBytes = 0;
    await send('Profiler.start');
    for (let i = 0; i < 120; i++) {
      const start = performance.now();
      const response = await fetch(`http://${worker.address}:${worker.port}/mcp`, { method: 'POST', signal: AbortSignal.timeout(10000), headers: wire.headers, body: JSON.stringify({ ...wire.body, jsonrpc: '2.0', id: i + 1 }) });
      const bytes = await response.arrayBuffer();
      assert.equal(response.status, 200, `${name}: ${new TextDecoder().decode(bytes).slice(0,500)}`);
      const text = new TextDecoder().decode(bytes);
      const result = JSON.parse(text.startsWith('event:') ? text.split('\n').find(line => line.startsWith('data: ')).slice(6) : text);
      assert.ok(result.result && !result.result.isError, JSON.stringify(result).slice(0,300));
      elapsed.push(performance.now() - start); maxResponseBytes = Math.max(maxResponseBytes, bytes.byteLength);
    }
    const { profile } = await send('Profiler.stop');
    await writeFile(`output/mcp-${label}-${name}.cpuprofile`, JSON.stringify(profile));
    const counts = new Map();
    for (const id of profile.samples ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    const topFrames = profile.nodes.map(node => ({ function: node.callFrame.functionName,
      url: node.callFrame.url, line: node.callFrame.lineNumber + 1, samples: counts.get(node.id) ?? 0 }))
      .filter(node => node.samples).sort((a,b) => b.samples - a.samples).slice(0,15);
    const sorted = elapsed.slice(20).sort((a,b) => a-b);
    summaries.push({ name, firstElapsedMs: elapsed[0], warmupRequests: 20, measuredRequests: 100,
      loopbackElapsedMs: { median: sorted[49], p95: sorted[94], p99: sorted[98] }, maxResponseBytes, topFrames });
  }
  const sourceHashes = Object.fromEntries(await Promise.all(['mcp/worker.mjs', 'mcp/tools.mjs', 'mcp/search.mjs', 'package-lock.json'].map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
  const report = { sourceHashes, label, measuredAt: new Date().toISOString(), runtime: process.version, hardware: cpus()[0].model,
    measurement: 'Actual Worker in local workerd. Inspector samples identify hot frames; loopback elapsed times include I/O and are not edge CPU. Profiles include warmup; percentiles exclude first 20 requests. No module startup profile.',
    provenance: snapshot.provenance, summaries };
  await writeFile(`output/mcp-profile-${label}.json`, JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {
  await modernClient?.close();
  socket?.close();
  await worker?.stop();
  await rm(directory, { recursive: true, force: true });
}
