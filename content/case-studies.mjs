// Shared static structure: add future studies to this list and their sections below.
import { realworld } from './case-studies/realworld.mjs';
import { roundingwell } from './case-studies/roundingwell.mjs';
import { vikunja } from './case-studies/vikunja.mjs';

export const studies = [realworld, roundingwell, vikunja];
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const caseStudies = {
  title: 'Case Studies',
  path: '/case-studies/',
  image: realworld.image,
  description: 'Real applications, development decisions, and measured results with Marionette.',
  active: 'case-studies',
  body: `<section class="article-heading"><p class="eyebrow">CASE STUDIES</p><h1>Follow the work.</h1><p>Real applications. Concrete decisions. Results you can inspect.</p></section>
  <div class="study-index">${studies.map(study => `<article class="study-card"><a class="study-card-image" href="${study.path}" aria-label="Read ${escape(study.title)}"><img src="${study.image.src}" width="${study.image.width}" height="${study.image.height}" alt="${escape(study.image.alt)}"></a><div><p class="eyebrow">${study.label}</p><h2><a href="${study.path}">${study.title}</a></h2><p>${study.description}</p><a class="text-link" href="${study.path}">Read the case study →</a></div></article>`).join('')}</div>`
};

const studyHero = study => {
  const image = study.image;
  return `<figure class="study-hero"><a href="${image.src}" aria-label="Open the full hero image"><img src="${image.src}" width="${image.width}" height="${image.height}" alt="${escape(image.alt)}"></a><figcaption>${escape(image.caption)} · <a href="${image.src}">View full size</a></figcaption></figure>`;
};

export function studyPage(study) {
  return {
    ...study,
    title: `${study.title} — Marionette`,
    headline: study.title,
    active: 'case-studies',
    article: true,
    author: { '@type': 'Organization', name: 'Marionette project', url: 'https://marionettejs.com' },
    body: `<article class="study">
      <header class="article-heading study-heading">
        <a class="study-back" href="/news/">← News</a>
        ${study.disclosure || ''}
        <p class="eyebrow">${study.label}</p><h1>${study.title}</h1>
        <p class="study-conclusion">${study.conclusion}</p>
        <p class="study-byline">Published by the Marionette project · <time datetime="${study.date}">${study.dateLabel}</time></p>
      </header>
      ${studyHero(study)}
      <div class="article-layout study-layout"><nav class="article-nav" aria-label="On this page"><p class="eyebrow">IN THIS STUDY</p>${study.sections.map(section => `<a href="#${section.id}">${section.label}</a>`).join('')}<a href="#methodology">Evidence &amp; methodology</a></nav>
        <div class="prose study-prose">${study.sections.map(section => `<section id="${section.id}"><h2>${section.title}</h2>${section.body}</section>`).join('')}${study.methodology}</div>
      </div>
    </article>`
  };
}
