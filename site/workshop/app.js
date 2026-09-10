// View, Region, CollectionView come from marionette.
// Model, Collection, DataApi, StateApi come from the matching @mnjs/data.
// Backstage supplies those imports. Keep each owner small; make the idea your own.
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,
  character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

const Victory = View.extend({
  tagName: 'li',
  className: 'victory',
  template: ({ id, title, completed }) => `
    <span class="victory-title">${escapeHTML(title)}</span>
    <button id="victory-${escapeHTML(id)}" class="count-victory" aria-pressed="${completed}">
      <span aria-hidden="true">${completed ? '✓' : '+'}</span> ${completed ? 'Counted' : 'Count it'}
    </button>`,
  ui: {
    toggle: '.count-victory',
  },
  triggers: {
    'click @ui.toggle': 'click:toggle',
  },
  modelEvents: {
    'change:completed': 'render',
    'change:title': 'render',
    'change:id': 'render',
  },
  onClickToggle() {
    this.model.set('completed', !this.model.get('completed'));
    this.getUI('toggle')[0].focus();
  },
});
Victory.setDataApi(DataApi);

const VictoryList = CollectionView.extend({
  tagName: 'ul',
  className: 'victories',
  childView: Victory,
});
VictoryList.setDataApi(DataApi);

const VictorySummary = View.extend({
  attributes: { 'aria-live': 'polite' },
  templateContext() {
    return { count: this.collection.toArray().filter(record => record.completed).length };
  },
  template: ({ count }) => `<div class="tally"><strong>${count}</strong>
    <span>${count === 1 ? 'small victory' : 'small victories'}<br>officially acknowledged.</span>
    <span class="seal" aria-hidden="true">✳</span></div>`,
  collectionEvents: {
    update: 'render',
    'change:completed': 'render',
  },
});
VictorySummary.setDataApi(DataApi);

const Scratchpad = View.extend({
  createState() { return new Model({ draft: '' }); },
  templateContext() { return this.getState().toObject(); },
  template: ({ draft }) => `<label for="victory-notes">Tomorrow can wait here.</label>
    <textarea id="victory-notes" placeholder="An unfinished thought…">${escapeHTML(draft)}</textarea>`,
  ui: { notes: '#victory-notes' },
  events: { 'input @ui.notes': 'onInputNotes' },
  onInputNotes({ delegateTarget }) {
    this.getState().set('draft', delegateTarget.value);
  },
});
Scratchpad.setStateApi(StateApi);

const VictoryBoard = View.extend({
  initialize() {
    // This board owns the records. Its child Views borrow the collection.
    this.collection = new Collection([
      { id: 'first', title: 'Open the editor', completed: false },
      { id: 'second', title: 'Make one small thing', completed: false },
    ]);
    this.nextId = 0;
  },
  template: () => `<header><p class="eyebrow">THE SMALL VICTORIES DEPARTMENT</p>
      <h1>That <em>counts.</em></h1><p class="intro">Small progress. Unreasonably official recognition.</p></header>
    <div class="summary"></div><section aria-label="Your victories"><div class="list"></div>
      <form class="add-victory"><label class="sr-only" for="new-victory">A small victory</label>
        <input id="new-victory" placeholder="Another thing that counts…" maxlength="120" required>
        <button id="add-victory" type="submit">Add <span aria-hidden="true">↗</span></button></form>
    </section><div class="notes"></div><p class="aside">No leaderboard. No productivity guilt. Just a little credit.</p>`,
  regions: {
    summary: '.summary',
    list: '.list',
    notes: '.notes',
  },
  ui: {
    form: '.add-victory',
    input: '#new-victory',
  },
  events: { 'submit @ui.form': 'onSubmitVictory' },
  onRender() {
    this.showChildView('summary', new VictorySummary({ collection: this.collection }));
    this.showChildView('list', new VictoryList({ collection: this.collection }));
    this.showChildView('notes', new Scratchpad());
  },
  onSubmitVictory(event) {
    event.preventDefault();
    const input = this.getUI('input')[0];
    const title = input.value.trim();
    if (!title) return;
    this.collection.add({ id: 'added-' + ++this.nextId, title, completed: false });
    input.value = '';
    input.focus();
  },
  onBeforeDestroy() {
    this.collection.destroy();
  },
});
export const region = new Region({ el: '#app' });
region.show(new VictoryBoard());
