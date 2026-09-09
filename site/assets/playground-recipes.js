// The workshop, documentation export, and MCP all consume these exact sources.
export const recipeRuntime = Object.freeze({ package: 'marionette', version: '5.0.0-beta.2', revision: '13f4954c352e646c413091ffdd83f6da59404573' });
const css = `body { background:#f4f0e8; color:#222; } #app { padding:24px; max-width:720px; margin:auto; } button,input { margin:6px; padding:8px; } label { display:block; } pre { white-space:pre-wrap; }`;
const instrumentation = `// This recipe observes only its own objects through public APIs.
const lifecycle = [], checks = new Map(), views = [], regions = [];
let lifecycleDropped = 0;
function track(name, view) {
  views.push({ name, view });
  for (const event of ['render', 'attach', 'detach', 'before:destroy', 'destroy']) {
    view.on(event, () => { lifecycle.push(name + ':' + event); if (lifecycle.length > 40) { lifecycle.shift(); lifecycleDropped++; } });
  }
  return view;
}
function check(id, observed) { checks.set(id, { id, expected: true, observed: Boolean(observed) }); }
export function inspectRecipe() { return { checks: [...checks.values()], lifecycle, lifecycleDropped, views, regions }; }
`;
export const recipes = [
  {
    id: 'list-detail', title: 'A draft that survives list changes',
    summary: 'Self-managed CollectionView children and a separate detail Region. Add/remove another child without rerendering the shell or editor. This does not demonstrate observable collection reconciliation.',
    docs: ['/docs/collection-view/', '/docs/view/', '/docs/lifecycle/'],
    checks: ['child-identity', 'input-identity', 'draft-preserved', 'focus-preserved', 'removed-child-destroyed'].map(id => ({ id, expected: true })),
    css,
    code: instrumentation + `const Row = View.extend({ tagName: 'li', template: ({ label }) => label });
const Editor = View.extend({
  createState() { return { draft: '' }; },
  template: () => '<label>Unsaved draft <input id="draft" autocomplete="off"></label><p>Type a draft, then press Enter in the field to change another row while retaining focus.</p>',
  events: { 'input #draft': 'remember', 'keydown #draft': 'key' },
  remember({ delegateTarget }) { this.getState().draft = delegateTarget.value; },
  key(event) { if (event.key === 'Enter') { event.preventDefault(); this.trigger('change:list'); } }
});
const Shell = View.extend({
  template: () => '<h1>A draft that stays put</h1><button id="change-list">Add/remove another row</button><div class="list"></div><div class="detail"></div>',
  regions: { list: '.list', detail: '.detail' },
  events: { 'click #change-list': 'changeList' },
  onRender() {
    this.list = track('list', new CollectionView({ tagName: 'ul' }));
    this.editor = track('editor', new Editor());
    this.showChildView('list', this.list);
    this.showChildView('detail', this.editor);
    this.row = track('retained-row', new Row({ model: { label: 'The original row' } }));
    this.list.addChildView(this.row);
    this.listenTo(this.editor, 'change:list', this.changeList);
    regions.push({ name: 'shell.list', region: this.getRegion('list') }, { name: 'shell.detail', region: this.getRegion('detail') });
  },
  changeList() {
    const input = this.editor.el.querySelector('#draft');
    const draft = input.value, focused = document.activeElement === input, row = this.row, rowElement = row.el;
    if (this.extra) {
      const removed = this.extra;
      this.list.removeChildView(removed);
      check('removed-child-destroyed', removed.isDestroyed());
      this.extra = null;
    } else {
      this.extra = new Row({ model: { label: 'An unrelated row' } });
      this.list.addChildView(this.extra);
    }
    check('child-identity', this.list.children.findByCid(row.cid) === row && row.el === rowElement && !row.isDestroyed());
    check('input-identity', this.editor.el.querySelector('#draft') === input);
    check('draft-preserved', input.value === draft && this.editor.getState().draft === draft);
    if (focused) check('focus-preserved', document.activeElement === input);
  }
});
export const region = new Region({ el: '#app' });
regions.push({ name: 'root', region });
region.show(track('shell', new Shell()));`
  },
  {
    id: 'owned-widget', title: 'A widget with an owner',
    summary: 'A View explicitly releases an application-owned widget subscription in onBeforeDestroy. Region replacement destroys its previous View; parent teardown destroys the replacement.',
    docs: ['/docs/lifecycle/', '/docs/region/'],
    checks: ['old-view-destroyed', 'widget-disposed-once', 'old-widget-unsubscribed', 'replacement-live', 'parent-cleanup'].map(id => ({ id, expected: true })),
    css,
    code: instrumentation + `function createWidget(el) {
  const state = { deliveries: 0, disposals: 0 };
  const receive = () => { state.deliveries++; el.textContent = 'Widget deliveries: ' + state.deliveries; };
  document.addEventListener('recipe:tick', receive);
  return { state, dispose() { state.disposals++; document.removeEventListener('recipe:tick', receive); } };
}
const Widget = View.extend({
  template: () => '<p class="widget">Widget deliveries: 0</p>',
  onAttach() { this.widget = createWidget(this.el.querySelector('.widget')); },
  onBeforeDestroy() { this.widget?.dispose(); }
});
const Shell = View.extend({
  template: () => '<h1>Who cleans up the widget?</h1><button id="replace-widget">Replace widget</button><button id="destroy-owner">Destroy owner</button><div class="slot"></div>',
  regions: { widget: '.slot' },
  events: { 'click #replace-widget': 'replace', 'click #destroy-owner': 'finish' },
  onRender() { this.showChildView('widget', track('first-widget', new Widget())); regions.push({ name: 'shell.widget', region: this.getRegion('widget') }); },
  replace() {
    const old = this.getChildView('widget'), deliveries = old.widget.state.deliveries;
    const next = track('replacement-widget', new Widget());
    this.showChildView('widget', next);
    document.dispatchEvent(new Event('recipe:tick'));
    check('old-view-destroyed', old.isDestroyed());
    check('widget-disposed-once', old.widget.state.disposals === 1);
    check('old-widget-unsubscribed', old.widget.state.deliveries === deliveries);
    check('replacement-live', !next.isDestroyed() && next.widget.state.deliveries === 1);
  },
  finish() {
    const child = this.getChildView('widget');
    region.empty();
    check('parent-cleanup', this.isDestroyed() && child.isDestroyed() && child.widget.state.disposals === 1 && !region.hasView());
  }
});
export const region = new Region({ el: '#app' });
regions.push({ name: 'root', region });
region.show(track('shell', new Shell()));`
  },
  {
    id: 'cancellable-work', title: 'Cancel work when its View leaves',
    summary: 'A View owns an AbortController and cancels a local delayed task before destruction. No fetch or network is used. Replace during the delay, then inspect after completion.',
    docs: ['/docs/lifecycle/', '/docs/region/'],
    checks: ['old-work-aborted', 'old-view-destroyed', 'no-stale-commit', 'replacement-completed'].map(id => ({ id, expected: true })),
    css,
    code: instrumentation + `function delay(signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 300);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
const Worker = View.extend({
  createState() { return { controller: new AbortController(), commits: 0 }; },
  template: () => '<p class="result">Waiting for local work…</p>',
  async onAttach() {
    const state = this.getState();
    try {
      await delay(state.controller.signal);
      if (state.controller.signal.aborted || this.isDestroyed()) return;
      state.commits++;
      this.el.querySelector('.result').textContent = 'Completed local work';
      this.trigger('completed');
    } catch (error) { if (error.name !== 'AbortError') throw error; }
  },
  onBeforeDestroy() { this.getState().controller.abort(); }
});
const Shell = View.extend({
  template: () => '<h1>Work has a lifetime</h1><button id="replace-worker">Start and immediately replace a worker</button><div class="slot"></div>',
  regions: { worker: '.slot' },
  events: { 'click #replace-worker': 'replace' },
  replace() {
    const old = track('cancelled-worker', new Worker());
    this.showChildView('worker', old);
    const next = track('replacement-worker', new Worker());
    this.listenTo(next, 'completed', () => {
      check('no-stale-commit', old.getState().commits === 0);
      check('replacement-completed', next.getState().commits === 1);
    });
    this.showChildView('worker', next);
    check('old-work-aborted', old.getState().controller.signal.aborted);
    check('old-view-destroyed', old.isDestroyed());
  },
  onRender() { regions.push({ name: 'shell.worker', region: this.getRegion('worker') }); }
});
export const region = new Region({ el: '#app' });
regions.push({ name: 'root', region });
region.show(track('shell', new Shell()));`
  },
  {
    id: 'application-startup', title: 'Application readiness can be superseded',
    summary: 'Application onBeforeStart readiness receives an AbortSignal. Stop supersedes a pending start with false; guard stale writes, await a fresh start returning true, handle a current failure rejection, and destroy the Application. Local delays only; no network or router.',
    docs: ['/docs/application/', '/docs/routing/'],
    checks: ['cancelled-start-false', 'stop-true', 'readiness-aborted', 'no-stale-write', 'fresh-start-true', 'root-shown', 'stopped-root-destroyed', 'current-failure-rejects', 'application-destroyed'].map(id => ({ id, expected: true })),
    css,
    code: instrumentation + `const Root = View.extend({ template: () => '<p>Application is ready</p>' });
const Feature = Application.extend({
  createState() { return { writes: [], starts: 0, signal: null }; },
  async onBeforeStart(app, options, { signal }) {
    const state = this.getState();
    state.signal = signal;
    options.entered?.();
    try {
      // This local loader deliberately finishes even after abort. The guard
      // prevents its stale result from writing application state.
      await new Promise(resolve => setTimeout(resolve, 120));
      if (signal.aborted) return;
      if (options.mode === 'fail') throw new Error('Local startup failed');
      state.writes.push(options.mode);
    } finally { options.finished?.(); }
  },
  onStart() {
    this.getState().starts++;
    this.showView(track('application-root', new Root()));
  }
});
const Shell = View.extend({
  template: () => '<h1>Ready, stopped, ready again</h1><button id="verify-application">Run Application lifecycle checks</button><div class="feature"></div><pre id="application-outcomes">Checks have not run.</pre>',
  events: { 'click #verify-application': 'verify' },
  async verify({ delegateTarget }) {
    delegateTarget.disabled = true;
    const app = this.application = new Feature({ region: { el: this.el.querySelector('.feature') } });
    const rootRegion = app.getRegion(), state = app.getState();
    regions.push({ name: 'application.root', region: rootRegion });
    const output = this.el.querySelector('#application-outcomes');
    try {
      let entered, finished;
      const hookEntered = new Promise(resolve => { entered = resolve; });
      const hookFinished = new Promise(resolve => { finished = resolve; });
      const pendingStart = app.start({ mode: 'stale', entered, finished });
      await hookEntered;
      const oldSignal = app.getState().signal;
      const stopped = await app.stop();
      const cancelledStart = await pendingStart;
      await hookFinished; // Check after the stale loader actually finishes.
      check('cancelled-start-false', cancelledStart === false);
      check('stop-true', stopped === true && !app.isRunning());
      check('readiness-aborted', oldSignal.aborted);
      check('no-stale-write', app.getState().writes.length === 0 && app.getState().starts === 0);
      const freshStart = await app.start({ mode: 'fresh' });
      const root = app.getView();
      check('fresh-start-true', freshStart === true && app.isRunning());
      check('root-shown', root?.isAttached() && !root.isDestroyed());
      await app.stop();
      check('stopped-root-destroyed', root?.isDestroyed() && !app.getRegion().hasView());
      let failure = null;
      try { await app.start({ mode: 'fail' }); } catch (error) { failure = error.message; }
      check('current-failure-rejects', failure === 'Local startup failed' && !app.isRunning());
      const destroyed = await app.destroy();
      check('application-destroyed', destroyed === true && app.isDestroyed() && !rootRegion.hasView());
      if (!this.isDestroyed()) output.textContent = JSON.stringify({ cancelledStart, stopped, freshStart, failure, destroyed, writes: state.writes }, null, 2);
    } catch (error) {
      await app.destroy();
      if (!this.isDestroyed()) output.textContent = 'Check failed: ' + error.message;
    }
  },
  onBeforeDestroy() {
    // A View hook is synchronous; Application teardown returns its own Promise.
    this.application?.destroy().catch(error => console.error(error));
  }
});
export const region = new Region({ el: '#app' });
regions.push({ name: 'root', region });
region.show(track('shell', new Shell()));`
  }
];

export function listRecipes() {
  return recipes.map(({ code, css, ...metadata }) => structuredClone({ ...metadata, runtime: recipeRuntime }));
}
export function getRecipe(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'id') || typeof input.id !== 'string') throw new Error('Expected {id} from listExamples().');
  const recipe = recipes.find(recipe => recipe.id === input.id);
  if (!recipe) throw new Error('Unknown example. Use listExamples() to discover exact ids.');
  return structuredClone({ ...recipe, runtime: recipeRuntime });
}
