# Marionette documentation MCP

Connect to **https://mcp.marionettejs.com/mcp** for public, read-only documentation
retrieval. No server login, API key, subscription, or model inference is required.
Your agent client's own access and model costs are separate.

The hosted Cloudflare Worker and the optional local, read-only stdio server share
`search_docs`, `get_doc`, `get_example`, and `marionette://catalog`. Both serve the
same verified website corpus and workshop recipes. The current supported package
is exactly **`marionette@5.0.0-beta.2`**.

**Bundled Markdown remains the installed-version reference.** First inspect your
application's installed package and its `dist/docs/` manifest, using the
[consumer skill helper](https://marionettejs.com/docs/agent-tools/) if available.
Compare its version and source revision with the MCP catalog. A custom build with
the same version label may contain different code. If they do not match, use the
installed docs; never substitute the hosted snapshot for another version.

## Connect a supported client

Use a client with Streamable HTTP support. The URL is an MCP protocol endpoint;
opening it as an ordinary browser page returns `405 Method Not Allowed`.
There is no separate `/sse` endpoint and no authentication step.

### Codex

Add the server with the CLI:

```sh
codex mcp add marionette-docs --url https://mcp.marionettejs.com/mcp
```

Or add this to your Codex `config.toml`:

```toml
[mcp_servers.marionette-docs]
url = "https://mcp.marionettejs.com/mcp"
```

See [Codex MCP configuration](https://developers.openai.com/codex/mcp).

### Claude Code

From the application directory, add it to project configuration:

```sh
claude mcp add --transport http --scope project marionette-docs https://mcp.marionettejs.com/mcp
```

Use `/mcp` to inspect the connection. See
[Claude Code MCP setup](https://code.claude.com/docs/en/mcp).

### VS Code

Add this to `.vscode/mcp.json`, merging with existing servers:

```json
{
  "servers": {
    "marionette-docs": {
      "type": "http",
      "url": "https://mcp.marionettejs.com/mcp"
    }
  }
}
```

Use **MCP: List Servers** to start and inspect it. See
[VS Code MCP configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).
Other clients may use a different configuration shape; use their documented
Streamable HTTP settings rather than assuming these files are interchangeable.

After connecting, ask the agent:

```text
Read marionette://catalog and compare its version and source revision with this
application's installed Marionette documentation. If they match, search for
Region ownership, then read the relevant document through every nextOffset.
Report the provenance and explain the contract. Do not modify the application.
```

## Optional local stdio server

Use Node.js 24 or newer. Clone and review the website source, then install its
locked dependencies and build the same corpus the website serves:

```sh
git clone https://github.com/marionettejs/marionettejs.com.git
cd marionettejs.com
npm ci
npm run build
node mcp/server.mjs
```

The final command waits for an MCP client on stdin; silence is expected. It is
not an interactive shell. This repository does not publish an npm MCP package.

Configure a client that supports local stdio servers with the following command
and argument. Replace both absolute paths with your installed Node 24+ binary
and cloned repository location. The server works independently of client cwd.

```json
{
  "mcpServers": {
    "marionette-docs": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/website/mcp/server.mjs"]
    }
  }
}
```

This is the common `mcpServers` configuration shape; use your client's equivalent
stdio settings if its configuration differs. Do not launch through `npm run`
in a client command: npm's normal script banner would mix with protocol stdout.
For a terminal smoke check, run `npm run build && node --test test/mcp.test.mjs`.

After updating the checkout or importing a new documentation snapshot, run
`npm ci` and `npm run build` again and restart the MCP connection. The server
reads the generated corpus once at startup and rejects mismatched snapshot or
publication provenance.

## Retrieval workflow

1. Read `marionette://catalog` for the exact supported package version,
   provenance, document count, and example names.
2. Call `search_docs` with a short query and your exact installed `version`.
   Search ranks word matches in titles and Markdown, favors titles and multiple
   matching terms, and ignores common function words. Results report the terms
   that matched; they need not contain every query word. This is lexical search,
   so try an API name if a prose query returns nothing.
3. Pass a returned `id` to `get_doc` as `path`. Follow `nextOffset` until it is
   `null` to retrieve the complete contract. Search snippets are incomplete.
4. Call `get_example` with a catalog example `name`. Concatenate its chunks,
   then parse the resulting JSON for sourceFiles (ES modules), CSS, related docs,
   and expected checks. Open that project on the demos page to run and inspect
   its behavior. main.js is the module entry point; Download project includes
   every source file and the pinned runtime.

For this snapshot, a search call is:

```json
{"query":"Region", "version":"5.0.0-beta.2", "limit":5}
```

`version` is required for every tool. Unsupported versions, including `latest`
and `next`, return errors instead of silently choosing another release.
Successful tool results contain snapshot version, revision, original content
hash, publication edit hash, and generated corpus hash. Document results also
include canonical links and the reading Markdown hash. Example results include
the hash of the exact returned recipe JSON.

Search returns at most 10 results with 600-character snippets and supports result
offsets. Document and example reads default to 8,000 characters and allow at most
12,000 per call. Their offsets count UTF-16 characters, not bytes. Use the
returned `nextOffset` exactly. A requested limit never silently loses the rest
of a document or example.

## Boundaries and verification

The three tools only look up identifiers in loaded maps. Tool arguments cannot
select filesystem paths, URLs, imports, or commands. The process reads fixed
repository files during startup, makes no network requests, writes no files,
and never executes recipe code. The MCP server does not run or certify the
example's expected checks. The website workshop and browser tests do that work.

The hosted endpoint runs on Workers Free: no database, Durable Objects, persistent
sessions, AI calls, or paid bindings. It accepts at most 16 KiB per HTTP request,
including streamed bodies, and rejects JSON batches. Search queries are at most
200 characters; tool schemas reject extra fields. Retrieval results are bounded
as described above. Host and browser Origin checks reject untrusted origins;
origin-less native MCP clients work. Browser-origin requests are allowed from
Marionette's website hosts and localhost; other browser integrations need review.

The published service uses stateless MCP HTTP. It also accepts the initialization
sequence used by 2025 Streamable HTTP clients through the SDK's stateless adapter.
Neither mode creates a session ID, replay buffer, subscription, or background task.
The compatibility adapter is needed by current clients, including the SDK client's
default mode; remove it when supported clients no longer need initialization.

Workers Free currently allows **100,000 requests per day across the account** and
**10 ms CPU per request**, with 128 MB memory. Every protocol request and page
counts; one agent task may make several calls. Traffic or abuse can exhaust the
free allowance. There is no availability guarantee or automatic paid upgrade.
Use the installed Markdown or local stdio server when the hosted service is
unavailable. See [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/).

Search uses an index prepared from the verified corpus at build time rather than
retokenizing every document on each request. Local CPU measurements are estimates;
Cloudflare's deployed CPU metrics are the evidence for the edge runtime. Maintainers
must remeasure after corpus or SDK changes and keep deployment manual.

## MCP retrieval and the browser workshop

This endpoint retrieves documentation and recipe source. The website's **WebMCP
workshop** exposes tools inside a compatible browser to build, operate, and inspect
a running example. It does not use this remote endpoint. A successful MCP retrieval
proves that the source was read; it does not prove that a recipe or consumer
application works. Verify actual behavior in the application's own tests.

The local checkout and installed dependencies are executable developer tools.
Neither transport reads application source or credentials. Hosted queries go to
Cloudflare; do not include private application data in a documentation query.
The Worker does not log request bodies or persist queries.

## Verification and maintenance

`npm run check` uses the official SDK client against both a stdio subprocess and
local workerd HTTP. It checks discovery, search pagination, every complete document
and recipe, content/provenance parity, version rejection, invalid inputs, request
bounds, Origin checks, and shutdown. Startup/build checks reject stale provenance
and modified Markdown. The HTTP test also checks the current MCP protocol.

For an explicitly selected endpoint, run:

```sh
node scripts/verify-mcp.mjs https://mcp.marionettejs.com/mcp
```

This performs bounded read-only requests and compares results against the locally
built snapshot. The maintenance runbook lives in `mcp/DEPLOYMENT.md` in the website
repository. Builds and CI do not publish anything.

Implementation references: [Cloudflare stateless handler](https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/),
[official SDK web-standard HTTP](https://ts.sdk.modelcontextprotocol.io/v2/serving/web-standard.html),
and [SDK client compatibility](https://ts.sdk.modelcontextprotocol.io/v2/serving/legacy-clients.html).
