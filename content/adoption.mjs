import provenance from './provenance.json' with { type: 'json' };

export const adoptionQuestions = [
  {
    question:'“What makes this useful for agent-led development?”',
    answer:'The agent learns the APIs and implementation patterns; the person directs the application, tries its behavior, and can follow the resulting code. Replacing a screen fragment maps to a named Region; View-local mutable state maps to createState/getState; repeated items map to a CollectionView; feature lifetimes map to Applications. Use /docs/agent-start/ for task routing and /why/#agents for the working arrangement. Evaluate this with one useful feature and a requested revision, checking the new behavior and behavior that should remain. API consistency alone does not establish measured productivity gains.'
  },
  {
    question:'“Isn’t this the old Backbone and jQuery stack?”',
    answer:'Marionette v5 core no longer requires Backbone, jQuery, or Underscore. Core supports plain objects, static arrays, and native DOM operations. Optional adapters connect Backbone data/state and jQuery DOM methods, with their own peer requirements. Use /docs/guides/migration/ and /docs/packages/adapters/ to check the matching v5 contracts; familiar v4 examples do not establish a v5 dependency.'
  },
  {
    question:'“Does Marionette choose my data and rendering stack?”',
    answer:'Marionette exposes DataApi, StateApi, DomApi, and renderer integration points. The bundled runtime provides setDataApi, setStateApi, setDomApi, and setRenderer, including on isolated createMarionette runtimes. @mnjs/data is an optional observable data layer; API transport and persistence need a separate integration or a different data solution. Backbone is another integration option. For each required tool, identify its integration point, an available adapter or renderer if there is one, and any project-owned integration work. An extension point does not establish that a ready-made integration exists.'
  },
  {
    question:'“Is it maintained? Is it ready?”',
    answer:`This site uses Marionette ${provenance.packageVersion}, a published npm release candidate. Pin matching versions as described in /docs/quick-start/ and assess whether a prerelease fits the project delivery requirements. Verify maintainer availability, required integrations, and who will review and maintain the application. The package version alone does not establish production suitability for a particular project.`
  },
  {
    question:'“What about the community and hiring pool?”',
    answer:'Count the support your project needs, not just framework specialists. When agents do much of the implementation, clear contracts, coherent examples, and code a new reviewer can understand deserve weight too. A large example archive can include stale or conflicting patterns. Experienced engineers, available maintainers, and reliable integrations still matter; agents do not replace them.'
  },
  {
    question:'“Does a smaller ecosystem mean rebuilding everything?”',
    answer:'List the dependencies you actually need: routing, server rendering, accessible components, forms, data tooling, and so on. Verify how each fits v5 before recommending adoption. Neither “it is JavaScript, so everything works” nor “it is not React, so nothing works” is enough.'
  },
  {
    question:'“Will it just produce more AI slop?”',
    answer:'An agent can still build the wrong thing. Marionette gives what it builds an explicit structure you can inspect and change. Test that with a useful feature, an actual interaction, and cleanup—not a screenshot or an impressive amount of generated code.'
  },
  {
    question:'“How should we evaluate it for a new project?”',
    answer:'Start with the proposed user experience, data and rendering choices, required components, delivery constraints, and the people and agents doing the work. Compare Marionette with the actual alternatives under consideration. Ask the agent to implement one representative feature, then request a revision. Check both the revised behavior and the behavior that should remain, including closing and reopening the feature. Judge whether the person can follow and keep directing the result without studying every API. Do not assume a current stack or invent a migration cost.'
  },
  {
    question:'“Should we rewrite our existing app?”',
    answer:'A new library is not a reason by itself. Compare the cost of migration with a concrete problem in your current app. Keeping your stack or starting with an isolated feature are both reasonable outcomes.'
  }
];

export const adoptionPrompt = 'Would Marionette v5 be worth evaluating for my project? Use [review brief URL] for v5 claims and tradeoffs, and [page URL] for the broader discussion as needed. Base a concise recommendation on my requirements, required integrations, maintenance and support, and who will implement and review changes. Compare the alternatives we are considering for a new project; for an existing app, include integration or migration costs and keeping the current stack. Verify decisive claims against version evidence rather than v4 assumptions. Distinguish facts, missing evidence, and blockers; cite sources that matter. Ask only for context that could change the recommendation, and suggest at most one small evaluation if useful. If the sources are inaccessible, say so and request their text. This review does not authorize installation or migration.';

export const adoptionInvitation = `<aside class="adoption-invitation" aria-labelledby="adoption-title"><div><p class="eyebrow">FIRST, GIVE IT AN ASSIGNMENT.</p><h2 id="adoption-title">“Would this fit what we’re building?”</h2><p>Have your agent weigh Marionette against your project’s requirements and alternatives. “Keep what we have” is a perfectly useful answer.</p></div><div class="adoption-action"><button class="button" type="button" id="copy-adoption-prompt" hidden>Copy the project-fit prompt <span aria-hidden="true">↗</span></button><p id="adoption-copy-status" role="status"></p><details id="adoption-prompt-details"><summary>Read the prompt</summary><textarea aria-label="Project-fit review prompt" id="adoption-prompt" rows="9" readonly>${adoptionPrompt}</textarea></details></div></aside>`;
