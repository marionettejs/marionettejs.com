import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const libraryId = '/marionettejs/marionette';

export async function collectContext7({ manifest, publication, apiKey, refresh = false, request = fetch }) {
  if (manifest.sourceRepository !== 'https://github.com/marionettejs/marionette') throw new Error('Unexpected documentation repository.');
  if (refresh && (manifest.sourceDirty || publication.packageVersion !== manifest.packageVersion ||
      !['release candidate (published on npm)', 'stable release (published on npm)'].includes(publication.status))) {
    throw new Error('Only matching published documentation can trigger a refresh.');
  }
  if (!apiKey) throw new Error('Set CONTEXT7_API_KEY from the teamspace that owns Marionette.');
  const report = {
    checkedAt: new Date().toISOString(), libraryId,
    websiteRevision: process.env.GITHUB_SHA || null,
    documentation: { version: manifest.packageVersion, sourceRevision: manifest.sourceRevision, contentSha256: manifest.contentSha256 },
    refresh: { requested: refresh, accepted: false }, index: null, usage: null, failures: [],
    limits: 'Refresh acceptance means queued, not indexed. Context7 metadata does not prove source revision parity or benchmark availability; confirm actual benchmark data in the dashboard before comparing scores. Scores judge documentation answers; usage is not agent correctness, time or cost.'
  };
  async function api(path, body) {
    let response;
    try {
      response = await request(`https://context7.com/api${path}`, {
        method: body ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch { throw new Error('Context7 request failed or timed out.'); }
    // Do not print response bodies or authorization headers on failure.
    if (!response.ok) throw new Error(`Context7 HTTP ${response.status}.`);
    try { return await response.json(); } catch { throw new Error('Context7 returned invalid JSON.'); }
  }
  if (refresh) {
    try {
      await api('/v1/refresh', { libraryName: libraryId });
      report.refresh.accepted = true;
    } catch (error) { report.failures.push({ operation: 'refresh', message: error.message }); }
  }
  try {
    const data = await api('/v2/libs/search?' + new URLSearchParams({ libraryName: 'marionette', query: 'Marionette JavaScript framework documentation', fast: 'true' }));
    const library = data.results?.find(item => item.id === libraryId);
    if (!library) throw new Error('Marionette was absent from Context7 search results.');
    report.index = Object.fromEntries(['branch', 'lastUpdateDate', 'state', 'totalTokens', 'totalSnippets', 'trustScore', 'benchmarkScore', 'versions'].map(key => [key, library[key] ?? null]));
    if (library.state === 'error' || library.state === 'delete') throw new Error(`Context7 index state: ${library.state}.`);
  } catch (error) { report.failures.push({ operation: 'index', message: error.message }); }
  try {
    const usage = await api('/v2/libs/metrics?' + new URLSearchParams({ libraryId, days: '30' }));
    report.usage = Object.fromEntries(['total', 'daily', 'mcpClients', 'topics'].map(key => [key, usage[key] ?? null]));
  } catch (error) { report.failures.push({ operation: 'metrics', message: error.message }); }
  return report;
}

async function main() {
  const [mode = 'report'] = process.argv.slice(2);
  if (!['report', 'refresh'].includes(mode) || process.argv.length > 3) throw new Error('Usage: node scripts/context7.mjs [report|refresh]');
  const manifest = JSON.parse(await readFile(resolve(root, 'content/library-docs/manifest.json'), 'utf8'));
  const publication = JSON.parse(await readFile(resolve(root, 'content/docs-publication-edits.json'), 'utf8'));
  const report = await collectContext7({ manifest, publication, apiKey: process.env.CONTEXT7_API_KEY, refresh: mode === 'refresh' });
  const path = resolve(root, 'output/context7/report.json');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(report, null, 2) + '\n');
  const summary = [
    '## Context7',
    `Documentation: ${manifest.packageVersion} (${manifest.sourceRevision}).`,
    `Refresh: ${report.refresh.requested ? (report.refresh.accepted ? 'accepted; indexing is asynchronous' : 'failed') : 'not requested'}.`,
    `Index: ${report.index?.state ?? 'unavailable'}; last update: ${report.index?.lastUpdateDate ?? 'unavailable'}.`,
    `Reported benchmark score: ${report.index?.benchmarkScore ?? 'unavailable'} (availability unverified).`,
    'See the context7-evidence artifact for usage, topics and metadata. See the library admin Benchmark tab for question-level suggestions.',
    report.limits,
    ...report.failures.map(item => `${item.operation}: ${item.message}`)
  ].join('\n\n') + '\n';
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  console.log(summary);
  if (report.failures.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
