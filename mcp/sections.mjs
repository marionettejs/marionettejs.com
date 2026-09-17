import { tokenize } from './search.mjs';

export function indexSections(sections) {
  const index = Object.create(null);
  for (const section of sections) {
    const title = new Set(tokenize(section.heading));
    for (const term of tokenize(`${section.heading}\n${section.content}`)) {
      (index[term] ??= []).push([section.id, title.has(term)]);
    }
  }
  return index;
}

export function searchSections(sections, query, index = indexSections(sections)) {
  const terms = tokenize(query);
  if (!terms.length) throw new Error('Query must include an API name or substantive search word.');
  const matches = new Map();
  const lookup = new Map(sections.map(section => [section.id, section]));
  for (const term of terms) for (const [id, inTitle] of Object.hasOwn(index, term) ? index[term] : []) {
    const match = matches.get(id) || { id, matchedTerms: [], titleScore: 0 };
    match.matchedTerms.push(term);
    match.titleScore += inTitle ? 10 : 0;
    matches.set(id, match);
  }
  return [...matches.values()].map(({ id, matchedTerms, titleScore }) => ({
    ...lookup.get(id), matchedTerms, score: matchedTerms.length ** 2 + titleScore
  })).sort((a, b) => b.score - a.score || a.content.length - b.content.length || a.id.localeCompare(b.id, 'en'));
}

export const sectionMetadata = ({ content, ...section }) => ({ ...section, characters: content.length });

export function selectSections(sections, ids, maxCharacters) {
  const lookup = new Map(sections.map(section => [section.id, section]));
  const requested = [...new Set(ids)].map(id => {
    if (!lookup.has(id)) throw new Error(`Unknown section id: ${id}. Use search_sections.`);
    return lookup.get(id);
  });
  let characters = 0;
  const selected = [], omitted = [];
  for (const section of requested) {
    if (selected.some(parent => parent.documentId === section.documentId && parent.start <= section.start && parent.end >= section.end)) continue;
    // A selected parent replaces previously selected descendants without repeating text.
    const children = selected.filter(child => child.documentId === section.documentId && section.start <= child.start && section.end >= child.end);
    const required = section.content.length - children.reduce((sum, child) => sum + child.content.length, 0);
    if (characters + required > maxCharacters) {
      omitted.push({ id: section.id, characters: section.content.length, reason: 'budget' });
      continue;
    }
    for (const child of children) selected.splice(selected.indexOf(child), 1);
    selected.push(section); characters += required;
  }
  return { sections: selected.map(section => ({ ...sectionMetadata(section), content: section.content })),
    omitted: omitted.filter(item => !selected.some(parent => { const child = lookup.get(item.id); return parent.documentId === child.documentId && parent.start <= child.start && parent.end >= child.end; })),
    characters, maxCharacters };
}
