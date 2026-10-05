import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const page = { source: 'docs/example.md', title: 'Original title', markdown: '# Original title\n\nBody stays intact.\n' };
async function publication(t, edits) {
  const root = await mkdtemp(join(tmpdir(), 'publication-title-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'scripts'));
  await mkdir(join(root, 'content'));
  await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir');
  for (const file of ['published-docs.mjs', 'publication-status.mjs']) await cp(resolve('scripts', file), join(root, 'scripts', file));
  await writeFile(join(root, 'content/docs-publication-edits.json'), JSON.stringify({
    edits, titles: [{ source: page.source, before: page.title, after: 'Published title' }],
  }));
  return import(pathToFileURL(join(root, 'scripts/published-docs.mjs')));
}

test('title-only publication rejects an unchanged heading, including a matching heading inside code', async t => {
  const { publishedTitles } = await publication(t, []);
  assert.throws(() => publishedTitles([page]), /Review publication heading/);
  const fenced = { ...page, markdown: '```md\n# Published title\n```\n\n' + page.markdown };
  assert.throws(() => publishedTitles([fenced]), /Review publication heading/);
});

test('matching text and title overlays publish one consistent label without changing the source', async t => {
  const { publishedTitles, publishedMarkdown } = await publication(t, [{ source: page.source, before: '# Original title', after: '# Published title' }]);
  assert.equal(publishedTitles([page])[0].title, 'Published title');
  assert.equal(publishedMarkdown(page), '# Published title\n\nBody stays intact.\n');
  assert.equal(page.title, 'Original title');
  assert.equal(page.markdown, '# Original title\n\nBody stays intact.\n');
});
