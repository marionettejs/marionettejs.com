import { studies } from './case-studies.mjs';
import interview from './news/launch-interview.json' with { type: 'json' };
import { storeStory, storeStoryPage } from './news/store-story.mjs';

const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const dialogueText = text => {
  const body = escape(text).replaceAll(/\bRealWorld\b/g, '<a href="https://github.com/marionettejs/marionette-realworld-example-app">RealWorld</a>');
  if (text.startsWith('In RealWorld,')) return `${body} <a href="/case-studies/realworld/#comparison">Read the RealWorld measurements →</a>`;
  if (text.startsWith('The Vikunja Vue migration measurements')) return `${body} <a href="/case-studies/vikunja/#journey">Read the Vikunja measurements →</a>`;
  if (text.startsWith('The package includes version-matched docs')) return `${body} <a href="/docs/agents/">Work with an agent →</a> · <a href="/docs/tooling/">Application tooling →</a>`;
  return body;
};
export const categories = ['Release', 'Case Study', 'Research', 'Story'];
const tags = labels => `<ul class="news-tags" aria-label="Categories">${labels.map(label => `<li>${escape(label)}</li>`).join('')}</ul>`;
export const announcement = {
  title: 'Introducing Marionette 5',
  description: 'An independent core. A familiar structure. Paul Falgout and dot discuss the release, agent-led development, and what the working applications have shown.',
  path: '/news/introducing-marionette-5/',
  categories: ['Release', 'Story'],
  draft: true,
  date: '2026-10-10',
  dateLabel: 'October 10, 2026',
  linkLabel: 'Read the announcement',
  image: { src: '/assets/news/introducing-marionette-5.png', width: 1672, height: 941, alt: 'Fry under “You” and Bender holding tokens under “Your Agent”: “Take my tokens!” Marionette v5 available now.' }
};
export { storeStory, storeStoryPage };
export const newsPosts = [announcement, storeStory];
// Change this path to make an editorial selection; publication dates do not choose it.
export const featuredNewsPath = announcement.path;
export const sortNewsItems = entries => [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
export function selectNewsLayout(entries, featuredPath) {
  const ordered = sortNewsItems(entries);
  return { featured: ordered.find(entry => entry.path === featuredPath), chronological: ordered.filter(entry => entry.path !== featuredPath) };
}
const researchStudies = new Set(['/case-studies/realworld/', '/case-studies/vikunja/']);
export const newsItems = sortNewsItems([...newsPosts, ...studies.map(study => ({ ...study, categories: researchStudies.has(study.path) ? ['Case Study', 'Research'] : ['Case Study'] }))]);
const { featured, chronological } = selectNewsLayout(newsItems, featuredNewsPath);
const item = (entry, featured = false) => `<article class="news-card${featured ? ' news-feature' : ''}" data-news-item data-news-path="${entry.path}" data-categories="${escape(entry.categories.join('|'))}">
  <a class="news-image" href="${entry.path}" aria-label="Read ${escape(entry.title)}"><img src="${entry.image.src}" width="${entry.image.width}" height="${entry.image.height}" alt="${escape(entry.image.alt)}" ${featured ? 'fetchpriority="high"' : 'loading="lazy"'}></a>
  <div class="news-card-copy"><div class="news-meta">${tags(entry.categories)}${entry.draft ? '<span class="news-draft">Draft</span>' : ''}</div>
  <h2><a href="${entry.path}">${escape(entry.title)}</a></h2><p>${escape(entry.description)}</p>
  <div class="news-card-footer"><span>${entry.dateStatus === 'unverified' ? 'Draft · Publication date pending' : entry.draft ? entry.dateStatus === 'verified' ? `<time datetime="${entry.date}">${entry.dateLabel}</time> · Draft for review` : 'Draft for review' : `<time datetime="${entry.date}">${entry.dateLabel}</time>`}</span><a class="text-link" href="${entry.path}">${entry.linkLabel || (entry.categories.includes('Story') ? 'Read the story' : entry.draft ? 'Read the announcement' : 'Read the case study')} <span aria-hidden="true">↗</span></a></div></div>
</article>`;
export const news = {
  title: 'News — Marionette', active: 'news', description: 'Releases, case studies, research, and stories from the Marionette project.',
  body: `<section class="news-heading"><p class="eyebrow"><span class="signal-dot"></span>FROM THE MARIONETTE PROJECT</p><h1>News<span>.</span></h1><p>New releases. Working applications.<br>The conversations behind them.</p></section>
  <section class="news-feed" aria-label="News feed" data-news-feed>
    <div class="news-filter-bar" data-news-controls hidden><div class="news-filters" role="group" aria-label="Filter news by category">${['All', ...categories].map(label => `<button type="button" data-news-filter="${label}" aria-pressed="${label === 'All'}" aria-controls="news-items">${label}</button>`).join('')}</div><p class="news-count" role="status" aria-live="polite" data-news-status></p></div>
    <div id="news-items">${featured ? item(featured, true) : ''}<div data-news-chronological>${chronological.map(entry => item(entry)).join('')}</div></div>
    <p class="news-empty" data-news-empty hidden>No news in this category yet. <button type="button" data-news-reset>See all news</button>.</p>
  </section>`
};

const questions = interview.turns.filter(turn => turn.question);
export function renderDialogue(turns, breaks = new Map()) {
  let section = 0;
  let previousSpeaker;
  return turns.map((turn, index) => {
    const label = turn.speaker !== previousSpeaker ? `<p class="news-speaker">${escape(turn.speaker)}</p>` : '';
    previousSpeaker = turn.speaker;
    if (turn.question) return `${section ? '</section>' : ''}<section id="conversation-${++section}">${label}<h2>${escape(turn.text)}</h2>`;
    return `<div class="news-answer">${label}<p>${dialogueText(turn.text)}</p></div>${breaks.get(index) || ''}`;
  }).join('') + (section ? '</section>' : '');
}
const pullQuote = 'The human ergonomics of the code were about code review and not saving keystrokes.';
if (!interview.turns.some(turn => turn.speaker === 'Paul' && turn.text.includes(pullQuote))) throw new Error('Pull quote must remain an exact sentence from Paul.');
const workflowTurn = interview.turns.findIndex(turn => turn.speaker === 'Paul' && turn.text.startsWith('Those arguments still have some value.'));
const applicationTurn = interview.turns.findIndex(turn => turn.speaker === 'Paul' && turn.text.startsWith('The Vikunja Vue migration measurements'));
if (workflowTurn < 0 || applicationTurn < 0) throw new Error('Expected interview placements for the reading breaks.');
const readingBreaks = new Map([
  [workflowTurn, `<figure class="news-break news-pullquote"><blockquote><p>${escape(pullQuote)}</p></blockquote><figcaption>Paul Falgout</figcaption></figure>`],
  [applicationTurn, `<figure class="news-break news-case-capture"><a href="/assets/case-studies/vikunja/task-dark.png" aria-label="Open the full Vikunja task-details screenshot"><img src="/assets/case-studies/vikunja/task-dark.png" width="1440" height="900" loading="lazy" decoding="async" alt="Vikunja’s dark task-details screen showing the Parity task 1 fixture, project navigation, description, comments, editor, and task actions."></a><figcaption>Vikunja task details in the Marionette v5 frontend. <a href="/case-studies/vikunja/">Read the migration case study →</a></figcaption></figure>`]
]);
const dialogue = renderDialogue(interview.turns, readingBreaks);
export const announcementPage = {
  title: `${announcement.title} — Marionette`, description: announcement.description, image: announcement.image, active: 'news', article: true, date: announcement.date, draft: announcement.draft,
  contributor: { '@type': 'Person', name: 'Paul Falgout', url: 'https://github.com/paulfalgout' },
  body: `<article class="news-article">
    <header class="news-article-heading"><a class="study-back" href="/news/">← News</a><div class="news-meta">${tags(announcement.categories)}${announcement.draft ? '<span class="news-draft">Draft for review</span>' : ''}</div><h1>${announcement.title}</h1><p class="news-lede">${escape(interview.intro)}</p><p class="news-byline">A conversation with Paul Falgout and dot, an OpenAI-powered assistant${announcement.draft ? '' : ` · <time datetime="${announcement.date}">${announcement.dateLabel}</time>`}</p></header>
    <figure class="news-hero"><img src="${announcement.image.src}" width="${announcement.image.width}" height="${announcement.image.height}" alt="${escape(announcement.image.alt)}"><figcaption>You and your agent. A little structure for both.</figcaption></figure>
    <div class="news-reading"><aside class="news-contents"><nav aria-label="In this conversation"><p class="eyebrow">IN THIS CONVERSATION</p>${questions.map((turn, index) => `<a href="#conversation-${index + 1}">${escape(turn.text)}</a>`).join('')}<a href="#try-it">Try it in your project</a></nav></aside>
      <div class="news-prose">${dialogue}
      <section id="try-it"><h2>Try it in your project.</h2><p>${escape(interview.closing)}</p><ul class="news-next"><li><a href="/docs/quick-start/">Get started with Marionette 5 →</a></li><li><a href="/docs/agent-start/">Equip your coding agent →</a></li><li><a href="/docs/guides/migration/">Bring an existing Marionette app forward →</a></li></ul></section>
      </div>
    </div>
  </article>`
};
