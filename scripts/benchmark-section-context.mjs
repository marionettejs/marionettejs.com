// Offline retrieval diagnostic, not a model evaluation or release usability score.
import { loadSnapshot } from '../mcp/load.mjs';
import { searchSections, selectSections } from '../mcp/sections.mjs';
const snapshot = await loadSnapshot();
const documentIds = ['docs/events.md', 'docs/events.class.md', 'docs/marionette.view.md', 'docs/marionette.region.md'];
const documents = snapshot.documents.filter(doc => documentIds.includes(doc.id));
const fullCharacters = documents.reduce((sum, doc) => sum + doc.markdown.length, 0);
const cases = [
  { task: 'render-resource', queries: ['triggerMethod', 'render before:render', 'destroy before:destroy'],
    headings: [['docs/events.md', '`triggerMethod`'], ['docs/events.class.md', '`render` and `before:render` events'], ['docs/events.class.md', '`destroy` and `before:destroy` events']] },
  { task: 'attach-resource', queries: ['triggerMethod', 'attach before:attach', 'detach before:detach', 'Detaching Existing Views', 'destroy A Region'],
    headings: [['docs/events.md', '`triggerMethod`'], ['docs/events.class.md', '`attach` and `before:attach` events'], ['docs/events.class.md', '`detach` and `before:detach` events'], ['docs/marionette.region.md', 'Detaching Existing Views'], ['docs/marionette.region.md', '`destroy` A Region']] },
];
const results = cases.map(({ task, queries, headings }) => {
  const manualIds = headings.map(([documentId, heading]) => {
    const section = snapshot.sections.find(section => section.documentId === documentId && section.heading === heading);
    if (!section) throw new Error(`Missing benchmark contract: ${documentId}: ${heading}`);
    return section.id;
  });
  // Rank globally, not against known answers or a prefiltered document set.
  const automaticIds = [...new Set(queries.flatMap(query => searchSections(snapshot.sections, query, snapshot.sectionIndex).slice(0, 3).map(section => section.id)))];
  const automatic = selectSections(snapshot.sections, automaticIds, 20_000);
  const manual = selectSections(snapshot.sections, manualIds, 20_000);
  const covered = manualIds.filter(id => {
    const expected = snapshot.sections.find(section => section.id === id);
    return automatic.sections.some(section => section.documentId === expected.documentId && section.start <= expected.start && section.end >= expected.end);
  });
  return { task, queries, fullCharacters, manualCharacters: manual.characters, automaticCharacters: automatic.characters,
    expectedContracts: manualIds, coveredContracts: covered, missingContracts: manualIds.filter(id => !covered.includes(id)),
    manualIds: manual.sections.map(s => s.id), automaticIds: automatic.sections.map(s => s.id), omitted: automatic.omitted };
});
console.log(JSON.stringify({ kind: 'offline-retrieval-diagnostic', scored: false, provenance: snapshot.provenance,
  note: 'Queries are task-informed; coverage checks named source sections, not agent correctness. No model calls or token estimates.', results }, null, 2));
