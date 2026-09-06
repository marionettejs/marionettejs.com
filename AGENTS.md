# Website prototype

Paul authorized a source backup on the remote feature branch
`feat/website` in `marionettejs/website`. This does not authorize website publication. Do not deploy,
enable hosting, push to `master` or `gh-pages`, or add an automatic deployment
workflow. Paul requires substantial beta testing before considering a public
launch, followed by explicit publication authorization. Passing tests or reaching
beta does not authorize publication.

This is the independent website repository. The earlier prototype and design
options remain in their existing checkouts; preserve them. Keep the website independent of the library's working directory.
Use the pinned vendor snapshot for the demo; never silently substitute npm's older
alpha package or a moving local library build.

Use `npm run dev` for the loopback-only preview and `npm run check` for build and tests.
No dependency installation is needed. Static pages remain readable without JavaScript.
The demo must use real Marionette Views/Regions and public lifecycle APIs.

Plans and original assets live in ../marionettejs-branding. No fabricated benchmarks,
endorsements, release readiness, or testimonials. Keep public-facing copy candid,
lightly humorous, and precise about what has actually been demonstrated.
