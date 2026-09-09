import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, cp, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const root = new URL('../', import.meta.url);
const command = fileURLToPath(new URL('../mcp/server.mjs', import.meta.url));
const corpus = JSON.parse(await readFile(new URL('../dist/docs/corpus.json', import.meta.url), 'utf8'));
const version = corpus.packageVersion;
const unpack = response => {
  assert.notEqual(response.isError, true, JSON.stringify(response.content));
  const data = JSON.parse(response.content[0].text);
  assert.deepEqual(data, response.structuredContent);
  assert.equal(data.provenance.packageVersion, version);
  assert.equal(data.provenance.sourceRevision, corpus.sourceRevision);
  assert.equal(data.provenance.sourceDirty, false);
  return data;
};

test('official MCP client initializes a subprocess, retrieves exact contracts and recipes, and rejects unsafe inputs', { timeout: 20_000 }, async t => {
  // Launch outside the checkout: paths must resolve from the server, not the client cwd.
  const transport = new StdioClientTransport({ command: process.execPath, args: [command], cwd: tmpdir(), stderr: 'pipe' });
  let stderr = '';
  transport.stderr.on('data', chunk => { stderr += chunk; });
  const client = new Client({ name: 'marionette-docs-test', version: '1.0.0' });
  t.after(async () => { await client.close(); });
  await client.connect(transport);
  const pid = transport.pid;
  assert.equal(client.getServerVersion().name, 'marionette-docs');
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), ['get_doc', 'get_example', 'search_docs']);
  assert.ok(tools.every(tool => tool.annotations.readOnlyHint && !tool.annotations.openWorldHint));
  const { resources } = await client.listResources();
  assert.deepEqual(resources.map(resource => resource.uri), ['marionette://catalog']);
  const catalog = JSON.parse((await client.readResource({ uri: resources[0].uri })).contents[0].text);
  assert.equal(catalog.provenance.packageVersion, version);
  assert.ok(catalog.examples.length >= 2);
  assert.equal(catalog.documentCount, corpus.documents.length);
  for (const [query, expectedId] of [
    ['preserve draft while another list row changes', 'docs/task-recipes.md'],
    ['cancellation async startup', 'docs/marionette.application.md'],
    ['how do I diagnose MN0023?', 'errors/MN0023'],
  ]) {
    const response = unpack(await client.callTool({ name: 'search_docs', arguments: { query, version } }));
    assert.ok(response.results.some(result => result.id === expectedId), `${query}: ${JSON.stringify(response.results.map(result => result.id))}`);
  }
  const search = unpack(await client.callTool({ name: 'search_docs', arguments: { query: 'Region', version, limit: 2 } }));
  assert.equal(search.results.length, 2);
  assert.ok(search.total > 2);
  assert.equal(search.nextOffset, 2);
  assert.ok(search.results.every(result => result.snippet.length <= 600 && result.url.startsWith('https://marionettejs.com/')));
  const nextSearch = unpack(await client.callTool({ name: 'search_docs', arguments: { query: 'Region', version, offset: search.nextOffset, limit: 2 } }));
  assert.ok(nextSearch.results.every(result => !search.results.some(previous => previous.id === result.id)));
  const expected = corpus.documents.find(document => document.id === search.results[0].id);
  let actual = '', offset = 0;
  do {
    const page = unpack(await client.callTool({ name: 'get_doc', arguments: { path: expected.id, version, offset, limit: 1_000 } }));
    assert.ok(page.content.length <= 1_000);
    assert.equal(page.document.sha256, expected.sha256);
    assert.equal(page.totalCharacters, expected.markdown.length);
    actual += page.content;
    offset = page.nextOffset;
  } while (offset !== null);
  assert.equal(actual, expected.markdown);
  let exampleJson = ''; offset = 0;
  do {
    const page = unpack(await client.callTool({ name: 'get_example', arguments: { name: catalog.examples[0].id, version, offset, limit: 500 } }));
    assert.ok(page.content.length <= 500);
    exampleJson += page.content; offset = page.nextOffset;
  } while (offset !== null);
  const example = JSON.parse(exampleJson);
  const { recipes } = await import('../site/assets/playground-recipes.js');
  assert.deepEqual(example, recipes.find(recipe => recipe.id === catalog.examples[0].id));
  assert.ok(example.code.length && example.checks.length);
  for (const unsupported of ['latest', 'next', '5', '4.1.3', `${version} `]) {
    for (const [name, args] of [['get_doc', { path: expected.id }], ['search_docs', { query: 'Region' }], ['get_example', { name: example.id }]]) {
      const response = await client.callTool({ name, arguments: { ...args, version: unsupported } });
      assert.equal(response.isError, true);
      assert.match(response.content[0].text, /Unsupported version/);
    }
  }
  for (const path of ['../package.json', '/etc/passwd', 'file:///etc/passwd', '%2e%2e/package.json', 'https://localhost/', '__proto__', 'constructor', `${expected.id}\0`]) {
    const response = await client.callTool({ name: 'get_doc', arguments: { path, version } });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /Unknown document id/);
  }
  for (const name of ['../package.json', '__proto__', 'constructor', 'https://example.com/']) {
    const response = await client.callTool({ name: 'get_example', arguments: { name, version } });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /Unknown example name/);
  }
  for (const args of [{ path: expected.id, limit: 12_001 }, { path: expected.id, offset: -1 }, { path: expected.id, extra: true }]) {
    const response = await client.callTool({ name: 'get_doc', arguments: { version, ...args } });
    assert.equal(response.isError, true);
  }
  const outOfBounds = await client.callTool({ name: 'get_doc', arguments: { version, path: expected.id, offset: expected.markdown.length + 1 } });
  assert.equal(outOfBounds.isError, true);
  await assert.rejects(client.readResource({ uri: 'file:///etc/passwd' }));
  assert.equal(unpack(await client.callTool({ name: 'search_docs', arguments: { query: 'zzzznosuchcontract', version } })).total, 0);
  await client.close();
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  assert.equal(stderr, '');
});

test('stdio server exits cleanly on EOF without requiring a signal', { timeout: 5_000 }, async () => {
  const child = spawn(process.execPath, [command], { cwd: fileURLToPath(root), stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '', errors = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { errors += data; });
  const exit = once(child, 'exit');
  child.stdin.end();
  const [code, signal] = await exit;
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.equal(output, '');
  assert.equal(errors, '');
});

test('server refuses stale provenance and tampered Markdown before serving tools', { timeout: 10_000 }, async t => {
  const fixture = await mkdtemp(join(tmpdir(), 'marionette-mcp-'));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  for (const directory of ['mcp', 'content/library-docs', 'site/assets', 'dist/docs']) await mkdir(join(fixture, directory), { recursive: true });
  for (const path of ['mcp/server.mjs', 'content/library-docs/manifest.json', 'content/docs-publication-edits.json', 'site/assets/playground-recipes.js']) {
    await cp(new URL(path, root), join(fixture, path));
  }
  await writeFile(join(fixture, 'package.json'), '{"type":"module"}');
  await symlink(fileURLToPath(new URL('node_modules', root)), join(fixture, 'node_modules'), 'dir');
  const stale = structuredClone(corpus); stale.sourceRevision = '0'.repeat(40);
  const tampered = structuredClone(corpus); tampered.documents[0].markdown += '\nUnverified replacement';
  for (const invalid of [stale, tampered]) {
    await writeFile(join(fixture, 'dist/docs/corpus.json'), JSON.stringify(invalid));
    const child = spawn(process.execPath, [join(fixture, 'mcp/server.mjs')], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', errors = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { errors += data; });
    const exit = once(child, 'exit'); child.stdin.end();
    const [code] = await exit;
    assert.equal(code, 1);
    assert.equal(output, '');
    assert.match(errors, /Unable to load Marionette documentation/);
    assert.ok(!errors.includes(fixture), 'Startup errors must not expose local paths');
  }
});
