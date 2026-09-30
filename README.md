# Marionette website — candidate documentation integration

The live site is marionettejs.com; www.marionettejs.com and v5.marionettejs.com
also work. Cloudflare Pages serves one complete artifact.
The apex is canonical; v5 remains a noindexed mirror.

Source lives in `marionettejs/marionettejs.com`. Earlier design commits and checkouts remain
preserved in the old website repository. The local preview still binds to loopback.

## Candidate integration

This branch imports rebuilt rc.2 consumer docs with `npm run docs:import -- /path/to/export`.
Its publication metadata identifies local candidate source; `latest` is the exported
routing label and does not assert npm publication. Browser demos and workshops
remain pinned to published rc.1, with separate `/reference/provenance.json`.
Website and MCP retrieval use the same imported corpus and packaged records assets.
Builds do not publish the candidate, the website, or the MCP service.

A complete import replaces the old corpus and its navigation. Preserve matching
snapshot bytes and hashes; remove obsolete publication overlays. Import the
final reviewed clean export, run `npm run check`, and review desktop/narrow docs
before requesting any publication. A main merge deploys both services, so the
candidate release and endpoint/version policy must be decided before merging.

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

Publishing needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
secrets in the `production` environment. The token needs Pages Edit for the
deployment account and Individual Workers
Editor access scoped to `marionette-docs-mcp`. The existing Worker custom domain
is already configured; changing it also requires Workers Routes Edit for the
`marionettejs.com` zone. The Pages project comes from the `CLOUDFLARE_PAGES_PROJECT`
repository variable and defaults to `marionette-v5`.

`scripts/check-deployment.mjs ORIGIN --health-only` reads the live site and reports what does not
pass health checks: page version strings, provenance, sitemap `lastmod`, the
headers that keep a validator on published pages, and the exact bytes of both
vendor bundles. Run it locally, or through the "Deployed site check" workflow,
which also runs daily. Still verify the homepage, Why page, docs, agent briefs
and a real playground interaction by hand after a release.

The v4 GitHub Pages archive preserves the existing
versioned documentation and download paths. `_redirects` preserves those legacy paths and the published preview URLs
(`/docs/regions/` and `/reference/region.md`); current `/docs/` serves release-candidate documentation. The old root `sw.js` unregisters
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

`site/vendor/marionette.js` bundles the published `marionette@5.0.0-rc.1`
with matching `@mnjs/radio` and `@mnjs/utils` from package-lock.json. Run
`npm run vendor:build` after an intentional package upgrade. It verifies the
package/docs versions, bundles ESM with esbuild, includes all MIT licenses, and
records the npm integrity and resulting bundle hash in `content/provenance.json`.
The homepage and playground retain that published runtime. Imported candidate documentation has its own manifest and publication status.

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
reading-copy changes separately. This integration has no editorial overlay. Website
and MCP builds use the same corpus hashes and source identity. Their included records
example comes from the same packaged source assets; the browser workshop retains
its separate published runtime and does not establish candidate behavior.

Published documentation labels require a clean snapshot matching the installed npm
archive, including its revision, content digest and locked registry integrity. The
current rc.1 workshop pin therefore prevents marking rc.2 docs as published. To
remove this gate after an authorized rc.2 release, update the exact core/data
package pins, lockfile and the version guard in `scripts/build-vendor.mjs`,
rebuild both vendor bundles and their provenance, import
the matching published documentation archive, and pass the workshop, docs and MCP
checks before changing publication status. Remove the rc.1 manifest-layout choice
in `scripts/published-docs.mjs` when that workshop upgrade is complete.

For rc.2, perform the registry upgrade as one reviewed change after publication:

```sh
npm install --save-dev --save-exact marionette@5.0.0-rc.2 @mnjs/data@5.0.0-rc.2
npm ls marionette @mnjs/data @mnjs/radio @mnjs/utils
```

Require all four installed versions to match. Switch the vendor builder to the
root `docs-manifest.json`, require the exact rc.2 version and clean source, and
remove its rc.1 layout and version assertion. Update the workshop brief, runtime,
recipes, export assertions and README/AGENTS pins from the installed artifact's
version and source revision. Rebuild with `npm run vendor:build` and
`npm run vendor:demos`; verify both resulting hashes and license bundles.

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
