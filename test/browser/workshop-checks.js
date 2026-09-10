// Appended to the submitted starter only in the browser regression fixture.
// Observe public ownership, data, DOM, and lifecycle; never framework internals.
const checks = [];
function check(condition, label) {
  checks.push({ id: label, expected: true, observed: Boolean(condition) });
  if (!condition) throw new Error('FAILED: ' + label);
}
window.addEventListener('run-workshop-checks', () => {
const first = region.currentView;
const Root = first.constructor;
const second = new Root();
check(first.collection !== second.collection && first.collection.at(0) !== second.collection.at(0), 'Independent owned records');
const list = first.getChildView('list');
const summary = first.getChildView('summary');
const scratchpad = first.getChildView('notes');
const model = first.collection.at(0);
const row = list.children.findByModel(model);
const oldButton = row.el.querySelector('button');
oldButton.querySelector('span').click();
check(model.get('completed') === true, 'Nested click changes the record');
check(row.el.querySelector('button').getAttribute('aria-pressed') === 'true' && /1\s+small victory/.test(summary.el.textContent), 'Row and summary observe the same record');
check(second.collection.at(0).get('completed') === false, 'Second instance stays independent');
const notes = scratchpad.el.querySelector('textarea');
notes.focus();
notes.value = 'Keep this <unfinished> thought';
notes.dispatchEvent(new Event('input', { bubbles: true }));
notes.setSelectionRange(3, 7);
model.set({ completed: false, title: '<Literal & safe>' });
check(row.el.querySelector('.victory-title').textContent === '<Literal & safe>' && /0\s+small victories/.test(summary.el.textContent), 'Direct model changes reach both observers and escape text');
check(first.getChildView('notes') === scratchpad && document.activeElement === notes && notes.value === 'Keep this <unfinished> thought' && notes.selectionStart === 3 && notes.selectionEnd === 7, 'Unrelated draft, selection, focus and identity survive');
model.set('id', 'renamed');
check(row.el.querySelector('button').id === 'victory-renamed', 'Record ID changes update the addressed control');
first.collection.move(model, 1);
check(list.children.findByModel(model) === row && list.el.lastElementChild === row.el, 'Reordering preserves the row');
const input = first.el.querySelector('#new-victory');
const form = input.closest('form');
input.value = '   ';
form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
check(first.collection.length === 2, 'Blank input creates no record');
input.value = '<A new victory>';
form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const added = first.collection.at(2);
const addedRow = list.children.findByModel(added);
check(added.get('title') === '<A new victory>' && addedRow.el.textContent.includes('<A new victory>') && input.value === '' && document.activeElement === input, 'Adding a record updates the list and returns focus');
first.collection.remove(added);
check(addedRow.isDestroyed() && !addedRow.el.isConnected && list.children.findByModel(model) === row, 'Removal destroys only the removed row');
const detached = region.detachView();
region.show(detached);
row.el.querySelector('button span').click();
check(model.get('completed') === true, 'Reattachment does not duplicate the handler');
scratchpad.render();
check(scratchpad.el.querySelector('textarea').value === 'Keep this <unfinished> thought', 'Draft state can reproduce its template');
let lateRenders = 0;
row.on('render', () => { lateRenders++; });
summary.on('render', () => { lateRenders++; });
const retainedButton = row.el.querySelector('button');
region.show(second);
check(first.isDestroyed() && list.isDestroyed() && row.isDestroyed() && summary.isDestroyed() && scratchpad.isDestroyed(), 'Region replacement destroys the entire owned tree');
retainedButton.click();
check(model.get('completed') === true, 'Destroyed controls do nothing');
model.set('completed', false);
check(lateRenders === 0, 'Destroyed observers stop rendering');
check(/0\s+small victories/.test(second.getChildView('summary').el.textContent), 'Replacement starts fresh');
region.empty();
check(second.isDestroyed() && !region.hasView(), 'Empty destroys the replacement');
region.show(new Root());
}, { once: true });
export function inspectRecipe() {
  return { checks };
}
