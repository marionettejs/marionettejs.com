// The homepage is a small Application with independently owned interactions.
import { Application, View, CollectionView, html, Model, Collection, DataApi, setDataApi } from './demo-setup.js';
import { startup, startupSource, interactionSource, listSource, ideaSource, sentenceEventsSource, codeTabs, initialCodePanels, isFocusedCodeLine } from './hero-code.js';

// Configure the optional hero's observable data adapter once at its entry.
setDataApi(DataApi);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const codeSketch = frame => html`${frame.source.before ? html`<span class="hero-code-line hero-code-muted">${frame.source.before}</span><span class="hero-code-line hero-code-blank" aria-hidden="true"></span>` : null}${frame.source.methods.map(({ name, lines, label }) => html`${label ? html`<span class="hero-code-line hero-code-muted">${label}</span>` : null}<span class="hero-code-method" data-active=${name === frame.active}>${lines.map(line => html`<span class="hero-code-line" data-focus=${isFocusedCodeLine(name, frame.active, line)}>${line}</span>`)}</span><span class="hero-code-line hero-code-blank" aria-hidden="true"></span>`)}${frame.source.after ? html`<span class="hero-code-line hero-code-muted">${frame.source.after}</span>` : null}`;

const CodeTrace = View.extend({
  className: 'hero-code',
  createState() {
    return {
      selected: 'view', manual: false, pinned: null, scroll: {},
      panels: initialCodePanels(),
    };
  },
  initialize() {
    this.frames = [];
    this.completed = [];
    this.lifetime = new AbortController();
    reducedMotion.addEventListener('change', () => this.flushReduced(), { signal: this.lifetime.signal });
    document.addEventListener('visibilitychange', () => this.flushReduced(), { signal: this.lifetime.signal });
    this.observer = new MutationObserver(() => this.flushReduced());
    this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  },
  templateContext() {
    const state = this.getState();
    const panels = codeTabs.map(tab => ({ ...tab,
      frame: state.manual && tab.id === state.selected ? state.pinned : state.panels[tab.id],
    }));
    return { panels, selected: state.selected, manual: state.manual, prefix: this.cid,
      frame: panels.find(tab => tab.id === state.selected).frame, completed: this.completed };
  },
  template: ({ panels, selected, manual, prefix, frame, completed }) => html`
    <div class="hero-code-heading"><span><img class="hero-code-mark" src="/assets/mark.svg" width="19" height="20" alt=""><i aria-hidden="true"></i> FOLLOW THE STRINGS</span>
      <button type="button" class="hero-replay">Replay startup <span aria-hidden="true">↻</span></button></div>
    <div class="hero-code-tabs" role="tablist" aria-label="Hero code sketches">${panels.map(tab => html`
      <button type="button" role="tab" id=${prefix + '-tab-' + tab.id} data-code-tab=${tab.id}
        aria-selected=${selected === tab.id} aria-controls=${prefix + '-panel-' + tab.id}
        tabindex=${selected === tab.id ? 0 : -1}><span class="hero-file-icon" aria-hidden="true">JS</span>${tab.label}</button>`)}</div>
    ${panels.map(tab => html`<section class="hero-code-panel" role="tabpanel" id=${prefix + '-panel-' + tab.id}
      aria-labelledby=${prefix + '-tab-' + tab.id} ?hidden=${selected !== tab.id}>
      <div class="hero-code-file"><span>${tab.frame.source.file.split(' · ')[1]}</span><small>Marionette + @mnjs/html</small></div>
      <pre class="hero-code-source" tabindex="0" aria-label=${'Illustrative Marionette code: ' + tab.label}><code>${codeSketch(tab.frame)}</code></pre>
    </section>`)}
    <div class="hero-trace-footer"><span class="hero-trace-step">${frame?.title || 'Preparing the header'}</span><span class="hero-trace-count">${completed.length} ${completed.length === 1 ? 'step' : 'steps'}</span></div>
    <div class="hero-code-follow"><span role="status">${manual ? 'Browsing · auto-follow paused' : 'Following the walkthrough'}</span>
      <button type="button" class="hero-follow" ?hidden=${!manual}>Follow walkthrough <span aria-hidden="true">→</span></button></div>
    <p class="hero-code-note">Illustrative code, with the plumbing left out. The header stays live while the highlight follows.</p>`,
  ui: { tabs: '[role="tab"]', replay: '.hero-replay', follow: '.hero-follow' },
  events: { 'click @ui.tabs': 'onClickTab', 'keydown @ui.tabs': 'onKeydownTab',
    'click @ui.follow': 'onClickFollow', 'click @ui.replay': 'onClickReplay',
    'focusin .hero-code-source': 'onReadCode', 'wheel .hero-code-source': 'onReadCode',
    'keydown .hero-code-source': 'onKeydownCode' },
  onReadCode() {
    const state = this.getState();
    if (state.manual) return;
    state.manual = true;
    state.pinned = state.panels[state.selected];
    this.render();
  },
  onKeydownCode(event) {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) this.onReadCode();
  },
  saveScroll() {
    const state = this.getState();
    const code = this.el.querySelector('.hero-code-panel:not([hidden]) .hero-code-source');
    if (code) state.scroll[state.selected] = code.scrollTop;
  },
  continueReading({ focused, top, left }) {
    this.onReadCode();
    const code = this.el.querySelector('.hero-code-panel:not([hidden]) .hero-code-source');
    code.scrollTop = top;
    code.scrollLeft = left;
    if (focused) code.focus({ preventScroll: true });
    this.saveScroll();
  },
  restoreScroll({ follow = false } = {}) {
    const state = this.getState();
    const code = this.el.querySelector('.hero-code-panel:not([hidden]) .hero-code-source');
    if (!code) return;
    const rail = this.el.querySelector('.hero-code-tabs');
    const selected = rail.querySelector('[aria-selected="true"]');
    const railBox = rail.getBoundingClientRect();
    const tabBox = selected.getBoundingClientRect();
    if (tabBox.right > railBox.right) rail.scrollLeft += tabBox.right - railBox.right;
    else if (tabBox.left < railBox.left) rail.scrollLeft += tabBox.left - railBox.left;
    code.scrollTop = state.scroll[state.selected] || 0;
    const active = follow && code.querySelector('.hero-code-method[data-active="true"]');
    if (active) {
      const bounds = code.getBoundingClientRect();
      const target = active.getBoundingClientRect();
      if (target.bottom > bounds.bottom) code.scrollTop += target.bottom - bounds.bottom + 16;
      else if (target.top < bounds.top) code.scrollTop += target.top - bounds.top - 24;
    }
  },
  selectTab(id) {
    this.saveScroll();
    const state = this.getState();
    state.selected = id;
    state.manual = true;
    state.pinned = state.panels[id];
    this.render();
    this.restoreScroll();
  },
  onClickTab({ delegateTarget }) {
    this.selectTab(delegateTarget.dataset.codeTab);
  },
  onKeydownTab(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = codeTabs.findIndex(tab => tab.id === event.delegateTarget.dataset.codeTab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? codeTabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + codeTabs.length) % codeTabs.length;
    this.selectTab(codeTabs[next].id);
    const tab = this.getUI('tabs')[next];
    tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  },
  follow() {
    this.saveScroll();
    const state = this.getState();
    state.manual = false;
    state.pinned = null;
    if (this.current) state.selected = this.current.source.tab;
    this.render();
    this.restoreScroll({ follow: true });
  },
  onClickFollow() {
    this.follow();
    this.el.querySelector('[role="tab"][aria-selected="true"]').focus();
  },
  onClickReplay() {
    this.follow();
    this.triggerMethod('replay:startup');
  },
  present(frame) {
    this.current = frame;
    const state = this.getState();
    state.panels[frame.source.tab] = frame;
    // Keep both the manually chosen tab and its code snapshot steady.
    if (state.manual) return;
    this.saveScroll();
    state.selected = frame.source.tab;
    this.render();
    this.restoreScroll({ follow: true });
  },
  isReduced() {
    return reducedMotion.matches || document.hidden || document.documentElement.classList.contains('motion-off');
  },
  record(frame, { reset = false } = {}) {
    if (reset) {
      const state = this.getState();
      state.manual = false;
      state.pinned = null;
      clearTimeout(this.timer);
      this.timer = null;
      this.frames = [];
      this.completed = [];
    }
    this.completed.push(frame.title);
    if (this.isReduced()) {
      this.frames = [];
      clearTimeout(this.timer);
      this.timer = null;
      this.present(frame);
      return;
    }
    this.frames.push(frame);
    this.advance();
  },
  advance() {
    if (this.timer || !this.frames.length) return;
    this.present(this.frames.shift());
    this.timer = setTimeout(() => {
      this.timer = null;
      this.advance();
    }, 650);
  },
  choose(id) {
    const source = interactionSource(id);
    this.record({ title: 'Handle the panel choice', active: 'handler', source }, { reset: true });
    this.record({ title: 'Replace the answer Region', active: 'region', source });
  },
  flushReduced() {
    if (!this.isReduced() || !this.frames.length) return;
    clearTimeout(this.timer);
    this.timer = null;
    const frame = this.frames.at(-1);
    this.frames = [];
    this.present(frame);
  },
  onBeforeDetach() {
    clearTimeout(this.timer);
    this.timer = null;
    this.frames = [];
  },
  onBeforeDestroy() {
    clearTimeout(this.timer);
    this.lifetime.abort();
    this.observer.disconnect();
  },
});

const Answer = View.extend({
  className: 'hero-answer',
  attributes: { 'aria-label': 'Interactive example result' },
  template: ({ eyebrow, title, body, intro = false, points = [], links = [], another = false, retry = false }) => intro ? html`<p class="hero-initial-purpose">${body.split('\n').map((line, index) => html`${index ? html`<br>` : null}${line}`)}</p>` : html`
    <p class="hero-answer-eyebrow">${eyebrow}</p><h2>${title}</h2><p>${body}</p>
    ${points.length ? html`<ul>${points.map(point => html`<li>${point}</li>`)}</ul>` : null}
    <div class="hero-answer-links">${retry ? html`<button type="button" class="hero-retry-startup">Retry startup <span aria-hidden="true">↻</span></button>` : null}${links.map(link => html`<a href=${link.href}>${link.label} <span aria-hidden="true">↗</span></a>`)}</div>
    ${another ? html`<button type="button" class="hero-another-idea">Another sentence <span aria-hidden="true">↻</span></button>` : null}`,
  triggers: { 'click .hero-another-idea': 'load:idea', 'click .hero-retry-startup': 'replay:startup' },
});
const SentenceAnswer = Answer.extend({ className: 'hero-answer hero-sentence-answer' });
const PanelContent = Answer.extend({ className: 'hero-panel-detail' });
const PanelAnswer = View.extend({
  className: 'hero-answer hero-panel-answer',
  attributes: { 'aria-label': 'Replace a panel' },
  initialize({ panels, index = 0 }) { this.panels = panels; this.index = index; },
  templateContext() { return { panelId: this.cid + '-panel' }; },
  template: ({ panelId }) => html`<div class="hero-panel-navigation" role="group" aria-label="Choose a panel">
    <button type="button" class="hero-previous-panel" aria-label="Previous panel" aria-controls=${panelId}><span aria-hidden="true">←</span></button>
    <button type="button" class="hero-next-panel" aria-label="Next panel" aria-controls=${panelId}><span aria-hidden="true">→</span></button>
    </div><div class="hero-panel-content" id=${panelId}></div>`,
  regions: { panel: '.hero-panel-content' },
  events: { 'click .hero-previous-panel': 'onPreviousPanel', 'click .hero-next-panel': 'onNextPanel' },
  onRender() { this.showPanel(); },
  showPanel() {
    this.previousPanel = this.getChildView('panel');
    this.showChildView('panel', new PanelContent({ model: new Model(this.panels[this.index]) }));
  },
  changePanel(direction) {
    this.index = (this.index + direction + this.panels.length) % this.panels.length;
    this.showPanel();
    this.triggerMethod('swap:panel');
  },
  onPreviousPanel() { this.changePanel(-1); },
  onNextPanel() { this.changePanel(1); },
});
const sentenceDescription = 'One mood, one character, one unlikely plan. Pull again for another combination.';
const Loader = View.extend({
  className: 'hero-loader',
  attributes: { role: 'status' },
  template: ({ cancellable = false }) => cancellable ? html`<div class="hero-loader-content">
    <p class="hero-answer-eyebrow">A FEW WORDS, REARRANGED <span class="hero-loader-mark" aria-hidden="true">✳</span></p>
    <h2 class="hero-loader-title" aria-label="Finding the right words…"><span class="hero-word-machine" aria-hidden="true"><span>A</span>${[['curious', 'sleepy', 'dramatic'], ['robot', 'teapot', 'pigeon'], ['dances', 'bakes', 'naps']].map(words => html`<span class="hero-word-window"><span>${words.map(word => html`<span>${word}</span>`)}</span></span>`)}</span></h2>
    <p class="hero-sentence-description">${sentenceDescription}</p><button type="button" class="hero-cancel-idea">Cancel</button></div>`
    : html`<span class="hero-boot-spinner" aria-hidden="true"><svg viewBox="0 0 40 40"><circle class="hero-spinner-track" cx="20" cy="20" r="17"/><circle class="hero-spinner-arc" cx="20" cy="20" r="17" pathLength="100"/></svg><img src="/assets/mark.svg" width="13" height="14" alt=""></span><div><strong>Waiting on something good…</strong><p>This wait is fake. The async code is the point.</p></div>`,
  triggers: { 'click .hero-cancel-idea': 'cancel:idea' },
});
const Heading = View.extend({
  className: 'hero-heading',
  createState() { return { visible: false }; },
  templateContext() { return this.getState(); },
  template: ({ visible }) => visible ? html`<h1 class="hero-heading-text">Pull a few<br><em>strings.</em></h1>` : null,
});
const HeroActions = View.extend({
  className: 'night-actions hero-choices',
  template: () => html`
    <a href="/why/" class="button hero-explore">Explore Marionette <span aria-hidden="true">↗</span></a>
    <a href="/docs/agent-start/" class="hero-equip">Equip your agent <span aria-hidden="true">→</span></a>`,
  events: { 'click a': 'onClickLink' },
  onClickLink(event) {
    // Let native links preserve immediate navigation, keyboard and modified clicks.
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    this.triggerMethod('navigate', event.delegateTarget.getAttribute('href'));
  },
});

const FeatureChoice = View.extend({
  tagName: 'li',
  createState() { return { selected: false }; },
  templateContext() { return this.getState(); },
  template: ({ id, label, selected }) => html`<button type="button" class="hero-feature" data-feature=${id} aria-pressed=${selected} aria-controls="hero-answer-slot">${label}</button>`,
  events: { 'click .hero-feature': 'choose' },
  choose() { this.triggerMethod('choose', this.model); },
});
const FeatureChoices = CollectionView.extend({
  tagName: 'ul',
  className: 'hero-features',
  childView: FeatureChoice,
  childViewTriggers: { choose: 'select:feature' },
  select(id) {
    this.children.each(view => {
      view.getState().selected = view.model.id === id;
      view.render();
    });
  },
});
const rowLabels = ['Teach a teapot to whistle', 'Give a pigeon a promotion', 'Knit a tiny hat for a robot'];
const ExampleRow = View.extend({
  tagName: 'li',
  className: 'hero-sample-row',
  template: ({ number, label }) => html`<span><small>${String(number).padStart(2, '0')}</small> ${label}</span><button type="button" class="hero-remove-row" aria-label=${'Remove ' + label}>×</button>`,
  triggers: { 'click .hero-remove-row': 'click:remove' },
});
const ExampleRows = CollectionView.extend({
  tagName: 'ul',
  className: 'hero-sample-rows',
  attributes: { id: 'hero-example-rows', 'aria-label': 'Small feature rows' },
  childView: ExampleRow,
  childViewEvents: { 'click:remove': 'onClickRemove' },
  onClickRemove(row) {
    this.previousRow = row;
    this.collection.remove(row.model);
    this.triggerMethod('trace:list', 'remove');
  },
});
const ListControls = View.extend({
  className: 'hero-list-controls',
  templateContext() { return { full: this.collection.length >= 3 }; },
  collectionEvents: { update: 'render', reset: 'render' },
  template: ({ full }) => html`<button type="button" class="hero-add-row" aria-controls="hero-example-rows" ?hidden=${full}>Add a row <span aria-hidden="true">+</span></button>`,
  ui: { add: '.hero-add-row' },
  triggers: { 'click @ui.add': 'add:row' },
});
function listHeading() { return html`<p class="hero-answer-eyebrow">A CHANGING LIST</p><h2>A row joins. The others stay.</h2><p>Add a tiny adventure or remove one. A data Collection holds the Models; CollectionView owns their row Views.</p>`; }
const ListAnswer = View.extend({
  className: 'hero-answer hero-list-answer',
  attributes: { 'aria-label': 'Interactive list result' },
  createState() { return { next: 2 }; },
  initialize() {
    this.collection = new Collection(rowLabels.slice(0, 2).map((label, index) => ({ id: index + 1, number: index + 1, label })));
  },
  template: () => html`${listHeading()}<div class="hero-rows-stage"><div class="hero-rows-slot"></div><div class="hero-list-controls-slot"></div></div>`,
  regions: { rows: '.hero-rows-slot', controls: '.hero-list-controls-slot' },
  childViewEvents: { 'trace:list': 'onListChange', 'add:row': 'onClickAdd' },
  onRender() {
    this.showChildView('rows', new ExampleRows({ collection: this.collection }));
    this.showChildView('controls', new ListControls({ collection: this.collection }));
  },
  onClickAdd() {
    if (this.collection.length >= 3) return;
    const used = new Set(this.collection.models.map(model => model.get('label')));
    const number = ++this.getState().next;
    this.collection.add({ id: number, number, label: rowLabels.find(label => !used.has(label)) });
    const list = this.getChildView('rows').el;
    if (this.collection.length === 3) list.lastElementChild.querySelector('button').focus({ preventScroll: true });
    this.triggerMethod('trace:list', 'add');
  },
  onListChange(active) {
    if (active === 'remove') this.getChildView('controls').getUI('add')[0].focus({ preventScroll: true });
    this.triggerMethod('trace:list', active);
  },
  onBeforeDestroy() { this.collection.destroy(); },
});

const HeroShell = View.extend({
  className: 'hero-shell',
  createState() { return { answers: null, selection: '', panel: 0, idea: 0 }; },
  template: () => html`
    <div class="hero-ambient" aria-hidden="true"><div class="hero-ambient-light"></div><div class="hero-ambient-texture"></div></div>
    <div class="night-copy"><p class="eyebrow"><span class="signal-dot"></span> MARIONETTE 5.1 <span class="hero-app-label">THIS HEADER IS AN APP</span></p>
      <div class="hero-heading-slot"></div>
      <div class="hero-content-stage"><div class="hero-loading-slot"></div><div class="hero-support">
      <p class="night-intro">A JavaScript UI library for<br><strong>agent-led development.</strong></p>
      <div class="hero-actions-slot"></div>
      <section class="hero-interaction-stage" aria-label="Try small interactions"><p class="hero-try-label">OR PULL ONE OF THESE:</p><div class="hero-features-slot"></div>
      <div id="hero-answer-slot" class="hero-answer-slot" aria-live="polite" aria-atomic="true"><div class="hero-panel-sizer" aria-hidden="true" inert>${listHeading()}<div class="hero-rows-stage"></div></div><div class="hero-answer-view-slot"></div><div class="hero-idea-loading-slot"></div></div></section>
      </div></div>
    </div>
    <details class="rig hero-live-code" data-rig open><summary class="hero-code-toggle">Explore the code <span aria-hidden="true">＋</span></summary><div class="rig-decoration" aria-hidden="true"><div class="rig-control"><span class="yoke-pin pin-left"></span><img src="/assets/mark.svg" width="68" height="70" alt=""><span class="yoke-pin pin-right"></span></div><svg class="rig-strings" viewBox="0 0 560 96" preserveAspectRatio="none"><path d="M84 0 V96 M476 0 V96"/></svg></div><section class="demo hero-code-frame" aria-label="An illustrative Marionette sketch"><div class="hero-code-slot"></div></section>
      <p class="rig-caption">A real Application. <span>A few strings worth following.</span></p></details>
    <div class="hero-bottom" aria-hidden="true"></div>`,
  regions: { heading: '.hero-heading-slot', loading: '.hero-loading-slot', actions: '.hero-actions-slot', features: '.hero-features-slot', answer: '.hero-answer-view-slot', ideaLoading: '.hero-idea-loading-slot', code: '.hero-code-slot' },
  childViewEvents: { navigate: 'onNavigate', 'select:feature': 'onSelectFeature', 'trace:list': 'onTraceList', 'swap:panel': 'onSwapPanel', 'load:idea': 'loadIdea', 'cancel:idea': 'cancelIdea' },
  childViewTriggers: { 'replay:startup': 'replay:startup' },
  onRender() {
    this.showChildView('heading', new Heading());
    this.showChildView('actions', new HeroActions());
    this.showChildView('features', new FeatureChoices({ collection: new Collection([
      { id: 'list', label: 'Try a list' }, { id: 'panel', label: 'Swap a panel' }, { id: 'idea', label: 'Load an idea' },
    ]) }));
    this.showChildView('code', new CodeTrace());
    const compact = matchMedia('(max-width: 420px)');
    const disclosure = this.el.querySelector('.hero-live-code');
    disclosure.open = this.options.codeDisclosureOpen ?? !compact.matches;
    this.layoutLifetime = new AbortController();
    compact.addEventListener('change', () => { disclosure.open = !compact.matches; }, { signal: this.layoutLifetime.signal });
    this.once('destroy', () => this.layoutLifetime.abort());
    this.getRegion('answer').on('before:empty', (_region, view) => { this.previousAnswer = view; });
  },
  showHeading() {
    const heading = this.getChildView('heading');
    heading.getState().visible = true;
    heading.render();
  },
  revealHeading(signal) {
    if (reducedMotion.matches || document.documentElement.classList.contains('motion-off')) {
      this.showHeading();
      return Promise.resolve();
    }
    // One quick first beat: paint the code, then let its line reveal the heading.
    return new Promise(resolve => {
      const done = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', done);
        if (!signal.aborted && !this.isDestroyed()) this.showHeading();
        resolve();
      };
      const timer = setTimeout(done, 90);
      signal.addEventListener('abort', done, { once: true });
    });
  },
  onNavigate(href) {
    const source = { ...interactionSource('hero-explore'), methods: [{ name: 'navigate', label: '// Native links keep navigation immediate.', lines: [
      'const Actions = View.extend({', `  template: () => html\`<a href="${href}">Next step</a>\`,`,
      "  events: { 'click a': 'onClickLink' },", '  onClickLink() {', "    this.triggerMethod('navigate');", '    // The browser follows the link.', '  }', '});',
    ] }] };
    this.getChildView('code').record({ title: 'Follow the link', active: 'navigate', source }, { reset: true });
  },
  showAnswer(id) {
    this.showChildView('answer', new Answer({ model: new Model(this.getState().answers[id]) }));
  },
  onSelectFeature({ id }) {
    const state = this.getState();
    if (!state.answers) return;
    this.revealMobileActions();
    if (id === 'idea') { this.loadIdea(); return; }
    this.cancelPendingIdea();
    state.selection = id;
    this.getChildView('features').select(id);
    if (id === 'list') {
      this.showChildView('answer', new ListAnswer());
      this.onTraceList('add');
    } else {
      this.showChildView('answer', new PanelAnswer({ panels: [state.answers.panel, state.answers.panelAgain], index: state.panel++ % 2 }));
      this.onSwapPanel();
    }
  },
  revealMobileActions() {
    // Match the stacked layout; desktop selections keep their scroll position.
    if (!matchMedia('(max-width: 760px)').matches) return;
    const header = document.querySelector('.site-header');
    const style = getComputedStyle(header);
    const clearance = ['fixed', 'sticky'].includes(style.position)
      ? header.getBoundingClientRect().height + (Number.parseFloat(style.top) || 0) : 0;
    const top = this.el.querySelector('.hero-features-slot').getBoundingClientRect().top + scrollY - clearance - 16;
    scrollTo({ top, behavior: reducedMotion.matches || document.documentElement.classList.contains('motion-off') ? 'instant' : 'smooth' });
  },
  onSwapPanel() { this.getChildView('code').choose('panel'); },
  onTraceList(active) {
    this.getChildView('code').record({ title: active === 'add' ? 'Add one owned row' : 'Destroy the removed row', active, source: listSource() }, { reset: true });
  },
  loadIdea() {
    const state = this.getState();
    if (!this.getChildView('ideaLoading')) this.ideaPriorSelection = state.selection;
    state.selection = 'idea';
    this.getChildView('features').select('idea');
    this.ideaApplication ||= new IdeaApplication({ shell: this });
    this.ideaApplication.restart().catch(error => {
      if (!this.isDestroyed() && error.name !== 'AbortError') {
        this.cancelIdea();
      }
    });
  },
  showIdeaLoader() {
    const moveFocus = this.getChildView('answer')?.el.contains(document.activeElement);
    this.showChildView('ideaLoading', new Loader({ model: new Model({ cancellable: true }) }));
    if (moveFocus) this.getChildView('ideaLoading').el.querySelector('button').focus();
    const trace = this.getChildView('code');
    trace.record({ title: 'A View click requests another run', active: 'restart', source: sentenceEventsSource() }, { reset: true });
    trace.record({ title: 'Application shows its loader', active: 'showLoader', source: ideaSource() });
    trace.record({ title: 'Application awaits prepareStart', active: 'prepareStart', source: ideaSource() });
  },
  showIdea(sentence) {
    const waitingFocus = this.getChildView('ideaLoading').el.contains(document.activeElement);
    this.getRegion('ideaLoading').empty();
    this.showChildView('answer', new SentenceAnswer({ model: new Model({ title: sentence, body: sentenceDescription, links: [], eyebrow: 'A FEW WORDS, REARRANGED', another: true }) }));
    if (waitingFocus) this.getChildView('answer').el.querySelector('.hero-another-idea').focus();
    this.getChildView('code').record({ title: 'onStart receives the new sentence', active: 'onStart', source: ideaSource() });
  },
  cancelPendingIdea() {
    this.ideaApplication?.stop();
    this.getRegion('ideaLoading').empty();
  },
  cancelIdea() {
    this.cancelPendingIdea();
    this.getState().selection = this.ideaPriorSelection || '';
    this.getChildView('features').select(this.getState().selection);
    this.getChildView('code').record({ title: 'Cancel the unfinished work', active: 'cancel', source: sentenceEventsSource() }, { reset: true });
    this.getChildView('features').el.querySelector('[data-feature="idea"]').focus();
  },
  activate(answers) {
    const state = this.getState();
    state.answers = answers;
    this.getRegion('loading').empty();
    this.showAnswer(state.selection || 'intro');
  },
  onBeforeDestroy() { this.ideaApplication?.destroy(); },
});

function pause(milliseconds, signal) {
  if (signal.aborted || reducedMotion.matches || document.documentElement.classList.contains('motion-off')) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
    const timer = setTimeout(done, milliseconds);
    signal.addEventListener('abort', done, { once: true });
  });
}
// This optional feature has its own Application preparation lifetime.
const Moods = ['curious', 'sleepy', 'dramatic', 'delighted', 'suspicious'];
const Characters = ['robot', 'octopus', 'teapot', 'pigeon', 'moon'];
const Plans = ['learns to tap dance', 'opens a tiny bakery', 'auditions for a cloud', 'takes up competitive napping', 'writes a very polite heist movie'];
const choose = values => values[Math.floor(Math.random() * values.length)];
const IdeaApplication = Application.extend({
  initialize({ shell }) { this.shell = shell; },
  createState() { return { previous: '' }; },
  onBeforeStart() { this.shell.showIdeaLoader(); },
  async prepareStart(_options, { signal }) {
    await pause(1600, signal);
    signal.throwIfAborted();
    const mood = choose(Moods);
    let character = choose(Characters);
    const plan = choose(Plans);
    let sentence = `A ${mood} ${character} ${plan}.`;
    if (sentence === this.getState().previous) {
      character = Characters[(Characters.indexOf(character) + 1) % Characters.length];
      sentence = `A ${mood} ${character} ${plan}.`;
    }
    return sentence;
  },
  onStart(_app, _options, sentence) {
    this.getState().previous = sentence;
    this.shell.showIdea(sentence);
  },
});
async function loadAnswers(signal) {
  const response = await fetch(new URL('../hero-answers.json', import.meta.url), { signal });
  if (!response.ok) throw new Error('Header answers could not load.');
  const answers = await response.json();
  await pause(1600, signal);
  signal.throwIfAborted();
  return answers;
}
const HeroApplication = Application.extend({
  initialize({ codeReading, codeDisclosureOpen }) {
    this.codeReading = codeReading;
    this.codeDisclosureOpen = codeDisclosureOpen;
  },
  viewEvents: { 'replay:startup': 'replay' },
  onBeforeStart() {
    this.showLoader();
  },
  async prepareStart(_options, { signal }) {
    await this.shell.revealHeading(signal);
    if (signal.aborted) return;
    const answers = await loadAnswers(signal);
    return answers;
  },
  onStart(_app, _options, answers) {
    this.showApp(answers);
  },
  showLoader() {
    this.shell ||= new HeroShell({ codeDisclosureOpen: this.codeDisclosureOpen });
    this.showView(this.shell);
    this.shell.cancelPendingIdea();
    Object.assign(this.shell.getState(), { answers: null, selection: '' });
    const heading = this.shell.getChildView('heading');
    heading.getState().visible = false;
    heading.render();
    this.shell.getChildView('features').select('');
    this.shell.getRegion('answer').empty();
    this.shell.showChildView('loading', new Loader());
    const frames = startup();
    this.shell.getChildView('code').record(frames[0], { reset: true });
    if (this.codeReading) {
      this.shell.el.querySelector('.hero-live-code').open = true;
      this.shell.getChildView('code').continueReading(this.codeReading);
      this.codeReading = null;
    }
    this.shell.getChildView('code').record(frames[1]);
    this.shell.getChildView('code').record(frames[2]);
  },
  showApp(answers) {
    this.shell.activate(answers);
    this.shell.getChildView('code').record(startup()[3]);
  },
  replay() {
    this.restart().catch(error => this.showFailure(error));
  },
  showFailure(error) {
    if (this.isDestroyed()) return;
    this.shell.getRegion('loading').empty();
    this.shell.showChildView('answer', new Answer({ model: new Model({
      eyebrow: 'TRY THAT AGAIN', title: 'The header couldn’t prepare its answers.',
      body: 'Try startup again, or keep exploring the guides below.', retry: true,
      links: [{ label: 'Why Marionette', href: '/why/' }, { label: 'Agent setup', href: '/docs/agent-start/' }],
    }) }));
    this.shell.getChildView('code').record({ title: error.message, active: 'prepareStart', source: startupSource() }, { reset: true });
  },
});

const host = document.querySelector('[data-home-hero]');
host.classList.add('interactive-hero');
host.closest('.opening-act').classList.add('interactive-opening');
const fallbackRig = [...host.querySelectorAll('[data-code-fallback]')].find(el => getComputedStyle(el).display !== 'none');
const fallbackCode = fallbackRig?.open ? fallbackRig.querySelector('.hero-code-panel:not([hidden]) .hero-code-source') : null;
const focused = fallbackCode === document.activeElement;
const codeReading = fallbackCode && (focused || fallbackCode.scrollTop || fallbackCode.scrollLeft)
  ? { focused, top: fallbackCode.scrollTop, left: fallbackCode.scrollLeft } : null;
const application = new HeroApplication({ region: { el: host }, codeReading, codeDisclosureOpen: fallbackRig?.open });
Object.defineProperty(window, 'MarionetteHero', { configurable: true, value: Object.freeze({
  inspect() {
    const shell = application.getView();
    const trace = shell?.getChildView('code');
    const answer = shell?.getChildView('answer');
    return {
      running: application.isRunning(), ready: Boolean(shell?.getState().answers), application: application.cid,
      shell: shell?.cid, actions: shell?.getChildView('actions')?.cid,
      answer: shell?.getChildView('answer')?.cid, selection: shell?.getState().selection,
      headingVisible: shell?.getChildView('heading')?.getState().visible,
      previousAnswerDestroyed: shell?.previousAnswer?.isDestroyed() ?? false,
      panel: answer instanceof PanelAnswer ? answer.getChildView('panel')?.cid : null,
      previousPanelDestroyed: answer instanceof PanelAnswer ? answer.previousPanel?.isDestroyed() ?? false : false,
      stage: trace?.current?.active, recorded: trace?.completed.slice(), queued: trace?.frames.length,
      list: shell?.getChildView('answer')?.collection ? { count: shell.getChildView('answer').collection.length, models: shell.getChildView('answer').collection.models.map(model => ({ id: model.id, label: model.get('label'), realModel: model instanceof Model })), previousRowDestroyed: shell.getChildView('answer').getChildView('rows')?.previousRow?.isDestroyed() ?? null } : null,
      ideaApplication: shell?.ideaApplication?.cid, ideaRunning: shell?.ideaApplication?.isRunning(),
      codeTab: trace?.getState().selected, following: !trace?.getState().manual,
    };
  },
}) });
await application.start().catch(error => application.showFailure(error));
addEventListener('pagehide', event => { if (!event.persisted) application.destroy(); });
