import test from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '@modelcontextprotocol/server';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createDocsHttpHandler } from '../mcp/http.mjs';

const revision = 'a'.repeat(40);
const endpoint = 'https://mcp.marionettejs.com/mcp';
const headers = { host: 'mcp.marionettejs.com', 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
const list = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
const request = (options = {}) => new Request(endpoint, { method: 'POST', body: list, ...options, headers: { ...headers, ...options.headers } });

function fixture(t, factory = () => new McpServer({ name: 'handler-test', version: '1.0.0' })) {
  let instances = 0;
  const handler = createDocsHttpHandler(context => { instances++; return factory(context); }, revision);
  t.after(() => handler.close());
  return { handler, instances: () => instances };
}

async function clientFor(t, handler, version) {
  const client = new Client({ name: 'handler-test', version: '1.0.0' }, { versionNegotiation: { mode: version.startsWith('2025') ? 'legacy' : { pin: version } } });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint), { fetch: async (url, options) => {
    const req = new Request(url, options);
    req.headers.set('host', new URL(url).host);
    const response = await handler.fetch(req);
    assert.equal(response.headers.get('mcp-session-id'), null);
    assert.equal(response.headers.get('x-marionette-revision'), revision);
    return response;
  } }));
  return client;
}

test('Host and Origin allowlists apply before factories and CORS preflights', async t => {
  const { handler, instances } = fixture(t);
  for (const host of ['evil.example', 'mcp.marionettejs.com.evil.example', 'localhost@evil.example']) {
    const response = await handler.fetch(request({ headers: { host } }));
    assert.equal(response.status, 403, host);
    assert.equal(response.headers.get('x-marionette-revision'), revision);
  }
  for (const origin of ['https://evil.example', 'https://marionettejs.com.evil.example', 'null', 'invalid', 'file:///']) {
    for (const method of ['POST', 'OPTIONS']) {
      assert.equal((await handler.fetch(request({ method, body: method === 'POST' ? list : undefined, headers: { origin } }))).status, 403, origin);
    }
  }
  for (const origin of ['https://marionettejs.com', 'https://www.marionettejs.com', 'https://v5.marionettejs.com', 'https://mcp.marionettejs.com', 'http://localhost:3000', 'http://127.0.0.1:3000']) {
    const response = await handler.fetch(request({ method: 'OPTIONS', body: undefined, headers: { origin } }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(response.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
    assert.match(response.headers.get('access-control-allow-headers'), /MCP-Protocol-Version/);
  }
  assert.equal(instances(), 0);
});

test('body and route rejection never creates an MCP server, and streamed overflow cancels input', async t => {
  const { handler, instances } = fixture(t);
  for (const length of ['16385', '-1', '1.5', 'NaN']) {
    assert.equal((await handler.fetch(request({ headers: { 'content-length': length } }))).status, 413);
  }
  for (const body of ['{', 'null', '[]', '42']) assert.equal((await handler.fetch(request({ body }))).status, 400);
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(16_385)); }, cancel() { cancelled = true; } });
  assert.equal((await handler.fetch(request({ body, duplex: 'half' }))).status, 413);
  assert.equal(cancelled, true);
  assert.equal((await handler.fetch(new Request('https://mcp.marionettejs.com/other'))).status, 404);
  assert.equal(instances(), 0);
  // Exactly the advertised byte boundary is accepted without truncation.
  const accepted = await handler.fetch(request({ body: list.padEnd(16_384, ' ') }));
  assert.equal(accepted.status, 200);
  await accepted.text();
  assert.equal(instances(), 1);
});

test('factory failures and body stream failures are sanitized and keep the revision header', async t => {
  const { handler } = fixture(t, () => { throw new Error('private path and credential'); });
  for (const req of [request(), request({ body: new ReadableStream({ start(controller) { controller.error(new Error('private stream')); } }), duplex: 'half' })]) {
    const response = await handler.fetch(req);
    assert.equal(response.status, 500);
    assert.equal(response.headers.get('x-marionette-revision'), revision);
    assert.deepEqual((await response.json()).error, { code: -32603, message: 'Internal server error' });
  }
});

for (const version of ['2025-11-25', '2026-07-28']) {
  test(`${version} concurrent requests have fresh servers and promptly reject reverse requests`, { timeout: 10_000 }, async t => {
    let serial = 0;
    const { handler } = fixture(t, () => {
      const id = ++serial;
      const server = new McpServer({ name: 'handler-test', version: '1.0.0' });
      server.registerTool('identity', { inputSchema: {} }, async () => ({ content: [{ type: 'text', text: String(id) }] }));
      server.registerTool('reverse', { inputSchema: {} }, async () => {
        await server.server.request({ method: 'ping' });
        return { content: [] };
      });
      return server;
    });
    const client = await clientFor(t, handler, version);
    const responses = await Promise.all(Array.from({ length: 8 }, () => client.callTool({ name: 'identity', arguments: {} })));
    assert.equal(new Set(responses.map(result => result.content[0].text)).size, 8);
    const reverse = await client.callTool({ name: 'reverse', arguments: {} });
    assert.equal(reverse.isError, true);
    assert.match(reverse.content[0].text, version.startsWith('2025') ? /Server-to-client requests are unavailable/ : /per-request|inputRequired|push-style|2026|unsupported/i);
  });
}
