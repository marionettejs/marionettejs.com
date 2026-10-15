import { escapeHtml as escape } from '../../scripts/html.mjs';

const evidence = 'https://github.com/paulfalgout/marionette-realworld-example-app/blob/6d69d2510f26c46f14435569a81b604fb0cdc99d/evaluations/2026-10-10';
export const maintenanceResearch = {
  title: 'Can an agent maintain another agent’s app?',
  description: 'A fresh agent extended a real Marionette app, kept its inherited tests intact, and passed 44 browser checks. A bounded study of maintenance, handoff, and lifecycle repair.',
  path: '/news/realworld-agent-maintenance/',
  categories: ['Research'],
  date: '2026-10-14',
  dateLabel: 'October 14, 2026',
  linkLabel: 'Read the research',
  image: {
    src: '/assets/news/realworld-agent-maintenance.png', displaySrc: '/assets/news/realworld-agent-maintenance.webp', width: 1672, height: 941,
    alt: 'Flatpack illustration: under “Your Agent,” a person struggles with tangled chair parts; under “With Marionette,” a person assembles a chair using a numbered Marionette instruction sheet.'
  }
};
export const maintenanceResearchPage = {
  title: `${maintenanceResearch.title} — Marionette`,
  description: maintenanceResearch.description,
  image: maintenanceResearch.image,
  date: maintenanceResearch.date,
  article: true,
  active: 'news',
  author: { '@type': 'Organization', name: 'Marionette project', url: 'https://marionettejs.com' },
  body: `<article class="news-article news-maintenance">
    <header class="news-article-heading"><a class="study-back" href="/news/">← News</a><div class="news-meta"><ul class="news-tags" aria-label="Categories"><li>Research</li></ul></div><h1>${escape(maintenanceResearch.title)}</h1><p class="news-lede">An agent built the feature. A different agent picked it up, extended it, and kept the existing tests intact. That is a useful kind of boring.</p><p class="news-byline">Marionette project · <time datetime="${maintenanceResearch.date}">${maintenanceResearch.dateLabel}</time></p></header>
    <figure class="news-hero"><img src="${escape(maintenanceResearch.image.displaySrc || maintenanceResearch.image.src)}" width="${maintenanceResearch.image.width}" height="${maintenanceResearch.image.height}" alt="${escape(maintenanceResearch.image.alt)}"><figcaption>Some assembly required. Instructions included.</figcaption></figure>
    <div class="news-reading news-story-reading"><div class="news-prose">
      <section id="example"><h2>Same feed. One more request.</h2>
        <p>In <a href="/case-studies/realworld/">Conduit, our RealWorld blogging frontend</a>, the first agent built a title filter. The next job: match descriptions and tags too. Keep the rest of the app working.</p>
        <figure class="news-filter-example" aria-labelledby="filter-example-caption">
          <div class="news-filter-panels">
            <div class="news-filter-panel"><h3>Before</h3><p class="news-filter-scope">Search article titles</p><p class="news-filter-query">Filter <code>cleanup</code></p><div class="news-filter-empty">No matching articles.</div></div>
            <div class="news-filter-panel"><h3>After</h3><p class="news-filter-scope">Search titles, descriptions and tags</p><p class="news-filter-query">Filter <code>cleanup</code></p><div class="news-filter-match"><h4>Keeping drafts across navigation</h4><p>A note on <mark>cleanup</mark> and retained views.</p><span class="news-filter-tag">marionette</span> <span class="news-filter-tag">lifecycle</span></div></div>
          </div>
          <figcaption id="filter-example-caption">Illustrative example with sample article text, not an app screenshot. A description can now supply the match; tags are searchable too.</figcaption>
        </figure>
        <p>Same loaded articles. Same routes and pagination totals. Filtering kept the existing list and row instances. No extra fetch, and no quiet rewrite of article data.</p>
      </section>

      <section id="handoff"><h2>New agent. Same contracts.</h2>
        <figure class="news-handoff" aria-labelledby="handoff-caption">
          <ol class="news-handoff-steps"><li><strong>First agent</strong><span>Title filter + partly broken code</span></li><li><strong>Fresh agent</strong><span>Repair + descriptions + tags</span></li><li><strong>Independent checks</strong><span>Old behavior + new feature</span></li></ol>
          <figcaption id="handoff-caption">The fresh agent received code and tests, without a handoff note.</figcaption>
        </figure>
        <p>Three inherited author tests were failing. The fresh agent repaired accessible names in application markup and added the extension while keeping those tests intact. They did not get a motivational rewrite.</p>
        <dl class="news-maintenance-results">
          <div><dt>Fresh-agent takeover</dt><dd><strong>44 / 44</strong> browser checks</dd><dd>33 baseline + 7 author + 4 withheld extension cases. Three unit tests, build, lint and architecture review also passed. <a href="${evidence}/assessment-A3.json">Takeover assessment →</a></dd></div>
          <div id="lifecycle"><dt>Lifecycle repair · second attempt</dt><dd><strong>11 / 11</strong> frozen independent checks</dd><dd>The first attempt was quota-interrupted and graded 7/11. This fresh attempt started from the original seed; no architecture review was performed. <a href="${evidence}/README.md">Lifecycle report →</a></dd><dd><a href="#race">A later unscored probe found a controller race →</a></dd></div>
        </dl>
        <p>The <a href="${evidence}/architecture-A3.json">architecture review</a> found clear ownership: the Application owned status and collection sources; Views borrowed them. Refresh, retry, navigation and cleanup behavior survived the extension.</p>
      </section>

      <details id="method" class="news-research-method"><summary>How we checked it: method and limits</summary>
        <p>Gemini 3.8 Flash High at high effort, a fixed runner, published Marionette 5.0.0 packages and matching docs, in Chromium with local fixtures. The handoff used the installed official skill and read-only documentation MCP. Acceptance cases were withheld, without implementation hints, evaluator feedback or silent retries.</p>
        <p>The full record includes the earlier attempts: the first feature passed baseline and withheld checks but failed three author tests; the next extension changed protected tests and was rejected before behavior grading; two original attempts stopped at provider quota. The additional lifecycle attempt is separate from those four.</p>
        <p>The lifecycle checks covered stale loads and errors. Stop and destroy released resources synchronously; the borrowed state source survived destruction. A retained restart had the expected single subscription and heartbeat pair.</p>
        <p id="race">A later <strong>unscored</strong> probe found an agent-written controller race: a canceled restart cleared a newer restart’s flag, letting refresh abort its load. This was outside the eleven scored checks; their original result is unchanged. See the <a href="${evidence}/observations/restart-race.json">observation</a> and <a href="https://github.com/paulfalgout/marionette-realworld-example-app/issues/2">open regression</a>.</p>
        <p>Supporting checks passed 30 native state tests; lint caught four deliberately invalid examples and cleared five valid ones. Review noted duplicated filtering work and an unverified refresh-focus case. This bounded study does not compare frameworks or measure speed, event counts, heap retention, live backends, other browsers or broader models.</p>
      </details>
      <p class="news-research-takeaway">Give the next agent real code, readable contracts and tests it must preserve. Then check its work. Instructions included; verification still required.</p>
      <ul class="news-next"><li><a href="${evidence}/README.md">Read the full report and replay instructions →</a></li><li><a href="/docs/agents/">Equip an agent for your Marionette app →</a></li></ul>
    </div></div>
  </article>`
};
