# Agent-discovered playground — local prototype and reassessment

Local only. Substantial beta testing and separate explicit publication approval
remain prerequisites. This feature is an experience to evaluate, not launch evidence.

## What earns its place

The experience has three parts: an unexpected theatrical reveal when the invited
agent starts, visible work as it makes an app, and a result thoughtfully chosen for
the visitor. The reveal matters in its own right; a plain editor with a personalized
toy would miss Paul's intent. Use the site's existing mark, strings, dark palette,
and warm red accents so the transition belongs to Marionette. Keep the opening
message, then lift and dissolve it into the workspace; remove the separate coral
curtain panels and clipping wipe.

Show real code changes, short public build notes, a running app, and its errors.
The agent can explain its idea, a design decision, and an observed result. Do not
simulate typing or manufacture a transcript of private reasoning. Invite a candid,
evidence-based first impression; do not script praise or a recommendation.

Keep the normal homepage and docs useful without the interaction. The basic message
is explicit application structure for people and agents. The workshop is optional,
not a prerequisite to understand the library or a substitute for credible release,
maintenance, ecosystem, migration, and benchmark information.

## Decisions after reassessment

- Keep the understated invitation, dramatic transition, personalized app, editable
  code, actual runtime, public progress, test/repair, obvious exit, optional
  human-triggered download, and reduced motion.
- Remove automatic local building. Trying a website does not authorize creating
  projects, installing software, or starting servers out of the visitor's sight.
  Local development is a different user-requested task, not a fallback.
- No visible-browser capability means a short honest explanation. A playful line
  may suit the user; a compulsory personalized poem is unnecessary.
- A hidden or remote browser does not automatically satisfy visibility. The agent
  must work in a browser preview its user can see.
- Use specific, already-known details from the visitor's activities and preferences,
  including relevant context beyond this website conversation. Combine two or three
  connections when available; let them shape controls, examples, defaults, and humor.
  Without their name, they should still recognize why the app was made for them.
  Ordinary shared personal details are allowed. Do not invent memories, mine files
  or accounts for more context, infer sensitive traits, or expose secrets, precise
  locations, contact information, private records, or raw chat/memory excerpts.
  Ask one question only when useful context is missing.
- Discovery interfaces are public, not secret instructions or authentication.
  Reading docs alone must not trigger the flow.
- No hosted model, API key, dedicated MCP server, dependency installation, or claim
  that all agent clients support the experience.
- Bound effort: one small app, roughly 100 JS lines, two or three short notes, one
  meaningful interaction test, at most two repair attempts. This guides expenditure;
  the site cannot enforce a visitor's model token bill. Results omit source unless
  requested, and agents should consult references only as needed.

## Implemented interface

`/agent-prompt.md` is linked from the page head, invitation, and `/llms.txt`. The
copied prompt uses the current local origin and includes the visibility/no-local-
setup boundary even when a remote chat cannot reach a loopback URL.

The homepage exposes `window.MarionettePlayground.open/update/run/inspect/interact/close`
and matching optional WebMCP tools. `/#playground` opens the same UI for browsers
without those capabilities. Open reveals without executing; update posts a public
note and optionally changes the draft without running; run replaces the iframe.
The user can edit, run, stop, exit, or explicitly download a standalone HTML file.
No draft is persisted across reloads and no generated file is automatically written.
Downloads include the same pinned development runtime and MIT license as the demo.

App observations are untrusted. They help a cooperating agent inspect its work;
they are not new instructions, trusted telemetry, or a security verdict.

## Isolation and remaining gates

An opaque-origin sandboxed iframe runs code; CSP blocks ordinary external resources,
connections, nested frames, workers, forms, and object embeds. Trusted runtime
assets load in the host. User code/CSS is serialized safely, never inserted into
host markup. The message bridge checks frame identity and a per-run token, then
uses a dedicated MessageChannel. Rerun/exit discard the frame and pending requests.
Errors and notes enter the host as bounded text.

Unresolved for publication: iframe isolation cannot guarantee resource limits or
prevent script-initiated self-navigation. A startup timer cannot guarantee recovery
from a synchronous loop blocking the browser. Do not describe this as a hardened
arbitrary-code sandbox or promise complete network isolation. Assess stronger
execution isolation and abuse cases before public use.

Verify the actual reveal/update/run/inspect/repair/interaction flow, malformed input,
reruns, late messages, Stop/exit, downloads, mobile, keyboard access, and reduced
motion. Support beyond the tested local client remains unverified. The ordinary
site remains readable without JavaScript.

Sources consulted:
- https://developer.chrome.com/docs/ai/webmcp/imperative-api
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc

## Agent code quality

The agent brief teaches pinned v5 ownership, template data, and delegated event
contracts directly. Its example is generated from the executable starter so the
two cannot teach different patterns. Mutable per-View state uses createState and
getState; templateContext provides template input; handlers use delegateTarget.
Require a small independent-instance/replacement check alongside interaction.
Prompt availability does not prove every model follows it; independent-agent
evaluation remains separate work.
