const repo = 'https://github.com/marionettejs/vikunja';
const revision = '5fca3cbdc45a1b5c3d1d2f4fb6efef84226384fd';
const laterRevision = '5a4bb2d8d281c2bac81b08d8fffe4b7bd90c30dd';
const verifiedRevision = '66af00fd379f1f53b4a91d2765cede72dd7bf09a';
const source = `${repo}/blob/${revision}`;
const assets = '/assets/case-studies/vikunja';
const evidence = `<a href="${repo}/tree/${revision}">Measured code</a> · <a href="${source}/migration/rc2-architecture-review.md">Architecture</a> · <a href="${source}/migration/rc2-publication-measurements-20261007.md">Measurements and method</a> · <a href="${repo}/blob/${verifiedRevision}/migration/rc2-ui-recovery-20261007.md">Verified fixes and limits</a>`;

export const vikunja = {
  path: '/case-studies/vikunja/',
  title: 'From Vue to Marionette: An Agent-Led Migration',
  description: 'An agent-assisted frontend migration, a measured Vue comparison, and the integration work that remains.',
  label: '03 / VUE TO MARIONETTE',
  date: '2026-10-07',
  dateLabel: 'October 7, 2026',
  image: { src: `${assets}/hero.png`, width: 1520, height: 685, caption: 'Paired Vue and Marionette task captures · 1440 px · light theme', alt: 'The same Vikunja task in Vue and Marionette v5, side by side, with navigation, description, comments, editor, and task actions.' },
};

vikunja.body = `<article class="study">
  <header class="article-heading study-heading">
    <a class="study-back" href="/case-studies/">← Case studies</a>
    <p class="eyebrow">${vikunja.label}</p><h1>${vikunja.title}</h1>
    <p class="study-conclusion">ChatGPT dot migrated a substantial Vue application to Marionette v5 RC2 without the developer supplying Marionette-specific implementation instructions. The measured frontend opened rich tasks faster and transferred less JavaScript and CSS on the cold list route than Vue.</p>
    <p class="study-byline">Published by the Marionette project · <time datetime="${vikunja.date}">${vikunja.dateLabel}</time></p>
  </header>
  <figure class="study-hero"><a href="${vikunja.image.src}"><img src="${vikunja.image.src}" width="1520" height="685" alt="${vikunja.image.alt}"></a><figcaption>${vikunja.image.caption}. <a href="${vikunja.image.src}">View full size</a>. These captures illustrate the interface, not pixel-perfect parity.</figcaption></figure>
  <div class="article-layout study-layout"><nav class="article-nav" aria-label="On this page"><p class="eyebrow">IN THIS STUDY</p><a href="#reuse">Reuse versus rewrite</a><a href="#journey">A faster task journey</a><a href="#ownership">Why ownership matters</a><a href="#tradeoffs">Migration tradeoffs</a><a href="#methodology">Evidence and limits</a></nav>
  <div class="prose study-prose">
    <section id="reuse"><h2>Reuse versus rewrite</h2>
      <p>Vikunja is an open-source task manager with a Vue interface and Go backend. Dot inspected the existing application and used installed, version-matched Marionette guidance to replace its frontend.</p>
      <div class="study-table-scroll" tabindex="0" role="region" aria-label="What stayed and what changed"><table><caption>Frontend replacement</caption><thead><tr><th scope="col">Kept</th><th scope="col">Changed</th></tr></thead><tbody><tr><th scope="row">Go backend and API client</th><td>Vue templates → Marionette Views</td></tr><tr><th scope="row">Models and services</th><td>Component coordination → Applications and Regions</td></tr><tr><th scope="row">Assets and translation files</th><td>UI bindings, wrappers and lifecycle integration</td></tr></tbody></table></div>
      <p>Reusable styles still depended on DOM structure. Vue bindings, wrappers, and component lifecycles needed replacement; framework-neutral code could stay. <a href="${source}/migration/README.md">Migration record</a>.</p>
    </section>
    <section id="journey"><h2>A faster rich task journey</h2>
      <figure class="study-capture"><a href="${assets}/task-opening.png"><img src="${assets}/task-opening.png" width="2240" height="690" loading="lazy" alt="Zero-based bar chart of median first rich-task opening: Vue 3.72 seconds, Marionette v5 1.04 seconds; 72% shorter in this run."></a><figcaption>Vue: 3.71943 s; Marionette: 1.03577 s. Median of 20 samples per app; lower is better. 500-task fixture, 50 visible rows/cards, rich task with 50 comments. Production builds, desktop Chromium; timings include automation, API and frame waits. <a href="${assets}/task-opening.png">View full size</a>.</figcaption></figure>
      <p>Rich-task opening was 72% shorter. Cold-list JS/CSS transfer was 420.5 KiB versus Vue’s 614.2 KiB, about 32% less. Search was mixed: total input-to-paint was 194.80 ms versus 221.25 ms, but the results-publication-to-paint interval was slower, 24.45 ms versus 12.75 ms. These are implementation and journey comparisons, not framework rankings. <a href="${source}/migration/rc2-publication-measurements-20261007.md">Measurement report</a>.</p>
    </section>
    <section id="ownership"><h2>Why the architecture matters</h2>
      <p>The workspace survives project navigation while individual panels come and go. Task records publish accepted writes; editor Views keep their own drafts. If someone types during a save, the newer draft stays dirty after the older save succeeds. Updating a status indicator does not require rebuilding the editor. <a href="${source}/migration/rc2-task-shell-ownership-review.md">Task ownership review</a>.</p>
      <p>This TypeScript/Vite implementation renders through lit-html alongside existing services and UI libraries; v5 requires neither Backbone nor jQuery. Lit updates template nodes. The application chooses which child Views remain mounted. <a href="${source}/migration/rc2-architecture-review.md">Architecture</a>.</p>
    </section>
    <section id="tradeoffs"><h2>What to weigh before migrating</h2>
      <p>Try this approach for features with local drafts, asynchronous panels, and explicit lifetimes. You own routing, persistence integration, and synchronization policy. Follow a task from its Application to its record and editor View, then run the paired journey.</p>
      <p>The developer directed outcomes, appearance, progress, and verification. Dot handled implementation, investigation, and technical corrections. Its incomplete Vue-source readings caused mistakes; paired desktop/mobile journeys exposed focus, styling, and label defects that builds missed. <a href="${repo}/blob/${verifiedRevision}/migration/rc2-ui-recovery-20261007.md">Verified follow-up fixes</a>.</p>
    </section>
    <section id="methodology"><h2>Evidence and limits</h2>
      <p class="study-note">All <a href="${repo}/blob/${laterRevision}/migration/rc2-full-route-inventory.md">59 original routes are ported</a>; acceptance verification is incomplete. Fix snapshot <code>66af00fd</code> passes 778 unit cases and 82/84 focused browser cases; the two retained mobile-wheel assertions also fail in Vue. Licensed integrations, external providers, Electron, OS IME and screen-reader equivalence remain unverified.</p>
      <p class="study-note">Benchmarks stay pinned to <code>5fca3cbd</code>, before the label and recovery fixes; neither follow-up was rebenchmarked. The hero was captured October 7 at 05:48 UTC from <code>8de771eab</code>, with the same measured frontend tree <code>50662d9</code>. Runtime: <code>5.0.0-rc.2</code>.</p>
      <p>${evidence}</p>
    </section>
  </div></div>
</article>`;
