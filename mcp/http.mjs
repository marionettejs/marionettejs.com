import { createMcpHandler, hostHeaderValidationResponse, originValidationResponse, isJSONRPCRequest } from '@modelcontextprotocol/server';

const MAX_BODY_BYTES = 16_384;
const reportError = error => console.error('Documentation MCP serving failure:', error);
const hosts = ['mcp.marionettejs.com', 'localhost', '127.0.0.1'];
const origins = ['marionettejs.com', 'www.marionettejs.com', 'v5.marionettejs.com', 'mcp.marionettejs.com', 'localhost', '127.0.0.1'];

export function createDocsHttpHandler(factory, revision) {
  const handler = createMcpHandler(async context => {
    const server = await factory(context);
    // A legacy reverse request cannot receive its reply on a stateless endpoint.
    // SDK 2.3.1 has no legacy reverse-request policy option. Retain this
    // adapter until one exists; test/mcp-handler.test.mjs exercises a real
    // legacy reverse request and must keep passing on every SDK upgrade.
    if (context.era === 'legacy') {
      const connect = server.connect.bind(server);
      server.connect = transport => {
        const send = transport.send.bind(transport);
        transport.send = async (message, options) => {
          if (isJSONRPCRequest(message)) {
            transport.onmessage?.({ jsonrpc: '2.0', id: message.id, error: {
              code: -32603, message: 'Server-to-client requests are unavailable on the stateless documentation endpoint.',
            } });
            return;
          }
          return send(message, options);
        };
        return connect(transport);
      };
    }
    return server;
  }, { responseMode: 'json', maxSubscriptions: 0, legacy: 'stateless', onerror: reportError });

  async function serve(request) {
    if (new URL(request.url).pathname !== '/mcp') return new Response('Not found', { status: 404 });
    const rejection = hostHeaderValidationResponse(request, hosts) ?? originValidationResponse(request, origins);
    if (rejection) return rejection;
    if (request.method === 'OPTIONS') return new Response(null);
    if (request.method !== 'POST') return handler.fetch(request);
    const length = request.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
      return new Response(`MCP request body exceeds ${MAX_BODY_BYTES} bytes`, { status: 413 });
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
          return new Response(`MCP request body exceeds ${MAX_BODY_BYTES} bytes`, { status: 413 });
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
  }

  return {
    async fetch(request) {
      let response;
      try { response = await serve(request); }
      catch (error) {
        reportError(error);
        response = Response.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal server error' } }, { status: 500 });
      }
      const headers = new Headers(response.headers);
      headers.set('x-marionette-revision', revision);
      // Host/Origin checks above apply to preflights as well as protocol calls.
      headers.set('access-control-allow-origin', '*');
      headers.set('access-control-allow-methods', 'POST, OPTIONS');
      headers.set('access-control-allow-headers', 'Content-Type, Accept, Authorization, mcp-session-id, MCP-Protocol-Version, Mcp-Method, Mcp-Name');
      headers.set('access-control-expose-headers', 'mcp-session-id, x-marionette-revision');
      headers.set('access-control-max-age', '86400');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    },
    close: () => handler.close(),
  };
}
