import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,'dist');
const routes=['index.html','why/index.html','docs/regions/index.html','thanks/index.html','404.html'];

test('every built page has valid local links, fragments, and asset references',async()=>{
  let checked=0;
  for(const route of routes){
    const html=await readFile(resolve(out,route),'utf8');
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,route);
    assert.match(html,/<html lang="en">/);
    assert.match(html,/<meta name="robots" content="noindex, nofollow">/);
    const base=new URL(route.replace(/index.html$/,''),'http://preview.local/');
    for(const [,ref]of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      const url=new URL(ref,base);
      if(url.origin!==base.origin)continue;
      let target=resolve(out,`.${decodeURIComponent(url.pathname)}`);
      if((await stat(target)).isDirectory())target=resolve(target,'index.html');
      assert.ok((await stat(target)).isFile(),`${route}: ${ref}`);
      if(url.hash && extname(target)==='.html'){
        const body=await readFile(target,'utf8');
        assert.ok(body.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),`${route}: missing ${ref}`);
      }
      checked++;
    }
  }
  assert.ok(checked>40);
});

test('all local JavaScript imports and CSS imports resolve in the built output',async()=>{
  for(const file of ['assets/site.js','assets/demo.js','assets/motion.js','assets/playground.js','assets/playground-runtime.js','assets/playground.css','assets/site.css','assets/night.css']){
    const body=await readFile(resolve(out,file),'utf8');
    for(const match of body.matchAll(/(?:from\s*|import\(|@import url\()['"]([^'"]+)['"]/g)){
      const target=resolve(dirname(resolve(out,file)),match[1].split('?')[0]);
      assert.ok((await stat(target)).isFile(),`${file}: ${match[1]}`);
    }
  }
});

test('the published demo assets match the pinned local snapshot',async()=>{
  const provenance=JSON.parse(await readFile(resolve(out,'reference/provenance.json'),'utf8'));
  assert.match(provenance.libraryRevision,/^[a-f0-9]{40}$/);
  const hash=createHash('sha256').update(await readFile(resolve(out,'vendor/marionette.js'))).digest('hex');
  assert.equal(hash,provenance.bundleSha256);
  assert.equal(await readFile(resolve(out,'reference/region.md'),'utf8'),await readFile(resolve(root,'content/region-reference.md'),'utf8'));
  assert.match(await readFile(resolve(out,'vendor/MARIONETTE-LICENSE.txt'),'utf8'),/MIT/);
});


test('entry and directly loaded modules use content versions to invalidate browser caches', async () => {
  const entry = await readFile(resolve(out, 'assets/site.js'), 'utf8');
  const version = source => createHash('sha256').update(source).digest('hex').slice(0, 12);
  const html = await readFile(resolve(out, 'index.html'), 'utf8');
  assert.ok(html.includes(`src="/assets/site.js?v=${version(entry)}"`));
  const imports = [...entry.matchAll(/import\('(.+?)\?v=([a-f0-9]+)'\)/g)];
  assert.equal(imports.length, 3);
  for (const [, path, hash] of imports) {
    assert.equal(hash, version(await readFile(resolve(out, 'assets', path))), path);
  }
});
