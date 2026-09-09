import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../',import.meta.url));
const out = resolve(root,'dist');
const port = Number(process.env.MARIONETTE_PREVIEW_PORT || 4175);
const clients = new Set();
const serveBuilt = process.argv.includes('--serve-built');
const build = () => spawnSync(process.execPath,['scripts/build.mjs'],{cwd:root,stdio:'inherit'}).status === 0;
if (!serveBuilt && !build()) process.exit(1);
const types={'.png':'image/png','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.md':'text/markdown; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method !== 'GET' && req.method !== 'HEAD'){res.writeHead(405);res.end();return;}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  if(pathname==='/_reload'){res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});res.write(': ready\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;}
  let file=resolve(out,`.${pathname}`);
  if(!file.startsWith(out+sep)&&file!==out){res.writeHead(403);res.end();return;}
  try {
    if((await stat(file)).isDirectory()) file=resolve(file,'index.html');
    let body=await readFile(file);
    if(extname(file)==='.html')body=Buffer.from(body.toString().replace('</body>','<script src="/_reload.js"></script></body>'));
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:body);
  } catch {
    if(pathname==='/_reload.js'){res.writeHead(200,{'Content-Type':types['.js']});res.end('new EventSource("/_reload").onmessage = () => location.reload();');return;}
    // Builds briefly replace dist; a missing error page must not stop the server.
    const missingPage = await readFile(resolve(out,'404.html')).catch(() => null);
    res.writeHead(missingPage ? 404 : 503, {'Content-Type':types['.html']});
    res.end(req.method === 'HEAD' ? undefined : missingPage || 'Local preview is rebuilding. Refresh in a moment.');
  }
});
server.on('error',err=>{console.error(err.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`Local preview: http://127.0.0.1:${server.address().port}/`));
let timer;
if (!serveBuilt) for(const dir of ['site','content','scripts'])watch(resolve(root,dir),{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(()=>{if(build())for(const client of clients)client.write('data: reload\n\n');},160);});
