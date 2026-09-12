# Marionette website — 5.0.0-beta.2

The live site is marionettejs.com; www.marionettejs.com and v5.marionettejs.com
also work. Cloudflare Pages serves one complete artifact.
The apex is canonical; v5 remains a noindexed mirror.

Source lives in `marionettejs/marionettejs.com`. Earlier design commits and checkouts remain
preserved in the old website repository. The local preview still binds to loopback.

## Deployment

Use Cloudflare Pages Direct Upload for an explicitly requested deployment:
1. Run `npm run check`.
2. Upload the contents of `dist/` as the site root, not the repository or a containing folder.
3. Verify the homepage, Why page, docs, agent briefs, and real playground interaction.

Keep deployments manual. The v4 GitHub Pages archive preserves the existing
versioned documentation and download paths. `_redirects` preserves those legacy paths and the published preview URLs
(`/docs/regions/` and `/reference/region.md`); current `/docs/` serves beta documentation. The old root `sw.js` unregisters
retained legacy service workers and clears only their named precache. Keep that
retirement file while returning browsers can retain those registrations.

The public read-only documentation MCP endpoint is `https://mcp.marionettejs.com/mcp`.
See [client setup](mcp/README.md) and the [manual Worker deployment runbook](mcp/DEPLOYMENT.md).
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

Requires Node.js 24 or newer. Browser tests also require Chromium (`npx playwright install chromium`) and the `unzip` command to verify downloaded projects. Run `npm ci` before the first build to install the pinned documentation renderer and search tools.

```sh
npm run dev
```

Open <http://127.0.0.1:4175/>. The server rebuilds and reloads on source changes.
Use `MARIONETTE_PREVIEW_PORT` to select a different explicit port if necessary.

## Prototype pages

- Homepage: dark interactive composition, draft brand assets, candid positioning, and a real Application with a screen View, CollectionView, and detail Region.
- `/why/`: adoption criteria, community/hiring concerns, the AI-slop question, and evidence boundaries.
- `/docs/`: the canonical documentation snapshot, with local search, task navigation, diagnostics, and copyable Markdown.
- `/thanks/`: Patreon support, the merch store, credits and review tools, and maintainer acknowledgements. Future supporter names belong here only after confirmation and permission.
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

`site/vendor/marionette.js` bundles the published `marionette@5.0.0-beta.2`
with matching `@mnjs/radio` and `@mnjs/utils` from package-lock.json. Run
`npm run vendor:build` after an intentional package upgrade. It verifies the
package/docs versions, bundles ESM with esbuild, includes all MIT licenses, and
records the npm integrity and resulting bundle hash in `content/provenance.json`.
The homepage and playground use the same runtime and docs as the beta package.

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

Import documentation from the exact published npm package used by the demos:

```sh
npm run docs:import -- /absolute/path/to/package/dist/docs
npm run check
```

The importer validates source paths, routes, every content hash, and the aggregate
digest before replacing `content/library-docs/`. Commit that generated snapshot
with its manifest after reviewing the source diff. Do not edit imported Markdown.
The manifest records the package version, base source revision, content digest, and
whether the source checkout includes local changes. A local-change snapshot is suitable
for review; publish from a reviewed committed revision. Version alone is not enough
to identify development snapshots that share the same alpha number.

The build renders all pages at manifest routes under `/docs/`, publishes reading Markdown at the same route with `.md` (the index uses `/docs/index.md`),
and preserves canonical source byte for byte under `/docs/markdown/`. Reading
Markdown resolves documentation links to the snapshot and other source links to its
base revision; fenced examples and inline code remain unchanged. Its metadata names
the original source hash, not a hash of the transformed Markdown. The build also
publishes `/docs/llms.txt` and
`/docs/manifest.json`. Diagnostic pages at `/errors/` and their Markdown exports
come from the included catalog. The catalog names `docs.marionettejs.com` diagnostic routes, while runtime errors
still use the legacy versioned URL prefix. Align runtime URLs and diagnostic
hosting in a separate release change; this website serves its diagnostic reference under /errors/.

Marked 18.0.12 renders Markdown with raw HTML escaped and unsafe URL schemes blocked.
Pagefind 1.5.2 indexes generated pages during the build and serves search entirely
from static files. Search begins with consumer docs selected; readers can include
maintainer material with the Audience filter. There are no service
keys, hosted search requests, AI inference calls, or request-based service charges
in this implementation. Hosting providers can still impose free-tier limits.

Publication wording fixes for the reading copies live in
`content/docs-publication-edits.json`. Both HTML and agent Markdown apply these
exact prose edits. Archived package Markdown and its hashes remain unchanged.
Do not silently describe an edited source archive as the released artifact.

The normal build creates one `dist/` artifact containing marketing, documentation,
search, and the workshop. Deploy the complete output to all three active hosts.

Always deploy from this repository and branch with both marketing and documentation present. The old `marionettejs.com` docs worktree is not the deployment source. Preserve the full `dist/` build, including `/thanks/`, documentation, search, agent briefs, and pinned demo assets.

## Packaged sources and website corrections

`content/library-docs/` is the archived npm documentation snapshot. Keep its
manifest and listed files byte-for-byte intact. `content/docs-publication-edits.json`
records corrections applied only to HTML and reading Markdown; diagnostic-code
links in reading copies go directly to the matching error page.

The package omits the JSON schema referenced by its diagnostic catalog.
`content/diagnostics-schema.json` supplies the exact schema from the same release
revision, with its source and hash in `content/diagnostics-schema-provenance.json`.
The build verifies that identity and publishes the schema beside all catalog
copies. Recheck this supplement when importing a newer release.

The published preview URLs `/docs/regions/` and `/reference/region.md` have redirects
because they were shared externally. Retain them while those links remain in use;
remove them only after external references are migrated and access logs show no use.

Documentation imports retain the previous snapshot in `content/library-docs.backup/`
until installation succeeds. A failed install restores it automatically; after
an interrupted process, the next import restores a missing target before reading
new input. If a build is needed first, rename the backup to `content/library-docs/`.

Development and troubleshooting are part of the same published snapshot. Import
all guides together with `npm run docs:import -- /absolute/path/to/marionette/.docs-export`. The browser check executes their
actual failing/corrected snippets against the matching published demo bundle.
The previously shared `/development/` and `/troubleshooting/` URLs redirect to
`/docs/development/` and `/docs/troubleshooting/`. Their old manifest and source
URLs also redirect to the matching canonical snapshot; retain those redirects while
external references use them, and remove only after references migrate and access
logs show no use. These checks do not authorize deploying the site.
