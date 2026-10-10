// Website-authored setup. The skill itself stays in the installed release package.
import provenance from '../content/provenance.json' with { type: 'json' };
export const release = provenance.packageVersion;
export const revision = provenance.libraryRevision;
const fence = (code, language = 'sh') => `\`\`\`${language}\n${code}\n\`\`\``;
const copySkill = directory => fence(`node -e "
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('marionette/package.json'));
const destination = '${directory}/marionette';
if (fs.lstatSync(destination, { throwIfNoEntry: false }))
  throw new Error('Skill folder already exists: ' + destination);
fs.cpSync(path.join(root, 'skills/marionette'), destination,
  { recursive: true, force: false, errorOnExist: true });
"`);
const checkout = `git clone --no-checkout --depth 1 https://github.com/marionettejs/marionette.git .marionette-plugin &&\ngit -C .marionette-plugin fetch --depth 1 origin ${revision} &&\ngit -C .marionette-plugin checkout --detach ${revision}`;

export const setupIntro = `Your agent learns the patterns. You get on with the application.

The **skill** guides development using your application's installed, version-matched docs. The **plugin** bundles a loader that finds your application's installed skill, plus the documentation MCP connection. Its version identifies that loader, independently of the framework. Marionette's skill and plugin are free; your selected AI service has its own pricing.

**Setup: Marionette ${release}.**
`;

export const setupPrerequisites = `For a new application, run this in its project directory (Node.js 24 or newer):

${fence(`npm install marionette@${release}`)}

Already using Marionette v5? Keep your installed version and copy its complete skill folder, including the lookup scripts. The copy commands use Node.js on macOS, Linux, or PowerShell. Plugin commands use Bash, zsh, or PowerShell 7+ and stop on failure. Copying stops if the skill folder already exists; review an existing installation before replacing it.
`;

export const clients = [
  { id: 'codex', name: 'Codex', markdown: `### Codex

Copy the installed package's complete skill into your project:

${copySkill('.agents/skills')}

Open Codex in this project. Type \`$marionette\` in your prompt or find it in \`/skills\`. If it does not appear, restart Codex.

${fence('$marionette Build a small feature using the installed Marionette docs.', 'text')}

OpenAI directory publication is not complete. Use this project skill for now. [Codex skill setup](https://learn.chatgpt.com/docs/build-skills).
` },
  { id: 'claude', name: 'Claude Code', markdown: `### Claude Code

For a reproducible plugin installation, use the verified package source revision. The loader still reads the skill from your application’s installed package. Run in your terminal with Git and Claude Code installed. Keep this checkout while using the plugin:

${fence(`${checkout} &&\nclaude plugin marketplace add ./.marionette-plugin &&\nclaude plugin install marionette@marionettejs &&\nclaude plugin list`)}

Start a new Claude Code session in your application. Look for \`/marionette:marionette\` in the skill menu, then use it with your request.

This repository marketplace is separate from the Claude web directory. Installation does not verify live MCP retrieval; match the hosted docs to your installed package before using them. [Claude Code plugin setup](https://code.claude.com/docs/en/discover-plugins).
` },
  { id: 'copilot', name: 'Copilot CLI', markdown: `### Copilot CLI

Install the repository marketplace plugin and its skill loader:

${fence('copilot plugin marketplace add marionettejs/marionette &&\ncopilot plugin install marionette@marionettejs &&\ncopilot plugin list')}

These commands follow the repository's current marketplace, which may change. To hold the plugin at ${release}, use a local checkout of the verified release instead, before installing:

${fence(`${checkout} &&\ncopilot plugin marketplace add ./.marionette-plugin &&\ncopilot plugin install marionette@marionettejs &&\ncopilot plugin list`)}

Choose one marketplace source. Keep the local checkout while using the pinned installation. Run \`copilot skill list\` to confirm Marionette is available. Start Copilot in your application, then ask it to use the Marionette skill for your feature. Live MCP use has not been verified. [Copilot CLI plugin setup](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing).
` },
  { id: 'cursor', name: 'Cursor', markdown: `### Cursor

Copy the installed package's complete skill into your project:

${copySkill('.cursor/skills')}

Open the project in Cursor. In Agent chat, type \`/\` and select \`marionette\`, then describe your feature. Check Customize → Skills if it does not appear.

The publisher application has been submitted; an approved marketplace listing has not been confirmed. Use the project skill meanwhile. [Cursor skill setup](https://cursor.com/docs/skills).
` },
  { id: 'other', name: 'Other agents', markdown: `### Other agents

Copy the complete installed skill into a portable project folder:

${copySkill('.agents/skills')}

If your client supports Agent Skills, move the whole \`.agents/skills/marionette\` folder to its documented skill location. Otherwise give it this concrete request:

${fence('Read .agents/skills/marionette/SKILL.md and use its bundled lookup scripts from this application directory. Confirm the installed Marionette version and source revision, then build the feature I describe.', 'text')}

Client discovery varies. Keep the scripts with the skill; SKILL.md alone is not the complete installation.
` },
];

export const setupOutro = `### Prefer just the docs connection?

[Standalone MCP setup](https://marionettejs.com/docs/mcp/) remains available. Before using the plugin's hosted docs, confirm that **both version and source revision match** your installed package. If they differ, use the installed Markdown and lookup scripts. Copying the skill does not require MCP.
`;

export const setupMarkdown = `${setupIntro}\n${setupPrerequisites}\n## Choose your coding agent\n\n${clients.map(client => client.markdown).join('\n')}\n${setupOutro}`;

export function setupHtml(render, moduleUrl) {
  return `<div class="agent-setup">${render(setupIntro)}${render(setupPrerequisites)}${render("## Choose your coding agent")}<div class="agent-selector" hidden><label for="agent-client">Your coding agent</label><select id="agent-client" aria-controls="agent-instructions">${clients.map(client => `<option value="${client.id}">${client.name}</option>`).join('')}</select><p id="agent-selection-status" class="sr-only" role="status"></p></div><noscript><p>All client instructions are shown below. Select and copy commands directly.</p></noscript><div id="agent-instructions">${clients.map(client => `<section data-agent-client="${client.id}" aria-label="${client.name} setup">${render(client.markdown)}</section>`).join('')}</div>${render(setupOutro)}</div><script type="module" src="${moduleUrl}"></script>`;
}
