import { escapeHtml as escape } from '../../scripts/html.mjs';
export const storeStory = {
  title: 'Wear your very specific opinions.',
  description: 'Marionette has merch. Your laptop has room for one more opinion. Help support the work, with or without sleeves.',
  path: '/news/wear-your-very-specific-opinions/',
  categories: ['Story'],
  date: '2026-09-08',
  dateStatus: 'verified',
  dateLabel: 'September 8, 2026',
  dateTimezone: 'UTC',
  dateSource: 'https://x.com/marionettejs/status/2097394994114101568',
  sourceCreatedAt: '2026-09-08T18:41:48.000Z',
  sourceParent: 'https://x.com/marionettejs/status/1166244737969319936',
  dateVerification: 'Public X syndication metadata; parent is the 2019 OSS/ad-free statement, and this reply links the merch store.',
  image: { src: '/assets/store-header.png', width: 1920, height: 800, alt: 'Marionette hoodies, a T-shirt, cap, mug, and stickers hanging from red puppet strings.' }
};

export function storyPage(story = storeStory) {
  return {
  title: `${escape(story.title)} — Marionette`,
  description: story.description,
  image: story.image,
  date: story.date,
  article: true,
  active: 'news',
  body: `<article class="news-article">
    <header class="news-article-heading"><a class="study-back" href="/news/">← News</a><div class="news-meta"><ul class="news-tags" aria-label="Categories"><li>Story</li></ul></div><h1>${escape(story.title)}</h1><p class="news-lede">Apparently, explicit ownership now extends to your wardrobe.</p><p class="news-byline"><time datetime="${escape(story.date)}">${escape(story.dateLabel)}</time> · <a href="${escape(story.dateSource)}">The store announcement</a></p></header>
    <figure class="news-hero"><img src="${escape(story.image.src)}" width="${story.image.width}" height="${story.image.height}" alt="${escape(story.image.alt)}"></figure>
    <div class="news-reading news-story-reading"><div class="news-prose">
      <p>Marionette has a <a href="https://store.marionettejs.com/">merch store</a>. There are tees, hoodies, hats, mugs, and stickers, including “No Backbone. Still Opinionated.” for anyone whose architectural preferences need a wider audience. Your laptop has room for one more opinion.</p>
      <p>The store and <a href="https://github.com/sponsors/paulfalgout">GitHub sponsorship</a> are two ways to help support Marionette’s future development. Sponsorship supports maintenance, documentation, examples, and the human review that keeps the AI-generated enthusiasm in check.</p>
      <p>It also helps cover the token bill. The machines, regrettably, have not agreed to volunteer.</p>
      <p><a href="https://store.marionettejs.com/">Pick up something from the store</a> or <a href="https://github.com/sponsors/paulfalgout">become a sponsor</a>. Marionette remains free and open source. The wardrobe situation is yours to manage.</p>
      <p><a href="https://marionettejs.com/thanks/">More ways to support Marionette →</a></p>
    </div></div>
  </article>`
  };
}
export const storeStoryPage = storyPage();
