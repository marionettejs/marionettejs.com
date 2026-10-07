export function comparisonPercent(clientX, left, width) {
  return width > 0 ? Math.round(Math.max(0, Math.min(100, (clientX - left) / width * 100))) : 50;
}

export function installImageComparisons(root = document) {
  for (const comparison of root.querySelectorAll('[data-image-comparison]')) {
    const frame = comparison.querySelector('[data-comparison-frame]');
    const input = comparison.querySelector('[data-comparison-range]');
    const output = comparison.querySelector('[data-comparison-output]');
    const handle = comparison.querySelector('[data-comparison-handle]');
    let pointerId = null;
    const update = () => {
      const value = Number(input.value);
      frame.style.setProperty('--comparison-split', `${value}%`);
      output.value = `${value}% ${comparison.dataset.comparisonBeforeName} / ${100 - value}% ${comparison.dataset.comparisonAfterName}`;
      input.setAttribute('aria-valuetext', output.value);
    };
    const move = event => {
      const bounds = frame.getBoundingClientRect();
      input.value = comparisonPercent(event.clientX, bounds.left, bounds.width);
      update();
    };
    input.addEventListener('input', update);
    handle.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      pointerId = event.pointerId;
      handle.setPointerCapture(pointerId);
      input.focus({ preventScroll: true });
      move(event);
    });
    handle.addEventListener('pointermove', event => {
      if (event.pointerId === pointerId) move(event);
    });
    const endDrag = () => { pointerId = null; };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    handle.addEventListener('lostpointercapture', endDrag);
    update();
    for (const selector of ['[data-comparison-before]', '[data-comparison-before-label]', '[data-comparison-divider]', '[data-comparison-handle]', '[data-comparison-controls]']) comparison.querySelector(selector).hidden = false;
  }
}
