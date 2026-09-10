import { View } from 'marionette';
import { DataApi } from '@mnjs/data';
import { TodoList, TodoFooter } from './todo-views.js';
import { PlanningNotes } from './planning-notes.js';

// Start here: Todos composes the app with three named Regions.
// todo-views.js owns Models and rows; planning-notes.js owns the draft.
const Todos = View.extend({
  template: () => `
    <section class="todoapp" aria-label="Todo list">
      <h2 class="todos-heading">todos</h2>
      <label class="sr-only" for="new-todo">What needs to be done?</label>
      <input id="new-todo" placeholder="What needs to be done?" autocomplete="off">
      <section class="todo-main">
        <input id="toggle-all" type="checkbox" aria-label="Mark all as complete">
        <label for="toggle-all" class="toggle-all-label" title="Mark all as complete">❯</label>
        <div class="list"></div>
      </section>
      <div class="footer-slot"></div>
    </section>
    <p class="todo-instructions">Double-click to edit a todo · Enter saves · Escape cancels</p>
    <p class="todo-instructions">Made with Marionette. Stored in memory for this run.</p>
    <details class="notes-experiment"><summary>Side experiment: keep a draft while the list changes</summary>
    <p class="fine">Two Regions, two independent Views. This exercise adds or removes a test task while you stay in the notes input.</p>
    <div class="detail"></div>
    <button id="change-list">Add / remove a test task</button></details>
  `,
  regions: {
    list: '.list',
    notes: '.detail',
    footer: '.footer-slot',
  },
  ui: {
    input: '#new-todo',
    toggleAll: '#toggle-all',
    main: '.todo-main',
    change: '#change-list',
  },
  events: {
    'keydown @ui.input': 'onKeydownNewTodo',
    'change @ui.toggleAll': 'onChangeToggleAll',
  },
  triggers: {
    'click @ui.change': 'click:neighbor',
  },
  childViewEvents: {
    'press:enter': 'changeNeighbor',
    'select:filter': 'onSelectFilter',
    'click:clearCompleted': 'onClickClearCompleted',
  },
  collectionEvents: {
    update: 'refresh',
    reset: 'refresh',
    'change:completed': 'refresh',
  },
  onClickNeighbor() {
    this.changeNeighbor();
  },
  onRender() {
    this.filter = 'all';
    this.list = new TodoList({
      collection: this.collection,
    });
    this.notes = new PlanningNotes();
    this.showChildView('list', this.list);
    this.showChildView('notes', this.notes);
    this.showChildView('footer', new TodoFooter());
    this.refresh();
  },
  onAttach() {
    this.getUI('input')[0].focus();
    this.routeListener = this.onChangeRoute.bind(this);
    window.addEventListener('hashchange', this.routeListener);
    this.onChangeRoute();
  },
  onChangeRoute() {
    this.filter =
      location.hash === '#/active'
        ? 'active'
        : location.hash === '#/completed'
          ? 'completed'
          : 'all';
    this.refresh();
  },
  onBeforeDetach() {
    window.removeEventListener('hashchange', this.routeListener);
  },
  onBeforeDestroy() {
    window.removeEventListener('hashchange', this.routeListener);
    this.collection.destroy();
  },
  onKeydownNewTodo(event) {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    const input = event.delegateTarget;
    if (!input.value.trim()) {
      return;
    }
    this.addTodo(input.value.trim());
    input.value = '';
  },
  addTodo(title) {
    return this.collection.add({
      title,
    });
  },
  onSelectFilter(filter) {
    this.filter = filter;
    location.hash = filter === 'all' ? '#/' : '#/' + filter;
    this.refresh();
    this.triggerMethod('change:filter', filter);
  },
  onChangeToggleAll() {
    const completed = this.collection.remaining() > 0;
    this.collection.forEach(todo => todo.set('completed', completed));
  },
  onClickClearCompleted() {
    this.collection.remove(this.collection.completed());
  },
  refresh() {
    const count = this.collection.length;
    const remaining = this.collection.remaining();
    this.getUI('toggleAll')[0].checked = count > 0 && remaining === 0;
    this.getUI('toggleAll')[0].disabled = !count;
    this.getUI('main')[0].hidden = !count;
    this.getChildView('footer').getState().set({
      count,
      remaining,
      filter: this.filter,
    });
    // CollectionView owns which children are attached. The notes Region stays put.
    this.list.setFilter(item =>
      this.filter === 'active'
        ? !item.model.get('completed')
        : this.filter === 'completed'
          ? item.model.get('completed')
          : true,
    );
  },
  changeNeighbor() {
    if (this.neighbor && this.collection.get(this.neighbor)) {
      this.collection.remove(this.neighbor);
      this.neighbor = null;
    } else {
      this.neighbor = this.addTodo('Take a highly strategic biscuit break');
    }
    this.triggerMethod('change:neighbor');
  },
});
Todos.setDataApi(DataApi);

export { Todos };
