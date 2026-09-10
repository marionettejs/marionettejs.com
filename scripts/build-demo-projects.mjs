import { readFile, readdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
const projects = {};
const directory = new URL('../site/demos/projects/', import.meta.url);
for (const id of ['list-detail', 'owned-widget', 'mission-control']) {
  projects[id] = {};
  for (const folder of ['shared', id]) {
    for (const file of (await readdir(new URL(folder + '/', directory))).filter(file => file.endsWith('.js')).sort()) {
      projects[id][file] = await readFile(new URL(folder + '/' + file, directory), 'utf8');
    }
  }
}
await writeFile(new URL('../site/assets/demo-projects.js', import.meta.url), '// Generated from site/demos/projects by build-demo-projects.mjs.\nexport const projects = ' + JSON.stringify(projects, null, 2) + ';\n');
const parserLicense = await readFile(new URL('../node_modules/@babel/parser/LICENSE', import.meta.url), 'utf8');
await build({ entryPoints: [new URL('../tools/demo-project.js', import.meta.url).pathname], outfile: new URL('../site/assets/demo-project-tools.js', import.meta.url).pathname, bundle: true, minify: true, format: 'esm', platform: 'browser', target: 'es2022', legalComments: 'inline', banner: { js: '/*! @babel/parser\n' + parserLicense + '\n*/' } });
