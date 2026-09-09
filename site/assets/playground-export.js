import { revision, validateApp } from './playground-runtime.js';

export const backstageURL = 'https://marionettejs.com/#playground';
export const backstageText = 'Give your AI agent a small stage and see what it makes of you. A personal little app, built in your browser with Marionette.';

export function codePenData(input, vendor, license) {
  const app = validateApp(input);
  // Keep the exact ESM snapshot inside the Pen, safely serialized as inert data.
  const runtime = JSON.stringify({ vendor, license }).replaceAll('<', '\\u003c');
  return {
    title: app.title,
    description: `Made in Marionette Backstage. Bring your agent: ${backstageURL}\nRuntime snapshot: ${revision}`,
    html: `<main id="app"></main>\n<script type="application/json" id="marionette-runtime">${runtime}</script>`,
    css: `* { box-sizing: border-box; }\nbody { margin: 0; font: 16px/1.5 system-ui, sans-serif; }\nbutton, input, select, textarea { font: inherit; max-width: 100%; }\n:focus-visible { outline: 3px solid #2869e8; outline-offset: 3px; }\n\n${app.css}`,
    js: `// Pinned Marionette runtime and MIT license are included in the HTML panel.\nconst marionetteSource = JSON.parse(document.querySelector('#marionette-runtime').textContent).vendor;\nconst marionetteURL = URL.createObjectURL(new Blob([marionetteSource], { type: 'text/javascript' }));\nconst { View, Region, CollectionView, Behavior, Application, MnObject, Events } = await import(marionetteURL);\nURL.revokeObjectURL(marionetteURL);\n\n${app.code}`,
    head: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    html_pre_processor: 'none',
    css_pre_processor: 'none',
    js_pre_processor: 'none',
  };
}
