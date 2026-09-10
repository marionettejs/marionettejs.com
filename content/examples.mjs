import { listRecipes } from '../site/assets/playground-recipes.js';
const icons = ['☑', '📻', '🚀'];
const chooserNames = ['TodoMVC', 'Radio Ghostbusters', 'Cheese Patrol'];
const chooserHints = ['Models. Rows. Your next small victory.', 'Unplug the ghost wiggles.', 'Catch a flying Promise.'];
export const examples = {
  title: 'Interactive demos — Marionette 5',
  description: 'Explore real Marionette examples with readable code and observable results. TodoMVC, owned resources, cancellation, and Application readiness.',
  active: 'examples',
  body: `<section class="examples-page" id="examples">
    <header class="examples-intro"><p class="eyebrow">SMALL APPS / VISIBLE CONSEQUENCES</p><h1>See what the<br><em>code does.</em></h1><p>Try a thing. Read the code. See what changed.<br>No agent required. No disappearing evidence.</p></header>
    <section class="example-chooser" id="example-chooser" aria-label="Choose a demo"><div class="example-cards">${listRecipes().map((recipe, i) => `<button id="${recipe.id}" data-example-id="${recipe.id}" class="demo-card" type="button" aria-pressed="false"><span class="example-icon" aria-hidden="true">${icons[i]}</span><span class="example-card-copy"><strong>${chooserNames[i]}</strong><small>${chooserHints[i]}</small></span></button>`).join('')}</div></section>
    <section class="example-workbench" aria-label="Interactive example">
      <header class="example-heading"><div><p class="eyebrow">ON THE BENCH</p><h2 id="example-title">TodoMVC, one View at a time</h2></div><div><button data-example-restart type="button">Reset example</button><button data-example-download type="button">Download project ↓</button><button data-example-codepen form="example-codepen" type="submit" disabled>View on CodePen ↗</button></div></header>
      <p id="example-status" role="status">Preparing the example…</p><pre id="example-errors" role="alert" hidden></pre>
      <div class="example-preview" aria-label="Running example"></div>
      <section class="example-source" aria-labelledby="example-source-title"><h3 id="example-source-title">Read &amp; edit the Marionette code</h3><p>Start with a short reading trail. Files follow the owners: app.js composes the demo, feature files hold its Views, and motion.js isolates animation mechanics. lesson.js observes the app; lesson-ui.js renders the teaching interface. Imports and exports are real. Download includes a runnable project and the pinned runtime.</p><nav id="example-reading-guide" aria-label="Source reading trail"></nav><p id="example-reading-location" role="status"></p><div class="example-source-tabs" role="tablist" aria-label="Example source files"><button type="button" role="tab" id="example-js-tab" aria-selected="true" aria-controls="example-js-panel">app.js</button><button type="button" role="tab" id="example-css-tab" aria-selected="false" aria-controls="example-css-panel" tabindex="-1">style.css</button><button type="button" role="tab" id="example-lesson-tab" aria-selected="false" aria-controls="example-lesson-panel" tabindex="-1">lesson.js</button></div><div role="tabpanel" id="example-js-panel" aria-labelledby="example-js-tab"><label for="example-code" class="sr-only">Example JavaScript</label><textarea id="example-code" spellcheck="false" maxlength="60000"></textarea></div><div role="tabpanel" id="example-css-panel" aria-labelledby="example-css-tab" hidden><label for="example-css" class="sr-only">Example CSS</label><textarea id="example-css" spellcheck="false" maxlength="20000"></textarea></div><div role="tabpanel" id="example-lesson-panel" aria-labelledby="example-lesson-tab" hidden><label for="example-lesson" class="sr-only">Lesson JavaScript</label><textarea id="example-lesson" spellcheck="false" maxlength="60000"></textarea></div><button data-example-run type="button">Run my changes ↗</button></section>
      <p class="example-export-note">CodePen runs the current module project. Download includes its source files, HTML, CSS, and runtime. Your Backstage app is separate.</p><nav id="example-docs" aria-label="Related documentation"></nav>
      <form id="example-codepen" action="https://codepen.io/pen/define" method="POST" target="_blank" rel="noopener noreferrer" hidden><input name="data" type="hidden"></form>
    </section>

    <noscript><p>The interactive examples need JavaScript. Read the <a href="/docs/region/">Region guide</a> or <a href="/docs/application/">Application guide</a>.</p></noscript>
  </section>`
};

export const demosInvitation = `
<section class="home-demos" id="demos" aria-labelledby="home-demos-title">
  <div class="home-demos-copy"><p class="eyebrow">TRY IT YOURSELF</p><h2 id="home-demos-title">A few things<br>you can <em>poke.</em></h2><p>Real apps. Readable source.<br>Try a todo list, retire a radio, or cancel a launch. The code and the consequences stay in view.</p><a class="text-link" href="/demos/">Explore the demos →</a></div>
  <div class="home-demo-cards">${listRecipes().map((recipe, i) => `<a class="demo-card" href="/demos/#${recipe.id}"><span class="example-icon" aria-hidden="true">${icons[i]}</span><span class="example-card-copy"><strong>${chooserNames[i]}</strong><small>${chooserHints[i]}</small></span></a>`).join('')}</div>
</section>`;
