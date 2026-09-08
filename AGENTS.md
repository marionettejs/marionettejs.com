# Website prototype

Paul authorized a public test preview at `v5.marionettejs.com` on 2026-09-06.
Use manual Cloudflare Pages deployments when requested. Do not add automatic
publishing or move the main `marionettejs.com` website without separate explicit
authorization. Keep the preview noindexed and preserve the existing GitHub Pages
production site. Domain registration remains in DNSimple; DNS is in Cloudflare.

This is the independent website repository. The earlier prototype and design
options remain in their existing checkouts; preserve them. Keep the website independent of the library's working directory.
Use the pinned vendor snapshot for the demo; never silently substitute npm's older
alpha package or a moving local library build.

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
