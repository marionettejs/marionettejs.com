import { View, CollectionView } from 'marionette';
import { Model, Collection, DataApi, StateApi } from '@mnjs/data';
import { escapeHTML } from './html.js';

// TodoMVC-style editing with independent Marionette owners.
// Model, Collection and DataApi are supplied by the pinned @mnjs/data bundle.
// @mnjs/data owns the todos; CollectionView observes membership and each
// TodoItem observes its Model. Local editing state belongs to the row View.
const Todo = Model.extend({
  defaults: {
    title: '',
    completed: false,
  },
});
const TodoCollection = Collection.extend({
  model: Todo,
  remaining() {
    return this.models.filter(todo => !todo.get('completed')).length;
  },
  completed() {
    return this.models.filter(todo => todo.get('completed'));
  },
});
const TodoItem = View.extend({
  tagName: 'li',
  className: 'todo-item',
  createState() {
    return {
      editing: false,
    };
  },
  modelEvents: {
    change: 'render',
  },
  templateContext() {
    return this.getState();
  },
  template: ({ title, completed, editing }) => `
    <input class="toggle" type="checkbox" aria-label="Complete todo" ${completed ? 'checked' : ''}>
    <label class="todo-title" tabindex="0" role="button" title="Double-click to edit">${escapeHTML(title)}</label>
    <button class="delete-todo" aria-label="Delete todo">×</button>
    <input class="edit" aria-label="Edit todo title" value="${escapeHTML(title)}" ${editing ? '' : 'hidden'}>`,
  ui: {
    toggle: '.toggle',
    title: '.todo-title',
    edit: '.edit',
    remove: '.delete-todo',
  },
  events: {
    'change @ui.toggle': 'onChangeCompleted',
    'keydown @ui.title': 'onKeydownTitle',
    'keydown @ui.edit': 'onKeydownEdit',
    'focusout @ui.edit': 'onFocusoutEdit',
  },
  triggers: {
    'dblclick @ui.title': 'dblclick:title',
    'click @ui.remove': 'click:remove',
  },
  onDblclickTitle() {
    this.edit();
  },
  onFocusoutEdit() {
    this.save();
  },
  onRender() {
    const { editing } = this.getState();
    const completed = this.model.get('completed');
    this.el.classList.toggle('completed', completed);
    this.el.classList.toggle('editing', editing);
    if (editing) {
      const [input] = this.getUI('edit');
      input.focus();
      input.select();
    }
  },
  onKeydownTitle(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.edit();
    }
  },
  onChangeCompleted() {
    const focused = this.getUI('toggle')[0] === document.activeElement;
    this.model.set('completed', !this.model.get('completed'));
    if (focused) {
      this.getUI('toggle')[0].focus({
        preventScroll: true,
      });
    }
  },
  edit() {
    this.getState().editing = true;
    this.render();
  },
  onKeydownEdit(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.save();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.endEdit();
    }
  },
  save() {
    if (!this.getState().editing) {
      return;
    }
    const title = this.getUI('edit')[0].value.trim();
    if (!title) {
      this.getState().editing = false;
      this.triggerMethod('submit:emptyTitle', this.model);
      return;
    }
    if (title === this.model.get('title')) {
      this.endEdit();
      return;
    }
    this.getState().editing = false;
    this.model.set('title', title);
  },
  endEdit() {
    this.getState().editing = false;
    this.render();
  },
});
TodoItem.setDataApi(DataApi);
const TodoList = CollectionView.extend({
  tagName: 'ul',
  childView: TodoItem,
  childViewEvents: {
    'click:remove': 'onClickRemove',
    'submit:emptyTitle': 'onSubmitEmptyTitle',
  },
  onClickRemove(view) {
    this.collection.remove(view.model);
  },
  onSubmitEmptyTitle(model) {
    this.collection.remove(model);
  },
});
TodoList.setDataApi(DataApi);
const TodoFooter = View.extend({
  createState() {
    return new Model({ count: 0, remaining: 0, filter: 'all' });
  },
  stateEvents: {
    change: 'render',
  },
  templateContext() {
    return this.getState().toObject();
  },
  template: ({ count, remaining, filter }) => `<footer class="todo-footer" ${count ? '' : 'hidden'}>
    <span id="todo-count" role="status"><strong>${remaining}</strong> item${remaining === 1 ? '' : 's'} left</span>
    <nav aria-label="Filter todos">${['all', 'active', 'completed'].map(name => `<a href="#/${name === 'all' ? '' : name}" data-filter="${name}" ${filter === name ? 'aria-current="page"' : ''}>${name[0].toUpperCase() + name.slice(1)}</a>`).join('')}</nav>
    <button id="clear-completed" ${remaining === count ? 'hidden' : ''}>Clear completed</button></footer>`,
  ui: {
    filters: '[data-filter]',
    clear: '#clear-completed',
  },
  events: {
    'click @ui.filters': 'onClickFilter',
  },
  triggers: {
    'click @ui.clear': 'click:clearCompleted',
  },
  onClickFilter(event) {
    event.preventDefault();
    this.triggerMethod('select:filter', event.delegateTarget.dataset.filter);
  },
});
TodoFooter.setStateApi(StateApi);

export { TodoCollection, TodoItem, TodoList, TodoFooter };
