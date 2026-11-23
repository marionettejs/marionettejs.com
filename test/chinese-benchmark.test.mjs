import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';

const output = (path) => readFile(new URL('../dist/' + path, import.meta.url), 'utf8');
const route = '/zh-CN/news/react-show-your-work/';

test('the Simplified Chinese benchmark feature is directly available with localized metadata', async () => {
  const html = await output(route.slice(1) + 'index.html');
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/marionettejs\.com\/zh-CN\/news\/react-show-your-work\/">/);
  assert.match(html, /<meta property="og:locale" content="zh_CN">/);
  assert.match(html, /跳到正文/);
  assert.match(html, /<img src="\/assets\/news\/react-show-your-work\/hero\.webp" width="1672" height="941" alt="带有 Marionette 标志/);
  assert.match(html, /role="region" aria-label="基准测试对比" tabindex="0"><table>/);
  assert.equal(html.match(/<table>/g).length, 1);
  assert.match(html, /<a href="https:\/\/marionettejs\.com\/news\/react-show-your-work\/">阅读英文原文与完整测试图表<\/a>/);
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(data.inLanguage, 'zh-CN');
  assert.equal(data.author.name, 'Paul Falgout');
  assert.match(data.headline, /速度、内存和包体积怎么比/);
  assert.doesNotMatch(html, /<script [^>]*src=/);
  assert.doesNotMatch(html, /case-studies\.css/);
});

async function* outputFiles(directory, prefix = '') {
  for (const entry of await readdir(new URL(directory, import.meta.url), { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) yield* outputFiles(directory + entry.name + '/', path);
    else if (entry.isFile()) yield path;
  }
}

test('no other generated site or discovery artifact refers to the localized feature', async () => {
  const articlePath = route.slice(1) + 'index.html';
  const routeFragment = route.slice(1, -1);
  let pagefindFragments = 0;
  for await (const path of outputFiles('../dist/')) {
    // These are the two intended outputs: the page and its cache rule.
    if (path === articlePath || path === '_headers') continue;
    const bytes = await readFile(new URL('../dist/' + path, import.meta.url));
    assert.ok(!bytes.includes(routeFragment), path);
    // Pagefind stores route URLs inside gzip-compressed result fragments.
    if (path.startsWith('pagefind/fragment/') && path.endsWith('.pf_fragment')) {
      pagefindFragments++;
      assert.ok(!gunzipSync(bytes).includes(routeFragment), path);
    }
  }
  assert.ok(pagefindFragments > 0, 'expected to inspect Pagefind result fragments');
  const mcp = await readFile(new URL('../output/mcp/snapshot.json', import.meta.url));
  assert.ok(!mcp.includes(routeFragment), 'documentation MCP snapshot');
});
