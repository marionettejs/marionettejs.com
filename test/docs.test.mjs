import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { readSnapshot, renderMarkdown, markdownUrl, canonicalSourceUrl, deriveMarkdown } from '../scripts/library-docs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'content/library-docs');

test('every canonical page publishes its exact Markdown and source identity', async () => {
  const { manifest, pages } = await readSnapshot(source);
  assert.ok(pages.length > 30, 'Full documentation corpus');
  for (const page of pages) {
    const html = await readFile(resolve(root, 'dist', page.route, 'index.html'), 'utf8');
    assert.equal(await readFile(resolve(root, 'dist', canonicalSourceUrl(page).slice(1)), 'utf8'), page.markdown);
    assert.ok(html.includes(`type="text/markdown" href="${markdownUrl(page)}"`));
    assert.ok(html.includes(manifest.sourceRevision.slice(0, 8)));
    assert.ok(html.includes('data-pagefind-body'));
    assert.ok(html.includes('data-copy-markdown'));
  }
  const llms = await readFile(resolve(root, 'dist/docs/llms.txt'), 'utf8');
  for (const page of pages) assert.ok(llms.includes(markdownUrl(page)));
  assert.ok((await readFile(resolve(root, 'dist/pagefind/pagefind.js'), 'utf8')).length > 100);
});

test('import refuses altered content and unsafe paths before replacement', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'marionette-docs-'));
  try {
    await cp(source, directory, { recursive: true });
    const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
    const page = manifest.pages[0];
    await writeFile(resolve(directory, page.source), 'altered');
    await assert.rejects(readSnapshot(directory), /hash mismatch/);
    page.source = '../outside.md';
    await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest));
    await assert.rejects(readSnapshot(directory), /Invalid or duplicate/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('renderer keeps headings linkable and maps canonical cross-page references', () => {
  const page = { source: 'docs/example.md', markdown: '# Example\n\n## `show(view)`\n\n[Region](marionette.region.md#showing-a-view)\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert)\n' };
  const { html } = renderMarkdown(page, [{ source: 'docs/marionette.region.md', route: 'docs/regions' }], { sourceRepository: 'https://github.com/marionettejs/marionette', sourceRevision: 'a'.repeat(40) });
  assert.match(html, /id="showview"/);
  assert.match(html, /href="\/docs\/regions\/#showing-a-view"/);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
});

test('diagnostics retain active and retired identities with machine-readable remedies', async () => {
  const catalog = JSON.parse(await readFile(resolve(root, 'dist/docs/diagnostics.json'), 'utf8'));
  for (const entry of catalog.diagnostics) {
    const markdown = await readFile(resolve(root, 'dist/errors', `${entry.code}.md`), 'utf8');
    assert.ok(markdown.includes(`Status: ${entry.status}`));
    assert.ok(markdown.includes(entry.remediation));
    const html = await readFile(resolve(root, 'dist/errors', entry.code, 'index.html'), 'utf8');
    assert.ok(html.includes(`type="text/markdown" href="/errors/${entry.code}.md"`));
    assert.ok(markdown.includes('base revision'));
    assert.ok(markdown.includes('[Diagnostic catalog](/errors/index.md)'));
  }
});

test('agent Markdown keeps code intact and resolves page links within this snapshot', async () => {
  const { manifest, pages } = await readSnapshot(source);
  const parser = new Marked();
  for (const page of pages) {
    const derived = await readFile(resolve(root, 'dist', markdownUrl(page).slice(1)), 'utf8');
    assert.ok(derived.includes(`original source SHA-256 ${page.sha256}`));
    const code = markdown => { const blocks = []; parser.walkTokens(parser.lexer(markdown), token => { if (token.type === 'code' || token.type === 'codespan') blocks.push(token.text); }); return blocks; };
    assert.deepEqual(code(derived), code(page.markdown), `${page.source}: code must not change`);
    const hrefs = [];
    parser.walkTokens(parser.lexer(derived), token => { if (token.type === 'link') hrefs.push(token.href); });
    for (const href of hrefs) {
      assert.ok(!/^https:\/\/github.com\/marionettejs\/(?:marionette|backbone.marionette)\/blob\/(?:master|main)\//.test(href), `${page.source}: moving source ${href}`);
      assert.ok(/^(?:#|\/|[a-z]+:)/i.test(href), `${page.source}: unresolved relative link ${href}`);
      if (href.startsWith('/') && !href.startsWith('//')) await readFile(resolve(root, 'dist', href.split('#')[0].slice(1)));
    }
  }
  const sample = { source: 'docs/example.md', route: 'docs/example', title: 'Example', sha256: 'a'.repeat(64), markdown: '# Example\n\n[Region](marionette.region.md)\n\n```md\n[Region](marionette.region.md)\n```\n\n`[Region](marionette.region.md)`\n\n[ref]: marionette.region.md\n' };
  const derived = deriveMarkdown(sample, pages, manifest);
  assert.ok(derived.includes('[Region](/docs/region.md)'));
  assert.ok(derived.includes('```md\n[Region](marionette.region.md)\n```'));
  assert.ok(derived.includes('`[Region](marionette.region.md)`'));
  assert.ok(derived.includes('[ref]: /docs/region.md'));
});

test('explicit historical revisions are not rewritten to the current snapshot', () => {
  const revision = 'b'.repeat(40);
  const manifest = { sourceRepository: 'https://github.com/marionettejs/marionette', sourceRevision: 'a'.repeat(40) };
  const page = { source: 'docs/example.md', markdown: `# Example\n\n[Historical](https://github.com/marionettejs/marionette/blob/${revision}/docs/marionette.region.md)\n` };
  const { html } = renderMarkdown(page, [{ source: 'docs/marionette.region.md', route: 'docs/region' }], manifest);
  assert.ok(html.includes(`/blob/${revision}/docs/marionette.region.md`));
});

test('demo reading Markdown preserves code and pins references to its own source', async () => {
  const provenance = JSON.parse(await readFile(resolve(root, 'content/provenance.json'), 'utf8'));
  const original = await readFile(resolve(root, 'content/demo-region-reference.md'), 'utf8');
  const markdown = await readFile(resolve(root, 'dist/reference/demo-region.md'), 'utf8');
  const base = `${provenance.libraryRepository}/blob/${provenance.libraryRevision}/`;
  assert.ok(markdown.includes(`base revision ${provenance.libraryRevision}`));
  assert.ok(markdown.includes('[Canonical source](/reference/demo-region-source.md)'));
  assert.ok(markdown.includes('[Source identity](/reference/provenance.json)'));
  assert.ok(markdown.includes(`${base}docs/upgrade-v2-v3.md#changes-to-regionshow`));
  assert.ok(markdown.includes(`${base}config/diagnostics/catalog.json`));
  const parser = new Marked();
  const code = source => {
    const blocks = [];
    parser.walkTokens(parser.lexer(source), token => {
      if (token.type === 'code' || token.type === 'codespan') blocks.push(token.text);
    });
    return blocks;
  };
  assert.deepEqual(code(markdown), code(original));
  const links = [];
  parser.walkTokens(parser.lexer(markdown), token => {
    if (token.type === 'link') links.push(token.href);
  });
  for (const href of links) {
    assert.ok(/^(?:#|\/reference\/|https?:)/.test(href), `Unresolved demo link: ${href}`);
    if (href.startsWith(`${provenance.libraryRepository}/blob/`)) {
      assert.ok(href.startsWith(base), `Demo link uses another revision: ${href}`);
    }
    assert.ok(!href.includes('/docs/upgrade.md'), 'Obsolete migration path');
  }
});
