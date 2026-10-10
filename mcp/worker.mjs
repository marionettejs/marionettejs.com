import { createDocsHttpHandler } from './http.mjs';
import { createDocsServerFactory } from './tools.mjs';
import snapshot from '../output/mcp/snapshot.json';

export default createDocsHttpHandler(createDocsServerFactory(snapshot), snapshot.deploymentRevision);
