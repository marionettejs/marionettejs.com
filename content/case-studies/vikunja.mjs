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
  description: 'An agent-led frontend migration, a measured Vue comparison, and the integration work that remains.',
  label: '03 / VUE TO MARIONETTE',
  date: '2026-10-07',
  dateLabel: 'October 7, 2026',
  image: { src: `${assets}/task-dark.png`, width: 1440, height: 900, caption: 'Vikunja task details in the Marionette v5 RC2 frontend · original 1440 × 900 capture · dark theme.', alt: 'Vikunja task details in dark theme, with project navigation, description, comments, an editor and task actions.' },
};

vikunja.disclosure = '';
vikunja.conclusion = `ChatGPT’s coding agent, dot, migrated a substantial Vue application to Marionette v5 RC2 without the developer supplying Marionette-specific implementation instructions. The measured frontend opened rich tasks faster and transferred less JavaScript and CSS on the cold list route than Vue.`;
vikunja.sections = [
  { id: 'reuse', label: 'Reuse versus rewrite', title: 'Reuse versus rewrite', body: `
      <p>Vikunja is an open-source task manager with a Vue interface and Go backend. The agent inspected the existing application and used installed, version-matched Marionette guidance to replace its frontend.</p>
      <div class="study-table-scroll" tabindex="0" role="region" aria-label="What stayed and what changed"><table class="study-comparison"><caption>Frontend replacement</caption><thead><tr><th scope="col">Kept</th><th scope="col">Changed</th></tr></thead><tbody><tr><th scope="row">Go backend and API client</th><td>Vue templates → Marionette Views</td></tr><tr><th scope="row">Models and services</th><td>Component coordination → Applications and Regions</td></tr><tr><th scope="row">Assets and translation files</th><td>UI bindings, wrappers and lifecycle integration</td></tr></tbody></table></div>
      <p>Reusable styles still depended on DOM structure. Vue bindings, wrappers, and component lifecycles needed replacement; framework-neutral code could stay. <a href="${source}/migration/README.md">Migration record</a>.</p>
    ` },
  { id: 'journey', label: 'A faster rich task journey', title: 'A faster rich task journey', body: `
      <figure class="study-task-chart"><h3>Median time to open a rich task</h3><div class="study-chart-bars" role="img" aria-label="Scale: 0 to 4 seconds. Median task-opening times: Vue 3.71943; Marionette v5 RC2 1.03577. 72% shorter in this measured run; lower is better."><div class="study-chart-row"><div class="study-chart-legend"><span>Vue</span><strong>3.72 s</strong></div><div class="study-chart-track"><div class="study-chart-vue" style="width:92.98575%"></div></div></div><div class="study-chart-row"><div class="study-chart-legend"><span>Marionette v5 RC2</span><strong>1.04 s</strong></div><div class="study-chart-track"><div class="study-chart-marionette" style="width:25.89425%"></div></div></div><div class="study-chart-axis" aria-hidden="true"><span style="--tick:0">0</span><span style="--tick:1">1</span><span style="--tick:2">2</span><span style="--tick:3">3</span><span style="--tick:4">4 s</span></div></div><figcaption>Vue: 3.71943 s; Marionette: 1.03577 s. Median of 20 samples per app; lower is better. 500-task fixture, 50 visible rows/cards, rich task with 50 comments. Production builds, desktop Chromium; timings include automation, API and frame waits. <a href="${assets}/task-opening.png">Original chart</a>.</figcaption></figure>
      <p>Rich-task opening was 72% shorter. Cold-list JS/CSS transfer was 420.5 KiB versus Vue’s 614.2 KiB, about 32% less. Search was mixed: total input-to-paint was 194.80 ms versus 221.25 ms, but the results-publication-to-paint interval was slower, 24.45 ms versus 12.75 ms. These are implementation and journey comparisons, not framework rankings. <a href="${source}/migration/rc2-publication-measurements-20261007.md">Measurement report</a>.</p>
    ` },
  { id: 'ownership', label: 'Why the architecture matters', title: 'Why the architecture matters', body: `
      <p>The workspace survives project navigation while individual panels come and go. Task records publish accepted writes; editor Views keep their own drafts. If someone types during a save, the newer draft stays dirty after the older save succeeds. Updating a status indicator does not require rebuilding the editor. <a href="${source}/migration/rc2-task-shell-ownership-review.md">Task ownership review</a>.</p>
      <p>This TypeScript/Vite implementation renders through lit-html alongside existing services and UI libraries; v5 requires neither Backbone nor jQuery. Lit updates template nodes. The application chooses which child Views remain mounted. <a href="${source}/migration/rc2-architecture-review.md">Architecture</a>.</p>
    ` },
  { id: 'tradeoffs', label: 'What to weigh before migrating', title: 'What to weigh before migrating', body: `
      <p>Try this approach for features with local drafts, asynchronous panels, and explicit lifetimes. You own routing, persistence integration, and synchronization policy. Follow a task from its Application to its record and editor View, then run the paired journey.</p>
      <p>The developer directed outcomes, appearance, progress, and verification. The agent handled implementation, investigation, and technical corrections. Its incomplete Vue-source readings caused mistakes; paired desktop/mobile journeys exposed focus, styling, and label defects that builds missed. <a href="${repo}/blob/${verifiedRevision}/migration/rc2-ui-recovery-20261007.md">Verified follow-up fixes</a>.</p>
    ` },
];
vikunja.methodology = `<details id="methodology" class="study-disclosure study-methodology"><summary>Evidence and methodology</summary><div class="study-disclosure-body">
      <p class="study-note">All <a href="${repo}/blob/${laterRevision}/migration/rc2-full-route-inventory.md">59 original routes are ported</a>; acceptance verification is incomplete. Fix snapshot <code>66af00fd</code> passes 778 unit cases and 82/84 focused browser cases; the two retained mobile-wheel assertions also fail in Vue. Licensed integrations, external providers, Electron, OS IME and screen-reader equivalence remain unverified.</p>
      <p class="study-note">Benchmarks stay pinned to <code>5fca3cbd</code>, before the label and recovery fixes; neither follow-up was rebenchmarked. The hero was captured October 7 at 05:48 UTC from <code>8de771eab</code>, with the same measured frontend tree <code>50662d985</code>. Runtime: <code>5.0.0-rc.2</code>.</p>
      <p>The developer confirms that he supplied outcome and verification direction, not Marionette-specific implementation instructions. This is an account of the migration, not a controlled agent-development experiment; the <a href="${source}/migration/README.md">public migration record</a> documents implementation and follow-up work, not a complete prompt transcript.</p><p>${evidence}</p>
    </div></details>`;
