import { createMcpHandler } from 'agents/mcp/server';
import { createDocsServer } from './tools.mjs';
import snapshot from '../output/mcp/snapshot.json';

const MAX_BODY_BYTES = 16_384;
const handler = createMcpHandler(() => createDocsServer(snapshot), {
  route: '/mcp', responseMode: 'json', maxSubscriptions: 0,
  // Current Streamable HTTP clients still initialize using the legacy wire
  // protocol. This SDK-supported lane is also stateless (no sessions or SSE).
  legacy: 'stateless',
  allowedHostnames: ['mcp.marionettejs.com', 'localhost', '127.0.0.1'],
  allowedOriginHostnames: ['marionettejs.com', 'www.marionettejs.com', 'v5.marionettejs.com', 'mcp.marionettejs.com', 'localhost', '127.0.0.1'],
});

export default {
  async fetch(request) {
    if (new URL(request.url).pathname !== '/mcp') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return handler.fetch(request);
    const length = request.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
      return new Response('MCP request body exceeds 16384 bytes', { status: 413 });
    }
    // Count streamed bytes too: Content-Length is optional and untrusted.
    const reader = request.body?.getReader();
    const chunks = []; let size = 0;
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return new Response('MCP request body exceeds 16384 bytes', { status: 413 });
        }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let parsedBody;
    try { parsedBody = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return new Response('Invalid JSON', { status: 400 }); }
    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      return new Response('One MCP request object is required; batches are unsupported', { status: 400 });
    }
    return handler.fetch(new Request(request, { body: bytes }), { parsedBody });
  },
};
