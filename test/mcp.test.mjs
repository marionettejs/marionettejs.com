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
const { loadSnapshot } = await import('../mcp/load.mjs');
const { validateDiagnostics } = await import('../scripts/library-docs.mjs');
const artifact = await loadSnapshot();
const corpus = { ...artifact.provenance, documents: artifact.documents };
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
  assert.deepEqual(tools.map(tool => tool.name).sort(), ['get_diagnostic', 'get_doc', 'get_example', 'get_sections', 'get_symbol', 'search_docs', 'search_sections']);
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
      if (sourceRevision === undefined && corpus.publication.endsWith('(published on npm)')) {
        unpack(response);
      } else {
        assert.equal(response.isError, true);
        assert.match(response.content[0].text, /Source revision mismatch/);
      }
    }
  }
  assert.equal(catalog.provenance.corpusKind, 'package-artifact');
  assert.equal(catalog.provenance.publicationEditsSha256, undefined);
  const symbol = unpack(await client.callTool({ name: 'get_symbol', arguments: { sourceRevision: corpus.sourceRevision, name: 'Region.show', version } }));
  assert.equal(symbol.matches[0].member, 'show');
  for (const section of symbol.contracts.region.sections) {
    const read = unpack(await client.callTool({ name: 'get_sections', arguments: { sourceRevision: corpus.sourceRevision, ids: [section], version } }));
    assert.equal(read.sections[0].id, section);
  }
  const diagnostic = unpack(await client.callTool({ name: 'get_diagnostic', arguments: { sourceRevision: corpus.sourceRevision, code: 'MN0004', version } }));
  assert.equal(diagnostic.diagnostic.code, 'MN0004');
  const explanation = unpack(await client.callTool({ name: 'get_doc', arguments: { sourceRevision: corpus.sourceRevision, path: diagnostic.documentId, version } }));
  assert.ok(explanation.content.includes(diagnostic.diagnostic.remediation));
  assert.ok(diagnostic.relatedSections.length);
  assert.equal(unpack(await client.callTool({ name: 'get_diagnostic', arguments: { sourceRevision: corpus.sourceRevision, code: 'MN0001', version } })).diagnostic.status, 'retired');
  for (const [name, args] of [['get_symbol', { name: '../secret' }], ['get_symbol', { name: 'View', limit: 6 }],
    ['get_symbol', { name: 'View', version: '4.1.3' }], ['get_diagnostic', { code: 'MN9999' }],
    ['get_diagnostic', { code: 'mn0004' }], ['get_diagnostic', { code: 'MN0004', sourceRevision: '0'.repeat(40) }]]) {
    assert.equal((await client.callTool({ name, arguments: { sourceRevision: corpus.sourceRevision, version, ...args } })).isError, true);
  }
  const firstMatch = unpack(await client.callTool({ name: 'get_symbol', arguments: { sourceRevision: corpus.sourceRevision, name: 'destroy', version, limit: 1 } }));
  assert.equal(firstMatch.matches.length, 1);
  assert.equal(firstMatch.nextOffset, 1);
  const secondMatch = unpack(await client.callTool({ name: 'get_symbol', arguments: { sourceRevision: corpus.sourceRevision, name: 'destroy', version, limit: 1, offset: 1 } }));
  assert.notEqual(secondMatch.matches[0].name, firstMatch.matches[0].name);
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
  const canonical = (await import('../content/library-docs/skills/marionette/scripts/search.mjs')).searchSections;
  const { loadSnapshot } = await import('../mcp/load.mjs');
  const snapshot = await loadSnapshot();
  const files = new Map(snapshot.sectionIndex.files.map(([source, content]) => [source, { content }]));
  for (const query of ['the and', 'why', 'by']) {
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
    ['restart retaining UI', 'docs/guides/retained-restart.md'],
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
  assert.ok(search.results.every(result => result.snippet.length <= 600 && result.url.startsWith('https://github.com/marionettejs/marionette/blob/')));
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

test('local candidate servers reject source changes that a commit revision cannot identify', async () => {
  const { loadSnapshot } = await import('../mcp/load.mjs');
  const { createDocsServerFactory } = await import('../mcp/tools.mjs');
  const snapshot = await loadSnapshot();
  const provenance = { ...snapshot.provenance, publication: 'development candidate (local source)', sourceDirty: false };
  assert.equal(typeof createDocsServerFactory({ ...snapshot, provenance }), 'function');
  for (const sourceDirty of [true, undefined, null]) assert.throws(() =>
    createDocsServerFactory({ ...snapshot, provenance: { ...provenance, sourceDirty } }), /clean source snapshot/);
});

test('server refuses stale provenance and tampered Markdown before serving tools', { timeout: 10_000 }, async t => {
  const fixture = await mkdtemp(join(tmpdir(), 'marionette mcp '));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  for (const directory of ['mcp', 'scripts', 'content', 'dist/docs']) await mkdir(join(fixture, directory), { recursive: true });
  await cp(new URL('content/supplemental-docs', root), join(fixture, 'content/supplemental-docs'), { recursive: true });
  await cp(new URL('dist/docs/supplemental-manifest.json', root), join(fixture, 'dist/docs/supplemental-manifest.json'));
  await cp(new URL('content/library-docs', root), join(fixture, 'content/library-docs'), { recursive: true });
  for (const path of ['package-lock.json', 'scripts/heading-ids.mjs', 'mcp/index-sections.mjs', 'mcp/sections.mjs', 'mcp/server.mjs', 'mcp/load.mjs', 'mcp/tools.mjs', 'mcp/search.mjs', 'content/docs-publication-edits.json', 'content/provenance.json', 'scripts/library-docs.mjs', 'scripts/html.mjs', 'scripts/search-index.mjs', 'scripts/published-docs.mjs', 'scripts/publication-status.mjs', 'scripts/agent-discovery.mjs', 'scripts/agent-setup.mjs']) {
    await cp(new URL(path, root), join(fixture, path));
  }
  await writeFile(join(fixture, 'package.json'), '{"type":"module"}');
  await symlink(fileURLToPath(new URL('node_modules', root)), join(fixture, 'node_modules'), 'dir');
  await writeFile(join(fixture, 'dist/docs/corpus.json'), JSON.stringify(corpus));
  const loader = await import(new URL('mcp/load.mjs', new URL(`file://${fixture}/`)));
  assert.equal((await loader.loadSnapshot()).documents.length, corpus.documents.length);
  // Stable now packages this guide, so it belongs to the artifact corpus.
  assert.equal((await loader.loadSnapshot()).documents.some(doc => doc.id === 'docs/guides/framework-migration.md'), true);
  const manifestPath = join(fixture, 'content/library-docs/manifest.json');
  const manifestBytes = await readFile(manifestPath, 'utf8');
  const original = JSON.parse(manifestBytes);
  const stale = structuredClone(original); stale.sourceRevision = '0'.repeat(40);
  const digest = structuredClone(original); digest.contentSha256 = '0'.repeat(64);
  for (const invalid of [digest, ...(corpus.publication.endsWith('(published on npm)') ? [stale] : [])]) {
    await writeFile(manifestPath, JSON.stringify(invalid));
    await assert.rejects(loader.loadSnapshot());
  }
  await writeFile(manifestPath, manifestBytes);
  const source = join(fixture, 'content/library-docs', original.pages[0].source);
  await writeFile(source, (await readFile(source, 'utf8')) + '\nUnverified replacement');
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
});

test('MCP contract text is byte-identical to the archived package, excluding website reading copies', async () => {
  const manifest = JSON.parse(await readFile(new URL('../content/library-docs/manifest.json', import.meta.url), 'utf8'));
  for (const page of manifest.pages) {
    const content = await readFile(new URL(`../content/library-docs/${page.source}`, import.meta.url), 'utf8');
    const document = artifact.documents.find(doc => doc.id === page.source);
    assert.ok(document, `Missing archived page: ${page.source}`);
    assert.equal(document.markdown, content, page.source);
    assert.equal(document.sourceSha256, document.sha256);
    assert.equal(document.sourceRevision, manifest.sourceRevision);
  }
  assert.equal(artifact.documents.some(doc => doc.id === 'docs/guides/framework-migration.md'), true);
});


test('diagnostic document inputs reject missing text, unsupported catalogs, and duplicate codes', async () => {
  const schema3 = JSON.parse(await readFile(new URL('../content/library-docs/config/diagnostics/catalog.schema.json', import.meta.url), 'utf8'));
  // Keep legacy-schema rejection coverage without treating the stable v3 schema
  // as though it were still the RC2 v2 artifact.
  const schema2 = structuredClone(schema3);
  schema2.properties.schemaVersion.const = 2;
  schema2.definitions.diagnostic.required = schema2.definitions.diagnostic.required.filter(key => key !== 'docsSection');
  delete schema2.definitions.diagnostic.properties.docsSection;
  const validate = (catalog, sections) => validateDiagnostics(catalog, catalog?.schemaVersion === 3 ? schema3 : schema2, sections);
  const diagnostic = { code: 'MN0004', slug: 'region-el-required', status: 'active', remediation: 'Supply an element.',
    category: 'ownership', severity: 'error', benchmarkCategory: 'ownership', objects: ['Region'], surfaces: ['runtime'], docsAnchor: '/errors/MN0004/' };
  const catalog = { $schema: './catalog.schema.json', schemaVersion: 2, diagnostics: [diagnostic] };
  assert.deepEqual(validate(catalog), [diagnostic]);
  const nextDiagnostic = { ...diagnostic, docsSection: 'docs/api/errors.md#mn0004' };
  const sections = new Set([nextDiagnostic.docsSection]);
  assert.deepEqual(validate({ ...catalog, schemaVersion: 3, diagnostics: [nextDiagnostic] }, sections), [nextDiagnostic]);
  assert.throws(() => validate({ ...catalog, schemaVersion: 3, diagnostics: [nextDiagnostic] }, new Set()), /Invalid packaged diagnostic section/);
  assert.throws(() => validate({ ...catalog, schemaVersion: 3,
    diagnostics: [{ ...nextDiagnostic, docsSection: 'docs/api/errors.md#mn0005' }] }, sections), /Invalid packaged diagnostic section/);
  for (const value of [null, {}, { ...catalog, schemaVersion: 99 }, { ...catalog, diagnostics: [] }]) {
    assert.throws(() => validate(value), /Unsupported or incomplete diagnostic catalog/);
  }
  for (const change of [{ slug: undefined }, { slug: ' ' }, { remediation: undefined }, { remediation: 4 },
    { remediation: '' }, { status: undefined }, { status: 'unknown' }, { code: 'bad' }, { code: ['MN0004'] },
    { objects: undefined }, { objects: [] }, { surfaces: [null] }, { category: undefined }, { severity: undefined },
    { docsAnchor: '/errors/MN0005/' }, { slug: 'Invalid_slug' }, { category: 'other' }, { severity: 'fatal' },
    { benchmarkCategory: 'other' }, { objects: ['Unknown'] }, { surfaces: ['other'] },
    { objects: ['Region', 'Region'] }, { surfaces: ['runtime', 'runtime'] }, { extra: true }, { status: 'deprecated' }, { status: 'deprecated', replacementCode: ['MN0005'] },
    { replacementCode: 'MN0005' }]) {
    for (const schemaVersion of [2, 3]) {
      const entry = schemaVersion === 3 ? nextDiagnostic : diagnostic;
      assert.throws(() => validate({ ...catalog, schemaVersion, diagnostics: [{ ...entry, ...change }] }, sections), /Invalid diagnostic catalog/);
    }
  }
  assert.throws(() => validate({ ...catalog, diagnostics: [diagnostic, diagnostic] }), /Invalid diagnostic catalog/);
  assert.throws(() => validate({ ...catalog, diagnostics: [{ ...diagnostic, code: 'MN0005', docsAnchor: '/errors/MN0005/' }, diagnostic] }), /Invalid diagnostic catalog/);
  assert.throws(() => validate({ ...catalog, schemaVersion: 3, diagnostics: [diagnostic] }, sections), /Invalid diagnostic catalog/);
  const deprecated = { ...diagnostic, code: 'MN0003', slug: 'old-region', docsAnchor: '/errors/MN0003/', status: 'deprecated', replacementCode: diagnostic.code };
  assert.deepEqual(validate({ ...catalog, diagnostics: [deprecated, diagnostic] }), [deprecated, diagnostic]);
  for (const replacementCode of ['MN0003', 'MN9999']) {
    assert.throws(() => validate({ ...catalog, diagnostics: [{ ...deprecated, replacementCode }, diagnostic] }), /Invalid diagnostic replacement/);
  }
});
