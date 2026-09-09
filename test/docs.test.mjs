import { publishedMarkdown } from '../scripts/published-docs.mjs';
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
    assert.deepEqual(code(derived), code(publishedMarkdown(page)), `${page.source}: code must match the reviewed publication copy`);
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

test('supporting resources publish exact bytes and resolve from HTML and agent Markdown', async () => {
  const { manifest, pages, assets } = await readSnapshot(source);
  for (const asset of assets) {
    assert.equal(await readFile(resolve(root, 'dist/docs/source', asset.source), 'utf8'), asset.content);
  }
  const fixture = 'test/fixtures/docs-routing/validate.mjs';
  const page = { source: 'docs/example.md', title: 'Example', sha256: 'a'.repeat(64), markdown: `# Example\n\n[Fixture](https://github.com/marionettejs/marionette/blob/master/${fixture})\n` };
  assert.ok(renderMarkdown(page, pages, manifest).html.includes(`/docs/source/${fixture}`));
  assert.ok(deriveMarkdown(page, pages, manifest).includes(`[Fixture](/docs/source/${fixture})`));
  const headers = await readFile(resolve(root, 'dist/_headers'), 'utf8');
  assert.match(headers, /\/docs\/source\/\*\n  Content-Type: text\/plain; charset=utf-8\n  X-Content-Type-Options: nosniff/);
});

test('historical Backbone repository links retain their original owner', () => {
  const href = 'https://github.com/marionettejs/backbone.marionette/blob/master/docs/marionette.region.md';
  const page = { source: 'docs/example.md', markdown: `# Example\n\n[Historical](${href})\n` };
  const manifest = { sourceRepository: 'https://github.com/marionettejs/marionette', sourceRevision: 'a'.repeat(40) };
  assert.ok(renderMarkdown(page, [{ source: 'docs/marionette.region.md', route: 'docs/region' }], manifest).html.includes(href));
});

test('supporting assets reject altered content and traversal', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'marionette-assets-'));
  try {
    await cp(source, directory, { recursive: true });
    const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
    const asset = manifest.assets.find(item => item.source.endsWith('.mjs'));
    await writeFile(resolve(directory, asset.source), 'altered');
    await assert.rejects(readSnapshot(directory), /hash mismatch/);
    asset.source = '../outside.mjs';
    await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest));
    await assert.rejects(readSnapshot(directory), /Unsupported documentation asset/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('supporting assets reject symlink escapes after safe manifest paths', async () => {
  const { symlink } = await import('node:fs/promises');
  const directory = await mkdtemp(resolve(tmpdir(), 'marionette-symlink-'));
  try {
    const snapshot = resolve(directory, 'snapshot');
    await cp(source, snapshot, { recursive: true });
    const assetDirectory = 'test/fixtures/docs-routing';
    await cp(resolve(snapshot, assetDirectory), resolve(directory, 'outside'), { recursive: true });
    await rm(resolve(snapshot, assetDirectory), { recursive: true });
    await symlink(resolve(directory, 'outside'), resolve(snapshot, assetDirectory), 'junction');
    await assert.rejects(readSnapshot(snapshot), /Documentation asset escapes snapshot/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('reading copies link diagnostic codes directly and expose class navigation', async () => {
  const collection = await readFile(resolve(root, 'dist/docs/collection-view/index.html'), 'utf8');
  assert.match(collection, /href="\/errors\/MN0023\/"/);
  const classes = await readFile(resolve(root, 'dist/docs/classes/index.html'), 'utf8');
  assert.match(classes, /<h2 id="marionetteview"/);
  assert.match(classes, /<a href="#marionetteview">Marionette.View<\/a>/);
  const llms = await readFile(resolve(root, 'dist/docs/llms.txt'), 'utf8');
  const { manifest } = await readSnapshot(source);
  assert.ok(llms.includes(`Channel: latest\nPublication: beta (published on npm)`));
});

test('diagnostic catalog schemas resolve beside all catalog copies with pinned provenance', async () => {
  const { createHash } = await import('node:crypto');
  const { manifest } = await readSnapshot(source);
  const provenance = JSON.parse(await readFile(resolve(root, 'dist/docs/schema-provenance.json'), 'utf8'));
  assert.equal(provenance.sourceRevision, manifest.sourceRevision);
  for (const path of ['docs/diagnostics.json', 'docs/source/config/diagnostics/catalog.json', 'docs/markdown/config/diagnostics/catalog.json']) {
    const catalog = JSON.parse(await readFile(resolve(root, 'dist', path), 'utf8'));
    const schemaPath = new URL(catalog.$schema, new URL(`../dist/${path}`, import.meta.url));
    const schema = await readFile(schemaPath, 'utf8');
    assert.equal(createHash('sha256').update(schema).digest('hex'), provenance.sha256);
    assert.ok(JSON.parse(schema).properties.diagnostics);
  }
});

test('diagnostic link rewrites preserve fenced, indented, and inline code examples', () => {
  const link = '[`MN0023`](diagnostic-catalog.md#look-up-a-code)';
  const code = `\`\`\`md\n${link}\n\`\`\`\n\n    ${link}\n\n\`\`${link}\`\`\n\n\`\`multiline\n${link}\n[ref]: marionette.region.md\n\`\``;
  const page = { source: 'docs/example.md', route: 'docs/example', title: 'Example', sha256: 'a'.repeat(64), markdown: `# Example\n\n**${link}**\n\n${code}\n` };
  const manifest = { packageVersion: '5.0.0-beta.2', sourceRepository: 'https://github.com/marionettejs/marionette', sourceRevision: 'a'.repeat(40) };
  const derived = deriveMarkdown(page, [], manifest);
  assert.ok(derived.includes('**[`MN0023`](/errors/MN0023.md)**'));
  assert.ok(derived.includes(code), 'All code examples remain byte-for-byte unchanged');
  const html = renderMarkdown(page, [], manifest).html;
  assert.equal((html.match(/href="\/errors\/MN0023\/"/g) || []).length, 1);
  assert.equal((html.match(/diagnostic-catalog.md#look-up-a-code/g) || []).length, 4);
});
