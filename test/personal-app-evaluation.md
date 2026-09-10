# Personalized-app first-attempt evaluation

Status: a local exploratory pilot ran on September 10, 2026. Its delivery failure
informed bounded workshop reads; observed missed updates and skipped build notes
informed the revised brief. This is not the library's scored benchmark and does
not establish a general first-attempt success rate. Record a new profile before
further model runs.
The executable starter passing browser checks does not establish that a new agent
will follow the brief. This protocol evaluates the invitation, not the library's
separate thirteen-task benchmark. Do not change that corpus or call this a frozen
or scored series before its run profile and inputs are approved and recorded.

## Inputs and provenance

Build the website, then preserve these exact inputs before a trial:

- `dist/agent-prompt.md`: the brief including executable JavaScript and CSS.
- `site/workshop/app.js` and `style.css`: readable starter sources.
- `package-lock.json`, `content/provenance.json`, and
  `site/vendor/demos.provenance.json`: exact published beta.2 runtime and hashes.
- Website source commit plus a patch/hash for any local changes; archive the full
  build used by the browser. Record the library guidance revision separately.

An agent receives the same invitation and visible workshop that a user receives.
Do not add architecture reminders, the scoring rubric, repository access, the
reference solution, or corrective hints outside that normal consumer path.

## Synthetic user cases

Give each case its own fresh conversation and reset browser state. These are
fictional preferences, not customer data or claims about the real user.

1. **Rehearsal notebook:** “I play bass in a small jazz trio. I like paper setlists,
   dry humor, and finishing rehearsal on time. Make me something personal using
   the Marionette invitation.” A meaningful interaction should help choose or
   organize a short rehearsal; renaming a counter does not satisfy the request.
2. **Balcony garden:** “I grow herbs on a tiny balcony and draw little botanical
   labels. I prefer a quiet morning ritual to streaks or scores. Make me something
   personal using the Marionette invitation.” Observe an actual care/selection
   workflow and its effect on another part of the UI.
3. **Weekend micro-adventures:** “I like short neighborhood walks, sketching signs,
   and choosing an outing by mood. Big planning dashboards put me off. Make me
   something personal using the Marionette invitation.” Observe the choice-to-result
   workflow and a repeat choice with an unrelated draft still present, if applicable.

Do not prescribe identical components to every app. The agent should choose a
structure appropriate to its idea, including a genuinely smaller design when enough.

## Required run declaration

Before any paid or delegated trial, record and obtain authorization for:

- Exact runner/client, model identifier, reasoning setting and tool versions.
- A visible browser profile and its supported controls; no private archives,
  account connectors, installation, external assets or network requests from app code.
- Which brief variants, cases and fresh attempts will run; serial execution by default.
- Per-attempt and total token/spend ceilings, elapsed-time limits, stopping rules,
  retry handling, and the location of raw traces and screenshots.
- The scoring reviewer and rubric; keep that reviewer blind to variant identity
  when comparing versions. Never select only favorable attempts after viewing results.

This document does not authorize or start those runs. A first small pilot is useful
for discovering workflow defects; its sample cannot establish a population success rate.

## Capture the first submission before repairs

Save the exact first code/CSS passed to `run_marionette_app`, any startup errors,
rendered desktop/narrow screenshots, and observable interactions. Score that
submission separately from the final repaired result. Keep all failed attempts and
capability failures, with reasons. Record repair count and elapsed work. A first
submission that fails to start is a first-attempt failure even if later repaired.

## Acceptance

Require working interaction, no unhandled errors, and a readable ownership structure.
Review the code and run the relevant public behavior; a keyword count is insufficient.

- View templates own ordinary content; named Regions own independent child screens.
  Repeated records have a data source and CollectionView rather than a View store.
- Actual data/state capability matches the design. For shared observable records,
  change the source directly and observe every interested display.
- Unrelated editable drafts, focus, selection and child identity survive relevant
  updates. Input/output is escaped, controls labeled, and keyboard interaction works.
- Region replacement cleans up the prior tree. Retained old controls do nothing;
  attachment-bound resources do not duplicate on reattachment. Async work cannot
  apply stale results, when the app actually has async work.
- The code is proportionate, with semantic events and focused responsibilities.
  No lesson instrumentation masquerades as product behavior.

Score each visual/personal criterion 0–3: absent/broken, generic/rough, considered,
excellent. Require at least 12/15 with no zero, alongside all applicable behavior gates:

1. Personal details shape controls and defaults, not only labels.
2. A coherent visual idea with deliberate typography and hierarchy.
3. Consistent spacing, palette, contrast and a memorable detail.
4. Desktop and narrow layouts preserve usable controls and focus treatment.
5. Useful empty, active and completion states; appropriate tone and restraint.

Have a human review the screenshots and code. Record reasons for each score and
mark inapplicable behavior explicitly. Do not equate “all gates pass” with proof
that an app is beautiful, or a visual score with correct lifecycle behavior.

## Deterministic controls available now

`npm run test:browser` exercises the composed starter with 17 public data/DOM/
ownership checks. It rejects handler-only rendering that misses direct Model
changes and an unowned DOM listener that survives destruction.
`node test/browser/personal-preview.mjs` verifies real mouse and keyboard form
submission, the exported beta.2 runtime, narrow layout, and blocked external form
submission. It saves screenshots for visual review. These controls validate the
reference and checking mechanism; they are not fresh-agent trials.
