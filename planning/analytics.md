# Website analytics event plan

PostHog EU is the approved provider. Project **292567** was configured on 2026-10-03 through the owner's Chrome session: Free plan (no card, capped 1 million events/month, one project, one-year retention), cookieless server hash enabled and verified after reload, discard-IP enabled, and canonical domain `https://marionettejs.com` authorized. Autocapture, heatmaps, web vitals and Session Replay were disabled during onboarding. Only the public write-only ingestion token is in website configuration; no administrative/personal API key, OAuth grant or external data connection was created. Collection will begin after an approved merge/deployment, which has not occurred. Context7 Docs7 analytics and its intentional chat submission flow remain separate services.

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
`cookieless_mode: 'always'` in the client. It uses request IP/user-agent/site for its
server hash; it is not zero personal-data processing. A daily hash limits return
journeys across days. Persistent identity/session storage needs a separate consent
and retention decision. The exact PostHog SDK 1.435.8 is bundled locally from its no-external entry. It runs only on main/www/v5 production hosts when configuration and privacy controls permit it. No SDK download, initialization or request occurs for opted-out visitors or unconfigured projects.

The adapter honors GPC, DNT and the local opt-out before initialization and capture. It disables SDK automatic events, replay, surveys, feature flags, remote config and external scripts. The before-send boundary replaces all SDK enrichment with fixed cookieless protocol fields, the browser user agent required for the server hash, public canonical URL/path and page category; person processing is disabled. The
boundary suppresses events when storage access throws, and catches sender errors
so analytics cannot break website actions. The linked `/privacy/` page explains collection and offers a local opt-out; its enabled/prepared wording follows build configuration. Do not expose an
administrative API key. A browser project ingestion key is intentionally public,
but still requires an approved project destination.

Set and verify a free usage cap, region and retention in the account; do not
assume an SDK option changes server-side project settings. Test outgoing payloads
with synthetic actions before enabling visitors. The SDK's own transport is rejected by its public before-send hook. A cancellable immediate fetch to `https://eu.i.posthog.com/i/v0/e/` owns delivery, with credentials omitted and no referrer, batching, offline persistence or retries. Opting out cancels pending requests and stops new events in the current and other open tabs via storage events. Already delivered requests cannot be recalled. A failed delivery is dropped. The build-derived public route allowlist preserves documentation page journeys; arbitrary URL capture is never necessary.

## Account completion checklist

1. Complete the chosen email account login/signup in PostHog EU; obtain explicit approval of any new terms and let the owner enter a new password/passkey. Account signup and verification are now complete.
2. Create/select the Marionette project with the owner's approval of any persistent project credentials. No personal or administrative token belongs in website code.
3. Enable **Cookieless server hash mode** under Project Settings → Web analytics. Verify the free tier has no paid subscription/card, its event cap stops ingestion at the free allocation, and the event retention setting matches the owner's choice. Record verified settings, not assumptions.
4. Put only the project's public `phc_` ingestion key in `site/assets/analytics-config.js` and set `cookielessServerHashConfirmed: true` after verification. The EU endpoint is fixed.
5. Run `npm run check`, `node test/browser/analytics.mjs`, and the repository browser suites. The synthetic SDK test intercepts all requests and proves allowed wire fields, no visitor ID storage, and opt-out control behavior. Verify one synthetic event appears in the real project when that verification is authorized.
6. Review/merge through the existing deployment workflow only with deployment approval. Confirm events arrive after deployment; implementation and build success alone do not prove live collection. Configure the workshop/examples/docs funnels listed above in the dashboard after account setup.

Official references: [cookieless measurement](https://posthog.com/tutorials/cookieless-tracking), [JavaScript configuration](https://posthog.com/docs/libraries/js/config), [terms](https://posthog.com/terms), [privacy](https://posthog.com/privacy).

Protocol verification: [capture API](https://posthog.com/docs/api/capture) supports the `/i/v0/e/` endpoint and top-level project key/distinct ID. [Cookieless ingestion source](https://github.com/PostHog/posthog/blob/master/nodejs/src/ingestion/common/cookieless/cookieless-manager.ts) verifies the sentinel, cookieless flag, required raw user agent/host, daily salt and server session assignment. Request IP is supplied by ingestion, not discovered or stored by the browser code. The SDK before-send hook is retained to preserve the supported cookieless client configuration and SDK bot filtering/event timestamps/UUIDs. The bundled adapter is about 359 kB uncompressed (loaded only for configured, eligible visitors); a synthetic `page_view` for `/privacy/` was accepted by the EU ingestion endpoint and visibly appeared in project Activity with a server-generated cookieless distinct ID on 2026-10-03. This verifies ingestion, not deployed visitor collection.

Performance and opt-out verification: SDK loading is asynchronous and never delays website controls or app startup. Events before analytics initialization are dropped rather than queued. The browser regression holds the SDK module indefinitely while operating the real homepage demo and privacy buttons, then verifies cross-tab opt-out aborts an intercepted pending request and a failed event is not retried.
