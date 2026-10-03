# Website analytics

PostHog EU project **292567** is the approved destination. The owner's Chrome billing page on 2026-10-03 showed the Free plan, a 1 million product-event monthly limit and a 5,000 web-recording monthly allowance. No card, paid subscription, personal API key or OAuth grant was added. Session recording was enabled in the account after the owner approved replay within the free cap. Keep the account without a card; review its limits before any future billing change.

## Collection and reports

The SDK emits standard `$pageview` and `$pageleave` events with anonymous session/window/page-view identifiers and bounded previous-page duration. Web Analytics can use these for page views, sessions, entry pages, bounce and session duration. Paths come from the build-derived public route allowlist; query strings and fragments are removed. Geography, referrers and campaign attribution are omitted, so those breakdowns are not available.

`site_click` records a fixed public link/button/control target, placement and public destination path. It excludes arbitrary element text, unknown controls, form fields, chat widgets and private URLs. Named events retain the existing boundary: workshop open/run/ready/failed/download/CodePen, example select/run/ready/failed/download/CodePen, docs search/copy, adoption/invitation copy and ownership selection. Events never include prompt, chat, generated source, app title, form values, search terms or exception text. Successful clipboard writes generate copy events; downloads and CodePen events describe initiation, not completed saves. Ready means runtime startup, not correctness. Initial example selections and agent-driven actions mean counts are not necessarily human engagement.

Replay is a separate, explicitly approved scope: public-page content, interactions and demo input/editor values are visible. Passwords remain protected; search input is masked. Context7 chat, opaque sandbox previews, console logs, network bodies/headers and canvas capture are excluded. Replay URL metadata is reduced to public paths/assets without queries or fragments. The preview sandbox and its `connect-src 'none'` are unchanged.

The exact locally bundled `posthog-js` 1.435.8 full/no-external entry includes the recorder without external script loading. Conventional anonymous SDK identifiers use a secure first-party cookie with a one-day expiration and browser session/window storage. There is no `identify` call or person profile processing. This supersedes the initial daily cookieless implementation, which cannot run replay in this SDK. Historical cookieless events remain separate identities; do not infer unique-human counts from either identity model.

## Test exclusion

Isolated synthetic browser contexts set `window.__MARIONETTE_ANALYTICS_TEST__ = true` before loading modules. Every event and replay delivery then has `analytics_test: true`; ordinary traffic has false. The flag is memory-only and introduces no visitor controls or banners. All further live QA must use this explicit context, never unmarked traffic from the owner's everyday browser.

Configure the project internal/test filter with event property `analytics_test is not true`, preserving the existing Internal / Test users cohort condition. Negative filtering retains historical events with no marker. Enable the filter for new and relevant existing insights, and verify Web Analytics/dashboard overrides. Filtering hides test traffic from reports, it does not delete events or exempt test recordings from usage. Account configuration and backend replay playback must be independently verified; a passing local intercepted recorder test is not proof of backend reporting.

The [Marionette behavior dashboard](https://eu.posthog.com/project/292567/dashboard/994181) contains workshop and example funnels and a site-to-docs-copy funnel. Its legacy `page_view` first step must be updated to `$pageview` for future traffic (or combined with the historical event to retain history). Public clicks can be broken down by target/placement, and session-linked public pageviews support path exploration.

## Privacy, transport and rollout

GPC, DNT and the existing per-origin opt-out apply before SDK initialization. Inaccessible preference storage fails closed. Opt-out aborts pending event/replay requests and stops the recorder in the current tab and other tabs through storage notifications. Already delivered requests cannot be recalled. No consent banner or additional analytics callout is added; the existing `/privacy/` page is updated factually.

A cancellable immediate transport sends events to `https://e.marionettejs.com/i/v0/e/` and replay to `/s/`, with credentials omitted and no referrer, retry, offline persistence or batching. Large replay bodies avoid the browser's 64 KiB keepalive limit. SDK enrichment is replaced with fixed supported protocol properties. Recorder configuration is fetched through the proxy; surveys, feature flags, heatmaps, errors and other product collection are disabled. SDK loading is asynchronous and cannot hold up website controls.

The free PostHog managed proxy is live and already deployed at revision `4c2edf0`. Its sole dedicated DNS-only CNAME is `e.marionettejs.com` → `2d1c5fd40dc6477608cb.cf-prod-eu-proxy.europehog.com`. The owner approved its terms and distributed Cloudflare processing separately. Cloudflare edge processing is geographically distributed; PostHog storage is EU. No automatic DNS integration, Worker or paid commitment was used. A proxy does not guarantee complete blocker coverage. Existing Context7/Docs7 and Cloudflare services remain separate.

The standard analytics/replay expansion requires its own approved merge. Validate `npm run check`, intercepted event/privacy/replay browser regressions, workshop/docs/personal-preview behavior and hosted CI. Then verify the deployed revision and a small explicitly tagged live journey, including backend playback and exclusions. Roll back through a normal revert PR and deployment workflow; no migration is required.

References: [JavaScript configuration](https://posthog.com/docs/libraries/js/config), [session replay](https://posthog.com/docs/session-replay), [internal/test filtering](https://posthog.com/docs/data/test-accounts), [managed proxy](https://posthog.com/docs/advanced/proxy), [capture protocol](https://posthog.com/docs/api/capture), [privacy](https://posthog.com/privacy).
