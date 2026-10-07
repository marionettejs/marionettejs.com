import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const prompts = JSON.parse(read('./realworld-prompts.json'));
const metrics = JSON.parse(read('./realworld-metrics.json'));
const repo = 'https://github.com/marionettejs/marionette-realworld-example-app';
const source = `${repo}/blob/${metrics.revision}`;
const link = (path, label) => `<a href="${source}/${path}">${label}</a>`;
const commit = (hash, label) => `<a href="${repo}/commit/${hash}">${label}</a>`;
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const disclosure = (title, body) => `<details class="study-disclosure"><summary>${title}</summary><div class="study-disclosure-body">${body}</div></details>`;
const quoted = texts => texts.map(text => `<pre class="study-prompt" tabindex="0" aria-label="Prompt text">${escape(text)}</pre>`).join('');
const n = value => Math.round(value).toLocaleString('en-US');
const table = (caption, headings, cells) => `<div class="study-table-scroll" tabindex="0" role="region" aria-label="${caption}"><table><caption>${caption}</caption><thead><tr><th scope="col">Application</th>${headings.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${metrics.rows.map(row => `<tr><th scope="row">${row.name}</th>${cells(row).map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const assets = '/assets/case-studies/realworld';

export const realworld = {
  path: '/case-studies/realworld/',
  title: 'Building RealWorld with an AI agent and Marionette v5',
  description: 'Three development stages, a finished Conduit frontend, and a measured comparison with Vue, React FSD, Angular, and SvelteKit.',
  label: '01 / REALWORLD',
  date: '2026-10-05',
  dateLabel: 'October 5, 2026',
  tldr: [
    'An AI-assisted Conduit frontend covers authentication, feeds, articles, comments, profiles, and editing.',
    'Named features own drafts, requests, and cleanup, giving changes a clear place to belong.',
    'Initial JavaScript was 55.6 KiB gzip, with desktop feed readiness comparable to Vue; SSR SvelteKit was smaller and faster to show the feed. Agent productivity was not measured.',
  ],
  image: { caption: 'Editorial illustration', src: `${assets}/development-progression-v2.png`, width: 1800, height: 960, alt: 'Editorial illustration comparing Waterfall, Agile, AI, and Marionette development through successive vehicle designs.' },
  disclosure: disclosure('The prompt behind this case study', `<pre class="study-prompt" tabindex="0" aria-label="Prompt text">${escape(read('./realworld-brief.txt'))}</pre>`),
  conclusion: `An AI coding agent built a Conduit frontend with Marionette v5 RC2, covering authentication, feeds, articles, comments, profiles, and editing. After correctness and presentation refinements, it was competitive with the selected client applications in the measured payload and navigation workloads; SvelteKit was smaller and faster to show the feed. This makes Marionette worth trying on a representative feature, but this was not a matched agent-development experiment across frameworks. ${link('docs/benchmark-comparison.md', 'See the measured comparison.')} <a href="${repo}">View the example repository.</a> `,
  sections: [
    {
      id: 'development', label: 'Three development stages', title: 'What did the agent need to do?',
      body: `<p>The work falls into three stages, represented by three application commits. Reviews and follow-up requests contributed to them; these were not three uninterrupted model responses, and commit count does not measure effort.</p>
      <h3>1. Implement the application</h3>
      <p>The initial request paired the framework-neutral RealWorld specification with the installed RC2 documentation. It produced named feature Applications, Views and Regions, explicit HTTP transport, and browser journeys. The root owned navigation and session; features owned requests and child lifetimes. That gave later changes identifiable places to land. ${commit('7ebb8dabba32f144c5baf0fb45096b285ada66c8', 'Implementation commit')} · ${link('docs/architecture.md', 'Architecture')}</p>
      ${disclosure('Stage 1 · Original implementation prompt', '<p>Exact quotation recovered from the development chat.</p>' + quoted(prompts.implementation))}
      <h3>2. Tighten correctness and ownership</h3>
      <p>Review exposed real defects: same-user session verification could discard a draft, and a delayed save could overwrite newer credentials. Refinement retained the current page when identity remained valid and rejected completions from obsolete sessions. Named Auth, Editor, and Settings Views also replaced a conditional form abstraction. That split was a teaching and organization request, distinct from fixing the races. ${commit('bbac29fa224293ddab7b131a6c8ca6f43c8d69b9', 'Refinement commit')}</p>
      ${disclosure('Stage 2 · Original refinement instructions', '<p>Exact quotations: the request following the review, then its file-organization follow-up. The preceding review supplied the bug context.</p>' + quoted(prompts.refinement))}
      <h3>3. Refine loading and presentation</h3>
      <p>The next request targeted demonstrated sequential work. Feed and tags, article and comments, and profile and feed could load concurrently under their existing owners. Follow-ups aligned markup and loading states with RealWorld: retained feed rows stay hidden while a replacement query loads, then return with Retry on failure. A bounded cleanup removed boilerplate without removing safeguards. ${commit('48b910a2e2c496772d1409c19792a7ef0ce8121d', 'Loading and presentation commit')} · ${link('docs/loading-review.md', 'Loading review')}</p>
      ${disclosure('Stage 3 · Original performance prompt and presentation follow-ups', '<p>Exact quotations recovered from the development chat. These separate requests contributed to the third stage; they are not a single prompt.</p><h4>Concurrent loading</h4>' + quoted(prompts.loading) + '<h4>Presentation fidelity</h4>' + quoted(prompts.presentation) + '<h4>Feed loading and cleanup</h4>' + quoted(prompts.feed))}`
    },
    {
      id: 'application', label: 'The finished application', title: 'What does the result look like?',
      body: `<p>The familiar Conduit interface remains the target. These desktop and mobile captures show the populated home feed at both widths. ${link('docs/loading-review.md#executed-checks', 'Screenshot and interaction evidence')}</p>
      <div class="study-screenshots">
        <figure><a href="${assets}/desktop-feed.png"><img src="${assets}/desktop-feed.png" width="1440" height="900" loading="lazy" alt="Conduit desktop home feed with article previews, Global Feed selected, and Popular Tags."></a><figcaption>Desktop · initial feed loaded, 1440 × 900. ${link('docs/metrics/marionette-loading-run/visual/desktop-initial-success.png', 'Original capture')}</figcaption></figure>
        <figure><a href="${assets}/mobile-feed.png"><img src="${assets}/mobile-feed.png" width="390" height="844" loading="lazy" alt="Conduit mobile home feed with Global Feed selected and populated article previews."></a><figcaption>Mobile · initial feed loaded, 390 × 844. ${link('docs/metrics/marionette-loading-run/visual/mobile-initial-success.png', 'Original capture')}</figcaption></figure>
      </div>
      <p>The final checks recorded 33 development browser cases executed across three engines: 99 executions, plus 19 production Chromium journeys and three unit tests. Those fixture-based checks cover more than the anonymous benchmark, but do not establish full upstream or live-backend acceptance. ${link('docs/metrics.md#recorded-verification', 'Verification record')}</p>`
    },
    {
      id: 'comparison', label: 'Measured comparison', title: 'How does it compare?',
      body: `<p>Only the complete five-application run is used below. These are selected implementations with incomplete parity checks, not isolated framework rankings. Source counts include comments and embedded styles; they exclude tests, configuration, dependencies, and standalone styles. Formatting also affects line counts. ${link('docs/benchmark-comparison.md#total-code-and-production-output', 'Counting rules')}</p>
      ${table('Source and initial JavaScript', ['Authored files', 'Nonblank lines', 'Initial JS<br>gzip KiB'], r => [r.files, n(r.lines), r.initialKiB.toFixed(1)])}
      <p>Marionette has fewer authored files, but more lines than Vue or Angular. Vue delivers less initial JavaScript. SvelteKit is smallest on both lines and initial scripts. React’s separate 45 generated API/schema files add 2,753 physical lines; generated runtime still contributes to its bundles. Initial payload is what the home route requests, not all-route output: Vue’s total browser JavaScript is 79.9 KiB gzip versus 49.3 initially.</p>
      ${table('Content readiness · median milliseconds', ['Feed<br>desktop / mobile', 'Article<br>desktop / mobile', 'Home return<br>desktop / mobile'], r => [`${n(r.desktop.readyMs)} / ${n(r.mobile.readyMs)}`, `${n(r.desktop.articleMs)} / ${n(r.mobile.articleMs)}`, `${n(r.desktop.homeMs)} / ${n(r.mobile.homeMs)}`])}
      <p class="study-note">Ten measured samples per app per profile; two warmups discarded. “Mobile” simulates constraints in desktop Chromium. Feed readiness checks 20 previews, tags, and two animation frames; it is not time to interactive. ${link('docs/metrics/full-final-run/summary.json', 'Final summary')} · ${link('docs/metrics/full-final-run/results.json', 'Raw samples')}</p>
      <p>Marionette and Vue are effectively level on desktop feed readiness. Marionette’s mobile article navigation is faster here; Vue’s return home is slightly quicker. SvelteKit has the fastest feed and mobile navigation, with SSR and server-local API calls that avoid simulated client latency. Its server costs are unmeasured. Runs were sequential on a shared machine, so small gaps deserve caution.</p>
      ${disclosure('Timing spread · constrained mobile feed', table('Observed minimum–maximum · milliseconds, n = 10', ['Feed readiness range'], r => [`${n(r.mobileRange[0])}–${n(r.mobileRange[1])}`]) + `<p>Ranges use only measured samples from ${link('docs/metrics/full-final-run/results.json', 'the final run')}; they are not confidence intervals.</p>`)}
      ${table('Browser heap · medians of three 100-cycle trials', ['Heap MiB<br>baseline → end', 'Growth<br>KiB', 'Last 50 cycles<br>growth KiB'], r => [`${r.baselineMiB.toFixed(2)} → ${r.endMiB.toFixed(2)}`, n(r.growthKiB), n(r.lateGrowthKiB)])}
      <p>Marionette finishes with less browser heap than Vue, React FSD, and Angular; SvelteKit uses less again. All five show zero DOM-node growth and 13 additional listeners. Late heap growth is smaller than total growth. These bounded, garbage-collected trials neither prove a leak nor establish leak-free operation; native DOM and server memory are excluded. ${link('docs/benchmark-comparison.md#memory-after-repeated-navigation', 'Memory method')}</p>`
    },
    {
      id: 'assessment', label: 'When to try Marionette', title: 'Is Marionette worth trying?',
      body: `<p>Try it on a feature with nested screens, local drafts, and asynchronous work that must stop when its owner leaves. This project shows how explicit ownership and retained state can make those responsibilities inspectable. That is a source observation; easier future agent edits remain a hypothesis. ${link('docs/marionette-source-review.md', 'Source review')}</p>
      <p>The application still defines credential authority, read/write ordering, draft comparisons, and cleanup for its own resources. Lifecycle conventions give those decisions a home. Runtime results do not prove superior agent development: a matched experiment would need equal requirements, agent settings and budgets, repeated runs, and measurements of time, interventions, defects, and maintenance effort.</p>`
    }
  ],
  methodology: `<details id="methodology" class="study-disclosure study-methodology"><summary>Evidence and methodology</summary><div class="study-disclosure-body">
    <p>This study is published by the Marionette project. All comparison measurements come from <code>docs/metrics/full-final-run</code>, recorded ${metrics.run} (October 5, 2026, 00:01 Asia/Seoul), at ${link('docs/metrics/README.md', 'evidence snapshot 00dc2c8')}. The evidence guide maps recorded source snapshots to the three application commits; it establishes source equivalence, not rebuilt artifact identity.</p>
    <p>Marionette and companion packages: 5.0.0-rc.2, with Lit rendering. ${link('docs/metrics/full-final-run/build.json', 'Final build/source manifest')} and ${link('docs/metrics/reference-run/builds.json', 'reference revisions, runtime versions and source counts')} preserve exact identities. Reference artifacts were reused, not rebuilt for the final run. The saved npm locks and patches describe preparation; a second clean installation replay remains unverified.</p>
    <p>Environment: Apple M2 Pro, macOS ARM64, 16 GiB RAM; Node 24.19.0; Chromium 153.0.8010.12. Desktop: 1440 × 900, unthrottled. Constrained mobile: 390 × 844, 4× CPU slowdown, 80 ms client latency, 1.6 Mbit/s down and 0.75 Mbit/s up. Fixed app order; fresh contexts, disabled browser cache, blocked service workers and external fonts/icons, shared local avatar.</p>
    <p>Workload: read-only local HTTP API, 40 ms GET delay, 20 feed summaries, two tags, 200 total articles, one article with 20 plain-text paragraphs and ten comments. Home limits and API addresses were normalized. Four client SPAs use a shared gzip server; SvelteKit uses production preview with SSR. React renders the fixture article in a paragraph while the others process Markdown. Complete semantic and presentation parity was not audited.</p>
    <p>There are 100 measured timing samples, 20 discarded warmups, and 15 memory trials overall. Navigation uses synthetic clicks after modules settle, excluding hover prefetch and physical pointer/actionability overhead. Memory trials have ten warmup cycles, then 100 home/article/home cycles, with two garbage collections at checkpoints. Payloads cover JavaScript recompressed at gzip level 9, excluding HTML, CSS, images, headers and server output.</p>
    <p>Screenshots are preserved loading-review captures, identified by ${link('docs/metrics/marionette-loading-run/build.json', 'their own manifest and source patch')}; they precede the final bounded code cleanup. They illustrate the retained loading presentation, not additional timing samples. ${link('docs/visual-comparison.md', 'The visual review')} records other presentation refinements and remaining differences.</p>
    <p>Prompts are exact user-message transcriptions recovered from the original development chat, including follow-ups where labeled. The repository’s ${link('docs/development-journal.md', 'development journal')} supplies implementation context, not proof of original wording. Model settings, elapsed development time, cost, and total intervention count are not established here.</p>
    <p>${link('docs/metrics/full-final-run/browser.log', 'Development browser log')} · ${link('docs/metrics/full-final-run/production.log', 'Production journey log')} · ${link('docs/metrics/full-final-run/unit.log', 'Unit log')}. No full upstream acceptance, live-backend interoperability, formal accessibility certification, or long-running production memory claim follows from these checks.</p>
    <p>To reproduce, use ${link('benchmarks/realworld/README.md', 'the benchmark instructions')} with the pinned manifests and a fresh output directory. ${link('docs/benchmark-comparison.md', 'The complete report')} includes all-route output, browser work, adaptations and remaining limits.</p>
  </div></details>`
};
