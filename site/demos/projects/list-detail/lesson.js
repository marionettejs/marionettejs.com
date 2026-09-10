import { LessonController, demoInspector, explain, story } from './lesson-ui.js';

const at = symbol => ({ file: 'app.js', symbol });
const row = symbol => ({ file: 'todo-views.js', symbol });

export const TodoLesson = LessonController.extend({
  observe(view) {
    this.listenTo(view, 'render', () => {
      this.listenTo(view.list, 'add:child', (list, child) => this.trackChild(child));
      demoInspector.observeView('list', view.list);
      demoInspector.observeView('notes', view.notes);
      demoInspector.observeRegion('todos.list', view.getRegion('list'));
      demoInspector.observeRegion('todos.notes', view.getRegion('notes'));
    });
    this.listenTo(view, 'change:neighbor', this.onChangeNeighbor);
    this.listenTo(view.collection, 'add', () => {
      this.trackRows();
      explain(
        'A Model becomes a row.',
        [at('Todos.addTodo'), row('TodoList.childView')],
        'The Collection stores the task. CollectionView creates a TodoItem for it—no manual row insertion.',
        ['You submitted a task.', 'Todos added its Model.', 'CollectionView attached its row.'],
      );
    });
    this.listenTo(view.collection, 'remove', model => {
      this.children.delete(model);
      if (this.retained?.model === model) {
        this.retained = null;
        this.element = null;
      }
      explain(
        'Removing data removes its owned row.',
        row('TodoList.onClickRemove'),
        'The child emits click:remove. TodoList removes its Model, and CollectionView destroys that child.',
        [
          'The row emitted an event.',
          'Its owner removed the Model.',
          'The child View was destroyed.',
        ],
      );
    });
    this.listenTo(view.collection, 'change:completed', () =>
      explain(
        'The row and its count follow the Model.',
        [row('TodoItem.onChangeCompleted'), row('TodoItem.modelEvents')],
        'A checkbox changes its Model. The row observes that change; the parent updates its footer and filter. The notes View stays intact.',
      ),
    );
    this.listenTo(view.collection, 'change:title', () =>
      explain(
        'An edit reaches the Model.',
        row('TodoItem.save'),
        'The row saves its draft into its Model. The same row View renders the new title.',
      ),
    );
    this.listenTo(view, 'change:filter', () =>
      explain(
        'Filtering changes which rows are attached.',
        at('Todos.refresh'),
        'CollectionView applies the filter. It does not rebuild the notes Region.',
      ),
    );
  },
  ready(view) {
    this.children = new Map();
    this.trackRows();
    this.input = view.notes.getUI('draft')[0];
    this.retained = view.list.children.find(() => true);
    this.element = this.retained?.el;
    explain(
      'Start with a task, a Model, and a row.',
      [at('Todos.addTodo'), row('TodoList.childView')],
      'Add a todo, complete it, then delete it. Each action reveals the actual method running here. The optional draft exercise below explores independent Regions.',
      ['Add a Model.', 'Interact with its child View.', 'Follow the event back to its owner.'],
    );
  },
  trackRows() {
    this.children ||= new Map();
    this.view.collection.forEach(model => {
      const child = this.view.list?.children.findByModel(model);
      if (child) {
        this.trackChild(child);
      }
    });
  },
  trackChild(child) {
    this.children ||= new Map();
    if (this.children.get(child.model) === child) {
      return;
    }
    this.children.set(child.model, child);
    this.listenTo(child, 'destroy', () =>
      demoInspector.check('removed-child-destroyed', child.isDestroyed()),
    );
  },
  onChangeNeighbor() {
    const view = this.view;
    demoInspector.check('input-identity', view.notes.getUI('draft')[0] === this.input);
    demoInspector.check('draft-preserved', this.input.value === view.notes.getState().draft);
    demoInspector.check('focus-preserved', document.activeElement === this.input);
    if (this.retained) {
      demoInspector.check(
        'child-identity',
        view.list.children.findByCid(this.retained.cid) === this.retained &&
          this.retained.el === this.element,
      );
    }
    explain(
      'The neighboring row changed. Your input stayed put.',
      at('Todos.changeNeighbor'),
      'The list and notes have separate Regions. This check compares the actual input and row objects; it is not a visual imitation.',
      [
        'The Collection changed.',
        'CollectionView updated its child.',
        'The notes input and cursor stayed alive.',
      ],
    );
    story('Same draft. Same input. Your master plan has survived a biscuit-related interruption.');
  },
});
