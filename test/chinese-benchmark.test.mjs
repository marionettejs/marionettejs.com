import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
});

test('the localized feature stays out of the English site and catalog outputs', async () => {
  for (const path of ['index.html', 'news/index.html', 'news/react-show-your-work/index.html', 'sitemap.xml', 'llms.txt', 'assets/analytics.js']) {
    assert.ok(!(await output(path)).includes(route), path);
  }
});
