import { View, Region, CollectionView, MnObject } from 'marionette';
import { escapeHTML } from './html.js';
import { sections } from './source.js';

const Story = View.extend({
  tagName: 'p',
  className: 'story',
  attributes: {
    role: 'status',
  },
  template: ({ text }) => escapeHTML(text),
});
const Explanation = View.extend({
  tagName: 'section',
  className: 'lesson-step',
  template: ({ title, excerpts, observation, steps }) => `
    <small>FOLLOW THE CONNECTION</small><h2>${escapeHTML(title)}</h2>
    <ol class="cause-chain">${steps.map(step => `<li>${escapeHTML(step)}</li>`).join('')}</ol>
    ${excerpts
      .map(excerpt =>
        excerpt
          ? `
      <section class="source-excerpt" data-source-file="${escapeHTML(excerpt.file)}" data-source-symbol="${escapeHTML(excerpt.symbol)}">
        <button class="source-link" data-file="${escapeHTML(excerpt.file)}" data-symbol="${escapeHTML(excerpt.symbol)}">${escapeHTML(excerpt.file)} · ${escapeHTML(excerpt.symbol)} ↗</button>
        <small class="source-caption">RUNNING SOURCE · LINES ${excerpt.line}–${excerpt.endLine}</small>
        <div class="source-lines"><pre><code>${excerpt.highlighted}</code></pre></div>
      </section>`
          : '<p class="source-missing">This method was removed or renamed in the running source. Use the source files below to inspect your edit.</p>',
      )
      .join('')}
    <p>${escapeHTML(observation)}</p>`,
  ui: {
    source: '.source-link',
  },
  events: {
    'click @ui.source': 'onClickSource',
  },
  onClickSource({ delegateTarget }) {
    sourceSelection = {
      file: delegateTarget.dataset.file,
      symbol: delegateTarget.dataset.symbol,
      requestId: ++sourceRequest,
    };
  },
});
const ObjectBoard = View.extend({
  className: 'object-board',
  template: ({ objects }) =>
    objects
      .map(
        ([name, status, detail]) => `<section>
    <h3>${escapeHTML(name)}</h3><strong>${escapeHTML(status)}</strong><p>${escapeHTML(detail)}</p></section>`,
      )
      .join(''),
});
const Receipt = View.extend({
  tagName: 'li',
  createState() {
    return {
      observed: null,
    };
  },
  templateContext() {
    return this.getState();
  },
  template: ({ label, observed }) =>
    `${observed === null ? '○' : observed ? '✓' : '✗'} ${escapeHTML(label)}`,
  onRender() {
    const observed = this.getState().observed;

    if (observed === null) {
      delete this.el.dataset.result;
    } else {
      this.el.dataset.result = observed ? 'pass' : 'fail';
    }
  },
});
const Receipts = CollectionView.extend({
  tagName: 'ol',
});
const Lesson = View.extend({
  className: 'lesson',
  template: ({ icon, title, introduction, question }) => `<header class="hero">
    <span class="mascot" aria-hidden="true">${escapeHTML(icon)}</span>
    <div><div class="kicker">A SMALL EXPERIMENT</div><h1>${escapeHTML(title)}</h1></div></header>
    ${question ? `<h2 class="lesson-question">${escapeHTML(question)}</h2>` : ''}
    <p class="lede">${escapeHTML(introduction)}</p>
    <div class="lesson-layout">
      <div class="lesson-play"><div id="experiment"></div><div class="retired-slot"></div></div>
      <aside class="lesson-explanation" aria-label="Code and consequence"><div class="explanation-slot"></div><div class="story-slot"></div></aside>
    </div>
    <details class="proof" aria-label="Observed evidence">
      <summary>Inspector · objects &amp; checks</summary>
      <p class="fine">Peek under the floorboards. ○ means not tried yet; ✓ means an actual object passed the check.</p>
      <div class="inspector-retired-slot"></div><div class="board-slot"></div><div class="receipts-slot"></div>
    </details>`,
  regions: {
    experiment: '#experiment',
    story: '.story-slot',
    retired: '.retired-slot',
    retiredEvidence: '.inspector-retired-slot',
    explanation: '.explanation-slot',
    board: '.board-slot',
    receipts: '.receipts-slot',
  },
  onRender() {
    this.showChildView('receipts', new Receipts());
    for (const { id, label } of this.model.evidence) {
      const receipt = new Receipt({
        model: {
          label,
        },
      });

      receiptViews.set(id, receipt);
      this.getChildView('receipts').addChildView(receipt);
    }
  },
});
const lifecycle = [];
const checks = new Map();
const views = [];
const receiptViews = new Map();
let lifecycleDropped = 0;
export let lesson;
let sourceSelection,
  sourceRequest = 0;

// Demo instrumentation only: these methods observe ownership; they do not create it.
const observedRegions = new Map();
const objectGroups = new Map();
const demoInspector = {
  observeView(name, view) {
    views.push({
      name,
      view,
    });
    for (const event of ['render', 'attach', 'detach', 'before:destroy', 'destroy']) {
      view.on(event, () => {
        lifecycle.push(name + ':' + event);
        if (lifecycle.length > 40) {
          lifecycle.shift();
          lifecycleDropped++;
        }
      });
    }

    return view;
  },
  check(id, observed) {
    checks.set(id, {
      id,
      expected: true,
      observed: Boolean(observed),
    });
    const receipt = receiptViews.get(id);

    if (receipt) {
      receipt.getState().observed = Boolean(observed);
      receipt.render();
    }
  },
  observeRegion(name, region) {
    observedRegions.set(name, region);
  },
  showRetired(view) {
    lesson.showChildView('retiredEvidence', view);
  },
  updateObjects(name, objects) {
    objectGroups.set(name, objects);
    lesson.showChildView(
      'board',
      new ObjectBoard({
        model: {
          objects: [...objectGroups.values()].flat(),
        },
      }),
    );
  },
  reset() {
    lesson.getRegion('retiredEvidence').empty();
    objectGroups.clear();
    lesson.getRegion('board').empty();
    checks.clear();
    views.length = lifecycle.length = 0;
    lifecycleDropped = 0;
    observedRegions.clear();
    this.observeRegion('root', lesson.getRegion('experiment'));
    for (const receipt of receiptViews.values()) {
      receipt.getState().observed = null;
      receipt.render();
    }
  },
  inspect() {
    return {
      sourceSelection,
      checks: [...checks.values()],
      lifecycle,
      lifecycleDropped,
      views,
      regions: [...observedRegions].map(([name, region]) => ({
        name,
        region,
      })),
    };
  },
};

function story(text) {
  lesson.showChildView(
    'story',
    new Story({
      model: {
        text,
      },
    }),
  );
}
function explain(title, references, observation, steps = []) {
  const excerpts = [references].flat().map(({ file, symbol }) => sections[file]?.[symbol] || null);
  lesson.showChildView(
    'explanation',
    new Explanation({
      model: {
        title,
        excerpts,
        observation,
        steps,
      },
    }),
  );
}
function stage({ icon, title, question, introduction, instruction, evidence }) {
  lesson = new Lesson({
    model: {
      icon,
      title,
      introduction,
      question,
      evidence,
    },
  });
  new Region({
    el: '#app',
  }).show(lesson);
  if (instruction) story(instruction);
}
function inspectRecipe() {
  return demoInspector.inspect();
}
// The controller owns subscriptions and teaching UI. App Views never import it.
const LessonController = MnObject.extend({
  initialize({ configuration, ViewClass, viewOptions = {} }) {
    stage(configuration);
    this.region = lesson.getRegion('experiment');
    this.ViewClass = ViewClass;
    this.viewOptions = viewOptions;
    this.showApp();
  },
  showApp() {
    this.view = new this.ViewClass(this.viewOptions);
    demoInspector.observeRegion('root', this.region);
    demoInspector.observeView('shell', this.view);
    this.observe(this.view);
    this.region.show(this.view);
    this.ready?.(this.view);
  },
  reset() {
    this.region.empty();
    this.stopListening();
    demoInspector.reset();
    this.showApp();
  },
  onBeforeDestroy() {
    this.region.empty();
  },
});
export { LessonController, demoInspector, story, explain, inspectRecipe };
