import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compileProject, projectArchive, inspectSource } from '../tools/demo-project.js';
import { recipes, recipeRuntime } from '../site/assets/playground-recipes.js';

test('the demo bundle matches the pinned core and data provenance', async () => {
  const read = path => readFile(new URL('../' + path, import.meta.url));
  const metadata = JSON.parse(await read('site/vendor/demos.provenance.json'));
  const core = JSON.parse(await read('content/provenance.json'));
  const lock = JSON.parse(await read('package-lock.json'));
  const data = lock.packages['node_modules/@mnjs/data'];
  assert.equal(metadata.coreSha256, core.bundleSha256);
  assert.equal(metadata.dataVersion, core.packageVersion);
  assert.equal(metadata.dataVersion, recipeRuntime.data.version);
  assert.equal(metadata.dataVersion, data.version);
  assert.equal(metadata.dataIntegrity, data.integrity);
  assert.equal(metadata.bundleSha256, createHash('sha256').update(await read('site/vendor/demos.js')).digest('hex'));
});

for (const recipe of recipes) {
  test(recipe.id + ': real modules, independent app code, exact source excerpts', async () => {
    const input = {title:recipe.title,css:recipe.css,files:recipe.sourceFiles};
    const compiled = compileProject(input);
    assert.equal(compiled.project.entry,'main.js');
    for (const [file,source] of Object.entries(recipe.sourceFiles)) {
      const directory = ['html.js','lesson-ui.js'].includes(file) ? 'shared' : recipe.id;
      assert.equal(source,await readFile(new URL('../site/demos/projects/'+directory+'/'+file,import.meta.url),'utf8'),'Generated registry must match the actual module');
      if (!['main.js','lesson.js','lesson-ui.js'].includes(file)) {
        assert.doesNotMatch(source,/\b(demoInspector|explain|story)\s*[.(]/);
        assert.doesNotMatch(source,/from ['"]\.\/(lesson|lesson-ui|source)\.js/);
      }
    }
    for (const entry of recipe.readingGuide) {
      const section = compiled.sections[entry.file][entry.symbol];
      assert.ok(section,entry.symbol);
      assert.equal(recipe.sourceFiles[entry.file].split('\n').slice(section.line-1,section.endLine).join('\n').trimEnd().replace(/,$/,''),section.text.trimEnd().replace(/,$/,''));
    }
    const archive=projectArchive(input,'export const View = {};','MIT');
    assert.equal(archive.type,'application/zip');
    assert.equal(new DataView(await archive.arrayBuffer()).getUint32(0,true),0x04034b50);
  });
}

test('module linker parses imports without rewriting comments or strings and reports errors by file',()=>{
  const files={
    'main.js': "import { value } from './value.js'; export { value }; const text = \"import nope from './ghost.js'\"; // import './ghost.js'\n",
    'value.js': 'export let value = 1; export const load = () => import("./main.js");',
  };
  const compiled=compileProject({title:'Modules',css:'',files});
  assert.match(compiled.project.modules['main.js'],/from "demo:value.js"/);
  assert.match(compiled.project.modules['main.js'],/import nope from '\.\/ghost.js'/);
  assert.match(compiled.project.modules['value.js'],/import\("demo:main.js"\)/);
  assert.throws(()=>compileProject({title:'Bad',css:'',files:{'main.js':"import './missing.js'"}}),/main.js: unknown project import/);
  assert.throws(()=>compileProject({title:'Bad',css:'',files:{'main.js':'const = broken'}}),/main.js:/);
  assert.throws(()=>compileProject({title:'Bad',css:'',files:{'main.js':'import(userInput)'}}),/dynamic imports need a literal/);
  assert.throws(()=>compileProject({title:'Bad',css:'',files:{'main.js':"import 'https://example.com/code.js'"}}),/unknown project import/);
});

test('edited method excerpts come from the edited snapshot, with HTML escaped',()=>{
  const recipe=recipes[0];
  const files={...recipe.sourceFiles,'app.js':recipe.sourceFiles['app.js'].replace('return this.collection.add({','// </code><script>test</script>\n    return this.collection.add({')};
  const {sections}=compileProject({title:recipe.title,css:recipe.css,files});
  assert.match(sections['app.js']['Todos.addTodo'].text,/<script>test<\/script>/);
  assert.doesNotMatch(sections['app.js']['Todos.addTodo'].highlighted,/<script>/);
  assert.match(sections['app.js']['Todos.addTodo'].highlighted,/&lt;script&gt;/);
});

test('editor highlights incomplete drafts safely and finds symbols without resolving imports', () => {
  const source = "import './missing.js';\nconst Radio = View.extend({\n  onAttach() {\n    return '<img src=x onerror=alert(1)>';\n  }\n});\n";
  const result = inspectSource(source);
  assert.deepEqual(result.symbols, [{ symbol: 'Radio.onAttach', line: 3, endLine: 5 }]);
  assert.match(result.highlighted, /syntax-keyword/);
  assert.doesNotMatch(result.highlighted, /<img/);
  assert.match(result.highlighted, /&lt;img/);
  for (const draft of ["const unfinished = '<svg onload=alert(1)>' +", '/* <script>alert(1)</script>']) {
    const highlighted = inspectSource(draft).highlighted;
    assert.doesNotMatch(highlighted, /<(svg|script)/);
    assert.match(highlighted, /syntax-(string|comment)/);
  }
  assert.match(inspectSource('a { color: #fff; content: "<img>"; }', 'css').highlighted, /&lt;img&gt;/);
});
