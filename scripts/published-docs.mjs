import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const publication = JSON.parse(readFileSync(new URL('../content/docs-publication-edits.json', import.meta.url), 'utf8'));

// Correct publication prose and editorial issues without rewriting the archived package source or code.
export function publishedMarkdown(page) {
  let markdown = page.markdown;
  for (const { source, before, after, readingSha256, sourceRevision, sourceSha256 } of publication.edits) {
    if (source !== page.source) continue;
    if (readingSha256 && (!/^[a-f0-9]{40}$/.test(sourceRevision) || !/^[a-f0-9]{64}$/.test(sourceSha256) || createHash('sha256').update(after).digest('hex') !== readingSha256)) throw new Error(`Invalid reading-copy provenance for ${source}`);
    if (!before || markdown.split(before).length !== 2) throw new Error(`Review publication wording for ${source}`);
    markdown = markdown.replace(before, () => after);
  }
  return markdown;
}

// Before the first stable v5 release, the published beta is deliberately on latest.
export function publishedChannel(manifest) {
  if (manifest.packageVersion !== publication.packageVersion || publication.channel !== 'latest') {
    throw new Error('Review published documentation channel.');
  }
  return publication.channel;
}

export function readingRevision(page, manifest) {
  return publication.edits.find(edit => edit.source === page.source && edit.sourceRevision)?.sourceRevision || manifest.sourceRevision;
}
