import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { starter, version, revision, validateApp, validateAction, runnerDocument, standaloneDocument } from '../site/assets/playground-runtime.js';

test('the discoverable brief embeds the exact executable starter', async () => {
  const brief = await readFile(new URL('../dist/agent-prompt.md', import.meta.url), 'utf8');
  assert.ok(brief.includes(`\`\`\`js\n${starter.code}\n\`\`\``));
  assert.ok(!brief.includes('<!-- playground-starter -->'));
});

test('app submissions reject malformed, oversized and extra inputs before execution', () => {
  assert.deepEqual(validateApp(starter), starter);
  for (const input of [null, [], {}, { ...starter, title: '' }, { ...starter, code: ' ' },
    { ...starter, code: 'a'.repeat(60001) }, { ...starter, css: 'a'.repeat(20001) },
    { ...starter, css: null }, { ...starter, url: 'https://example.com' }]) {
    assert.throws(() => validateApp(input));
  }
  const copy = validateApp(starter);
  copy.code = 'changed';
  assert.notEqual(copy.code, starter.code);
});

test('preview interactions accept only bounded control ids and explicit actions', () => {
  assert.deepEqual(validateAction({ id: 'celebrate', action: 'click' }), { id: 'celebrate', action: 'click' });
  assert.deepEqual(validateAction({ id: 'idea', action: 'input', value: '' }), { id: 'idea', action: 'input', value: '' });
  for (const input of [null, [], {}, { id: 'a', action: 'navigate' },
    { id: '#app button', action: 'click' }, { id: 'a', action: 'input' },
    { id: 'a', action: 'click', value: 'extra' }, { id: 'a', action: 'click', url: 'extra' },
    { id: 'a', action: 'input', value: 'x'.repeat(2001) }]) assert.throws(() => validateAction(input));
});

test('HTML parser breakouts stay inside serialized app data and policy precedes execution', () => {
  const attack = '</script><img src=x onerror="parent.compromised=true"><script>';
  const output = runnerDocument({ app: { title: attack, code: `document.querySelector('#app').textContent=${JSON.stringify(attack)}`, css: `/* ${attack} */` }, vendor: '// pinned', token: randomUUID() });
  assert.equal((output.match(/<script\b/g) || []).length, 1);
  assert.equal((output.match(/<\/script>/g) || []).length, 1);
  assert.ok(!output.includes('<img src=x'));
  assert.ok(output.indexOf('Content-Security-Policy') < output.indexOf('<script'));
  assert.match(output, /connect-src 'none'/);
  assert.match(output, /frame-src 'none'; worker-src 'none'/);
  assert.ok(!output.includes("'unsafe-eval'"));
  assert.throws(() => runnerDocument({ app: starter, vendor: '', token: '" onload="attack' }));
});

test('download contains the same pinned library, license and sandboxed standalone app', async () => {
  const vendor = await readFile(new URL('../site/vendor/marionette.js', import.meta.url), 'utf8');
  const license = await readFile(new URL('../site/vendor/MARIONETTE-LICENSE.txt', import.meta.url), 'utf8');
  const output = standaloneDocument(starter, vendor, license, randomUUID());
  assert.match(output, /sandbox="allow-scripts"/);
  assert.ok(!output.includes('allow-same-origin'));
  assert.ok(!output.includes('<script src='));
  assert.match(output, /b06750c507494441f0b2298766b70087e45346a2/);
  assert.match(output, /MIT/);
  const runner = output.match(/srcdoc="([^"]*)"/)[1].replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&');
  const config = JSON.parse(runner.slice(runner.indexOf('})({"app":') + 3, runner.lastIndexOf(');</script>')));
  assert.equal(config.vendor, vendor);
  assert.deepEqual(config.app, starter);
  assert.equal(config.standalone, true);
});

test('canonical recipe catalog rejects unknown ids and stays pinned to the demo', async () => {
  const { recipes, listRecipes, getRecipe, recipeRuntime } = await import('../site/assets/playground-recipes.js');
  const provenance = JSON.parse(await readFile(new URL('../content/provenance.json', import.meta.url), 'utf8'));
  assert.equal(version, recipeRuntime.version);
  assert.equal(revision, recipeRuntime.revision);
  assert.equal(recipeRuntime.version, provenance.packageVersion);
  assert.equal(recipeRuntime.revision, provenance.libraryRevision);
  assert.equal(new Set(recipes.map(recipe => recipe.id)).size, recipes.length);
  assert.ok(listRecipes().every(recipe => !('code' in recipe) && !('css' in recipe)));
  for (const recipe of recipes) {
    assert.deepEqual(validateApp({ title: recipe.title, code: recipe.code, css: recipe.css }).code, getRecipe({ id: recipe.id }).code);
    for (const path of recipe.docs) await readFile(new URL(`../dist${path}index.html`, import.meta.url), 'utf8');
  }
  for (const input of [null, [], {}, { id: '../secret' }, { id: 'list-detail', url: 'https://example.com' }]) assert.throws(() => getRecipe(input));
});
