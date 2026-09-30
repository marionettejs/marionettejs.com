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
  assert.equal(data.provenance.sourceDirty, corpus.sourceDirty);
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
  assert.deepEqual(tools.map(tool => tool.name).sort(), ['get_doc', 'get_example', 'get_sections', 'search_docs', 'search_sections']);
  assert.ok(tools.every(tool => tool.annotations.readOnlyHint && !tool.annotations.openWorldHint));
  const { resources } = await client.listResources();
  assert.deepEqual(resources.map(resource => resource.uri), ['marionette://catalog']);
  const catalog = JSON.parse((await client.readResource({ uri: resources[0].uri })).contents[0].text);
  assert.equal(catalog.provenance.packageVersion, version);
  assert.deepEqual(catalog.examples.map(example => example.id), ['records']);
  assert.equal(catalog.documentCount, corpus.documents.length);
  for (const sourceRevision of [undefined, '0'.repeat(40)]) {
    for (const name of ['search_docs', 'search_sections']) {
      const response = await client.callTool({ name, arguments: { query: 'Region', version, sourceRevision } });
      assert.equal(response.isError, true);
      assert.match(response.content[0].text, /Source revision mismatch/);
    }
  }
  const sectionSearch = unpack(await client.callTool({ name: 'search_sections', arguments: { sourceRevision: corpus.sourceRevision, query: 'detachView', version, limit: 5 } }));
  assert.ok(sectionSearch.results.length);
  assert.ok(sectionSearch.total <= 5);
  assert.equal(sectionSearch.nextOffset, null);
  const firstSection = unpack(await client.callTool({ name: 'search_sections', arguments: { sourceRevision: corpus.sourceRevision, query: 'detachView', version, limit: 1 } }));
  assert.equal(firstSection.results.length, 1);
  assert.equal(firstSection.nextOffset, firstSection.total > 1 ? 1 : null);
  if (firstSection.nextOffset !== null) {
    const nextSection = unpack(await client.callTool({ name: 'search_sections', arguments: { sourceRevision: corpus.sourceRevision, query: 'detachView', version, limit: 1, offset: firstSection.nextOffset } }));
    assert.equal(nextSection.results[0].id, sectionSearch.results[1].id);
  }
  const paginated = [];
  let sectionOffset = 0;
  do {
    const page = unpack(await client.callTool({ name: 'search_sections', arguments: { sourceRevision: corpus.sourceRevision, query: 'detachView', version, limit: 1, offset: sectionOffset } }));
    assert.equal(page.total, sectionSearch.total);
    paginated.push(...page.results.map(result => result.id));
    sectionOffset = page.nextOffset;
  } while (sectionOffset !== null);
  assert.deepEqual(paginated, sectionSearch.results.map(result => result.id));
  for (const offset of [sectionSearch.total, 5]) {
    const end = unpack(await client.callTool({ name: 'search_sections', arguments: { sourceRevision: corpus.sourceRevision, query: 'detachView', version, offset } }));
    assert.deepEqual(end.results, []);
    assert.equal(end.total, sectionSearch.total);
    assert.equal(end.nextOffset, null);
  }
  for (const query of ['the and', 'why', 'by']) {
    const canonical = (await import('../content/library-docs/skills/marionette/scripts/search.mjs')).searchSections;
    const snapshot = await (await import('../mcp/load.mjs')).loadSnapshot();
    const files = new Map(snapshot.sectionIndex.files.map(([source, content]) => [source, { content }]));
    const expected = canonical(snapshot.sectionIndex.sections, files, query);
    const actual = unpack(await client.callTool({ name: 'search_sections', arguments: { sourceRevision: corpus.sourceRevision, query, version } }));
    assert.deepEqual(actual.results.map(result => result.id), expected.map(result => result.id), query);
  }
  const selected = sectionSearch.results.find(section => section.characters <= 30_000);
  assert.ok(selected);
  const sectionRead = unpack(await client.callTool({ name: 'get_sections', arguments: { sourceRevision: corpus.sourceRevision, ids: [selected.id], version, maxCharacters: 30_000 } }));
  assert.equal(sectionRead.sections[0].id, selected.id);
  const sectionDocument = corpus.documents.find(doc => doc.id === selected.documentId);
  assert.equal(sectionRead.sections[0].content, sectionDocument.markdown.slice(selected.start, selected.end));
  assert.equal(sectionRead.sections[0].sourceSha256, sectionDocument.sourceSha256);
  assert.equal(sectionRead.sections[0].sha256, sectionDocument.sha256);
  assert.deepEqual(sectionRead.sections[0].sourceSupplements, sectionDocument.sourceSupplements);
  assert.deepEqual(sectionRead.omitted, []);
  const omitted = unpack(await client.callTool({ name: 'get_sections', arguments: { sourceRevision: corpus.sourceRevision, ids: [selected.id], version, maxCharacters: 1 } }));
  assert.equal(omitted.sections.length, 0);
  assert.equal(omitted.omitted[0].id, selected.id);
  for (const [name, args] of [
    ['get_sections', { ids: ['../package.json'] }], ['get_sections', { ids: [] }],
    ['get_sections', { ids: [selected.id], maxCharacters: 30_001 }],
    ['get_sections', { ids: [selected.id], version: 'latest' }],
    ['search_sections', { limit: 6, query: 'Region' }], ['search_sections', { offset: 6, query: 'Region' }],
    ['search_sections', { query: 'Region', version: 'latest' }],
  ]) assert.equal((await client.callTool({ name, arguments: { sourceRevision: corpus.sourceRevision, version, ...args } })).isError, true);
  const snippetSearch = unpack(await client.callTool({ name: 'search_docs', arguments: { sourceRevision: corpus.sourceRevision, query: 'untrusted rendering', version } }));
  const security = snippetSearch.results.find(result => result.id === 'docs/guides/accessibility-rendering.md');
  assert.ok(security, 'Find the safety guide using its title and a later body match');
  assert.match(security.snippet, /untrusted/i, 'A title-only match must not hide the matching body passage');
  for (const [query, expectedId] of [
    ['refresh retaining UI', 'docs/guides/retained-refresh.md'],
    ['cancellation async startup', 'docs/api/application.md'],
    ['how do I diagnose MN0023?', 'errors/MN0023'],
  ]) {
    const response = unpack(await client.callTool({ name: 'search_docs', arguments: { sourceRevision: corpus.sourceRevision, query, version } }));
    assert.ok(response.results.some(result => result.id === expectedId), `${query}: ${JSON.stringify(response.results.map(result => result.id))}`);
  }
  const search = unpack(await client.callTool({ name: 'search_docs', arguments: { sourceRevision: corpus.sourceRevision, query: 'Region', version, limit: 2 } }));
  assert.equal(search.results.length, 2);
  assert.ok(search.total > 2);
  assert.equal(search.nextOffset, 2);
  assert.ok(search.results.every(result => result.snippet.length <= 600 && result.url.startsWith('https://marionettejs.com/')));
  const nextSearch = unpack(await client.callTool({ name: 'search_docs', arguments: { sourceRevision: corpus.sourceRevision, query: 'Region', version, offset: search.nextOffset, limit: 2 } }));
  assert.ok(nextSearch.results.every(result => !search.results.some(previous => previous.id === result.id)));
  const expected = corpus.documents.find(document => document.id === search.results[0].id);
  let actual = '', offset = 0;
  do {
    const page = unpack(await client.callTool({ name: 'get_doc', arguments: { sourceRevision: corpus.sourceRevision, path: expected.id, version, offset, limit: 1_000 } }));
    assert.ok(page.content.length <= 1_000);
    assert.equal(page.document.sha256, expected.sha256);
    assert.equal(page.totalCharacters, expected.markdown.length);
    actual += page.content;
    offset = page.nextOffset;
  } while (offset !== null);
  assert.equal(actual, expected.markdown);
  let exampleJson = ''; offset = 0;
  do {
    const page = unpack(await client.callTool({ name: 'get_example', arguments: { sourceRevision: corpus.sourceRevision, name: catalog.examples[0].id, version, offset, limit: 500 } }));
    assert.ok(page.content.length <= 500);
    exampleJson += page.content; offset = page.nextOffset;
  } while (offset !== null);
  const example = JSON.parse(exampleJson);
  const { loadSnapshot } = await import('../mcp/load.mjs');
  const snapshot = await loadSnapshot();
  assert.deepEqual(example, JSON.parse(snapshot.examples[0].text));
  assert.equal(example.runtime.packageVersion, version);
  assert.ok(example.sourceFiles['src/main.js'].length && example.sourceFiles['tests/records.spec.js'].length);
  assert.equal(example.sourceHashes['src/main.js'].length, 64);
  assert.ok(example.relatedDocs.every(id => corpus.documents.some(doc => doc.id === id)));
  for (const unsupported of ['latest', 'next', '5', '4.1.3', `${version} `]) {
    for (const [name, args] of [['get_doc', { path: expected.id }], ['search_docs', { query: 'Region' }], ['get_example', { name: example.id }]]) {
      const response = await client.callTool({ name, arguments: { sourceRevision: corpus.sourceRevision, ...args, version: unsupported } });
      assert.equal(response.isError, true);
      assert.match(response.content[0].text, /Unsupported version/);
    }
  }
  for (const path of ['../package.json', '/etc/passwd', 'file:///etc/passwd', '%2e%2e/package.json', 'https://localhost/', '__proto__', 'constructor', `${expected.id}\0`]) {
    const response = await client.callTool({ name: 'get_doc', arguments: { sourceRevision: corpus.sourceRevision, path, version } });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /Unknown document id/);
  }
  for (const name of ['../package.json', '__proto__', 'constructor', 'https://example.com/']) {
    const response = await client.callTool({ name: 'get_example', arguments: { sourceRevision: corpus.sourceRevision, name, version } });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /Unknown example name/);
  }
  for (const args of [{ path: expected.id, limit: 12_001 }, { path: expected.id, offset: -1 }, { path: expected.id, extra: true }]) {
    const response = await client.callTool({ name: 'get_doc', arguments: { sourceRevision: corpus.sourceRevision, version, ...args } });
    assert.equal(response.isError, true);
  }
  const outOfBounds = await client.callTool({ name: 'get_doc', arguments: { sourceRevision: corpus.sourceRevision, version, path: expected.id, offset: expected.markdown.length + 1 } });
  assert.equal(outOfBounds.isError, true);
  await assert.rejects(client.readResource({ uri: 'file:///etc/passwd' }));
  assert.equal(unpack(await client.callTool({ name: 'search_docs', arguments: { sourceRevision: corpus.sourceRevision, query: 'zzzznosuchcontract', version } })).total, 0);
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
  for (const directory of ['mcp', 'scripts', 'content', 'dist/docs']) await mkdir(join(fixture, directory), { recursive: true });
  await cp(new URL('content/library-docs', root), join(fixture, 'content/library-docs'), { recursive: true });
  for (const path of ['scripts/heading-ids.mjs', 'mcp/index-sections.mjs', 'mcp/sections.mjs', 'mcp/server.mjs', 'mcp/load.mjs', 'mcp/tools.mjs', 'mcp/search.mjs', 'content/docs-publication-edits.json', 'scripts/library-docs.mjs', 'scripts/published-docs.mjs', 'scripts/publication-status.mjs', 'scripts/agent-discovery.mjs']) {
    await cp(new URL(path, root), join(fixture, path));
  }
  await writeFile(join(fixture, 'package.json'), '{"type":"module"}');
  await symlink(fileURLToPath(new URL('node_modules', root)), join(fixture, 'node_modules'), 'dir');
  await writeFile(join(fixture, 'dist/docs/corpus.json'), JSON.stringify(corpus));
  const loader = await import(new URL('mcp/load.mjs', new URL(`file://${fixture}/`)));
  assert.equal((await loader.loadSnapshot()).documents.length, corpus.documents.length);
  const stale = structuredClone(corpus); stale.sourceRevision = '0'.repeat(40);
  const tampered = structuredClone(corpus); tampered.documents[0].markdown += '\nUnverified replacement';
  const publication = structuredClone(corpus); publication.publication = 'release candidate (published on npm)';
  const missingReference = structuredClone(corpus); missingReference.documents = missingReference.documents.filter(doc => doc.id !== 'docs/architecture.md');
  for (const invalid of [stale, tampered, publication, missingReference]) {
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
