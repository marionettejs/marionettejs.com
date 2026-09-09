// Run after npm run build, then open the printed URL in the local preview.
// This exercises the real bundled library and DOM in the exported sandbox.
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { starter, standaloneDocument } from '../../site/assets/playground-runtime.js';

const app = { ...starter, title: 'Playground ownership regression', code: starter.code + `
const passed = [];
function check(condition, label) {
  if (!condition) throw new Error('FAILED: ' + label);
  passed.push(label);
}
const first = region.currentView;
const Second = first.constructor;
const second = new Second();
check(first.getState() !== second.getState(), 'Independent state sources');
const oldButton = first.el.querySelector('#celebrate');
oldButton.querySelector('span').click();
check(first.getState().victories === 1, 'Nested click uses the matched control');
check(first.el.textContent.includes('1 small victory'), 'State reaches the template');
check(second.getState().victories === 0, 'Second instance remains unchanged');
region.show(second);
check(first.isDestroyed(), 'Replacement destroys the previous View');
check(second.getState().victories === 0 && second.el.textContent.includes('0 small victories'), 'Replacement starts fresh');
oldButton.click();
check(first.getState().victories === 1, 'Destroyed View no longer handles clicks');
region.empty();
check(second.isDestroyed() && !region.hasView(), 'Empty destroys the replacement');
const report = document.createElement('pre');
report.id = 'ownership-result';
report.textContent = passed.length + ' BROWSER CHECKS PASSED\\n' + passed.join('\\n');
document.querySelector('#app').append(report);
` };
const vendor = await readFile(new URL('../../site/vendor/marionette.js', import.meta.url), 'utf8');
const license = await readFile(new URL('../../site/vendor/MARIONETTE-LICENSE.txt', import.meta.url), 'utf8');
await writeFile(new URL('../../dist/_ownership-check.html', import.meta.url), standaloneDocument(app, vendor, license, randomUUID()));
console.log('Open http://127.0.0.1:4175/_ownership-check.html — expect 8 BROWSER CHECKS PASSED.');
