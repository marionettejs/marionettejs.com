// Shared teaching frames for the first paint and the interactive walkthrough.
const source = (topic, sections, tab = 'view') => ({
  tab,
  file: `hero.js · ${topic}`,
  before: '',
  methods: sections.map(([name, label, code]) => ({ name, label: '// ' + label, lines: code.split('\n') })),
  after: '',
});
export const headingSource = () => source('a first entrance', [
  ['template', 'A View renders its state.', [
    'const Heading = View.extend({',
    '  createState: () => ({ visible: false }),',
    '  templateContext() { return this.getState(); },',
    '  template: ({ visible }) => visible',
    '    ? html`<h1>Pull a few strings.</h1>` : null',
    '});',
  ].join('\n')],
  ['heading', 'Now give it the stage.', 'heading.getState().visible = true;\nheading.render();'],
]);
export const startupSource = () => source('Application startup', [
  ['showLoader', 'Our app-defined helper shows the loader.', 'onBeforeStart() {\n  this.showLoader();\n}'],
  ['prepareStart', 'Preparation is the awaited hook.', 'async prepareStart(_options, { signal }) {\n  return await loadCoolIdeas({ signal });\n}'],
  ['onStart', 'Ready? Call our app-defined helper.', 'onStart(_app, _options, ideas) {\n  this.showApp(ideas);\n}'],
], 'application');
export const startup = () => [
  { title: 'Show the heading', active: 'heading', source: headingSource() },
  { title: 'Show a loader', active: 'showLoader', source: startupSource() },
  { title: 'Wait for something good', active: 'prepareStart', source: startupSource() },
  { title: 'Show the ready app', active: 'onStart', source: startupSource() },
];
export function interactionSource(id) {
  if (id === 'panel') return source('View events + a Region', [
    ['handler', 'The View handles the next-panel click.', "events: { 'click .next-panel': 'onNextPanel' },\nonNextPanel() {\n  this.showPanel(nextAnswer());\n}"],
    ['region', 'Its Region replaces the content View.', "showPanel(answer) {\n  this.showChildView('panel',\n    new Answer({ model: answer }));\n}"],
  ], 'events');
  return source('View events + Regions', [
    ['handler', 'The View handles a click.', `events: { 'click .${id}': 'onChoose' },\nonChoose() {\n  this.triggerMethod('choose:answer', '${id}');\n}`],
    ['region', 'Its owner changes one part.', "showAnswer(name) {\n  this.showChildView('answer',\n    new Answer({ model: answers[name] }));\n}"],
  ], 'events');
}
export const listSource = () => ({ ...source('a changing data Collection', [
  ['add', 'CollectionView observes the Collection.', "addRow() {\n  this.collection.add({ label: nextIdea });\n}"],
  ['remove', 'Remove the Model. Its row View follows.', 'removeRow(row) {\n  this.collection.remove(row.model);\n}'],
], 'lists'), before: "import { Collection } from '@mnjs/data';\nconst rows = new Collection();" });
export const ideaSource = () => source('an async sentence Application', [
  ['showLoader', 'A fresh run starts with a loader.', "const Sentences = Application.extend({\n  onBeforeStart() {\n    this.showLoader();\n  },"],
  ['prepareStart', 'Choose a value while we wait.', "  async prepareStart(_options, { signal }) {\n    const mood = await choose(Moods, { signal });\n    return `A ${mood} robot learns to tap dance.`;\n  },"],
  ['onStart', 'The new sentence reaches onStart.', "  onStart(_app, _options, sentence) {\n    this.showSentence(sentence);\n  }\n});\n\nconst sentences = new Sentences();"],
], 'application');
export const sentenceEventsSource = () => source('a click starts another run', [
  ['events', 'Marionette delegates the View events.', "const SentenceView = View.extend({\n  events: {\n    'click .another-sentence': 'onAnotherSentence',\n    'click .cancel': 'onCancel'\n  },"],
  ['restart', 'The click handler asks the Application.', '  onAnotherSentence() {\n    sentences.restart();\n  },'],
  ['cancel', 'Cancel only this unfinished run.', '  onCancel() {\n    sentences.stop();\n  }\n});'],
], 'events');

export const codeTabs = [
  { id: 'application', label: 'Application.js' }, { id: 'view', label: 'View.js' },
  { id: 'events', label: 'Events.js' }, { id: 'lists', label: 'List.js' }, { id: 'async', label: 'Startup.js' },
];
export const initialCodePanels = () => ({
  application: { title: 'Application startup', source: startupSource() },
  view: { title: 'Show the heading', active: 'heading', source: headingSource() },
  events: { title: 'View events and Regions', source: interactionSource('panel') },
  lists: { title: 'A changing list', source: listSource() },
  async: { title: 'Header startup', source: startupSource() },
});
export const isFocusedCodeLine = (name, active, line) => name === active && /getState\(\).visible|heading.render\(|showChildView\(|await |this.showApp\(|this.showLoader\(|triggerMethod\(|addChildView\(|removeChildView\(|collection.add\(|collection.remove\(|sentences.restart\(|sentences.stop\(/.test(line);
