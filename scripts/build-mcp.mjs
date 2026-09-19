import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { loadSnapshot } from '../mcp/load.mjs';
const snapshot = await loadSnapshot();
snapshot.deploymentRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(snapshot.deploymentRevision)) throw new Error('Invalid MCP deployment revision');
await mkdir(new URL('../output/mcp/', import.meta.url), { recursive: true });
await writeFile(new URL('../output/mcp/snapshot.json', import.meta.url), JSON.stringify(snapshot));
console.log(`MCP snapshot: ${snapshot.documents.length} documents, ${snapshot.examples.length} examples, ${snapshot.provenance.packageVersion}`);
