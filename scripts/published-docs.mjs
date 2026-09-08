import { readFileSync } from 'node:fs';
const publication = JSON.parse(readFileSync(new URL('../content/docs-publication-edits.json', import.meta.url), 'utf8'));

// Correct pre-publication prose without rewriting the archived package source or code.
export function publishedMarkdown(page) {
  let markdown = page.markdown;
  for (const { source, before, after } of publication.edits) {
    if (source !== page.source) continue;
    if (!markdown.includes(before)) throw new Error(`Review publication wording for ${source}`);
    markdown = markdown.replace(before, after);
  }
  return markdown;
}
