const search = new window.PagefindUI({ element: '#docs-search', showSubResults: true, showImages: false, bundlePath: '/pagefind/' });
search.triggerFilters({ Audience: ['Consumer'] });

for (const button of document.querySelectorAll('[data-copy-markdown]')) {
  button.addEventListener('click', async () => {
    const status = button.parentElement.querySelector('.copy-status');
    try {
      const response = await fetch(button.dataset.copyMarkdown);
      if (!response.ok) throw new Error('Markdown unavailable');
      await navigator.clipboard.writeText(await response.text());
      status.textContent = 'Markdown copied.';
    } catch {
      status.textContent = 'Copy unavailable. Use Read Markdown to select the text.';
    }
  });
}

const menu = document.querySelector('.docs-menu');
if (menu) {
  const smallScreen = window.matchMedia('(max-width: 760px)');
  const updateMenu = () => { menu.open = !smallScreen.matches; };
  updateMenu();
  smallScreen.addEventListener('change', updateMenu);
}

const searchElement = document.querySelector('#docs-search');
const searchInput = searchElement.querySelector('input');
const sizeSearch = () => {
  if ('dismissed' in searchElement.dataset || !searchInput.value) return;
  const viewport = window.visualViewport;
  const viewportTop = viewport?.offsetTop || 0;
  const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
  const bounds = searchElement.getBoundingClientRect();
  const below = Math.max(0, viewportBottom - bounds.bottom - 26);
  const above = Math.max(0, bounds.top - viewportTop - 26);
  const opensAbove = below < 160 && above > below;
  searchElement.dataset.placement = opensAbove ? 'above' : 'below';
  searchElement.style.setProperty('--docs-search-available-height', `${opensAbove ? above : below}px`);
};
const revealSearch = () => {
  delete searchElement.dataset.dismissed;
  sizeSearch();
};
window.addEventListener('resize', sizeSearch, { passive: true });
window.addEventListener('scroll', sizeSearch, { passive: true, capture: true });
window.visualViewport?.addEventListener('resize', sizeSearch, { passive: true });
window.visualViewport?.addEventListener('scroll', sizeSearch, { passive: true });
searchInput.addEventListener('input', revealSearch);
searchInput.addEventListener('focus', revealSearch);
searchInput.addEventListener('click', revealSearch);
searchElement.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  searchInput.focus();
  searchElement.dataset.dismissed = '';
});
document.addEventListener('pointerdown', event => {
  if (!searchElement.contains(event.target)) searchElement.dataset.dismissed = '';
});
