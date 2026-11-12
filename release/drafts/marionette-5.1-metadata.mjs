// Prepared publication descriptor. Production integration is held behind its unset publication-date gate.
export const releaseArticle = {
  title: 'Marionette 5.1: Two more opinions.',
  description: 'Meet @mnjs/html and @mnjs/router: templates and navigation built around Marionette’s Views, Regions, and Applications. Take what you need.',
  path: '/news/marionette-5-1/',
  categories: ['Release'],
  linkLabel: 'Meet HTML and Router',
  image: {
    src: '/assets/news/marionette-5.1.webp',
    width: 1672, height: 941,
    alt: 'A small browser application model with optional HTML and routing pieces being added under Marionette-red strings.'
  },
  author: { '@type': 'Organization', name: 'Marionette project', url: 'https://marionettejs.com' },
  article: true,
  active: 'news'
};

export function releaseArticleMetadata({ publicationDate } = {}) {
  if (publicationDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate) ||
        !Number.isFinite(Date.parse(publicationDate)) ||
        new Date(publicationDate).toISOString().slice(0, 10) !== publicationDate ||
        Date.parse(publicationDate) > Date.now()) throw new Error('Use the actual publication date, not a placeholder or future date');
  }
  return {
    ...releaseArticle,
    title: `${releaseArticle.title} — Marionette`,
    headline: releaseArticle.title,
    route: releaseArticle.path,
    ...(publicationDate ? { date: publicationDate, dateLabel: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(publicationDate)) } : {})
  };
}
