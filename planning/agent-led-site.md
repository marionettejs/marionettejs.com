# Agent-led Marionette website

## Direction

The agent learns Marionette's APIs and patterns. The person directs the application,
tries its behavior, and can follow the resulting code. Keep agent-led development
central. A traditional human onboarding course is secondary.

The design should feel specific to Marionette: a suspended application, strings
that explain ownership, stage directions, and a little dry humor. Keep the dark
palette and coral mark. Use varied composition, the bold red statement, and
retro game selectors with pixel icons instead of repeated rounded cards. AI authorship is fine; generic
presentation is the problem.

## First implementation

1. **Homepage:** retain the headline and real application preview; make the
   supporting copy concrete about agent implementation and human direction.
   Keep the concise red agent statement; explain the division of work on Why.
   Use the centered section for v5 dependency and integration choices; let the
   demo invitation carry the request to try an app and direct a change.
2. **Why Marionette:** answer project-fit questions in the context of agent-led
   work. Explain responsibilities, available integrations, application-owned
   persistence, and release-candidate status. Evaluate one useful feature and a
   revision, without promising measured productivity or correctness.
3. **Demos:** pair playful names with explicit concepts. Present retro game buttons for the
   demonstrations and a try / inspect / request-a-change journey. Surface the
   Records example and the matching agent guidance.
4. **Documentation presentation:** keep version identity visible, place detailed
   provenance and source utilities in disclosures, reduce mobile preamble, and
   keep navigation and section lookup accessible. Preserve imported contracts,
   canonical Markdown, retrieval resources, and content identity.
5. **Visual pass:** give marketing pages more deliberate rhythm, improve small
   labels, and connect the demo presentation to the rest of the site. Keep
   keyboard interaction, reduced motion, and JavaScript-free reading intact.

Maintainer storytelling and support-page expansion are outside this pass.

## Verification

- Run `npm run check` for the complete build and existing tests.
- Run the existing workshop and documentation browser suites after presentation
  changes; inspect desktop and phone layouts directly.
- Check meaningful journeys: homepage to agent guidance, project-fit prompt,
  demo selection and source navigation, docs search, disclosures and headings.
- Verify no horizontal page overflow and readable static HTML.
- Keep runtime behavior, agent-effectiveness evidence, and publication separate.
  This pass does not establish comparative agent performance.

## First-pass result

Implemented the five areas above on `feat/agent-led-site`. Verification passed:

- Complete build and 105 content/runtime tests.
- Full workshop/demo browser suite.
- Documentation browser suite: 76 page/viewport combinations, search, native
  disclosures, and navigation with and without JavaScript.
- Personal export interactions, sandbox form boundary, and desktop/phone layout.
- Direct visual review of the homepage, agent/human panel, Why page, demos, and
  documentation at desktop and phone sizes.

## Follow-on work

- Observe fresh agents building and revising one representative feature using
  the site. Use those results to choose any changes to the documentation corpus.
- Consider a directly runnable Records demonstration if visitors still struggle
  to connect the smaller lessons to application work.
- Refine copy and visual pacing after reviewing this local implementation.

Changes are reviewed in a feature-branch PR. Merging to `main` triggers the existing
workflow that publishes the website and documentation MCP. Opening the PR does
not authorize that merge or publication.
