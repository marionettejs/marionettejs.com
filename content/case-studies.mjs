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
  if (!image.comparison) return `<figure class="study-hero"><a href="${image.src}" aria-label="Open the full hero image"><img src="${image.src}" width="${image.width}" height="${image.height}" alt="${escape(image.alt)}"></a><figcaption>${escape(image.caption)} · <a href="${image.src}">View full size</a></figcaption></figure>`;
  const { beforeLabel, afterLabel } = image.comparison;
  const src = escape(image.src);
  return `<figure class="study-hero study-comparison-hero" data-image-comparison data-comparison-before-name="${escape(beforeLabel)}" data-comparison-after-name="${escape(afterLabel)}">
    <div class="study-comparison-frame" data-comparison-frame>
      <div class="study-comparison-crop"><img src="${src}" width="${image.width}" height="${image.height}" alt="${escape(afterLabel)} task view from the authentic paired capture"></div>
      <div class="study-comparison-crop study-comparison-before" data-comparison-before hidden><img src="${src}" width="${image.width}" height="${image.height}" alt="${escape(beforeLabel)} task view from the same authentic paired capture"></div>
      <span class="study-comparison-label study-comparison-label-before" data-comparison-before-label hidden>${escape(beforeLabel)}</span><span class="study-comparison-label study-comparison-label-after">${escape(afterLabel)}</span>
      <div class="study-comparison-divider" data-comparison-divider hidden></div><button type="button" class="study-comparison-handle" data-comparison-handle tabindex="-1" aria-hidden="true" hidden>↔</button>
    </div>
    <div class="study-comparison-controls" data-comparison-controls hidden><label for="study-comparison-range">Reveal ${escape(beforeLabel)}</label><input id="study-comparison-range" type="range" min="0" max="100" step="1" value="50" data-comparison-range aria-describedby="study-comparison-help"><output for="study-comparison-range" data-comparison-output></output><p id="study-comparison-help">Drag the divider, or use the slider with touch or ← / →, Home and End.</p></div>
    <figcaption>${escape(image.caption)} <a href="${src}">Open the original paired capture</a>. The Marionette view remains readable without JavaScript.</figcaption>
  </figure>`;
};

export function studyPage(study) {
  return {
    ...study,
    active: 'case-studies',
    body: `<article class="study">
      <header class="article-heading study-heading">
        <a class="study-back" href="/case-studies/">← Case Studies</a>
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
