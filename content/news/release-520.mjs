import { marked } from 'marked';
import { escapeHtml as escape } from '../../scripts/html.mjs';

export const release520Post = {
  title: 'Marionette 5.2.0: Meet Skeletor.',
  description: 'Marionette 5.2.0 adds support for Skeletor’s Models and Collections and introduces a DOM API for trusted raw markup.',
  path: '/news/marionette-5-2/',
  categories: ['Release'],
  date: '2026-11-22',
  dateLabel: 'November 22, 2026',
  dateSource: 'https://github.com/marionettejs/marionette/releases/tag/v5.2.0',
  dateStatus: 'verified',
  linkLabel: 'Meet Skeletor',
  image: {
    src: '/assets/news/Skeletor-Marionette-Hero.webp',
    width: 1600, height: 900,
    alt: 'Skeletor as a marionette, holding a backbone on a stage framed by red curtains.'
  },
  author: { '@type': 'Organization', name: 'Marionette project', url: 'https://marionettejs.com' },
  article: true,
  active: 'news'
};

const reading = marked.parse(`Backbone stopped being a core dependency in Marionette 5.0. It didn’t stop being useful. In 5.2, there’s another option for people who like Backbone’s Models and Collections: Skeletor. Apparently we do have a policy about skeletons.

## Who might want Skeletor?

[Skeletor](https://github.com/conversejs/skeletor) is a TypeScript-first data library that powers [Converse.js](https://conversejs.org/), an open-source XMPP chat client. It takes the familiar Model and Collection ideas from Backbone and adds typed attributes, computed properties, and persistence options such as IndexedDB and REST. It leaves Views and routing to the application.

It’s worth a look if you’re starting a TypeScript app and want model objects that know when their data changes, or if you’re trying a new data layer in one feature of an existing Backbone app. For example, a contact model can store a first and last name and give the View a computed display name without adding that extra field to what gets saved.

The optional \`@mnjs/adapters/skeletor\` adapter connects Marionette Views and CollectionViews to Skeletor 4.0.3. Templates can read computed values alongside stored attributes, and ordinary collection changes keep the child Views for models that are still present. If you’re bringing a Backbone app to Marionette 5, you can keep your existing Models and Collections through the Backbone adapter and try Skeletor in a new feature.

## One small DOM API

\`DomApi.setUnsafeHtml(el, markup)\` gives integrations an explicit way to put trusted raw markup, such as an SVG icon string, into a container they own. It doesn’t sanitize the string or clean up Views. Keep using your renderer for the content it owns.

Marionette, Utils, Radio, Data, and Adapters move to 5.2.0 together. HTML, Router, and the test helpers keep their own versions.

[Read the 5.2.0 release notes](https://github.com/marionettejs/marionette/releases/tag/v5.2.0) or [see the Skeletor adapter example](https://github.com/marionettejs/marionette/blob/v5.2.0/docs/packages/adapters.md#skeletor).
`);

export const release520Page = {
  ...release520Post,
  title: `${release520Post.title} — Marionette`,
  headline: release520Post.title,
  body: `<article class="news-article news-release">
    <header class="news-article-heading"><a class="study-back" href="/news/">← News</a><div class="news-meta"><ul class="news-tags" aria-label="Categories"><li>Release</li></ul></div><h1>${escape(release520Post.title)}</h1><p class="news-lede">${escape(release520Post.description)}</p><p class="news-byline">Marionette project · <time datetime="${escape(release520Post.date)}">${escape(release520Post.dateLabel)}</time></p></header>
    <figure class="news-hero"><img src="${escape(release520Post.image.src)}" width="${release520Post.image.width}" height="${release520Post.image.height}" alt="${escape(release520Post.image.alt)}"></figure>
    <div class="news-reading news-story-reading"><div class="news-prose">${reading}</div></div>
  </article>`
};
