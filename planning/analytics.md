# Website analytics event plan

Implementation is provider-neutral and disabled: `analytics.js` has no sender,
network requests, cookies, identity or event queue. Do not activate collection
until the owner approves the provider, region, project configuration and data
scope. Context7 Docs7 analytics and its intentional chat submission flow remain
separate services.

The current boundary accepts event names only and adds a coarse page category:
`home`, `docs`, `errors`, `demos`, `why`, `thanks`, or `other`. It also includes an exact public page path from the build-derived documentation route allowlist, or null for unrecognized paths. It drops arbitrary
path components, query strings and fragments. No prompt, chat, source code,
app title, form value, search query, exception text, DOM snapshot, visitor ID or
referrer is passed to the sender. A provider adapter must preserve this boundary
and disable automatic collection, replay and enrichment that reintroduces these
fields. The sandboxed preview keeps `connect-src 'none'`.

## Funnels

- Workshop: `page_view` → `workshop_open` → `workshop_run` →
  `workshop_ready` → `workshop_download` or `workshop_codepen`.
- Examples: `example_select` → `example_run` → `example_ready` →
  `example_download` or `example_codepen`.
- Documentation: docs `page_view` → `docs_search` or `docs_copy_markdown`.
- Adoption: why `page_view` → `adoption_copy`.

`workshop_failed` and `example_failed` describe the first failed startup snapshot
without its contents. Ready means the runtime reported startup readiness, not
that an app is correct. Example selection currently also occurs on initial page
load, and runs may be requested by the browser agent tools. Counts do not prove
human engagement. Download events describe browser download initiation; CodePen
events describe submission initiation, not a verified save in CodePen.
`docs_search` is emitted once per document after a nonempty query is entered;
its text and results are excluded. Copy events record successful clipboard writes.
`ownership_select` records a changed selection in the homepage ownership example.

## Activation decisions

PostHog cookieless daily hashing requires the matching project setting and
`cookieless: 'always'` in the client. It uses request IP/user-agent/site for its
server hash; it is not zero personal-data processing. A daily hash limits return
journeys across days. Persistent identity/session storage needs a separate consent
and retention decision. No SDK or adapter is configured by this scaffold.

The future adapter must honor GPC, DNT and the local opt-out before initialization,
not only before calling `track`; initialization itself may transmit data. The
boundary suppresses events when storage access throws, and catches sender errors
so analytics cannot break website actions. Add a visible opt-out/consent control
and accurate privacy explanation when activating a provider. Do not expose an
administrative API key. A browser project ingestion key is intentionally public,
but still requires an approved project destination.

Set and verify a free usage cap, region and retention in the account; do not
assume an SDK option changes server-side project settings. Test outgoing payloads
with synthetic actions before enabling visitors. A provider queue must not retain
events after opting out. The build-derived public route allowlist preserves documentation page journeys; arbitrary URL capture is never necessary.
