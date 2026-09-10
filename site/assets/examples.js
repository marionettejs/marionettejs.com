import { getRecipe, listRecipes, recipeRuntime } from './playground-recipes.js';
import { runnerDocument, validateAction } from './playground-runtime.js';
import { compileProject, projectArchive, projectPen } from './demo-project-tools.js';
import { createSourceEditor } from './source-editor.js';

const page = document.querySelector('#examples');
const preview = page.querySelector('.example-preview');
const code = page.querySelector('#example-code');
const css = page.querySelector('#example-css');
const lesson = page.querySelector('#example-lesson');
const sourceEditors = new Map([['app.js', code], ['lesson.js', lesson]]);
const sourceTabs = new Map();
const editorViews = new Map([[code, createSourceEditor(code, 'app.js')], [lesson, createSourceEditor(lesson, 'lesson.js')], [css, createSourceEditor(css, 'style.css')]]);
const title = page.querySelector('#example-title');
const status = page.querySelector('#example-status');
const errors = page.querySelector('#example-errors');
const codepen = page.querySelector('#example-codepen');
let selected, assets, exportAssets, active, snapshot, generation = 0, requestId = 0;
const requests = new Map();

function loadAssets() {
  if (!assets) assets = Promise.all(['/vendor/demos.js', '/vendor/DEMOS-LICENSE.txt'].map(async path => {
    const response = await fetch(path);
    if (!response.ok) throw new Error('The example runtime could not load. Try running it again.');
    return response.text();
  })).then(([vendor, license]) => {
    exportAssets = { vendor, license };
    page.querySelector('[data-example-codepen]').disabled = false;
    return exportAssets;
  }).catch(error => { assets = null; throw error; });
  return assets;
}
function draft() { return { title: title.textContent, files: Object.fromEntries([...sourceEditors].map(([file, editor]) => [file, editor.value])), css: css.value }; }
let sourceRequest;
function showSource(file, symbol) {
  const editor = sourceEditors.get(file);
  if (!editor) return;
  selectTab(sourceTabs.get(file));
  const section = editorViews.get(editor).goToSymbol(symbol);
  const location = page.querySelector('#example-reading-location');
  if (!section) { location.textContent = file + ': this definition is unavailable in the current draft. Use line navigation or finish the edit.'; return; }
  location.textContent = file + ' · line ' + section.line + ' — ' + symbol;
}

function state(includeSource = false) {
  return { selected: selected.id, runtime: recipeRuntime, preview: snapshot, ...(includeSource ? { draft: draft() } : {}) };
}
function report(error) {
  errors.hidden = false;
  errors.textContent = error.message;
  status.textContent = 'The example hit a snag. Its source is still available below.';
}
function stop() {
  generation++;
  if (active) {
    clearTimeout(active.timeout);
    active.resolve?.({ cancelled: true });
    active.port?.close();
    active.frame.remove();
    active = null;
  }
  for (const request of requests.values()) { clearTimeout(request.timeout); request.resolve({ cancelled: true }); }
  requests.clear();
}
function present(value) {
  if (!value || typeof value.ready !== 'boolean' || !Array.isArray(value.errors)) return;
  snapshot = value;
  const selection = value.recipe?.sourceSelection;
  if (selection && selection.requestId !== sourceRequest) {
    sourceRequest = selection.requestId;
    try { showSource(selection.file, selection.symbol); } catch (error) { page.querySelector('#example-reading-location').textContent = error.message; }
  }
  errors.textContent = value.errors.slice(0, 8).map(error => String(error).slice(0, 1500)).join('\n\n');
  errors.hidden = !errors.textContent;
  status.textContent = errors.textContent ? 'The example hit a snag.' : value.ready ? 'Ready. Try the demo. Its code is below.' : 'Preparing the example…';
  if (Number.isFinite(value.contentHeight)) active.frame.style.height = `${Math.max(500, Math.min(2800, value.contentHeight))}px`;
}
async function run() {
  const { app, project } = compileProject(draft());
  stop();
  sourceRequest = undefined;
  const id = generation;
  snapshot = null;
  errors.hidden = true;
  status.textContent = 'Preparing the example…';
  try {
    const { vendor } = await loadAssets();
    if (id !== generation) return { cancelled: true };
    const frame = document.createElement('iframe');
    frame.title = `Example: ${app.title}`;
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.setAttribute('allow', "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; tools 'none'");
    const token = crypto.randomUUID();
    const result = new Promise(resolve => {
      active = { frame, token, resolve };
      active.timeout = setTimeout(() => { stop(); report(new Error('The example did not start within five seconds. Check your edits and run again.')); }, 5000);
    });
    frame.srcdoc = runnerDocument({ app, project, vendor, token });
    preview.replaceChildren(frame);
    return await result;
  } catch (error) {
    if (id === generation) report(error);
    return state();
  }
}
addEventListener('message', event => {
  const session = active;
  if (!session || session.port || event.source !== session.frame.contentWindow || event.origin !== 'null' || event.data?.type !== 'pg-ready' || event.data.token !== session.token) return;
  const channel = new MessageChannel();
  session.port = channel.port1;
  session.port.onmessage = ({ data }) => {
    if (active !== session) return;
    const request = requests.get(data?.id);
    if (data?.type === 'snapshot') {
      present(data.snapshot);
      if (snapshot?.ready || snapshot?.errors.length) {
        clearTimeout(session.timeout);
        session.resolve?.(state());
        session.resolve = null;
      }
    }
    if (request) {
      clearTimeout(request.timeout);
      requests.delete(data.id);
      request.resolve(data.type === 'action-error' ? { error: String(data.error) } : state());
    }
  };
  session.frame.contentWindow.postMessage({ type: 'pg-connect', token: session.token }, '*', [channel.port2]);
});
function query(type, action) {
  if (!active?.port) return Promise.resolve(state());
  const id = ++requestId;
  return new Promise(resolve => {
    const timeout = setTimeout(() => { requests.delete(id); resolve({ ...state(), inspectionError: 'The example did not respond. Restart it to try again.' }); }, 2000);
    requests.set(id, { resolve, timeout });
    active.port.postMessage({ type, action, id });
  });
}
async function select(input) {
  selected = getRecipe(input);
  title.textContent = selected.title;
  code.value = selected.sourceFiles['app.js'];
  lesson.value = selected.sourceFiles['lesson.js'];
  for (const element of page.querySelectorAll('[data-extra-source]')) element.remove();
  for (const file of sourceEditors.keys()) if (!['app.js', 'lesson.js'].includes(file)) {
    editorViews.delete(sourceEditors.get(file));
    sourceEditors.delete(file);
  }
  sourceTabs.clear();
  sourceTabs.set('app.js', page.querySelector('#example-js-tab'));
  sourceTabs.set('lesson.js', page.querySelector('#example-lesson-tab'));
  for (const [file, value] of Object.entries(selected.sourceFiles)) {
    if (sourceEditors.has(file)) continue;
    const id = 'example-' + file.replaceAll('.', '-');
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = id + '-tab';
    tab.dataset.extraSource = '';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', id + '-panel');
    tab.textContent = file;
    const panel = document.createElement('div');
    panel.id = id + '-panel';
    panel.dataset.extraSource = '';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    const editor = document.createElement('textarea');
    editor.spellcheck = false;
    editor.maxLength = 60000;
    editor.setAttribute('aria-label', file + ' JavaScript');
    editor.value = value;
    editor.addEventListener('input', reportEdit);
    panel.append(editor);
    page.querySelector('.example-source-tabs').append(tab);
    page.querySelector('[data-example-run]').before(panel);
    editorViews.set(editor, createSourceEditor(editor, file));
    sourceEditors.set(file, editor);
    sourceTabs.set(file, tab);
    bindTab(tab);
  }
  tabs = [...page.querySelectorAll('[role=tab]')];
  page.querySelector('#example-reading-location').textContent = selected.readingGuide[0].detail;
  const trail = selected.readingGuide.map(entry => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = entry.label;
    button.addEventListener('click', () => {
      try { showSource(entry.file, entry.symbol); } catch (error) { page.querySelector('#example-reading-location').textContent = error.message; }
    });
    return button;
  });
  page.querySelector('#example-reading-guide').replaceChildren(...trail);
  selectTab(tabs[0]);
  css.value = selected.css;
  for (const view of editorViews.values()) view.refresh();
  for (const button of page.querySelectorAll('[data-example-id]')) button.setAttribute('aria-pressed', String(button.dataset.exampleId === selected.id));
  const links = selected.docs.map(path => {
    const link = document.createElement('a');
    link.href = path;
    link.textContent = path.split('/')[2].replaceAll('-', ' ') + ' docs ↗';
    return link;
  });
  page.querySelector('#example-docs').replaceChildren(...links);
  history.replaceState(null, '', '#' + selected.id);
  return run();
}
for (const button of page.querySelectorAll('[data-example-id]')) button.addEventListener('click', () => {
  select({ id: button.dataset.exampleId }).catch(report);
  page.querySelector('.example-workbench').scrollIntoView({ block: 'start' });
});
page.querySelector('[data-example-restart]').addEventListener('click', () => select({ id: selected.id }).catch(report));
page.querySelector('[data-example-run]').addEventListener('click', () => run().catch(report));
function reportEdit() { status.textContent = 'Source edited. Choose “Run my changes” to try it. Exports include these edits.'; }
for (const input of [code, css, lesson]) input.addEventListener('input', reportEdit);
let tabs = [...page.querySelectorAll('[role=tab]')];
function selectTab(tab) {
  for (const item of tabs) {
    item.setAttribute('aria-selected', String(item === tab));
    item.tabIndex = item === tab ? 0 : -1;
    page.querySelector('#' + item.getAttribute('aria-controls')).hidden = item !== tab;
  }
  const editor = page.querySelector('#' + tab.getAttribute('aria-controls') + ' textarea');
  editorViews.get(editor)?.refresh();
}
function bindTab(tab) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const visibleTabs = tabs.filter(item => !item.hidden);
    const index = visibleTabs.indexOf(tab);
    const next = event.key === 'Home' ? visibleTabs[0] : event.key === 'End' ? visibleTabs.at(-1) : visibleTabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + visibleTabs.length) % visibleTabs.length];
    selectTab(next); next.focus();
  });
}
for (const tab of tabs) bindTab(tab);
loadAssets().catch(report);
codepen.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const pen = projectPen(draft(), exportAssets.vendor, exportAssets.license);
    pen.description = `A Marionette example: https://marionettejs.com/demos/#${selected.id}\nRuntime: ${recipeRuntime.version}`;
    codepen.elements.data.value = JSON.stringify(pen);
    codepen.submit();
  } catch (error) { report(error); }
});
page.querySelector('[data-example-download]').addEventListener('click', async () => {
  try {
    const app = draft(), { vendor, license } = await loadAssets();
    const url = URL.createObjectURL(projectArchive(app, vendor, license));
    const link = document.createElement('a'); link.href = url; link.download = selected.id + '.zip'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { report(error); }
});
const api = Object.freeze({
  list: listRecipes, select, run,
  async inspect({ includeSource = false } = {}) { const result = await query('inspect'); return includeSource ? { ...result, draft: draft() } : result; },
  interact(input) { return query('act', validateAction(input)); }
});
Object.defineProperty(window, 'MarionetteExamples', { value: api });
addEventListener('pagehide', stop);
addEventListener('pageshow', event => { if (event.persisted) status.textContent = 'Preview stopped while away. Run your retained changes below, or reset the example.'; });
const initial = listRecipes().find(recipe => '#' + recipe.id === location.hash) || listRecipes()[0];
const linkedDemo = Boolean(location.hash);
select({ id: initial.id }).then(() => {
  if (linkedDemo) page.querySelector('.example-workbench').scrollIntoView({ block: 'start' });
}).catch(report);
