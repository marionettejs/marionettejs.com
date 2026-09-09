import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { unstable_dev } from 'wrangler';
import { verifyMcp } from '../scripts/verify-mcp.mjs';

test('Workers HTTP and local stdio agree on every document, example, and provenance record', { timeout: 90_000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'marionette-worker-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  // Test the already-built artifact; rebuilding here races other corpus tests.
  delete config.build; delete config.routes; delete config.account_id;
  config.main = resolve('mcp/worker.mjs');
  const configPath = join(directory, 'wrangler.json');
  await writeFile(configPath, JSON.stringify(config));
  const worker = await unstable_dev(config.main, {
    config: configPath,
    ip: '127.0.0.1', port: 0, inspectorPort: 0, local: true,
    logLevel: 'error', experimental: { disableExperimentalWarning: true, watch: false },
  });
  t.after(() => worker.stop());
  const result = await verifyMcp(`http://${worker.address}:${worker.port}/mcp`);
  t.diagnostic(`${result.documents} complete documents, ${result.examples} complete examples, ${result.equivalentToolCalls} equivalent tool calls`);
});
