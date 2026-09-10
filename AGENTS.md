# Website prototype

This branch targets beta.2 on marionettejs.com (canonical and indexable).
Verify the live provenance after manual deployment before reporting the release as live.
www.marionettejs.com and v5.marionettejs.com also work; v5 is a mirror with a `noindex` directive.
The launch was authorized and completed on September 9, 2026 (Asia/Seoul).
Use manual Cloudflare Pages deployments only when requested.
Do not add automatic publishing. Preserve old documentation links via the
v4.marionettejs.com GitHub Pages archive while those releases have consumers.

This is the independent website repository. The earlier prototype and design
options remain in their existing checkouts; preserve them. Keep the website independent of the library's working directory.
Use the exact published beta pinned in package-lock.json for the demos and
personal workshop. The local consumer path now targets beta.2; this does not
establish that it has been deployed. Rebuild core with `npm run vendor:build`,
then the core/data consumer bundle with `npm run vendor:demos`; never substitute
a moving local build.

The personal-app brief is `site/agent-prompt.md`. Its executable starter is authored
in `site/workshop/app.js` and `style.css`; `npm run build` generates the runtime
strings and embeds both sources in the brief. Edit those sources, not generated
`site/assets/workshop-starter.js`. Verify the full browser suite and
`node test/browser/personal-preview.mjs` after changing this path. Fresh-agent
evaluation requires the declared profile in `test/personal-app-evaluation.md`;
reference-solution success is not agent-effectiveness evidence.

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
