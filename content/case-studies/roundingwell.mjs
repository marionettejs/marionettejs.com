import { readFileSync } from 'node:fs';

const assets = '/assets/case-studies/roundingwell';
const repo = 'https://github.com/RoundingWell/app-frontend';
const migrationRevision = '9004d769beb0394581a1ccaa5dd6f7176e71f23e';
const refinedRevision = '870da88e24b7b14bf2563b3325199a4534c45aee';
const source = (revision, path, label) => `<a href="${repo}/blob/${revision}/${path}">${label}</a>`;
const worklist = 'src/js/apps/patients/worklist/';
const csv = readFileSync(new URL(`../../site${assets}/evidence/summary.csv`, import.meta.url), 'utf8').trim().split(/\r?\n/).map(line => line.split(','));
const [columns, ...values] = csv;
const measurements = values.map(row => Object.fromEntries(columns.map((key, index) => [key, row[index]])));
const selected = [
  ['actions', 'mount', 'Render editable action cards'],
  ['actions', 'filterHalf', 'Filter out half the action cards'],
  ['actions', 'destroy', 'Destroy the action list'],
  ['flows', 'reverse', 'Reverse flow-card order'],
];
const rows = selected.map(([kind, operation, label]) => {
  const row = measurements.find(value => value.count === '500' && value.editable === 'True' && value.kind === kind && value.operation === operation);
  const change = Number(row.change_percent);
  return `<tr><th scope="row">${label}</th><td>${Number(row.develop_median_ms).toFixed(1)}</td><td>${Number(row.v5_median_ms).toFixed(1)}</td><td>${Math.abs(change).toFixed(1)}% ${change < 0 ? 'less' : 'more'} time</td></tr>`;
}).join('');

export const roundingwell = {
  path: '/case-studies/roundingwell/',
  title: 'RoundingWell: a mature application moves to Marionette v5',
  description: 'Preserving care-team workflows while clarifying ownership and improving measured worklist performance.',
  label: '02 / ROUNDINGWELL',
  date: '2026-10-05',
  dateLabel: 'October 5, 2026',
  image: { src: `${assets}/brand-panels.png`, width: 1729, height: 910, caption: 'RoundingWell × Marionette', alt: 'RoundingWell’s white symbol and wordmark in a blue rounded panel beside Marionette’s white symbol and wordmark in a red rounded panel. An established product. A new chapter.' },
  disclosure: '<details class="study-disclosure"><summary>About this account</summary><div class="study-disclosure-body"><p>Published by the Marionette project. The migration combined human direction and agent assistance as the framework and its guidance evolved. It was not a controlled agent-development experiment.</p></div></details>',
  conclusion: 'RoundingWell moved a complex production application from Backbone.Marionette to v5 with clearer refresh and cancellation lifecycles. A historical beta benchmark found faster isolated worklist operations on 500 synthetic rows, including application changes; the final migration was not rebenchmarked.',
  sections: [
    {
      id: 'application', label: 'The application', title: 'An application already at work.',
      body: `<p><a href="https://www.roundingwell.com/">RoundingWell</a> helps care teams organize workflows, worklists, forms, and follow-up. Its frontend is a substantial application used in daily work, with years of product decisions and an established browser-test suite behind it.</p>
      <p>The migration preserved that investment while removing application jQuery and Marionette.Toolkit. Backbone data and routing, Handlebars templates, and the service layer stayed. <a href="${repo}">Explore the application</a> · ${source(migrationRevision, 'src/js/base/setup.js', 'Runtime integration')}</p>
      <figure class="study-capture"><a href="${assets}/worklist-benchmark.png"><img src="${assets}/worklist-benchmark.png" width="1440" height="1000" loading="lazy" alt="RoundingWell action-card views with synthetic Alice and Bob records, assignment controls, dates, and checkboxes."></a><figcaption>Real action-card views with synthetic data, captured in the worklist benchmark harness. <a href="${assets}/worklist-benchmark.png">Open full size</a>.</figcaption></figure>`
    },
    {
      id: 'ownership', label: 'Clearer ownership', title: 'Refresh the results. Keep the context.',
      body: `<p>Change a worklist filter while a patient sidebar is open. The results need to refresh; the surrounding page and sidebar should stay in place. Navigate away, and unfinished work must lose permission to update the replacement screen.</p>
      <p>The migration gives the page, results, and sidebar separate owners. The page coordinates its children; the results application owns selection, bulk editing, status, and list content. These boundaries give loading, refresh, and cleanup a specific home. ${source(migrationRevision, `${worklist}worklist_app.js`, 'Page composition')} · ${source(migrationRevision, `${worklist}worklist-results_app.js`, 'Results ownership')}</p>
      <p>With Marionette v5, the application replaces its local request coordinator with <code>prepareStart</code> and retained <code>restart()</code>: the results container stays mounted while replacement data loads. This gives refresh and cancellation a standard lifecycle, with less application-specific coordination. ${source(refinedRevision, `${worklist}worklist-results_app.js`, 'Lifecycle source')}</p>`
    },
    {
      id: 'behavior', label: 'Regression coverage', title: 'Protect the workflow.',
      body: `<p>An early migration revision passed 304 E2E tests across 35 existing specs, with two scenarios passing on retry. The migration also adds coverage for retaining cards during refresh, retrying failed loads, and keeping sidebar navigation available while data loads.</p>
      <p>Those user-visible contracts give future changes something concrete to preserve. ${source(refinedRevision, `${worklist}worklist-loading.e2e.cy.js`, 'Read the loading scenarios')} · <a href="${repo}/pull/1825">Verification record</a></p>`
    },
    {
      id: 'performance', label: 'Measured performance', title: 'What got faster?',
      body: `<p>A September 23 benchmark compared real worklist Views on v4 and v5 branches, using synthetic data and each branch’s actual templates, styles, and nested controls.</p>
      <div class="study-table-scroll" tabindex="0" role="region" aria-label="Historical worklist timings"><table><caption>Median milliseconds · 500 rows · 15 paired observations</caption><thead><tr><th scope="col">Operation</th><th scope="col">v4 branch</th><th scope="col">v5 branch</th><th scope="col">Change</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p>Rendering, filtering, and teardown improved. Flow-card reversal became slightly slower because increased style/layout cost outweighed cheaper synchronous work.</p>
      <p class="study-note">These historical results used a v5 beta build and have not been rerun against the final migration. Timings include synchronous work and forced style/layout, excluding network and the full app shell. Application and adapter changes accompany the framework change, so these results cannot isolate Marionette’s contribution. <a href="${assets}/evidence/summary.csv">All 92 comparisons and uncertainty ranges</a>.</p>`
    },
    {
      id: 'lessons', label: 'The takeaway', title: 'Give the next change a home.',
      body: `<p>RoundingWell’s migration shows how an established application can preserve useful product behavior while making ownership clearer. A sidebar change, loading state, or late-response bug has a specific place to investigate and a workflow to test.</p>
      <p>For another mature app, start with one demanding workflow: decide what stays mounted, what refreshes independently, and who owns unfinished work. Preserve its behavioral checks, then measure its expensive interactions.</p>`
    },
  ],
  methodology: `<details id="methodology" class="study-disclosure study-methodology"><summary>Evidence and methodology</summary><div class="study-disclosure-body">
    <p>Source links pin the <a href="${repo}/pull/1815">initial migration</a> and <a href="${repo}/pull/1825">lifecycle refinement</a> separately. The refined source revision is <code>${refinedRevision}</code>. The verification record reports passing component/E2E CI and 100% instrumented line/branch coverage, with documented exclusions and narrow ignores. Application tests and benchmarks were not rerun for this article; their historical results do not establish production deployment or defect-free behavior.</p>
    <p>Benchmark: September 23, 2026 (Asia/Seoul), Apple M2 Pro, 16 GiB RAM, headless Chrome 153.0.8010.53, 1440 × 1000, unthrottled, warm caches. <a href="${assets}/evidence/provenance.json">Exact package versions, source pins, and file hashes</a> identify both benchmark builds.</p>
    <p>Each configuration used 15 alternating branch pairs after two discarded warmups, with no outliers removed. The preserved data contains 360 measured sequences and 2,760 operation timings. Recorded assertions cover list behavior and teardown. An earlier run missing global design tokens was excluded. Exploratory bootstrap ranges describe local variation; cold startup, full navigation, mobile use, live APIs, paint timing, and memory retention were not measured. At 5,000 rows, rendering still took seconds on both branches.</p>
    <p><a href="${assets}/evidence/README.md">Full method and limits</a> · <a href="${assets}/evidence/summary.csv">Complete summary</a> · <a href="${assets}/evidence/results.json">Raw 100–1,000-row samples</a> · <a href="${assets}/evidence/results-5000.json">Raw 5,000-row samples</a>. The table reads the preserved CSV directly. The hero pairs the RoundingWell and Marionette vector logos; the worklist image is a browser capture with synthetic data.</p>
  </div></details>`,
};
