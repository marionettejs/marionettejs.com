# Marionette documentation MCP

A local, read-only stdio server for the website's generated documentation corpus
and executable workshop recipes. It uses the official MCP TypeScript SDK's
maintained v2 server and client packages, pinned in the website lockfile.

## Install from this repository

Use Node.js 24 or newer. Clone and review the website source, then install its
locked dependencies and build the same corpus the website serves:

```sh
git clone https://github.com/marionettejs/website.git
cd website
npm ci
npm run build
node mcp/server.mjs
```

The final command waits for an MCP client on stdin; silence is expected. It is
not an interactive shell. This repository does not publish an npm MCP package
or operate a hosted MCP endpoint.

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
   then parse the resulting JSON for code, CSS, related docs, and expected
   checks. Load that recipe in the workshop to run and inspect its behavior.

For this snapshot, a search call is:

```json
{"query":"Region", "version":"5.0.0-beta.1", "limit":5}
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

The trust boundary is the local checkout and its installed dependencies: review
them as you would any executable developer tool. This server does not accept
untrusted external corpora or read an application's source code or credentials.

`test/mcp.test.mjs` uses the official SDK client against a subprocess to verify
initialization, discovery, search pagination, full chunk reconstruction, recipe
identity, explicit version rejection, invalid input and path rejection, unknown
resources, and clean client/EOF shutdown. It is included in `npm run check`.
The tests also reject stale provenance and modified Markdown before startup.

SDK reference: [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
and [v2 documentation](https://ts.sdk.modelcontextprotocol.io/v2/).
