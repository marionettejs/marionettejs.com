import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('MCP setup is discoverable as the same website-authored guide without changing library provenance', async () => {
  assert.equal(await read('dist/docs/mcp.md'), await read('mcp/README.md'));
  for (const path of ['dist/llms.txt', 'dist/docs/llms.txt', 'dist/docs/agent-start.md']) {
    assert.ok((await read(path)).includes('https://marionettejs.com/docs/mcp.md'), path);
  }
  const page = await read('dist/docs/mcp/index.html');
  assert.match(page, /type="text\/markdown" href="\/docs\/mcp.md"/);
  assert.match(page, /local, read-only stdio server/);
  assert.ok((await read('dist/docs/index.html')).includes('href="/docs/mcp/"'));
  assert.ok((await read('dist/sitemap.xml')).includes('https://marionettejs.com/docs/mcp/'));
  const corpus = JSON.parse(await read('dist/docs/corpus.json'));
  assert.equal(corpus.documents.some(doc => doc.markdownUrl === 'https://marionettejs.com/docs/mcp.md'), false,
    'Website tooling instructions must not claim the library snapshot source revision');
  const coverage = JSON.parse(await read('dist/docs/coverage.json'));
  assert.ok(coverage.limitations.some(limit => limit.includes('website-authored MCP setup guide')));
});
