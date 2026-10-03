# Website analytics

PostHog EU project **292567** is the approved destination. The owner's Chrome billing page on 2026-10-03 showed the Free plan, a 1 million product-event monthly limit and a 5,000 web-recording monthly allowance. No card, paid subscription, personal API key or OAuth grant was added. Session recording was enabled in the account after the owner approved replay within the free cap. Keep the account without a card; review its limits before any future billing change.

## Collection and reports

The locally bundled PostHog SDK uses its normal transport, compression, batching, attribution and enrichment. Standard pageviews/pageleaves and autocapture retain referral sources, campaigns, browser, device, language, timezone and full page URLs, including query strings and fragments. GeoIP enrichment is enabled in the SDK; approximate country/region/city depend on server enrichment and proxy client-IP handling, and are distinct from browser language. No precise geolocation permission is requested. Historical stripped data cannot be recovered retroactively.

Existing named business events and fixed `site_click` classifications remain for the saved funnels/dashboard. They coexist with normal autocapture rather than limiting SDK collection. No identify calls or person profiles are added. Anonymous cookie lifetime remains one day.

Replay uses the supported bundled recorder, retains CSS, URLs, public input/editor content and normal supported recording capabilities. Built-in password protections remain. Cross-origin sandboxed previews cannot be assumed recordable; their sandbox architecture remains intact. No extra masking, custom DOM scrubber or custom network transport is applied.

The existing project public configuration checked on 2026-10-03 still returns `autocapture_opt_out: true`; authenticated project settings must enable autocapture. SDK `ip: true` removes the former per-event GeoIP disable, but backend transformation ordering/discard-IP behavior and actual geography require authenticated verification. Neither is proven merely by successful ingestion.

## Test exclusion

Isolated synthetic browser contexts set `window.__MARIONETTE_ANALYTICS_TEST__ = true` before loading modules. Every event and replay delivery then has `analytics_test: true`; ordinary traffic has false. The flag is memory-only and introduces no visitor controls or banners. All further live QA must use this explicit context, never unmarked traffic from the owner's everyday browser.

The project internal/test filter was saved with event property `analytics_test is not true`, preserving the existing Internal / Test users cohort condition. The default for new insights and the existing-insight bulk toggle are enabled; all five dashboard insights explicitly have `filterTestAccounts: true`. Backend queries on 2026-10-03 retained all 16 historical `page_view` events, including a separate check requiring the marker to be missing. Tagged synthetic public-click and navigation queries returned data with filtering off and none with filtering on. Web Analytics and Replay test filters were also verified. Filtering hides test traffic from reports, it does not delete events or exempt test recordings from usage.

The [Marionette behavior dashboard](https://eu.posthog.com/project/292567/dashboard/994181) contains workshop and example funnels and a site-to-docs-copy funnel whose first step now uses standard `$pageview` for future traffic. Historical `page_view` is separate. It also includes [public links and controls by fixed target](https://eu.posthog.com/project/292567/insights/lxiI6bDH) and [public page journeys](https://eu.posthog.com/project/292567/insights/hjgQK4Eo). Descriptions explain the new anonymous identity model and exclude explicitly tagged synthetic traffic.

## Privacy, transport and rollout

GPC, DNT and the existing per-origin opt-out apply before SDK initialization. Inaccessible preference storage fails closed. An opt-out calls the SDK's supported `opt_out_capturing()` and stops replay, including notifications from another tab. The standard SDK stops new capture; requests already captured/queued or in flight may finish. It does not promise cancellation or recall of prior collection. No banner or new callout is added; `/privacy/` describes standard analytics accurately.

The SDK owns transport and replay compression. Its `before_send` only honors current opt-outs and stamps the explicit test flag; it does not remove event types, enrichment or CSS. Unrelated product UI features remain disabled. SDK loading is asynchronous and cannot hold up website controls.

The free PostHog managed proxy is live and already deployed at revision `4c2edf0`. Its sole dedicated DNS-only CNAME is `e.marionettejs.com` → `2d1c5fd40dc6477608cb.cf-prod-eu-proxy.europehog.com`. The owner approved its terms and distributed Cloudflare processing separately. Cloudflare edge processing is geographically distributed; PostHog storage is EU. No automatic DNS integration, Worker or paid commitment was used. A proxy does not guarantee complete blocker coverage. Existing Context7/Docs7 and Cloudflare services remain separate.

The standard analytics/replay expansion has its own approved merge and deployment. Validate `npm run check`, intercepted event/privacy/replay browser regressions, workshop/docs/personal-preview behavior and hosted CI. Then verify the deployed revision and a small explicitly tagged live journey, including backend playback and exclusions. Roll back through a normal revert PR and deployment workflow; no migration is required.

References: [JavaScript configuration](https://posthog.com/docs/libraries/js/config), [session replay](https://posthog.com/docs/session-replay), [internal/test filtering](https://posthog.com/docs/data/test-accounts), [managed proxy](https://posthog.com/docs/advanced/proxy), [capture protocol](https://posthog.com/docs/api/capture), [privacy](https://posthog.com/privacy).
