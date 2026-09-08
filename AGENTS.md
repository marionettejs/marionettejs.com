# Website prototype

Paul authorized the beta.1 launch on marionettejs.com, www.marionettejs.com,
and v5.marionettejs.com on 2026-09-09. Use manual Cloudflare Pages deployments
when requested. The apex is canonical and indexable; v5 is a noindexed mirror.
Do not add automatic publishing. Preserve old documentation links via the
v4.marionettejs.com GitHub Pages archive while those releases have consumers.

This is the independent website repository. The earlier prototype and design
options remain in their existing checkouts; preserve them. Keep the website independent of the library's working directory.
Use the exact published beta pinned in package-lock.json for the demos.
Rebuild the vendor bundle with npm run vendor:build; never substitute a moving local build.

Use `npm run dev` for the loopback-only preview and `npm run check` for build and tests.
Run `npm ci` with Node 24 before the first build. Static pages remain readable without JavaScript.
The demo must use real Marionette Views/Regions and public lifecycle APIs.

Plans and original assets live in ../marionettejs-branding. No fabricated benchmarks,
endorsements, release readiness, or testimonials. Keep public-facing copy candid,
lightly humorous, and precise about what has actually been demonstrated.

Marketing, support links, and imported library docs share this repository and one build.
Deploy the complete artifact; do not deploy from the historical marionettejs.com
checkouts. Update the docs snapshot with `npm run docs:import` rather than replacing
marketing files with copies from those checkouts.
