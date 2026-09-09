# Agent website acceptance checks

The website serves the published package pinned in the lockfile. These checks improve
agent access to that contract; they do not certify general model understanding or
comparative development performance.

## Reproduce the checks

Use Node 24 and run `npm ci`, `npm run check`, then:

```sh
node scripts/check-agent-site.mjs --local --report output/agent-retrieval.json
npx --no-install playwright install chromium
npm run test:browser
```

The HTTP audit starts the real loopback preview on an available port with
`--serve-built`, serving the existing `dist/` from `npm run check` without rebuilding
or watching source files. It reads the
published Markdown and provenance through HTTP, and compares the received bytes to
this checkout's build. It rejects errors, redirects, HTML challenge pages, wrong
content types and stale content. The browser checks exercise real pinned runtime
behavior; consult their named assertions for coverage.

After a separately authorized deployment, audit the public origin against the exact
checkout used to build the deployed artifact:

```sh
node scripts/check-agent-site.mjs --base https://marionettejs.com --report output/public-agent-retrieval.json
```

A failed public read is a failed read from this client. It does not prove every
browser is blocked or identify the CDN rule responsible. Do not change crawler,
DNS, hosting or access settings based only on that failure. A passing local check
cannot establish production headers, search indexing or third-party cache freshness.

## Fresh-agent task probes

Start each probe without prior Marionette conversation history. Give it only the
website origin, task and installed package version. Record model/client, exact site
commit, package/source revision, entrypoint, documents and tools used, output,
verification evidence, failures and repairs. Do not copy the expected answers below
into the task prompt. Use a fresh workspace when execution is part of the probe.

| Task | Evidence to inspect |
| --- | --- |
| Find installation instructions for the published beta | Exact package and source version; no alpha/v4 substitution or implicit dependency upgrade |
| Explain ownership of a screen, list and detail panel | Appropriate View/Region/CollectionView boundaries and destruction semantics |
| Keep a user's draft while another list row changes | Real retained child/input identity, value and focus; no unconditional full rerender |
| Explain how feature startup handles stale asynchronous work | Readiness signal, supersession result and application-owned side-effect guard |
| Diagnose a runtime code | Correct active or retired catalog entry and concrete remediation |
| Fetch a documentation passage through MCP | Real initialize/tool request/response; version and canonical source in result |
| Request an unsupported version through MCP | Explicit failure; no silent substitution with current docs |
| Try a canonical workshop recipe | Actual control interaction and before/after observation; setup alone is not a pass |

Run retrieval probes through both ordinary website reads and the MCP interface.
Browser-only tool registration and client discovery are different checks: executing
a registered handler in a harness does not establish that a particular agent client
can discover experimental WebMCP tools.

Keep deterministic CI checks separate from model trials. A small successful trial
is useful feedback, not an agent benchmark corpus or evidence of superiority to
other frameworks. Store exploratory run evidence outside the published site and
publish only reproducible, appropriately scoped results.

## CI and release boundary

The GitHub Actions workflow runs on pull requests and updates to the default source
branch. It has read-only repository permission, builds locally, runs tests and uploads
validation evidence. It has no deployment step. Manual publication remains separate.
