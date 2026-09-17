import { Marked } from 'marked';
import { headingId } from '../scripts/heading-ids.mjs';

// Parse block tokens rather than heading-looking lines inside fenced examples.
export function documentSections(document) {
  const parser = new Marked();
  const normalized = document.markdown.replace(/\r\n?/g, '\n');
  const offsets = [];
  for (let i = 0; i < document.markdown.length; i++) {
    offsets.push(i);
    if (document.markdown[i] === '\r' && document.markdown[i + 1] === '\n') i++;
  }
  offsets.push(document.markdown.length);
  const tokens = parser.lexer(normalized);
  const used = new Map();
  const headings = [];
  let offset = 0;
  for (const token of tokens) {
    const start = normalized.indexOf(token.raw, offset);
    if (start < 0) throw new Error(`Cannot locate Markdown block: ${document.id}`);
    // Count nested headings too, matching duplicate anchor numbering in HTML.
    parser.walkTokens([token], item => {
      if (item.type !== 'heading') return;
      const anchor = headingId(parser.parseInline(item.text), used);
      if (item === token) headings.push({ start: offsets[start], depth: item.depth, heading: item.text, anchor });
    });
    offset = start + token.raw.length;
  }
  // Documents without headings and introductions remain individually retrievable.
  if (!headings.length || headings[0].start > 0) headings.unshift({ start: 0, depth: 0, heading: document.title, anchor: null });
  return headings.map((heading, index) => {
    const next = headings.slice(index + 1).find(item => heading.depth === 0 || item.depth <= heading.depth);
    const end = next?.start ?? document.markdown.length;
    const ancestors = headings.slice(0, index).reduce((stack, item) => {
      while (stack.length && stack.at(-1).depth >= item.depth) stack.pop();
      if (item.depth > 0) stack.push(item);
      return stack;
    }, []).filter(item => item.depth < heading.depth);
    return { id: `${document.id}#${heading.anchor ?? '@intro'}`, documentId: document.id,
      heading: heading.heading, breadcrumbs: ancestors.map(item => item.heading),
      parentId: ancestors.length ? `${document.id}#${ancestors.at(-1).anchor}` : null,
      url: heading.depth <= 1 ? document.url.split('#')[0] : `${document.url.split('#')[0]}#${heading.anchor}`,
      markdownUrl: document.markdownUrl, sourceUrl: document.sourceUrl, sourceSha256: document.sourceSha256, sha256: document.sha256,
      ...(document.sourceSupplements ? { sourceSupplements: document.sourceSupplements } : {}),
      start: heading.start, end, content: document.markdown.slice(heading.start, end) };
  });
}

