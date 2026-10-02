import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectContext7 } from '../scripts/context7.mjs';

const manifest = {
  packageVersion: '5.0.0-rc.2', sourceRepository: 'https://github.com/marionettejs/marionette',
  sourceRevision: 'a'.repeat(40), contentSha256: 'b'.repeat(64), sourceDirty: false
};
const publication = { packageVersion: manifest.packageVersion, status: 'release candidate (published on npm)' };
const library = {
  id: '/marionettejs/marionette', state: 'processing', lastUpdateDate: '2026-09-10T00:00:00Z',
  totalTokens: 2000, totalSnippets: 30, versions: ['v5.0.0-rc.2']
};
const usage = { total: { mcp: 2 }, daily: [], mcpClients: { dailyData: [] }, topics: [{ topic: 'lifecycle', count: 2 }], countries: [] };
const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
function fixture(calls) {
  return async (url, options) => {
    calls.push({ url: new URL(url), options });
    if (url.includes('/refresh')) return json({ message: 'Refresh started successfully' });
    if (url.includes('/search')) return json({ results: [{ id: '/another/marionette', benchmarkScore: 100 }, library] });
    return json(usage);
  };
}

test('release refresh targets the library rather than the website, and reports pending indexing honestly', async () => {
  const calls = [];
  const report = await collectContext7({ manifest, publication, apiKey: 'secret-fixture', refresh: true, request: fixture(calls) });
  assert.equal(calls.length, 3);
  assert.deepEqual(JSON.parse(calls[0].options.body), { libraryName: '/marionettejs/marionette' });
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.redirect, 'manual');
  assert.equal(calls[1].url.searchParams.get('fast'), 'true');
  assert.equal(calls[2].url.searchParams.get('libraryId'), '/marionettejs/marionette');
  assert.equal(calls[2].url.searchParams.get('days'), '30');
  assert.equal(report.refresh.accepted, true);
  assert.equal(report.index.state, 'processing');
  assert.equal(report.index.benchmarkScore, null);
  assert.deepEqual(report.usage.topics, usage.topics);
  assert.deepEqual(report.failures, []);
  assert.ok(!JSON.stringify(report).includes('secret-fixture'));
});

test('weekly measurement makes no refresh request and preserves a zero benchmark score', async () => {
  const calls = [];
  const request = fixture(calls);
  const report = await collectContext7({ manifest, publication, apiKey: 'key', request: async (url, options) => {
    if (url.includes('/search')) {
      calls.push({ url: new URL(url), options });
      return json({ results: [{ ...library, state: 'finalized', benchmarkScore: 0 }] });
    }
    return request(url, options);
  } });
  assert.equal(calls.length, 2);
  assert.equal(report.refresh.requested, false);
  assert.equal(report.index.benchmarkScore, 0);
});

test('refresh failure still collects evidence, without leaking remote errors or secrets', async () => {
  const request = fixture([]);
  const report = await collectContext7({ manifest, publication, apiKey: 'secret-fixture', refresh: true, request: (url, options) =>
    url.includes('/refresh') ? new Response('secret-fixture', { status: 429 }) : request(url, options)
  });
  assert.equal(report.refresh.accepted, false);
  assert.deepEqual(report.failures, [{ operation: 'refresh', message: 'Context7 HTTP 429.' }]);
  assert.ok(report.index);
  assert.ok(report.usage);
  assert.ok(!JSON.stringify(report).includes('secret-fixture'));
});

test('a different library and failed metrics cannot become successful Marionette evidence', async () => {
  const report = await collectContext7({ manifest, publication, apiKey: 'key', request: async url => {
    if (url.includes('/search')) return json({ results: [{ id: '/another/marionette', benchmarkScore: 100 }] });
    return new Response('', { status: 403 });
  } });
  assert.equal(report.index, null);
  assert.equal(report.usage, null);
  assert.deepEqual(report.failures.map(item => item.operation), ['index', 'metrics']);
});

test('candidate, mismatched and dirty docs cannot refresh the public index; stable releases can', async () => {
  for (const options of [
    { publication: { ...publication, status: 'development candidate (local source)' } },
    { publication: { ...publication, packageVersion: '5.0.0-rc.1' } },
    { manifest: { ...manifest, sourceDirty: true } }
  ]) await assert.rejects(collectContext7({ manifest, publication, apiKey: 'key', refresh: true, request: fixture([]), ...options }), /matching published documentation/);
  const report = await collectContext7({ manifest: { ...manifest, packageVersion: '5.0.0' }, publication: { packageVersion: '5.0.0', status: 'stable release (published on npm)' }, apiKey: 'key', refresh: true, request: fixture([]) });
  assert.equal(report.refresh.accepted, true);
  await assert.rejects(collectContext7({ manifest, publication }), /CONTEXT7_API_KEY/);
});
