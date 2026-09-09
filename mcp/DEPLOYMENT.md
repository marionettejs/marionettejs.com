# Manual documentation MCP deployment

Source: `marionettejs/marionettejs.com`. Worker: `marionette-docs-mcp`.
Endpoint: `https://mcp.marionettejs.com/mcp`.
Pages project: `marionette-v5`, production branch `main`.

## Architecture and Free limits

`load.mjs` verifies the generated corpus, individual Markdown hashes, publication
edits, and recipe runtime against the pinned manifest. It prepares the lexical
index and recipe hashes once. `tools.mjs` registers the shared tools and catalog.
`server.mjs` serves stdio; `worker.mjs` uses `createMcpHandler` from
`agents/mcp/server` with a fresh server per HTTP request. `npm run build` creates
the same website and verified Worker snapshot. No runtime filesystem, outbound
fetch, AI, database, Durable Object, persistent session, or secret binding exists.

Cloudflare's stateless adapter also accepts the 2025 initialization protocol,
which the official SDK client uses by default. Keep it while supported clients
need it. It is not a persistent session transport. The 2026-07-28 protocol is
verified separately. No npm artifact is published by this repository.

The account must remain on Workers Free: 100,000 requests/day (account-wide),
10 ms CPU/request, 128 MB memory. Do not upgrade, add paid bindings, or rely on
occasional CPU-limit flexibility. Request bodies are capped at 16 KiB; search
queries at 200 characters, search results at 10, snippets at 600 characters,
and document/example chunks at 12,000 UTF-16 characters. Pagination preserves
complete content. There is no per-user quota or guaranteed availability. Native
MCP clients need no authentication; browser Origins are explicitly restricted.

## Prepare, review, then deploy

Use Node 24 and the lockfile. Follow the normal feature-branch PR and required
`verify` check. Never push directly to main or bypass protections. Do not add
hosting jobs to CI.

```sh
npm ci
npm run check
node scripts/check-agent-site.mjs --local --report output/agent-retrieval.json
npm run test:browser
node scripts/benchmark-mcp.mjs
npx --no-install wrangler deploy --dry-run --outdir output/worker
```

The CPU benchmark measures Node thread CPU for the SDK request handler, including
server creation, search, and serialization. It excludes imports and snapshot
preparation. It is a preflight estimate, not Workers billing/limit telemetry.
Record local hardware/runtime and results. `node scripts/sample-mcp.mjs <endpoint>`
generates a bounded 240-request search-only window for those metrics. Check deployed CPU percentiles and
errors in Cloudflare Workers Metrics after a bounded search-only sample.

Confirm the active account with `wrangler whoami`, Workers Free in the dashboard,
and the previous Pages deployment ID. Wrangler may warn that the authorization
omits unrelated services; do not grant those scopes simply to silence the warning.
Store deployment credentials outside the repository. The runtime requires none.

After the reviewed PR merges, build and test the merged source, retain artifact
hashes, and manually run:

```sh
npm run mcp:deploy
node scripts/verify-mcp.mjs https://mcp.marionettejs.com/mcp
npx --no-install wrangler pages deploy dist --project-name marionette-v5 --branch main
node scripts/check-agent-site.mjs --base https://marionettejs.com --report output/agent-live.json
```

Wrangler's custom domain configuration creates the MCP subdomain and certificate.
It does not alter the apex website. The Pages upload must contain the complete
`dist/` artifact. Check the live rendered MCP guide, agent guide, skill setup,
canonical hostname, immutable package Markdown, and actual workshop interaction.
Compare public corpus and tool provenance with the tested artifact. Record the
Worker version ID, Pages deployment ID, source commit, hashes, CPU metrics, and
any verification gaps. Do not claim that local checks establish edge CPU cost.

## Rollback

For an existing Worker version, record its ID before deploying. Roll back only
to a known tested version using `wrangler rollback <version-id>`. For the initial
launch there is no prior Worker version; disable its custom-domain route if the
endpoint must be withdrawn, and retain the source/evidence for diagnosis.

For Pages, use the dashboard rollback to the previously recorded production
deployment. Before this work, that deployment was
`30210f62-ced2-4189-ba6c-9488d92eee43`. Confirm it is still the immediate prior
production version at deployment time. There are no data migrations or sessions
to roll back. Never roll the library package or npm dist-tags as part of this task.

References checked September 9, 2026:
- https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://ts.sdk.modelcontextprotocol.io/v2/serving/web-standard.html
- https://ts.sdk.modelcontextprotocol.io/v2/serving/legacy-clients.html

The Miniflare-only `sharp` override pins 0.35.4 for GHSA-rgj7-g3m4-5g8c.
Remove the override once Wrangler/Miniflare pins a patched version upstream.
It is local development tooling and is not included in the deployed Worker.
