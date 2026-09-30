import { searchSections as rankSections } from '../content/library-docs/skills/marionette/scripts/search.mjs';

export function indexSections(sections, documents) {
  // Plain entries survive the JSON snapshot used by the HTTP Worker. Ranking
  // uses the imported skill's implementation against website reading copies.
  return {
    sections: sections.map(section => ({ id: section.id, source: section.documentId,
      start: section.start, end: section.end, heading: section.heading, ancestors: section.breadcrumbs })),
    files: documents.map(document => [document.id, document.markdown]),
  };
}

export function searchSections(sections, query, index, lookup = new Map(sections.map(section => [section.id, section]))) {
  const files = new Map(index.files.map(([source, content]) => [source, { content }]));
  return rankSections(index.sections, files, query).map(({ id, matchedTerms, score }) => ({
    ...lookup.get(id), matchedTerms, score,
  }));
}

export const sectionMetadata = ({ content, ...section }) => ({ ...section, characters: content.length });

export function selectSections(sections, ids, maxCharacters, lookup = new Map(sections.map(section => [section.id, section]))) {
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
    const insertionIndex = children.length ? Math.min(...children.map(child => selected.indexOf(child))) : selected.length;
    for (const child of children) selected.splice(selected.indexOf(child), 1);
    selected.splice(insertionIndex, 0, section);
    characters += required;
  }
  return { sections: selected.map(section => ({ ...sectionMetadata(section), content: section.content })),
    omitted: omitted.filter(item => !selected.some(parent => { const child = lookup.get(item.id); return parent.documentId === child.documentId && parent.start <= child.start && parent.end >= child.end; })),
    characters, maxCharacters };
}
