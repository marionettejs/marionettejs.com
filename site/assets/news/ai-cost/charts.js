// Shared by static rendering and browser enhancement: one set of values and ordering.
export const metrics = [
  { id: 'cost', title: 'Hypothetical API proxy per build', unit: 'USD proxy', digits: 4, value: b => b.generation.conditional_api_equivalent_usd },
  { id: 'time', title: 'Generation time per build', unit: 'minutes', digits: 2, value: b => b.generation.duration_seconds / 60 },
  { id: 'tokens', title: 'Tokens per build', unit: 'million tokens', digits: 3, value: b => b.generation.chart_token_total / 1e6 },
  { id: 'javascript', title: 'Home JavaScript transferred', unit: 'KiB', digits: 2, value: b => b.home.javascript_transferred_bytes / 1024 },
  { id: 'tbt', title: 'Home Total Blocking Time (TBT)', unit: 'ms', digits: 3, value: b => b.home.tbt_ms },
  { id: 'lcp', title: 'Home Largest Contentful Paint (LCP)', unit: 'ms', digits: 3, value: b => b.home.lcp_ms },
  { id: 'lines', title: 'Formatter-normalized nonblank source lines', unit: 'lines', digits: 1, value: b => b.normalized_lines }
];
export const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const number = (value, digits) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export function summarize(values) {
  if (!values.length || values.some(v => !Number.isFinite(v))) throw new Error('Missing or invalid chart value');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  return { median: sorted.length % 2 ? sorted[Math.floor(middle)] : (sorted[middle - 1] + sorted[middle]) / 2, min: sorted[0], max: sorted.at(-1) };
}
export function rowsFor(builds, metric) {
  return [...new Set(builds.map(b => b.framework))].map(framework => {
    const observations = builds.filter(b => b.framework === framework).map(b => ({ build: b.build, value: metric.value(b) }));
    return { framework, observations, ...summarize(observations.map(b => b.value)) };
  }).sort((a, b) => a.median - b.median || a.framework.localeCompare(b.framework));
}
export function sortRows(rows, order) {
  if (order === 'original') return [...rows];
  const authored = new Map(rows.map((row, index) => [row.framework, index]));
  return [...rows].sort((a, b) => order === 'name' ? a.framework.localeCompare(b.framework) : (order === 'descending' ? b.median - a.median : a.median - b.median) || authored.get(a.framework) - authored.get(b.framework));
}
const summaryText = (row, metric) => `${number(row.median, metric.digits)} (${number(row.min, metric.digits)}–${number(row.max, metric.digits)})`;
export function tableRows(rows, metric) {
  return rows.map(row => `<tr data-framework="${esc(row.framework)}" data-median="${row.median}" data-min="${row.min}" data-max="${row.max}"><th scope="row">${esc(row.framework)}</th><td>${summaryText(row, metric)}</td>${row.observations.map(o => `<td data-build="${esc(o.build)}" data-value="${o.value}">${number(o.value, metric.digits)}</td>`).join('')}</tr>`).join('');
}
export function plotRows(rows, metric) {
  // Zero-based and stable across sort modes. Pad enough for endpoint glyphs.
  const observedMaximum = Math.max(...rows.map(row => row.max));
  const target = (observedMaximum > 0 ? observedMaximum : 1) * 1.04;
  const magnitude = 10 ** Math.floor(Math.log10(target / 4));
  const step = [1, 2, 2.5, 5, 10].find(n => n * magnitude >= target / 4) * magnitude;
  const maximum = Math.ceil(target / step) * step;
  const tickDigits = Math.max(0, -Math.floor(Math.log10(step)) + (String(step).endsWith('5') ? 1 : 0));
  const ticks = Array.from({ length: Math.round(maximum / step) + 1 }, (_, i) => i * step);
  return `<div class="benchmark-axis" aria-hidden="true">${ticks.map((tick, i) => `<span>${number(tick, tickDigits)}${i === ticks.length - 1 ? ` ${esc(metric.unit)}` : ''}</span>`).join('')}</div>` + rows.map(row => {
    const pct = value => 100 * value / maximum;
    const observed = row.observations.map(o => `${esc(o.build)}: ${number(o.value, metric.digits)} ${metric.unit}`).join('; ');
    return `<div class="benchmark-row" data-framework="${esc(row.framework)}" data-median="${row.median}" data-min="${row.min}" data-max="${row.max}">
      <strong>${esc(row.framework)}</strong><span class="benchmark-value">${summaryText(row, metric)} <span class="benchmark-deltas" aria-hidden="true">−${number(row.median - row.min, metric.digits)} / +${number(row.max - row.median, metric.digits)}</span></span>
      <div class="benchmark-track" style="background-size:${100 * step / maximum}% 100%" role="img" aria-label="${esc(row.framework)}: median ${number(row.median, metric.digits)} ${esc(metric.unit)}, range ${number(row.min, metric.digits)} to ${number(row.max, metric.digits)}. ${esc(observed)}">
        <span class="benchmark-bar" style="width:${pct(row.median)}%" aria-hidden="true"></span>
        <span class="benchmark-range" style="left:${pct(row.min)}%;width:${pct(row.max - row.min)}%" aria-hidden="true"></span>
        ${row.observations.map(o => `<span class="benchmark-dot benchmark-${esc(o.build)}" data-build="${esc(o.build)}" data-value="${o.value}" style="left:${pct(o.value)}%" aria-hidden="true" title="${esc(o.build)}: ${number(o.value, metric.digits)} ${esc(metric.unit)}"></span>`).join('')}
        <span class="benchmark-median" style="left:${pct(row.median)}%" aria-hidden="true"></span>
      </div></div>`;
  }).join('');
}
export function renderChart(builds, metric) {
  const rows = rowsFor(builds, metric);
  return `<figure class="benchmark" data-benchmark="${metric.id}" aria-labelledby="${metric.id}-title">
    <h3 id="${metric.id}-title">${metric.title}</h3>
    ${metric.id === 'cost' ? '<p class="benchmark-proxy-note">Calculated under Standard, short-context API assumptions. Not measured cost, subscription spending or an invoice. Actual dollar charges are unavailable. <a href="#price-method">Assumptions and missing accounting →</a></p>' : ''}
    <p class="benchmark-key"><span aria-hidden="true">◆</span> Median · line: minimum–maximum · circles: b1–b4</p>
    <div id="${metric.id}-plot" class="benchmark-plot" data-plot hidden>${plotRows(rows, metric)}</div>
    <div id="${metric.id}-table" class="benchmark-table" data-table tabindex="0" role="region" aria-label="${metric.title} data, scroll horizontally">
      <table><caption>${metric.title} (${metric.unit}). Four builds per framework; median (minimum–maximum).</caption><thead><tr><th scope="col">Framework</th><th scope="col">Median (range)</th>${['b1', 'b2', 'b3', 'b4'].map(b => `<th scope="col">${b}</th>`).join('')}</tr></thead><tbody>${tableRows(rows, metric)}</tbody></table>
    </div>
    <figcaption>All four independent builds. ${metric.id === 'cost' ? 'Range of calculated proxies under one hypothetical tariff scenario, not observed charges or an uncertainty interval.' : 'Ranges describe observations; they are not confidence intervals.'}${['javascript', 'tbt', 'lcp'].includes(metric.id) ? ' Each build value is its saved median of five mobile home Lighthouse samples; Nuxt b3 uses the corrected measurement.' : ''}</figcaption>
    <div class="benchmark-controls" data-controls hidden><label for="${metric.id}-sort">Sort</label> <select id="${metric.id}-sort" aria-controls="${metric.id}-plot ${metric.id}-table"><option value="original">Original order</option><option value="name">Framework, A–Z</option><option value="ascending">${metric.unit}, low to high</option><option value="descending">${metric.unit}, high to low</option></select><label class="benchmark-toggle"><input type="checkbox" aria-controls="${metric.id}-plot ${metric.id}-table"> Show as table</label></div>
    <p class="benchmark-status" role="status" aria-live="polite" data-status></p>
  </figure>`;
}

export function enhanceCharts(root, builds) {
  for (const figure of root.querySelectorAll('[data-benchmark]')) {
    const metric = metrics.find(m => m.id === figure.dataset.benchmark);
    const original = rowsFor(builds, metric);
    const plot = figure.querySelector('[data-plot]');
    const table = figure.querySelector('[data-table]');
    const select = figure.querySelector('select');
    const checkbox = figure.querySelector('input');
    const update = () => {
      const rows = sortRows(original, select.value);
      plot.innerHTML = plotRows(rows, metric);
      table.querySelector('tbody').innerHTML = tableRows(rows, metric);
      plot.hidden = checkbox.checked;
      table.hidden = !checkbox.checked;
      figure.querySelector('[data-status]').textContent = `${metric.title}: ${checkbox.checked ? 'table' : 'chart'}, ${select.selectedOptions[0].textContent}.`;
    };
    select.addEventListener('change', update);
    checkbox.addEventListener('change', update);
    figure.querySelector('[data-controls]').hidden = false;
    plot.hidden = false;
    table.hidden = true;
  }
}
