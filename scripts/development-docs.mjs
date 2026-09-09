import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';

// Supplemental guides come from library source. Published beta docs remain immutable.
export async function readDevelopmentDocs() {
  const base = new URL('../content/development-docs/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', base), 'utf8'));
  if (!/^[a-f0-9]{40}$/.test(manifest.sourceRevision) || manifest.sourceRepository !== 'https://github.com/marionettejs/marionette' ||
      manifest.pages?.length !== 2) throw new Error('Invalid development guide provenance.');
  const pages = [];
  for (const [index, name] of ['development', 'troubleshooting'].entries()) {
    const page = manifest.pages[index];
    if (page.source !== `docs/${name}.md` || page.route !== name) throw new Error('Invalid development guide source.');
    const markdown = await readFile(new URL(page.source, base), 'utf8');
    if (createHash('sha256').update(markdown).digest('hex') !== page.sha256) throw new Error(`Development guide hash mismatch: ${name}`);
    pages.push({ ...page, markdown });
  }
  return { manifest, pages };
}

export function diagnosticExamples(markdown) {
  return Object.fromEntries([...markdown.matchAll(/^### (MN\d{4}):[^\n]*\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm)]
    .map(([, code, body]) => [code, body.trim()]));
}

export async function buildDevelopmentDocs({ out, shell, renderMarkdown, deriveMarkdown }) {
  const { manifest, pages } = await readDevelopmentDocs();
  await mkdir(resolve(out, 'development'), { recursive: true });
  await writeFile(resolve(out, 'development/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const page of pages) {
    const notice = page.route === 'development'
      ? 'Unreleased development workflow. Use the exact candidate artifacts described below. The published npm release remains beta.1.'
      : 'These supplemental examples are checked against the published beta.1 and current development candidate. API references identify their library source.';
    const { html } = renderMarkdown(page, pages, manifest);
    await mkdir(resolve(out, page.route), { recursive: true });
    const sourceUrl = `/development/source/${page.source}`;
    await mkdir(dirname(resolve(out, sourceUrl.slice(1))), { recursive: true });
    await writeFile(resolve(out, sourceUrl.slice(1)), page.markdown);
    await writeFile(resolve(out, `${page.route}.md`), `${notice}\n\n${deriveMarkdown(page, pages, manifest, { sourceUrl, manifestUrl: '/development/manifest.json' })}`);
    await writeFile(resolve(out, page.route, 'index.html'), shell({
      title: page.title, description: notice, active: 'docs', route: `/${page.route}/`, markdown: `/${page.route}.md`,
      body: `<div class="docs-layout canonical-docs"><aside class="docs-nav"><a href="/docs/">Published beta.1 reference</a><a href="/development/">Development starter</a><a href="/troubleshooting/">Troubleshooting</a><div id="docs-search"></div></aside><article class="prose docs-prose" data-pagefind-body><p class="docs-version">${notice}</p><div class="docs-tools" data-pagefind-ignore><a href="/${page.route}.md">Read Markdown</a><button type="button" data-copy-markdown="/${page.route}.md">Copy Markdown</button><span class="copy-status" role="status"></span></div>${html}<p><a href="/development/manifest.json">Source identity: ${manifest.sourceRevision.slice(0, 8)}${manifest.sourceDirty ? ' + local changes' : ''}</a></p></article></div>`
    }));
  }
  return { manifest, examples: diagnosticExamples(pages[1].markdown) };
}
