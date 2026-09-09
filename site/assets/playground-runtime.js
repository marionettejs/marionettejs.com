export const version = '5.0.0-beta.1';
export const revision = 'b06750c507494441f0b2298766b70087e45346a2';
export const starter = {
  title: 'The small victories department',
  code: `// View and Region are supplied by the pinned Marionette runtime.
// Your agent can replace this with something that feels like you.
const Victories = View.extend({
  createState() { return { victories: 0 }; },
  templateContext() { return this.getState(); },
  template: ({ victories }) => \`<p class="eyebrow">THE SMALL VICTORIES DEPARTMENT</p>
    <h1>That counts.</h1>
    <p>You have acknowledged <strong>\${victories}</strong> small \${victories === 1 ? 'victory' : 'victories'}.</p>
    <button id="celebrate" data-amount="1"><span>I did a thing ↗</span></button>
    <p class="aside">Opened the editor? Counts. Closed a tab? Heroic.</p>\`,
  events: { 'click #celebrate': 'celebrate' },
  celebrate({ delegateTarget }) {
    this.getState().victories += Number(delegateTarget.dataset.amount);
    this.render();
  }
});
export const region = new Region({ el: '#app' });
region.show(new Victories());`,
  css: `/* Make it yours. No external fonts or assets needed. */
body { background: #eee9df; color: #222521; }
#app { max-width: 600px; margin: auto; padding: 48px 28px; }
h1 { font: italic 76px/1 Georgia, serif; letter-spacing: -4px; }
.eyebrow { font: 11px/1.6 monospace; letter-spacing: 2px; }
p { line-height: 1.7; }
strong { font-size: 28px; }
button { background: #d84635; color: white; border: 0; padding: 16px 22px;
  border-radius: 5px; cursor: pointer; font: inherit; }
button:hover { background: #b73528; }
.aside { font-size: 13px; opacity: .7; margin-top: 40px; }
@media (max-width: 420px) { h1 { font-size: 58px; } }`
};

export function validateApp(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['title', 'code', 'css'].includes(key))) {
    throw new Error('Expected {title, code, css}, with no other fields.');
  }
  for (const [key, max] of [['title', 100], ['code', 60000], ['css', 20000]]) {
    if (typeof input[key] !== 'string' || input[key].length > max || (key !== 'css' && !input[key].trim())) {
      throw new Error(`${key} must be ${key === 'css' ? 'a' : 'a non-empty'} string of at most ${max} characters.`);
    }
  }
  return { title: input.title, code: input.code, css: input.css };
}

export function validateAction(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['id', 'action', 'value'].includes(key)) ||
      typeof input.id !== 'string' || !/^[\w-]{1,80}$/.test(input.id) ||
      !['click', 'input'].includes(input.action) ||
      (input.action === 'input' ? typeof input.value !== 'string' || input.value.length > 2000 : 'value' in input)) {
    throw new Error('Expected {id, action: "click"} or {id, action: "input", value}, using a simple element id.');
  }
  return { ...input };
}

// JSON is embedded only as script text; escape HTML parser delimiters, including
// user-provided closing script tags. CSS and app code never become host markup.
const scriptJSON = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
const html = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function boot(config) {
  const { app, vendor, token, standalone, version, revision } = config;
  const postToParent = parent.postMessage.bind(parent);
  const errors = [];
  let port, appModule, library, ready = false, snapshotTimer;
  const clip = (value, length = 1500) => String(value).slice(0, length);
  function inspectRecipe() {
    if (typeof appModule?.inspectRecipe !== 'function') return null;
    try {
    const value = appModule.inspectRecipe();
    const list = key => Array.isArray(value?.[key]) ? value[key].slice(0, 40) : [];
    return {
      truncated: ['checks', 'lifecycle', 'views', 'regions'].some(key => Array.isArray(value?.[key]) && value[key].length > 40) || value?.lifecycleDropped > 0,
      checks: list('checks').map(item => ({ id: clip(item?.id, 80), expected: item?.expected === true, observed: typeof item?.observed === 'boolean' ? item.observed : null })),
      lifecycle: list('lifecycle').map(item => clip(item, 120)),
      views: list('views').filter(item => item?.view instanceof library.View || item?.view instanceof library.CollectionView).map(({ name, view }) => ({ name: clip(name, 80), rendered: view.isRendered(), attached: view.isAttached(), destroyed: view.isDestroyed() })),
      regions: list('regions').filter(item => item?.region instanceof library.Region).map(({ name, region }) => ({ name: clip(name, 80), hasView: region.hasView(), currentView: region.currentView ? clip(list('views').find(item => item?.view === region.currentView)?.name ?? '(unlisted)', 80) : null }))
    };
    } catch (error) { return { inspectionError: clip(error?.message || error) }; }
  }
  function snapshot() {
    const region = appModule?.region;
    return {
      ready, errors: [...errors], runtime: { package: 'marionette', version, revision }, recipe: inspectRecipe(),
      text: document.querySelector('#app')?.innerText.slice(0, 6000) || '',
      controls: [...document.querySelectorAll('#app button, #app input, #app select, #app textarea')].slice(0, 40).map(el => ({
        id: el.id, tag: el.tagName.toLowerCase(), label: clip(el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.textContent || el.placeholder || '', 120),
        value: clip(el.value ?? '', 500), disabled: el.disabled, checked: Boolean(el.checked)
      })),
      region: library && region instanceof library.Region ? {
        hasView: region.hasView(), rendered: region.currentView?.isRendered() ?? false,
        attached: region.currentView?.isAttached() ?? false
      } : null
    };
  }
  function send(id) {
    try { port?.postMessage({ type: 'snapshot', id, snapshot: snapshot() }); }
    catch { /* The host may have replaced this run. */ }
  }
  function record(error) {
    errors.push(clip(error?.stack || error?.message || error));
    errors.splice(0, Math.max(0, errors.length - 8));
    const output = document.querySelector('#runner-errors');
    output.hidden = false;
    output.textContent = errors.join('\n\n');
    send();
  }
  addEventListener('error', event => record(event.error || event.message));
  addEventListener('unhandledrejection', event => record(event.reason));
  addEventListener('securitypolicyviolation', event => record(`Blocked by preview policy: ${event.violatedDirective}`));
  // Navigation is not part of this app contract. This blocks ordinary link clicks;
  // it is not a security boundary against scripts assigning window.location.
  document.addEventListener('click', event => { if (event.target.closest?.('a')) event.preventDefault(); }, true);
  async function start() {
    const css = document.createElement('style');
    css.textContent = app.css;
    document.head.append(css);
    const vendorURL = URL.createObjectURL(new Blob([vendor], { type: 'text/javascript' }));
    const appURL = URL.createObjectURL(new Blob([
      `import { View, Region, CollectionView, Behavior, Application, MnObject, Events } from ${JSON.stringify(vendorURL)};\n`, app.code
    ], { type: 'text/javascript' }));
    try {
      library = await import(vendorURL);
      appModule = await import(appURL);
      ready = true;
    } catch (error) { record(error); }
    finally { URL.revokeObjectURL(vendorURL); URL.revokeObjectURL(appURL); send(); }
    new MutationObserver(() => {
      clearTimeout(snapshotTimer);
      snapshotTimer = setTimeout(() => send(), 100);
    }).observe(document.querySelector('#app'), { subtree: true, childList: true, characterData: true, attributes: true });
    document.addEventListener('input', () => { clearTimeout(snapshotTimer); snapshotTimer = setTimeout(() => send(), 100); });
  }
  if (standalone) { start(); return; }
  function connect(event) {
    if (event.source !== parent || event.data?.type !== 'pg-connect' || event.data.token !== token || !event.ports[0]) return;
    removeEventListener('message', connect);
    port = event.ports[0];
    port.onmessage = ({ data }) => {
      if (!data || !Number.isSafeInteger(data.id)) return;
      try {
        if (data.type === 'act') {
          const el = document.getElementById(data.action.id);
          if (!el || !document.querySelector('#app').contains(el) || !el.matches('button,input,select,textarea') || el.disabled) {
            throw new Error('No enabled app control with that id. Inspect the preview first.');
          }
          if (data.action.action === 'click') el.click();
          else {
            if (!el.matches('input:not([type=file]),select,textarea')) throw new Error('This control does not accept text input.');
            el.focus();
            el.value = data.action.value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        send(data.id);
      } catch (error) { port.postMessage({ type: 'action-error', id: data.id, error: clip(error.message) }); }
    };
    start();
  }
  addEventListener('message', connect);
  postToParent({ type: 'pg-ready', token }, '*');
}

export function runnerDocument({ app, vendor, token, standalone = false }) {
  validateApp(app);
  if (!/^[a-f0-9-]+$/.test(token)) throw new Error('Invalid runner token.');
  const csp = `default-src 'none'; script-src 'nonce-${token}' blob:; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; media-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${html(app.title)}</title><style>*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,sans-serif}button,input,select,textarea{font:inherit;max-width:100%}:focus-visible{outline:3px solid #2869e8;outline-offset:3px}#runner-errors{white-space:pre-wrap;overflow-wrap:anywhere;background:#2e1518;color:#ffd1cb;padding:20px;font:12px/1.6 monospace}</style></head><body><main id="app"></main><pre id="runner-errors" hidden role="alert"></pre><script nonce="${token}" type="module">(${boot.toString()})(${scriptJSON({ app, vendor, token, standalone, version, revision })});</script></body></html>`;
}

export function standaloneDocument(app, vendor, license, token) {
  const runner = runnerDocument({ app, vendor, token, standalone: true });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${html(app.title)}</title><style>body{margin:0;background:#101113}iframe{width:100%;height:100dvh;border:0;display:block}</style></head><body><iframe title="${html(app.title)}" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${html(runner)}"></iframe><!-- Marionette 5.0.0-beta.1 source ${revision}. License below. --><template id="marionette-license">${html(license)}</template></body></html>`;
}
