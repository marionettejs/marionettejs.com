import { staticServer } from './static-server.mjs';

// Each suite owns an ephemeral loopback server unless explicitly inspecting a preview.
export function builtSite() {
  if (process.env.MARIONETTE_PREVIEW_URL) return {
    base: process.env.MARIONETTE_PREVIEW_URL.replace(/\/$/, ''), close: async () => {},
  };
  return staticServer({ root: 'dist', types: {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.md': 'text/plain', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2',
  } });
}
