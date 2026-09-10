// Run after npm run build, then open the printed URL in the local preview.
// Share the executable public-contract checks with the automated browser suite.
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { starter, standaloneDocument } from '../../site/assets/playground-runtime.js';
const checks = await readFile(new URL('./workshop-checks.js', import.meta.url), 'utf8');
const app = { ...starter, title: 'Playground ownership regression', code: `${starter.code}\n${checks}
const run = document.createElement('button');
run.id = 'run-ownership-checks';
run.textContent = 'Run ownership checks';
document.body.append(run);
run.addEventListener('click', () => {
window.dispatchEvent(new Event('run-workshop-checks'));
const results = inspectRecipe().checks;
const report = document.createElement('pre');
report.id = 'ownership-result';
report.textContent = results.filter(check => check.observed).length + ' BROWSER CHECKS PASSED\\n' + results.map(check => (check.observed ? 'PASS: ' : 'FAIL: ') + check.id).join('\\n');
document.querySelector('#app').append(report);
run.disabled = true;
}, { once: true });
` };
const vendor = await readFile(new URL('../../site/vendor/demos.js', import.meta.url), 'utf8');
const license = await readFile(new URL('../../site/vendor/DEMOS-LICENSE.txt', import.meta.url), 'utf8');
await writeFile(new URL('../../dist/_ownership-check.html', import.meta.url), standaloneDocument(app, vendor, license, randomUUID()));
console.log('Open http://127.0.0.1:4175/_ownership-check.html — expect 18 BROWSER CHECKS PASSED.');
