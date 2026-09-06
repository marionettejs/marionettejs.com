# Marionette v5 website — public test preview

The public test preview at `v5.marionettejs.com` was authorized on 2026-09-06.
The main website remains on the old GitHub Pages site. A preview deployment does
not authorize a main-domain launch or automatic deployment on repository pushes.

Source lives in `marionettejs/website`. Earlier design commits and checkouts remain
preserved in the old website repository. The local preview still binds to loopback.

## Preview deployment

Use Cloudflare Pages Direct Upload for an explicitly requested deployment:
1. Run `npm run check`.
2. Upload the contents of `dist/` as the site root, not the repository or a containing folder.
3. Verify the homepage, Why page, docs, agent briefs, and real playground interaction.

The preview stays noindexed. No GitHub Actions workflow, automatic Git integration,
backend, or paid service is required. Future automation can deploy the same built
assets explicitly if requested. Direct Upload projects cannot be converted to the
built-in Git integration; that would require a separate Pages project.

At main-site launch, coordinate the domain assignment, DNS, HTTPS, and older docs
paths. Preserve the existing website as the rollback source. That cutover requires
separate authorization.

## Search and sharing metadata

The built HTML contains descriptive page titles, descriptions, canonical URLs,
Open Graph tags, and large-image social cards without requiring JavaScript.
The canonical origin is `siteOrigin` in `scripts/build.mjs`.

The preview allows crawling so link previews and agents can read the site.
HTML robots metadata and Cloudflare's `_headers` retain `noindex, nofollow`;
allowing crawling also lets search engines see that instruction. This preview
is not intended to rank in search. At an authorized main-site launch, update
`siteOrigin`, indexing directives, and add a sitemap for the final public routes.

The editable share-card artwork is `content/social-card.svg`; the published
1200 × 630 export is `site/assets/marionette-social.png`. Export with an SVG
renderer when editing the artwork; normal builds only copy the committed PNG.
Social services may cache old previews after deployment.

## View locally

Requires Node.js 24 or newer. There are no package dependencies to install.

```sh
npm run dev
```

Open <http://127.0.0.1:4175/>. The server rebuilds and reloads on source changes.
Use `MARIONETTE_PREVIEW_PORT` to select a different explicit port if necessary.

## Compare the design options

- **Option C / After Hours:** this checkout, <http://127.0.0.1:4175/>.
- **Option A / Poster:** saved at `bbc136fa`, checkout `../marionettejs-website-poster`,
  <http://127.0.0.1:4176/>. Start with `MARIONETTE_PREVIEW_PORT=4176 npm run dev`.
- **Option B / Theatre:** saved at `18f6dfc8`, checkout `../marionettejs-website-theatre`,
  <http://127.0.0.1:4177/>. Start with `MARIONETTE_PREVIEW_PORT=4177 npm run dev`.

Both earlier options remain intact in separate checkouts. Options A and B remain local.
C explores a dark palette, bold typography, scrolling parallax, and interactive
lifecycle diagrams. See `planning/design-directions.md` for comparison criteria.

## Prototype pages

- Homepage: dark interactive composition, draft brand assets, candid positioning, and a real Application with a screen View, CollectionView, and detail Region.
- `/why/`: adoption criteria, community/hiring concerns, the AI-slop question, and evidence boundaries.
- `/docs/regions/`: a focused guide with source links and a matching Markdown reference.
- `/llms.txt`: a compact task-oriented entry point with explicit version/status.
- `/agent-prompt.md`: optional visible-browser workshop brief with explicit effort limits.
- `/#playground`: theatrical reveal, editable JS/CSS, agent build notes, and actual app preview.
- Optional WebMCP tools operate the same demo where `document.modelContext` is supported.

The full documentation site remains owned by the library repository. The local docs
page is a representative design/learning slice, not a second complete reference site.

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

This uses an opaque-origin iframe and restrictive CSP, not a hardened hostile-code
execution service. Script-initiated self-navigation and CPU exhaustion need stronger
controls before public use. See `planning/agent-discovered-playground.md` for the
reassessment and remaining gates.

## Source and assets

`content/pages.mjs` contains the page copy and templates. `site/assets/` contains
CSS, the live example, and copied draft brand SVGs. `scripts/build.mjs` produces
static files in ignored `dist/`. `scripts/dev.mjs` serves only that output.

`site/vendor/marionette.js` is a plain ESM bundle of library source at
`8c8720317cfd59631335b9bc2d75269172b3db7f`, built with Rollup from a clean git archive
and the package version in that archive. It has no external imports. The MIT notice
is adjacent. `content/provenance.json` records the source and bundle hash. This is a
development snapshot, not the older published npm artifact also called alpha.2.

Do not regenerate the bundle from a moving working directory. For an intentional
refresh, archive a chosen clean source commit, generate its version module from that
commit's package.json, bundle its index.js as ESM using Rollup, copy its license and
Region reference, update provenance and the guide's version links, then revalidate
the demo. Rollup is needed only for that deliberate vendor refresh, not site builds.

Brand SVGs come from `marionettejs/branding` and remain draft, local-review assets.
Asset redistribution terms and font provenance must be resolved before public use.
Option C uses HTML/CSS/SVG diagrams; the generated theatre image is preserved only in Option B.
CSS uses system sans, serif, and monospace families; no fonts or analytics are fetched.

## Launch copy

Public-facing copy is written for the intended completed Marionette 5.0 launch,
as requested by Paul. This is an editorial assumption, not a release action.
Preserve the actual pinned runtime/version in provenance.
Do not invent benchmark numbers, migration results, or adoption claims.
The A/B previews remain available at their existing local ports.

## In-page workshop instructions

The invitation opens the workshop directly. Its Agent instructions disclosure
contains the same compiled brief served at `/agent-prompt.md`, including the exact
executable starter. Browser-only agents can read it without navigating away. The
copied invitation asks agents to open the workshop and read the instructions there;
the brief asks them to reveal the workspace before planning or looking up context.

## Project-fit review

The adoption page offers a copyable prompt for the visitor’s own agent. Detailed
objections and evidence limits live in `/adoption-review.md`, linked from page
metadata, `/llms.txt`, and the copied prompt. They are generated from
`content/adoption.mjs` and kept out of the human page’s reading flow. The review
compares adoption with the existing stack; it does not launch the playground or
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

For the ownership regression, after building and starting the preview, run:

```sh
node test/browser/playground-ownership.mjs
```

Open the printed local URL and verify `8 BROWSER CHECKS PASSED`. This uses the real
pinned library in the sandbox to exercise independent state, a nested control click,
template data, replacement, and destruction. It is a browser check, not part of the
Node-only test command. The build generates the agent brief's code example from the
executable starter; a source test prevents the two from drifting.

## Remaining work before launch

- Iterate on the design and copy with Paul, then extend the shared visual language to the actual docs build.
- Complete broader browser/accessibility testing and validate WebMCP in supported clients.
- Add migration/benchmark results only after they exist and have been reviewed.
- Map and preserve required historical documentation URLs from the current site.
- Plan retirement of its existing service worker and test returning visitors.
- Resolve asset publication terms, final naming, support/Patreon links, and hosting/rollback procedures.
- Test the library beta extensively and obtain separate publication approval.

The original website checkout and live site are untouched. Historical source remains
in Git; this branch replaces the obsolete build rather than retaining two pipelines.
