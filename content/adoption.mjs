import provenance from './provenance.json' with { type: 'json' };
import documentation from './library-docs/manifest.json' with { type: 'json' };

export const adoptionQuestions = [
  {
    question:'“What makes this useful for agent-led development?”',
    answer:'Marionette gives each change a clear home. A Region owns a changing panel, a View owns its local interaction, a CollectionView manages rows, and an Application coordinates a feature’s lifetime. Your agent can read those contracts, implement a request, and explain where it belongs. You direct the behavior and keep following the code as the application grows. Start at /docs/agent-start/ and try a feature followed by a revision. The case studies cover measured development and performance results.'
  },
  {
    question:'“Isn’t this the old Backbone and jQuery stack?”',
    answer:'Marionette 5 has an independent core built for native DOM operations, plain objects and static arrays. Start a new app with @mnjs/html for incremental templates and add @mnjs/data for observable Models and Collections. Existing Backbone and jQuery applications can use the matching adapters while adopting v5. /docs/quick-start/ gets a new application running; /docs/guides/migration/ covers existing Marionette code.'
  },
  {
    question:'“Does Marionette choose my data and rendering stack?”',
    answer:'You choose the stack; Marionette supplies the ownership and lifecycle. For a new application, use @mnjs/html with View events and Regions, then add @mnjs/data when records need observation. Native string templates remain supported, and adapters connect other renderers, Backbone sources, jQuery DOM methods and XState actors. DataApi, StateApi, DomApi and renderer providers let an application configure its integrations, including within an isolated createMarionette runtime. API transport and persistence live in the data service you choose. See /docs/integrations/setup/ for the configuration points.'
  },
  {
    question:'“What can I build with the current release?”',
    answer:`Build interactive screens, changing lists, editors, routed features and applications with coordinated startup and cleanup. The browser demos use Marionette ${provenance.packageVersion}; the documentation archive is ${documentation.packageVersion}, with separately identified reading-copy updates. Pin the packages for your application and give your agent their installed documentation. Begin with /docs/quick-start/ or the loading, selection and retry flow in /docs/records/.`
  },
  {
    question:'“What about the community and hiring pool?”',
    answer:'Marionette gives the team a shared vocabulary for reading and reviewing changes. A developer joining the project can trace a screen through its Views and Regions, inspect the installed contracts, and use the same examples as an agent. That makes application knowledge easier to pass on. For staffing and support, identify the engineers and maintainers your project will rely on alongside the integrations it needs.'
  },
  {
    question:'“How do I connect the rest of my application?”',
    answer:'Use @mnjs/router for URL-driven feature lifetimes, @mnjs/html for templates, and @mnjs/data for observable records. Keep API calls and persistence in your application’s service layer. Views can own charts, editors and other browser widgets through attach/detach and destroy hooks. Match your required component and server-rendering setup to an available integration before building around it; /docs/integrations/setup/ and /docs/guides/widgets/ are the starting points.'
  },
  {
    question:'“How do I keep directing what the agent builds?”',
    answer:'Ask for the behavior, try it, then ask for the next change. Marionette keeps the changing parts visible: the list owns its rows, the editor owns its draft, and the feature owns its pending work. Ask the agent to show which owner changed and exercise the result. The demos at /demos/ put that workflow beside the running source, ready to edit or download.'
  },
  {
    question:'“Where should we start on a new project?”',
    answer:'Choose a representative feature: a list with selection, an editor that keeps its draft, or a feature that prepares data before opening. Give your agent the user experience, data source and required components, plus /docs/agent-start/. Build it, then request a useful revision. Try the interaction, close and reopen the feature, and follow the changed code. That gives your team something concrete to compare with the alternatives you are considering.'
  },
  {
    question:'“How do we bring it into an existing app?”',
    answer:'Start at a feature boundary that benefits from clearer ownership: a changing panel, a complex editor, or work that needs reliable startup and cleanup. Preserve the host application’s routing and services while the feature uses Views and Regions internally. Use /docs/guides/existing-ui/ for integration and /docs/guides/migration/ for a Marionette version upgrade. Plan a wider migration around the application problem it solves.'
  }
];

export const adoptionPrompt = 'Help me plan a useful first feature with Marionette v5. Read [review brief URL] and [page URL]. Connect its ownership, rendering, data and lifecycle patterns to my project’s requirements. Recommend a representative feature and explain how we would build it, revise it and check the result. For a new project, compare the alternatives we are considering; for an existing application, identify a suitable integration boundary and migration work. Use the matching package documentation for decisive API claims, cite the sources that matter, and flag concrete missing integrations or support requirements. Ask for context only when it changes the recommendation. Start with a plan; let me choose when to implement it.';

export const adoptionInvitation = `<aside class="adoption-invitation" aria-labelledby="adoption-title"><div><p class="eyebrow">GIVE IT A REAL ASSIGNMENT.</p><h2 id="adoption-title">“What would we build first?”</h2><p>Have your agent connect Marionette to a feature you need. Get a concrete plan, then build it, try it, and ask for a revision.</p></div><div class="adoption-action"><button class="button" type="button" id="copy-adoption-prompt" hidden>Copy the project-fit prompt <span aria-hidden="true">↗</span></button><p id="adoption-copy-status" role="status"></p><details id="adoption-prompt-details"><summary>Read the prompt</summary><textarea aria-label="Project-fit review prompt" id="adoption-prompt" rows="9" readonly>${adoptionPrompt}</textarea></details></div></aside>`;
