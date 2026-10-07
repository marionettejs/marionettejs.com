import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

export async function staticServer({ root, types, fallbackType = 'application/octet-stream' }) {
  root = resolve(root);
  const server = createServer(async (request, response) => {
    try {
      let file = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
      if (file !== root && !file.startsWith(root + sep)) throw Error('Invalid path');
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      const body = await readFile(file);
      response.setHeader('Content-Type', types[extname(file)] || fallbackType);
      response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  };
}
