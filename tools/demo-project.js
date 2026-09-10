import { importProject } from '../site/assets/project-runtime.js';
import { parse } from '@babel/parser';

const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'tokens', 'comments', 'errors'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(item => walk(item, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
};
function highlightTokens(source, tokens, start = 0, end = source.length) {
  let cursor = start, highlighted = '';
  for (const token of tokens.filter(token => token.start >= start && token.end <= end)) {
    highlighted += escape(source.slice(cursor, token.start));
    const label = token.type.label || token.type;
    const type = token.type.keyword ? 'keyword' : ['string', 'template'].includes(label) ? 'string' : label === 'num' ? 'number' : String(label).startsWith('Comment') ? 'comment' : label === 'name' ? 'name' : 'punctuation';
    highlighted += `<span class="syntax-${type}">${escape(source.slice(token.start, token.end))}</span>`;
    cursor = token.end;
  }
  return highlighted + escape(source.slice(cursor, end));
}

function visitSections(node, section) {
  if (node.type === 'FunctionDeclaration' && node.id) section(node.id.name, node);
  if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || node.init?.type !== 'CallExpression' || node.init.arguments[0]?.type !== 'ObjectExpression') return;
  for (const property of node.init.arguments[0].properties) {
    const name = property.key?.name || property.key?.value;
    if (name) section(node.id.name + '.' + name, property);
    const statements = property.body?.body.find(statement => statement.type === 'TryStatement')?.block.body;
    const awaited = statements?.findIndex(statement => statement.type === 'ExpressionStatement' && statement.expression.type === 'AwaitExpression');
    if (awaited >= 0) {
      const end = statements[Math.min(awaited + 2, statements.length - 1)].end;
      section(node.id.name + '.' + name + '.completion', { start: statements[awaited].start, end });
    }
  }
}

// Reading an unfinished draft never executes it or requires its imports to resolve.
export function inspectSource(source, language = 'javascript') {
  let ast;
  if (language === 'javascript') {
    try { ast = parse(source, { sourceType: 'module', tokens: true, errorRecovery: true }); }
    catch { /* Incomplete edits still get lexical highlighting and line navigation. */ }
  }
  const symbols = [];
  if (ast) {
    walk(ast.program, node => visitSections(node, (symbol, section) => {
      if (symbol.endsWith('.completion')) return;
      const line = source.slice(0, section.start).split('\n').length;
      symbols.push({ symbol, line, endLine: source.slice(0, section.end).split('\n').length });
    }));
    return { highlighted: highlightTokens(source, ast.tokens), symbols };
  }
  const tokens = [...source.matchAll(/\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?|`(?:\\.|[^`\\])*`?|\b(?:import|from|export|const|let|return|if|else|new|async|await|function|this|true|false|null)\b|\b\d+(?:\.\d+)?\b|#[\da-fA-F]{3,8}\b/g)].map(match => ({
    start: match.index, end: match.index + match[0].length,
    type: /^(\/\*|\/\/)/.test(match[0]) ? 'Comment' : /^["'`#]/.test(match[0]) ? { label: 'string' } : /^\d/.test(match[0]) ? { label: 'num' } : { keyword: true },
  }));
  return { highlighted: highlightTokens(source, tokens), symbols };
}

export function compileProject(input) {
  if (!input || typeof input.title !== 'string' || input.title.length > 100 || typeof input.css !== 'string' || input.css.length > 20000 || !input.files || typeof input.files !== 'object') throw new Error('Expected a titled module project with CSS and files.');
  const names = Object.keys(input.files);
  if (names.length > 20 || !names.includes('main.js') || names.includes('source.js') || names.some(name => !/^[a-z][a-z0-9-]*\.js$/.test(name))) throw new Error('Project files must be simple .js names, including main.js; source.js is generated.');
  if (Object.values(input.files).some(source => typeof source !== 'string' || source.length > 60000) || Object.values(input.files).join('').length > 240000) throw new Error('Project source is too large.');
  const modules = {}, sections = {}, originals = {};
  for (const [file, source] of Object.entries(input.files)) {
    let ast;
    try { ast = parse(source, { sourceType: 'module', tokens: true, createImportExpressions: true }); }
    catch (error) { throw new Error(file + ': ' + error.message); }
    originals[file] = source;
    sections[file] = {};
    const edits = [];
    const resolveImport = node => {
      if (!node || node.type !== 'StringLiteral') throw new Error(file + ': dynamic imports need a literal project filename.');
      const specifier = node.value;
      if (['marionette', '@mnjs/data'].includes(specifier)) return;
      if (!specifier.startsWith('./') || (!names.includes(specifier.slice(2)) && specifier !== './source.js')) throw new Error(file + ': unknown project import ' + specifier);
      edits.push({ start: node.start, end: node.end, value: JSON.stringify('demo:' + specifier.slice(2)) });
    };
    const section = (name, node) => {
      const lines = source.slice(0, node.start).split('\n');
      const start = node.start - lines.at(-1).length;
      const end = node.end;
      const highlighted = highlightTokens(source, ast.tokens, start, end);
      sections[file][name] = { file, symbol: name.replace(/\.completion$/, ''), line: lines.length, endLine: source.slice(0, end).split('\n').length, text: source.slice(start, end), highlighted };
    };
    walk(ast.program, node => {
      if (['ImportDeclaration', 'ExportAllDeclaration', 'ExportNamedDeclaration'].includes(node.type) && node.source) resolveImport(node.source);
      if (node.type === 'ImportExpression') resolveImport(node.source);
      visitSections(node, section);
    });
    modules[file] = edits.sort((a,b) => b.start - a.start).reduce((result, edit) => result.slice(0, edit.start) + edit.value + result.slice(edit.end), source) + '\n//# sourceURL=marionette-demo/' + file;
  }
  const sourceModule = 'export const sources = ' + JSON.stringify(originals) + ';\nexport const sections = ' + JSON.stringify(sections) + ';';
  modules['source.js'] = sourceModule;
  return { app: { title: input.title, css: input.css, code: input.files['main.js'] }, project: { modules, entry: 'main.js' }, sourceModule, sections };
}

// A portable ZIP containing ordinary relative-import modules and the pinned runtime.
export function projectArchive(input, vendor, license) {
  const compiled = compileProject(input);
  const files = {
    ...input.files,
    'source.js': compiled.sourceModule,
    'style.css': '* { box-sizing: border-box; } body { margin: 0; font: 16px/1.5 system-ui; } button,input { font: inherit; max-width:100%; }\n' + input.css,
    'vendor/marionette.js': vendor,
    'vendor/LICENSE.txt': license,
    'index.html': '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escape(input.title) + '</title><link rel="stylesheet" href="style.css"><script type="importmap">{"imports":{"marionette":"./vendor/marionette.js","@mnjs/data":"./vendor/marionette.js"}}</script></head><body><main id="app"></main><script type="module" src="main.js"></script></body></html>',
    'README.md': '# ' + input.title + '\n\nServe this folder over HTTP, for example `python3 -m http.server 8000`, then open http://localhost:8000. No build or package installation is needed.\n\nmain.js mounts the app and its lesson controller. app.js and feature modules run without the teaching controller; mount the exported View in your own Region. lesson.js contains narration and observations. lesson-ui.js renders the teaching interface. source.js is generated from this exported source snapshot for exact excerpts. All other JavaScript files are ordinary ES modules with explicit imports and exports.\n\nThe pinned Marionette and data runtime, with its licenses, is included in vendor/.\n',
  };
  const encoder = new TextEncoder(), chunks = [], directory = [];
  let offset = 0;
  const header = (size, signature) => { const bytes = new Uint8Array(size); const view = new DataView(bytes.buffer); view.setUint32(0, signature, true); return [bytes,view]; };
  const crc32 = bytes => { let crc = -1; for (const byte of bytes) { crc ^= byte; for (let i=0;i<8;i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ -1) >>> 0; };
  for (const [name,text] of Object.entries(files)) {
    const filename = encoder.encode(name), content = encoder.encode(text), crc = crc32(content);
    const [local,l] = header(30,0x04034b50);
    l.setUint16(4,20,true); l.setUint16(6,0x800,true); l.setUint32(14,crc,true); l.setUint32(18,content.length,true); l.setUint32(22,content.length,true); l.setUint16(26,filename.length,true);
    chunks.push(local,filename,content);
    const [central,c] = header(46,0x02014b50);
    c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x800,true); c.setUint32(16,crc,true); c.setUint32(20,content.length,true); c.setUint32(24,content.length,true); c.setUint16(28,filename.length,true); c.setUint32(42,offset,true);
    directory.push(central,filename); offset += local.length + filename.length + content.length;
  }
  const [end,e] = header(22,0x06054b50), directorySize = directory.reduce((sum, chunk)=>sum+chunk.length,0);
  e.setUint16(8,Object.keys(files).length,true); e.setUint16(10,Object.keys(files).length,true); e.setUint32(12,directorySize,true); e.setUint32(16,offset,true);
  return new Blob([...chunks,...directory,end], {type:'application/zip'});
}

// Native ESM linking retains cycles, live bindings, and module isolation.
export function projectPen(input, vendor, license) {
  const { project } = compileProject(input);
  const data = JSON.stringify({project,vendor,license}).replaceAll('<','\\u003c');
  return {
    title:input.title, description:'A Marionette module project. Every source file and the pinned runtime are included.',
    html:'<main id="app"></main>\n<script type="application/json" id="demo-project">'+data+'</script>',
    css:'*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui}button,input{font:inherit;max-width:100%}\n'+input.css,
    js:'const demoReady = (async () => {\nconst {project,vendor} = JSON.parse(document.querySelector("#demo-project").textContent);\nconst {appModule} = await ('+importProject.toString()+')(project,vendor);\nreturn appModule;\n})();\n',
    head:'<meta name="viewport" content="width=device-width,initial-scale=1">', html_pre_processor:'none',css_pre_processor:'none',js_pre_processor:'none',
  };
}
