import { Application, View, CollectionView } from '../vendor/marionette.js?v=5.0.0-beta.1';

// Static example content; each screen owns its selection and lifecycle state.
const work = [
  { id:'plan', label:'Plan a feature', number:'01', title:'Give the idea a home.', body:'A screen owns its layout. Named Regions give each changing part a clear place to belong.', tag:'A PLACE TO START' },
  { id:'build', label:'Build the interface', number:'02', title:'Change one part.', body:'This detail View changed. The screen and the list kept their identities. No need to rebuild the whole room.', tag:'A REASONABLE AMOUNT OF CHANGE' },
  { id:'review', label:'Review the change', number:'03', title:'Follow the ownership.', body:'The Application owns the screen. The screen owns its Regions. The list owns its rows. A diff with a return address.', tag:'FOR WHOEVER READS THE DIFF' }
];
const WorkItem = View.extend({
  tagName:'li',
  template:({ number, label }) => `<button type="button"><span>${number}</span>${label}<span aria-hidden="true">↗</span></button>`,
  events:{ 'click button':'choose' },
  choose() { this.triggerMethod('choose', this.model); }
});
const WorkList = CollectionView.extend({
  tagName:'ul', className:'application-items', childView:WorkItem,
  childViewTriggers:{ choose:'select:work' }
});
const Detail = View.extend({
  tagName:'article', className:'application-detail',
  template:({ title, body, tag }) => `<span class="component-label">DetailView</span><h3>${title}</h3><p>${body}</p><small>${tag}</small>`
});
const Screen = View.extend({
  className:'application-screen',
  createState() { return { selectedId:work[0].id, replacements:0, previousDetailDestroyed:false }; },
  template:() => `<div class="application-owner"><span>ScreenView</span><span>owns this layout</span></div><div class="application-layout"><div class="application-list"><span class="component-label">CollectionView</span><div data-list></div><small>3 items · one list</small></div><div data-detail></div></div>`,
  regions:{ list:'[data-list]', detail:'[data-detail]' },
  childViewEvents:{ 'select:work':'selectWork' },
  onRender() {
    this.showChildView('list', new WorkList({ collection:work }));
    this.showChildView('detail', new Detail({ model:work.find(item => item.id === this.getState().selectedId) }));
  },
  selectWork(item) {
    const state = this.getState();
    if (state.selectedId === item.id) return;
    const previous = this.getChildView('detail');
    this.showChildView('detail', new Detail({ model:item }));
    state.selectedId = item.id;
    state.replacements++;
    state.previousDetailDestroyed = previous.isDestroyed();
    document.querySelector('#demo-status').textContent = 'Detail replaced and cleaned up. Screen and list stayed put.';
  }
});
const Preview = Application.extend({
  region:'#application-slot',
  onStart() { this.showView(new Screen()); }
});
const app = new Preview();
await app.start();

function inspect() {
  const screen = app.getView();
  const list = screen.getChildView('list');
  const detail = screen.getChildView('detail');
  return {
    running:app.isRunning(), screenId:screen.cid, listId:list.cid, detailId:detail.cid,
    attached:screen.isAttached(), regions:['list','detail'], listItems:list.children.length,
    ...screen.getState()
  };
}
const toolsLifetime = new AbortController();
if (document.modelContext?.registerTool) {
  const tools = [
    { name:'inspect_application_demo', title:'Inspect the application example', description:'Read the actual Application, screen, list and detail identities, selection, and previous detail cleanup. Selecting work preserves the screen and list.', inputSchema:{type:'object',properties:{},additionalProperties:false}, annotations:{readOnlyHint:true}, execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object');
      return inspect();
    } },
    { name:'select_application_demo_item', title:'Choose work in the application example', description:'Choose one of the visible work items. Replaces only the detail View; returns real ownership state.', inputSchema:{type:'object',properties:{id:{type:'string',enum:work.map(item => item.id)}},required:['id'],additionalProperties:false}, annotations:{readOnlyHint:false}, execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !Object.hasOwn(input,'id')) throw new Error('Expected exactly {id: "plan", "build", or "review"}');
      const item = work.find(item => item.id === input.id);
      if (!item) throw new Error('Unknown work item');
      app.getView().selectWork(item);
      return inspect();
    } }
  ];
  try {
    for (const tool of tools) await document.modelContext.registerTool(tool, { signal:toolsLifetime.signal });
  } catch (error) {
    toolsLifetime.abort();
    console.warn('Optional application example tools could not register.', error);
  }
}
addEventListener('pagehide', event => {
  if (!event.persisted) {
    toolsLifetime.abort();
    app.destroy().catch(error => console.warn('Application example cleanup failed.', error));
  }
});
