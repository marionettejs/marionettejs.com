import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,'dist');
const manifest=JSON.parse(await readFile(resolve(out,'docs/manifest.json'),'utf8'));
const catalog=JSON.parse(await readFile(resolve(out,'docs/diagnostics.json'),'utf8'));
const routes=['errors/index.html',...catalog.diagnostics.map(entry=>`errors/${entry.code}/index.html`),'thanks/index.html','index.html','why/index.html','404.html',...manifest.pages.map(page=>`${page.route}/index.html`)];

test('every built page has valid local links, fragments, and asset references',async()=>{
  let checked=0;
  for(const route of routes){
    const html=await readFile(resolve(out,route),'utf8');
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,route);
    assert.match(html,/<html lang="en">/);
    for (const link of ['/thanks/', 'https://www.patreon.com/marionettejs', 'https://store.marionettejs.com/', 'https://www.npmjs.com/package/marionette/v/5.0.0-beta.1']) {
      assert.ok(html.includes(`href="${link}"`), `${route}: missing shared footer link ${link}`);
    }
    const socialImage = html.match(/property="og:image" content="([^"]+)"/);
    assert.ok(socialImage, `${route}: missing social preview`);
    const socialUrl = new URL(socialImage[1]);
    assert.equal(socialUrl.origin, 'https://marionettejs.com');
    assert.ok((await stat(resolve(out, `.${socialUrl.pathname}`))).isFile(), `${route}: missing social image`);
    assert.match(html,/<meta name="robots" content="index, follow">/);
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
  for(const file of ['assets/site.js','assets/demo.js','assets/motion.js','assets/playground.js','assets/playground-runtime.js','assets/playground.css','assets/site.css','assets/night.css','assets/docs.js','assets/docs.css']){
    const body=await readFile(resolve(out,file),'utf8');
    for(const match of body.matchAll(/(?:from\s*|import\(|@import url\()['"]([^'"]+)['"]/g)){
      const target=resolve(dirname(resolve(out,file)),match[1].split('?')[0]);
      assert.ok((await stat(target)).isFile(),`${file}: ${match[1]}`);
    }
  }
});

test('the demo runtime and documentation match the published beta',async()=>{
  const provenance=JSON.parse(await readFile(resolve(out,'reference/provenance.json'),'utf8'));
  assert.match(provenance.libraryRevision,/^[a-f0-9]{40}$/);
  const hash=createHash('sha256').update(await readFile(resolve(out,'vendor/marionette.js'))).digest('hex');
  assert.equal(hash,provenance.bundleSha256);
  assert.equal(provenance.packageVersion, '5.0.0-beta.1');
  assert.equal(provenance.packageVersion, manifest.packageVersion);
  assert.equal(provenance.libraryRevision, manifest.sourceRevision);
  assert.equal(manifest.sourceDirty, false);
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
