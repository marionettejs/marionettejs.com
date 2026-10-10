const feed = document.querySelector('[data-news-feed]');
if (feed) {
  const buttons = [...feed.querySelectorAll('[data-news-filter]')];
  const items = [...feed.querySelectorAll('[data-news-item]')];
  const allowed = new Set(buttons.map(button => button.dataset.newsFilter));
  const apply = category => {
    if (!allowed.has(category)) category = 'All';
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.newsFilter === category));
    let count = 0;
    for (const item of items) {
      item.hidden = category !== 'All' && !item.dataset.categories.split('|').includes(category);
      if (!item.hidden) count++;
    }
    feed.querySelector('[data-news-status]').textContent = `${count} ${count === 1 ? 'story' : 'stories'}${category === 'All' ? '' : ` · ${category}`}`;
    feed.querySelector('[data-news-empty]').hidden = count !== 0;
  };
  const select = category => {
    const url = new URL(location.href);
    if (category === 'All') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    if (url.href !== location.href) history.pushState(null, '', url);
    apply(category);
  };
  for (const button of buttons) button.addEventListener('click', () => select(button.dataset.newsFilter));
  feed.querySelector('[data-news-reset]').addEventListener('click', () => {
    select('All');
    buttons[0].focus();
  });
  const restore = () => apply(new URL(location.href).searchParams.get('category') || 'All');
  addEventListener('popstate', restore);
  restore();
  feed.querySelector('[data-news-controls]').hidden = false;
}
