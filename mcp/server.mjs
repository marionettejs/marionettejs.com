import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { loadSnapshot } from './load.mjs';
import { createDocsServerFactory } from './tools.mjs';

async function main() {
  const server = createDocsServerFactory(await loadSnapshot())();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.once('end', () => { void server.close(); });
}

main().catch(() => {
  // Keep protocol stdout clean and avoid exposing local paths in startup failures.
  console.error('Unable to load Marionette documentation. In the website checkout, run npm ci and npm run build; check that the snapshot and recipes match.');
  process.exitCode = 1;
});
