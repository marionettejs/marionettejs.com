# Marionette website — v5 documentation integration

The live site is marionettejs.com; www.marionettejs.com and v5.marionettejs.com
also work. Cloudflare Pages serves one complete artifact.
The apex is canonical; v5 remains a noindexed mirror.

Source lives in `marionettejs/marionettejs.com`. Earlier design commits and checkouts remain
preserved in the old website repository. The local preview still binds to loopback.

## Stable 5.0.0 transition

This branch imports published **5.0.0** from source
`0f2284ad4bbfe8c82ce82714471697a68c2acaeb`. The [publication run](https://github.com/marionettejs/marionette/actions/runs/38034055064)
promoted [certification 38032320468](https://github.com/marionettejs/marionette/actions/runs/38032320468);
the [stable release](https://github.com/marionettejs/marionette/releases/tag/v5.0.0)
contains the matching archives and evidence. The four runtime registry integrities
and staged documentation manifest match those certified published bytes.
The documentation content digest is
`44c0d535fd36d11f31d909246f4ee7c6592eae3f25fb7513c61af65842593a90`.

Use this procedure for the stable import and its review. Merging to main deploys
both site and MCP and still requires separate approval.

1. Obtain the release owner's final published source revision and registry readback
   for all five packages (core, data, radio, utils and adapters), along with the
   certification artifact identity. The release owner verifies adapters separately;
   the website staging script checks only core, data, radio and utils.
   A successful unpublished build is insufficient.
2. With Node 24, run the exact stable install command in the publication section
   below, then `npm ci`. Review the four runtime lock entries, including transitive
   radio/utils. Never hand-author registry URLs, integrity values or archive hashes.
3. Run `npm run docs:stage-stable -- <certified-40-character-source-revision>`.
   This downloads the four exact locked registry archives, verifies their SHA-512
   integrities, and compares every installed file with the archive bytes (including
   runtime code and docs). It rejects linked, modified, missing or extra files;
   neither package metadata nor the hidden npm lockfile is proof of installed bytes.
   Registry access and `tar` are required for staging and `vendor:build`;
   `vendor:demos` also needs registry access or a warm npm cache for its fresh install.
   `vendor:demos` verifies the core bundle hash and uses a fresh script-free `npm ci`
   for data; ordinary tests use local metadata and fixture archives without registry reads.
   It requires 5.0.0 and the certified revision, then verifies every documentation/asset hash.
   It exports package bytes plus generated archive evidence to `output/stable-docs`;
   the evidence file is `output/stable-docs/stable-docs-evidence.json`. Docs and evidence appear together
   only after every write succeeds. It refuses an existing export directory. Failed
   runs can be retried; an abruptly terminated run may leave an unused `.stable-docs-*`
   sibling in `output/`, which can be removed once that process has stopped.
   Compare its digest and revision with the release owner's published artifact evidence.
4. Run `npm run docs:import -- output/stable-docs`. Reconcile **every** reading-copy
   overlay in `content/docs-publication-edits.json` against the new archive. Remove
   changes already in the archive and obsolete RC2 limitations; retain only reviewed
   editorial changes with correct before/after hashes and source identity. Set its
   packageVersion to `5.0.0` and status to `stable release (published on npm)` only
   with that evidence. Review title edits, navigation and supplemental guides too;
   remove a supplemental copy when the package now supplies the same guide.
   Never edit archive bytes.
5. Run `npm run vendor:build`, then `npm run vendor:demos`, then `npm run check`.
   Commit the actual lockfile, archive, declaration, bundles, licenses, provenance
   and generated workshop changes together. Setup instructions derive their exact
   version/revision from that provenance. MCP and discovery outputs derive theirs
   from the imported publication. Do not replace historical case-study versions,
   benchmark evidence, original prompts or the v4 archive.
6. Run `node scripts/check-agent-site.mjs --local --report output/agent-retrieval.json`
   and the full browser checks in `.github/workflows/check.yml`. The sync validator
   is for an overlay-only sync PR; this transition instead runs the archive, corpus,
   import, sync and MCP tests through `npm run check`. Inspect desktop/narrow documentation,
   homepage title/social metadata, install links, agent setup, llms output and MCP
   catalog/lookup. Current instructions must no longer call stable a candidate;
   immutable historical RC2 evidence and generic candidate tests remain valid.
7. Retain the staged archive URLs/integrities, source revision and content digest
   under `releaseEvidence` in `content/docs-publication-edits.json`, with the
   certification/publication run links and separate adapter readback. This structured
   evidence is committed and served at `/docs/publication.json`. Update this status
   and the PR with the verification results.
   Obtain separate merge/deployment approval. This preparation does not authorize
   package publication, a site deployment, or changes to credentials/settings.

Reading-copy PR #73 (`automation/library-docs-sync`, reviewed head `5a2ed828`)
was merged into main at `46c3402` and integrated into this branch. Its four
changes are supplied by the stable archive:
package identity guidance in `docs/agents.md` and `docs/readme.md`, explicit child
startup cancellation in `docs/api/application.md`, and Backbone reorder guidance
in `docs/packages/adapters.md`. The latter limitation still applies in stable;
its guidance is retained in the package, not duplicated in a website overlay.
The old navigation warning is stale; stable supplies the framework-migration guide
and navigation directly. Of the 23 previous reading overlays, only the website's
shorter architecture heading remains. Four later reading edits clarify the View
lifecycle diagram, exclusive child-start coordination, data persistence scope,
and client installation verification without changing the archived package.
The duplicate supplemental migration guide is now replaced by its exact packaged
copy and is available through MCP too.
Do not reintroduce stale RC2 overlays after stable import. Historical RC2
evidence remains in Git and case-study assets.

## Versioned integration

This integration uses the exact published package pinned in `package-lock.json`
across documentation, browser demos and workshops. Import consumer docs with `npm run docs:import -- /path/to/export`.
Website and MCP retrieval use the same imported corpus and packaged records assets.
Runtime version and revision come from the installed package's vendor provenance;
`/docs/manifest.json` identifies the documentation snapshot. Builds do not publish
the package, website, or MCP service.

A complete import replaces the corpus and its navigation. Preserve matching
snapshot bytes and hashes; import the reviewed clean released source and verify it
against the installed registry archive before setting published metadata. Run
`npm run check` and review desktop/narrow docs. A main merge deploys both services.

## Deployment

Merging to `main` publishes the site and documentation MCP.
`.github/workflows/deploy.yml` runs
`npm run check`, uploads `dist/` to Cloudflare Pages as the site root, and then
verifies the live origin with `scripts/check-deployment.mjs ORIGIN --revision SHA`.
The website commit is embedded in each generated page and must match the
published commit on every checked route; the sitemap must also match the built
artifact. Manual dispatch is restricted to `main`. A deployment that does not
serve this revision fails the run. The workflow then publishes the Worker from
the same checkout and compares its live tools, corpus, documents, and examples
with the local build using `scripts/verify-mcp.mjs ENDPOINT --revision SHA`.
The Worker response revision must match the deployed commit. A failed Worker deployment
or parity check fails the run; rerun the workflow after correcting the cause.
The two service uploads are sequential, not atomic.

### Context7 distribution and feedback

After a successful site and MCP deployment, a change to the documentation manifest
or publication metadata calls `.github/workflows/context7.yml` to request a refresh
of `/marionettejs/marionette`. Manual deployment also requests a refresh. Marketing
changes do not. Context7 failures fail the separate job after deployment; correct
the cause and use the Context7 workflow's manual refresh rather than redeploying.

Set `CONTEXT7_API_KEY` in the `production` environment from the Context7 teamspace
that owns the library. The key is used only by trusted `main` workflows. The library
repository's `context7.json` owns indexing configuration; its `previousVersions`
list declares supported immutable tags. Add the new release tag there as part of
release preparation. Website CI refreshes the library's configured branch, and
Context7 processes the declared versions. Refresh acceptance means queued work;
verify the tag's completed indexing in the owner dashboard.

The same workflow collects measurements weekly and on manual dispatch. It saves
`context7-evidence` artifacts for 90 days: expected docs identity, reported index
state/date, token and snippet counts, benchmark score (null when unavailable),
available versions, 30-day usage and lifetime topic counts. It makes two read calls,
plus one request on refresh runs; it does not launch a separate paid evaluation.
Configuration failures are reported in the job log before a snapshot is collected.
The API does not attest source revision parity. Check returned snippets against
the expected release before treating a snapshot as evidence about those docs.

Use the [owner dashboard](https://context7.com/marionettejs/marionette/admin) to
review Benchmark suggestions and question-level results when available. For each
candidate improvement, check whether the question is a real supported task and
whether the failure came from the docs, indexing, retrieval or grading. Correct
the relevant guide or reference, then compare with a saved snapshot. Keep questions
and versions consistent where possible; avoid adding prose just to improve a score.
Trust scores reflect source reputation, usage reflects reach, and benchmark scores
judge documentation answers. None establishes application correctness or agent
time/token efficiency; use our consumer checks and controlled tasks for those.

Context7's automatic refresh is usage-triggered with popularity-based thresholds,
not a release webhook. See its [refresh policy](https://context7.com/docs/library-updates),
[Actions integration](https://context7.com/docs/integrations/github-actions),
and [current feedback pipeline](https://upstash.com/blog/context7-research).
The old owner-run benchmarks were [deprecated by Context7](https://github.com/upstash/context7/issues/2760#issuecomment-4706452541).
There is currently no documented public benchmark trigger. The API may return zero
while the dashboard says no benchmark data; this is not a measured failure score.

Documentation HTML also embeds the optional Context7 chat widget with Marionette's
red, a bottom-right position and a short branded welcome. It uses the public library
ID, never the CI API key. Enable it in the owner dashboard's Chat tab and allow
`marionettejs.com` and the public aliases where it should work. Its current script
sends chat messages to Context7 when visitors submit them; the welcome states this.
The configured library follows the indexed default branch. Check answers against
the docs version shown on the page, especially before a new release is published.
Ordinary docs, Markdown and search work without the widget. The documentation
browser suite checks this by blocking its script; verify the actual widget on the
allowed deployed domain after merging. Chat billing is not specified in the widget
guide; do not infer it from API or private-parsing prices.

All HTML pages include the deferred Docs7 analytics script for connected site
`b83657b2-fde7-4916-a683-2d3ba41f185b`. This is a public site identifier, not an API
key. Analytics appears in that site's Docs7 dashboard after deployment; embedding
the script alone does not establish that visits have been recorded.

PostHog EU is configured on its capped Free plan through the free managed proxy. Standard page views, sessions, navigation duration, public control clicks, named product events and public-page replay use anonymous SDK identifiers. See [the event and setup plan](planning/analytics.md). The `/privacy/` page explains collection and offers an opt-out; this control is separate from Context7 and Cloudflare services.

Publishing needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
secrets in the `production` environment. The token needs Pages Edit for the
deployment account and Individual Workers
Editor access scoped to `marionette-docs-mcp`. The existing Worker custom domain
is already configured; changing it also requires Workers Routes Edit for the
`marionettejs.com` zone. The Pages project comes from the `CLOUDFLARE_PAGES_PROJECT`
repository variable and defaults to `marionette-v5`.

`scripts/check-deployment.mjs ORIGIN --health-only` reads the live site and reports what does not
pass health checks: page version strings, provenance, canonical sitemap URLs and
any recorded page modification dates, the
headers that keep a validator on published pages, and the exact bytes of both
vendor bundles. Run it locally, or through the "Deployed site check" workflow,
which also runs daily. Still verify the homepage, Why page, docs, agent briefs
and a real playground interaction by hand after a release.

The v4 GitHub Pages archive preserves the existing
versioned documentation and download paths. `_redirects` preserves those legacy paths and the published preview URLs
(`/docs/regions/` and `/reference/region.md`); current `/docs/` serves the imported package documentation. The old root `sw.js` unregisters
retained legacy service workers and clears only their named precache. Keep that
retirement file while returning browsers can retain those registrations.

The public read-only documentation MCP endpoint is `https://mcp.marionettejs.com/mcp`.
See [client setup](mcp/README.md) and the [Worker deployment runbook](mcp/DEPLOYMENT.md).
The Worker and local stdio process share the same verified corpus and tools.

## Search and sharing metadata

Stylesheets, the JavaScript entry point, and its directly loaded modules use content
versions in their URLs so returning visitors receive changed code and styles.

The built HTML contains descriptive page titles, descriptions, canonical URLs,
Open Graph tags, and large-image social cards without requiring JavaScript.
The canonical origin is `siteOrigin` in `scripts/build.mjs`.

The main site is indexable and publishes `/sitemap.xml`. All hosts use canonical
URLs on https://marionettejs.com. Host-specific headers keep v5 and the default
Pages domain noindexed while still allowing agents and social crawlers to read.

The editable share-card artwork is `content/social-card.svg`; the published
1200 × 630 export is `site/assets/marionette-social.png`. Export with an SVG
renderer when editing the artwork; normal builds only copy the committed PNG.
Social services may cache old previews after deployment.

## View locally

Requires Node.js 24 or newer. With nvm, run `nvm use` before installation. Browser tests also require Chromium (`npx playwright install chromium`) and the `unzip` command to verify downloaded projects. Run `npm ci` before the first build to install the pinned documentation renderer and search tools.

```sh
npm run dev
```

Open <http://127.0.0.1:4175/>. The server rebuilds and reloads on source changes.
Use `MARIONETTE_PREVIEW_PORT` to select a different explicit port if necessary.

## Prototype pages

- Homepage: dark interactive composition, draft brand assets, candid positioning, and a real Application with a screen View, CollectionView, and detail Region.
- `/why/`: adoption criteria, community/hiring concerns, the AI-slop question, and evidence boundaries.
- `/docs/`: the canonical documentation snapshot, with local search, task navigation, diagnostics, and copyable Markdown.
- `/thanks/`: GitHub Sponsors support, the merch store, credits and review tools, and maintainer acknowledgements. Future supporter names belong here only after confirmation and permission.
- `/llms.txt`: a compact task-oriented entry point with explicit version/status.
- `/agent-prompt.md`: optional visible-browser workshop brief with completion criteria.
- `/#playground`: theatrical reveal, editable JS/CSS, agent build notes, and actual app preview.
- Optional WebMCP tools operate the same demo where `document.modelContext` is supported.

Canonical documentation is authored in the library repository and imported here as
a verified snapshot. This website renders that full snapshot alongside marketing;
do not maintain a second handwritten reference.

## Agent workshop

The invitation copies the current site address. Agents can discover the brief and
use `window.MarionettePlayground.open/update/run/inspect/interact/close`, matching
WebMCP tools, or the visible editor. Open does not run code. Updates show public
build notes and can change the draft before running. Notes describe useful choices
and observed results, including a candid impression of the library.

Default scope: one small app, a few notes, one interaction test, and at most two
repair attempts. Source is omitted from repeated tool responses unless requested.
There is no automatic local-project fallback. The user must be able to see the
browser; otherwise the agent explains the missing capability and stops execution.
Only an explicit Download app click writes a standalone HTML file. Drafts stay in
this tab until reload. The export includes the pinned runtime and MIT license and
needs no installation or server.

After the first successful app run, a Next steps section appears below the editor
and preview and stays available while editing. “View on CodePen” sends the current
draft and pinned runtime/license to CodePen’s prefill editor on an explicit click. Save there to obtain an app link; free Pens
are public. “Share this experience” shares the public workshop URL only, with no app
source, title, or build notes.

This uses an opaque-origin iframe and restrictive CSP, not a hardened hostile-code
execution service. Script-initiated self-navigation and CPU exhaustion need stronger
controls before public use. See `planning/agent-discovered-playground.md` for the
reassessment and remaining gates.

## Source and assets

`content/pages.mjs` contains the page copy and templates. `site/assets/` contains
CSS, the live example, and copied draft brand SVGs. `scripts/build.mjs` produces
static files in ignored `dist/`. `scripts/dev.mjs` serves only that output.

`site/vendor/marionette.js` bundles the exact published `marionette` version
with matching `@mnjs/radio` and `@mnjs/utils` from package-lock.json. Run
`npm run vendor:build` after an intentional package upgrade. It verifies the
package/docs versions, bundles ESM with esbuild, includes all MIT licenses, and
records the npm integrity and resulting bundle hash in `content/provenance.json`.
The homepage and playground use that runtime. Imported documentation must match
its package version and source revision before publication.

## Launch copy

Public-facing copy is written for the intended completed Marionette 5.0 launch,
as requested by Paul. This is an editorial assumption, not a release action.
Preserve the actual pinned runtime/version in provenance.
Do not invent benchmark numbers, migration results, or adoption claims.

## In-page workshop instructions

The invitation opens the workshop directly. Its Agent instructions disclosure
contains the same compiled brief served at `/agent-prompt.md`, including the exact
executable starter. Browser-only agents can read it without navigating away. The
copied invitation asks agents to open the workshop and read the instructions there;
the brief defines the personal app outcome, runtime contracts, and relevant checks.

## Project-fit review

The adoption page offers a copyable prompt for the visitor’s own agent. Detailed
objections and evidence limits live in `/adoption-review.md`, linked from page
metadata, `/llms.txt`, and the copied prompt. They are generated from
`content/adoption.mjs` and kept out of the human page’s reading flow. The review
covers both new projects and existing applications; it does not launch the playground or
authorize installation or migration.

## Motion behavior

`motion.js` updates decorative parallax on scroll/pointer events through a single
queued animation frame. It does not run a continuous JavaScript animation loop.
The hero runs an Application with a screen View, list CollectionView, and detail
View. Selecting work replaces only the detail; the screen and list retain their
identities. A static SVG thread connects the hero to the agent invitation on desktop,
with its path recalculated only when the layout changes.
The invitation star swings gently toward a nearby mouse pointer around its fixed
string attachment, then settles back on exit. It uses CSS transitions and the same
queued frame, with no idle loop, and respects both motion preferences.

The separate lifecycle illustration has
manual Show/Replace/Empty controls and an optional, finite playback sequence.
Scrolling never changes the selected stage. The matching code updates with it.

Playback stops on manual selection, Stop, Reduce motion, reduced-motion preference,
navigation, or hiding the page. Reduce motion also disables decorative parallax and
transitions. Its Reduce motion / Restore motion preference lives in the footer.
Reduced motion leaves the manual stage controls available. All screen
sizes use normal page flow. Without JavaScript, the reading content and initial
diagram remain visible, and inactive controls are disabled.

## Validation

```sh
npm run check
```

Checks build output, local links/fragments/assets, script imports, and pinned-source
integrity, input limits, safe runner serialization, and standalone export contents. Also validate the live demo in a browser: show notes, replace with tasks,
empty, show again, and inspect lifecycle events. Confirm destruction counts and that
the empty control disables when appropriate. Check mobile layout, keyboard access,
and readable pages without JavaScript. Source checks alone do not prove those flows.

Run the automated workshop browser regressions from a fresh checkout with:

```sh
npm ci
npm run build
npx playwright install chromium
npm run test:browser
```

`test:browser` serves the existing `dist/` on an ephemeral loopback port, so rebuild
it after source changes. On Linux CI use `npx playwright install --with-deps chromium`.
It runs pinned Chromium with experimental web-platform features for native WebMCP,
fails on behavioral assertions, and writes a screenshot to `output/playwright/`.
The browser command is separate from the Node checks; it needs Chromium installed.

For the ownership regression, after building and starting the preview, run:

```sh
node test/browser/playground-ownership.mjs
```

Open the printed local URL, click **Run ownership checks**, and verify
`18 BROWSER CHECKS PASSED`. This uses the real
pinned library in the sandbox to exercise independent state, a nested control click,
template data, replacement, and destruction. It is a browser check, not part of the
Node-only test command. The build generates the agent brief's code example from the
executable starter; a source test prevents the two from drifting.

## Documentation source

Import the complete reviewed consumer export from the corresponding library
revision. For a published release, compare it with that package's bundled manifest;
for a candidate, retain its actual revision, dirty flag and local-source publication
status. Never infer publication from the exported `latest` routing label.

```sh
npm run docs:import -- /absolute/path/to/library/.docs-export
npm run check
node test/browser/docs-candidate.mjs
```

The importer checks bounded paths, symlink containment, unique routes, every source
hash and the aggregate digest before replacing `content/library-docs/`. Review the
manifest diff and do not edit imported files. Candidate imports replace the prior
corpus, navigation and diagnostic assets together. Original bytes remain available
under `/docs/markdown/` and `/docs/source/`; HTML and reading Markdown resolve links
within the imported snapshot. Code remains intact. Diagnostic schemas are hashed
assets from the same export, rather than an independently maintained supplement.

`content/docs-publication-edits.json` records publication status and any reviewed
reading-copy changes separately. Website and MCP builds use the same corpus hashes
and source identity. Their included records example comes from the same packaged
source assets. The browser workshop identifies its exact runtime independently.

Published documentation labels require a clean snapshot matching the installed npm
archive, including its revision, content digest and locked registry integrity.
After an authorized release, upgrade the exact core/data pins together:

```sh
npm install --save-dev --save-exact marionette@5.0.0 @mnjs/data@5.0.0
npm ls marionette @mnjs/data @mnjs/radio @mnjs/utils
```

Require all four installed versions to match. The vendor builder reads the package's
root `docs-manifest.json` and requires clean source, matching exact pins and registry
archive URLs/integrities for core, data, radio and utils. Rebuild with
`npm run vendor:build` and `npm run vendor:demos`; verify both resulting hashes and
license bundles. `npm run build` derives the workshop brief, runtime, recipes and
export identity from the resulting provenance, including the released source revision.

Compare every imported page and supporting asset with the installed registry
archive before setting published metadata. Run `npm run check`,
`npm run test:docs:browser`, `npm run test:browser` and
`node test/browser/personal-preview.mjs`, plus the deployment runbook's HTTP MCP
verification. A local candidate import may be checked before publication, with
its candidate status retained. Final deployment must use the matching registry
runtime and verified publication metadata.


Marked escapes raw HTML and blocks unsafe URL schemes. Pagefind builds a static
search index. The browser check covers every imported page at desktop and narrow
widths and checks rendered search. It does not run all instructional examples or
measure reader effectiveness; those are library/consumer verification boundaries.

Imports stage a replacement and retain the previous directory until installation
succeeds. Failed installation restores it; the next import recovers an interrupted
replacement before checking new input. Build and review the complete `dist/`
artifact before requesting publication. Main merges deploy both website and MCP,
so package release policy, public endpoint version and source reachability need
agreement before merging this candidate integration.

The existing v0-v4 archive URLs remain supported for those consumers. Previously
shared `/docs/regions/` and `/reference/region.md` links resolve to the new modular
Region reference. Their compatibility reason is external links; remove them when
those references migrate and access logs establish they are unused.

## Library documentation sync

[`scripts/docs-sync/README.md`](scripts/docs-sync/README.md) describes the bounded
reading-copy sync and reviewed PR path. It preserves the imported archive and
rejects navigation changes. Changes to the canonical corpus require an explicit
complete snapshot import and website review. Neither import nor build authorizes
publication.

## Case studies

`/case-studies/` lists studies from `content/case-studies.mjs`. Each article supplies
metadata, a conclusion, sections, disclosures, and methodology to the shared static
article layout. Add a study to that list to generate its route and index card.

The first article, `/case-studies/realworld/`, uses only the final five-app run at
`00dc2c8e469f3d62470b1a63a66ff9892eb3fdff`. Its compact metric data records that pin;
permanent links point to the raw evidence. Development prompts are transcribed from
the original chat, separately from repository evidence. The supplied brief is kept
verbatim in `content/case-studies/realworld-brief.txt` and displayed in a native,
closed-by-default disclosure. The rebalanced 1800 × 960 editorial illustration serves
as both hero and social image at its full aspect ratio; no crop or padding is needed.
Copied screenshots retain their source dimensions and link to their original captures.
Social metadata uses the canonical public paths; the loopback preview sends a noindex header.

The second article, `/case-studies/roundingwell/`, describes the migration through
RC2 and is drafted for publication after that application change merges. Its historical
beta.6 benchmark table reads the preserved CSV in
`site/assets/case-studies/roundingwell/evidence/`; that directory includes raw
samples, source pins, file hashes, and methodology. The worklist capture uses
synthetic data. The 1729 × 910 hero pairs the existing RoundingWell and Marionette
vector logos in blue and red panels. Its editable source is
`site/assets/case-studies/roundingwell/brand-panels.svg`; the PNG export is shared
by the article and social metadata without cropping.


## News publication

The feature branch and pull request are the staging mechanism. News articles have
no draft flag: the normal build includes them in the feed, sitemap, and public
article metadata. They become public when the PR is merged and the deployment
workflow publishes that commit. A branch build does not authorize that merge.
The loopback preview independently sends `X-Robots-Tag: noindex, nofollow` for all
responses; the production 404 also remains noindexed.

Article dates are editorial publication dates. RoundingWell intentionally uses
October 6, 2026, separately from its Git merge and deployment timestamps.
The launch hero's lossless WebP derivative is used in-page; the original PNG is
preserved for source and social previews, with unchanged artwork and dimensions.
