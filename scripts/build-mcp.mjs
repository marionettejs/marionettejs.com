import { mkdir, writeFile } from 'node:fs/promises';
import { loadSnapshot } from '../mcp/load.mjs';
const snapshot = await loadSnapshot();
await mkdir(new URL('../output/mcp/', import.meta.url), { recursive: true });
await writeFile(new URL('../output/mcp/snapshot.json', import.meta.url), JSON.stringify(snapshot));
console.log(`MCP snapshot: ${snapshot.documents.length} documents, ${snapshot.examples.length} examples, ${snapshot.provenance.packageVersion}`);
