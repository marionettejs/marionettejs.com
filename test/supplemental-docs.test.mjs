import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readSnapshot, readSupplementalPages } from '../scripts/library-docs.mjs';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const source = 'docs/guides/framework-migration.md';
const revision = 'a84a53ec799aa424900d08883ee5d3ad8d0873de';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('migration guide is separately pinned and published on the website but excluded from package-specific MCP', async () => {
  const { manifest, pages } = await readSnapshot('content/library-docs');
  assert.equal(pages.length, 38);
  assert.ok(!pages.some(page => page.source === source));
  const [guide] = await readSupplementalPages('content/supplemental-docs', pages);
  assert.equal(guide.sourceRevision, revision);
  assert.equal(await read('dist/docs/markdown/' + source), guide.markdown);
  const html = await read('dist/docs/guides/framework-migration/index.html');
  assert.ok(html.includes('Migrate from another UI framework'));
  assert.ok(html.includes(revision));
  assert.ok(html.includes('href="/docs/supplemental-manifest.json">Snapshot manifest'));
  assert.ok((await read('dist/docs/guides/framework-migration.md')).includes(`base revision ${revision};`));
  assert.ok(html.includes('href="/docs/guides/framework-migration/"'));
  for (const path of ['dist/docs/guides/framework-migration.md', 'dist/llms-full.txt', 'dist/docs/bundles/guides.txt']) {
    const text = await read(path);
    assert.ok(text.includes('Inventory behavior before implementation'), path);
    assert.ok(text.includes(revision), path);
  }
  assert.ok((await read('dist/docs/llms.txt')).includes('/docs/guides/framework-migration.md'));
  const corpus = JSON.parse(await read('dist/docs/corpus.json'));
  const document = corpus.documents.find(item => item.id === source);
  assert.equal(document.sourceRevision, revision);
  assert.equal(document.sourceSha256, hash(guide.markdown));
  assert.deepEqual(JSON.parse(await read('dist/docs/manifest.json')), manifest);
  const client = new Client({ name: 'guide-publication-test', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ['mcp/server.mjs'] }));
  try {
    const response = await client.callTool({ name: 'get_doc', arguments: { path: source, sourceRevision: manifest.sourceRevision, version: manifest.packageVersion, limit: 12000 } });
    assert.equal(response.isError, true, 'Website-only guides are not packaged rc.2 contracts');
    const search = await client.callTool({ name: 'search_docs', arguments: { query: 'Migrate framework', sourceRevision: manifest.sourceRevision, version: manifest.packageVersion } });
    assert.notEqual(search.isError, true, JSON.stringify(search.content));
    assert.ok(!JSON.stringify(search).includes(source));
  } finally { await client.close(); }
});

test('supplemental sources reject corrupt bytes and archive route collisions', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'supplemental-guide-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp('content/supplemental-docs', directory, { recursive: true });
  const [guide] = await readSupplementalPages(directory, []);
  await assert.rejects(readSupplementalPages(directory, [guide]), /Invalid supplemental/);
  await assert.rejects(readSupplementalPages(directory, [{ source: 'docs/other.md', route: guide.route }]), /Invalid supplemental/);
  const manifestPath = join(directory, 'manifest.json');
  const manifest = await readFile(manifestPath, 'utf8');
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, pages: [] }));
  await assert.rejects(readSupplementalPages(directory, []), /Unsupported supplemental/);
  await writeFile(manifestPath, manifest);
  await writeFile(join(directory, source), '# Changed content\n');
  await assert.rejects(readSupplementalPages(directory, []), /hash mismatch/);
});
