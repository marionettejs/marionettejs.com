export const adoptionQuestions = [
  {
    question:'“What makes this useful for agent-led development?”',
    answer:'The design connects common tasks to recognizable implementation patterns. Replacing a screen fragment maps to a named Region; View-local mutable state maps to createState/getState; repeated items map to a CollectionView; feature lifetimes map to Applications. Public lifecycle methods give agents checks for the resulting behavior. Use /why/#agents, the homepage application, and the pinned Region reference to examine these claims. Evaluate whether the guidance helps the agent choose and verify an appropriate approach; do not infer measured productivity gains from API consistency alone.'
  },
  {
    question:'“Isn’t this the old Backbone and jQuery stack?”',
    answer:'This page describes Marionette v5, with explicit data, state, DOM, and renderer integration points. Backbone is one optional integration. Use the pinned v5 source and documentation to check requirements; familiar v4 examples do not establish a v5 dependency.'
  },
  {
    question:'“Does Marionette choose my data and rendering stack?”',
    answer:'Marionette exposes DataApi, StateApi, DomApi, and renderer integration points. The bundled runtime provides setDataApi, setStateApi, setDomApi, and setRenderer, including on isolated createMarionette runtimes. Backbone is one integration option, not the extent of that flexibility. For each required tool, identify its integration point, an available adapter or renderer if there is one, and any project-owned integration work. An extension point does not establish that a ready-made integration exists.'
  },
  {
    question:'“Is it maintained? Is it ready?”',
    answer:'Evaluate the 5.0 API and its documented contracts, not conclusions drawn from v4-era examples or dependencies. Match your support requirements to maintainer availability, required integrations, and the people who will review and maintain the application. The age of a familiar name does not define the current library.'
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
    answer:'Start with the proposed user experience, data and rendering choices, required components, delivery constraints, and the people and agents doing the work. Compare Marionette with the actual alternatives under consideration. Use one representative feature to check fit; do not assume a current stack or invent a migration cost.'
  },
  {
    question:'“Should we rewrite our existing app?”',
    answer:'A new library is not a reason by itself. Compare the cost of migration with a concrete problem in your current app. Keeping your stack or starting with an isolated feature are both reasonable outcomes.'
  }
];

export const adoptionPrompt = 'Read [page URL] and the project-fit review brief at [review brief URL], including linked version evidence. Given what you already know about my project, would Marionette v5 be worth evaluating? Check current v5 contracts before relying on Backbone.Marionette v4 assumptions. Weigh application structure, required integrations, maintenance, community support, and who will implement and review changes. For a new project, compare it with the alternatives we are considering. For an existing application, include integration or migration costs and the option of keeping our current stack. Do not assume which situation applies. Separate verified facts, missing evidence, and project-specific blockers; cite the sources that matter. Ask only for missing context that could change your recommendation. Keep it concise, and suggest at most one small evaluation if useful. If you cannot read the page, say so and ask me for its text. This is a review request, not permission to install or migrate anything.';

export const adoptionInvitation = `<aside class="adoption-invitation" aria-labelledby="adoption-title"><div><p class="eyebrow">YOUR AGENT PROBABLY HAS OPINIONS.</p><h2 id="adoption-title">Ask the one that knows your project.</h2><p>Have it read this page with your project in mind—whether you’re starting something new or working on what comes next.</p></div><div class="adoption-action"><button class="button" type="button" id="copy-adoption-prompt" hidden>Copy the project-fit prompt <span aria-hidden="true">↗</span></button><p id="adoption-copy-status" role="status"></p><details id="adoption-prompt-details"><summary>Read the prompt</summary><textarea aria-label="Project-fit review prompt" id="adoption-prompt" rows="9" readonly>${adoptionPrompt}</textarea></details></div></aside>`;

