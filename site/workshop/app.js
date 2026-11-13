// View, Region, CollectionView and adapter setup functions come from marionette.
// Model, Collection, DataApi, StateApi come from the matching @mnjs/data.
// Backstage supplies those imports. Keep each owner small; make the idea your own.
// html and HtmlDomApi come from @mnjs/html. Configure all owners before mounting.
setDomApi(HtmlDomApi);
setDataApi(DataApi);

const Victory = View.extend({
  tagName: 'li',
  className: 'victory',
  template: ({ id, title, completed }) => html`
    <span class="victory-title">${title}</span>
    <button id="victory-${id}" class="count-victory" aria-pressed="${completed}">
      <span aria-hidden="true">${completed ? '✓' : '+'}</span> ${completed ? 'Counted' : 'Count it'}
    </button>`,
  ui: {
    toggle: '.count-victory',
  },
  triggers: {
    'click @ui.toggle': 'click:toggle',
  },
  modelEvents: { change: 'render' },
  onClickToggle() {
    this.model.set('completed', !this.model.get('completed'));
    this.getUI('toggle')[0].focus();
  },
});

const VictoryList = CollectionView.extend({
  tagName: 'ul',
  className: 'victories',
  childView: Victory,
});

const VictorySummary = View.extend({
  attributes: { 'aria-live': 'polite' },
  templateContext() {
    return { count: this.collection.toArray().filter(record => record.completed).length };
  },
  template: ({ count }) => html`<div class="tally"><strong>${count}</strong>
    <span>${count === 1 ? 'small victory' : 'small victories'}<br>officially acknowledged.</span>
    <span class="seal" aria-hidden="true">✳</span></div>`,
  collectionEvents: {
    update: 'render',
    'change:completed': 'render',
  },
});

const Scratchpad = View.extend({
  createState() { return { draft: '' }; },
  templateContext() { return this.getState(); },
  template: ({ draft }) => html`<label for="victory-notes">Tomorrow can wait here.</label>
    <textarea id="victory-notes" .value=${draft} placeholder="An unfinished thought…"></textarea>`,
  ui: { notes: '#victory-notes' },
  events: { 'input @ui.notes': 'onInputNotes' },
  onInputNotes({ delegateTarget }) {
    this.getState().draft = delegateTarget.value;
  },
});

const VictoryBoard = View.extend({
  initialize() {
    // This board owns the records. Its child Views borrow the collection.
    this.collection = new Collection([
      { id: 'first', title: 'Open the editor', completed: false },
      { id: 'second', title: 'Make one small thing', completed: false },
    ]);
    this.nextId = 0;
  },
  template: () => html`<header><p class="eyebrow">THE SMALL VICTORIES DEPARTMENT</p>
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
