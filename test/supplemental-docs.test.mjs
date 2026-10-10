import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { readSnapshot, readSupplementalPages } from '../scripts/library-docs.mjs';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const source = 'docs/guides/framework-migration.md';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('stable migration guide comes from the package and is available through website and MCP', async () => {
  const { manifest, pages } = await readSnapshot('content/library-docs');
  const guide = pages.find(page => page.source === source);
  assert.ok(guide);
  assert.deepEqual(await readSupplementalPages('content/supplemental-docs', pages), []);
  assert.equal(await read('dist/docs/markdown/' + source), guide.markdown);
  const html = await read('dist/docs/guides/framework-migration/index.html');
  assert.ok(html.includes('Migrate from another UI framework'));
  assert.ok(html.includes(manifest.sourceRevision));
  assert.ok(html.includes('href="/docs/manifest.json">Snapshot manifest'));
  for (const path of ['dist/docs/guides/framework-migration.md', 'dist/llms-full.txt', 'dist/docs/bundles/guides.txt']) {
    const text = await read(path);
    assert.ok(text.includes('Inventory behavior before implementation'), path);
    assert.ok(text.includes(manifest.sourceRevision), path);
  }
  assert.ok((await read('dist/docs/llms.txt')).includes('/docs/guides/framework-migration.md'));
  const corpus = JSON.parse(await read('dist/docs/corpus.json'));
  const document = corpus.documents.find(item => item.id === source);
  assert.equal(document.sourceRevision, manifest.sourceRevision);
  assert.equal(document.sourceSha256, hash(guide.markdown));
  assert.deepEqual(JSON.parse(await read('dist/docs/manifest.json')), manifest);
  const client = new Client({ name: 'guide-publication-test', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ['mcp/server.mjs'] }));
  try {
    const response = await client.callTool({ name: 'get_doc', arguments: { path: source, sourceRevision: manifest.sourceRevision, version: manifest.packageVersion, limit: 12000 } });
    assert.notEqual(response.isError, true, JSON.stringify(response.content));
    assert.ok(JSON.stringify(response).includes('Inventory behavior before implementation'));
    const search = await client.callTool({ name: 'search_docs', arguments: { query: 'Migrate framework', sourceRevision: manifest.sourceRevision, version: manifest.packageVersion } });
    assert.notEqual(search.isError, true, JSON.stringify(search.content));
    assert.ok(JSON.stringify(search).includes(source));
  } finally { await client.close(); }
});

test('supplemental sources allow an empty manifest but reject corrupt bytes and archive route collisions', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'supplemental-guide-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const manifestPath = join(directory, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, pages: [] }));
  assert.deepEqual(await readSupplementalPages(directory, []), []);
  const markdown = '# Website-only guide\n';
  const entry = { source, route: 'docs/guides/framework-migration', title: 'Website-only guide', section: 'Guides', sourceRevision: 'a'.repeat(40), sha256: hash(markdown) };
  await mkdir(dirname(join(directory, source)), { recursive: true });
  await writeFile(join(directory, source), markdown);
  const manifest = JSON.stringify({ schemaVersion: 1, pages: [entry] });
  await writeFile(manifestPath, manifest);
  const [guide] = await readSupplementalPages(directory, []);
  assert.equal(guide.markdown, markdown);
  await assert.rejects(readSupplementalPages(directory, [guide]), /Invalid supplemental/);
  await assert.rejects(readSupplementalPages(directory, [{ source: 'docs/other.md', route: guide.route }]), /Invalid supplemental/);
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, pages: null }));
  await assert.rejects(readSupplementalPages(directory, []), /Unsupported supplemental/);
  await writeFile(manifestPath, manifest);
  await writeFile(join(directory, source), '# Changed content\n');
  await assert.rejects(readSupplementalPages(directory, []), /hash mismatch/);
});
