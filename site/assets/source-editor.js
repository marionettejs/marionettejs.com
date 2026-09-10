import { inspectSource } from './demo-project-tools.js';

// The textarea owns input, selection, undo and scrolling. The inert layers only paint.
export function createSourceEditor(editor, file) {
  const wrapper = document.createElement('div');
  wrapper.className = 'source-editor';
  const toolbar = document.createElement('div');
  toolbar.className = 'source-editor-toolbar';
  const symbols = document.createElement('select');
  symbols.setAttribute('aria-label', 'Jump to method in ' + file);
  const lineForm = document.createElement('form');
  const lineLabel = document.createElement('label');
  lineLabel.textContent = 'Line ';
  const lineInput = document.createElement('input');
  lineInput.type = 'number';
  lineInput.min = '1';
  lineInput.value = '1';
  lineInput.required = true;
  lineInput.setAttribute('aria-label', 'Go to line in ' + file);
  lineLabel.append(lineInput);
  const go = document.createElement('button');
  go.type = 'submit';
  go.textContent = 'Go';
  lineForm.append(lineLabel, go);
  const position = document.createElement('span');
  position.className = 'source-editor-position';
  toolbar.append(symbols, lineForm, position);
  const viewport = document.createElement('div');
  viewport.className = 'source-editor-viewport';
  const gutter = document.createElement('div');
  gutter.className = 'source-editor-gutter';
  gutter.setAttribute('aria-hidden', 'true');
  const numbers = document.createElement('div');
  gutter.append(numbers);
  const surface = document.createElement('div');
  surface.className = 'source-editor-text';
  const highlight = document.createElement('pre');
  highlight.className = 'source-editor-highlight';
  highlight.setAttribute('aria-hidden', 'true');
  const paintedCode = document.createElement('code');
  highlight.append(paintedCode);
  editor.before(wrapper);
  surface.append(highlight, editor);
  viewport.append(gutter, surface);
  wrapper.append(toolbar, viewport);
  editor.wrap = 'off';
  editor.setAttribute('autocapitalize', 'off');
  editor.setAttribute('autocorrect', 'off');

  let renderedValue, sections = [], selectedLine;
  function syncScroll() {
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
    numbers.style.transform = `translateY(${-editor.scrollTop}px)`;
  }
  function showPosition() {
    const before = editor.value.slice(0, editor.selectionStart);
    const line = before.split('\n').length;
    const column = before.length - before.lastIndexOf('\n');
    position.textContent = `Ln ${line}, Col ${column}`;
    if (selectedLine !== line) {
      numbers.children[selectedLine - 1]?.removeAttribute('data-current');
      numbers.children[line - 1]?.setAttribute('data-current', '');
      selectedLine = line;
    }
  }
  function refresh() {
    if (renderedValue === editor.value) {
      showPosition();
      syncScroll();
      return;
    }
    renderedValue = editor.value;
    const result = inspectSource(renderedValue, file.endsWith('.css') ? 'css' : 'javascript');
    sections = result.symbols;
    // inspectSource escapes every source fragment before adding fixed token markup.
    paintedCode.innerHTML = result.highlighted + '\n';
    const count = renderedValue.split('\n').length;
    numbers.replaceChildren(...Array.from({ length: count }, (_, index) => {
      const number = document.createElement('span');
      number.textContent = index + 1;
      return number;
    }));
    lineInput.max = count;
    const previous = symbols.value;
    const prompt = new Option(sections.length ? 'Jump to a method or definition…' : 'Use line navigation while editing', '');
    symbols.replaceChildren(prompt, ...sections.map(section => new Option(`${section.symbol} · ${section.line}`, section.symbol)));
    symbols.disabled = !sections.length;
    symbols.value = sections.some(section => section.symbol === previous) ? previous : '';
    selectedLine = undefined;
    showPosition();
    syncScroll();
  }
  function goToLine(line, endLine = line) {
    refresh();
    const lines = editor.value.split('\n');
    line = Math.max(1, Math.min(lines.length, line));
    endLine = Math.max(line, Math.min(lines.length, endLine));
    const start = lines.slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0);
    const end = start + lines.slice(line - 1, endLine).join('\n').length;
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(start, end);
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
    editor.scrollTop = Math.max(0, (line - 3) * lineHeight);
    editor.scrollLeft = 0;
    lineInput.value = line;
    showPosition();
    syncScroll();
    wrapper.scrollIntoView({ block: 'nearest' });
  }
  function goToSymbol(symbol) {
    refresh();
    const section = sections.find(section => section.symbol === symbol);
    if (!section) return;
    symbols.value = symbol;
    goToLine(section.line, section.endLine);
    return section;
  }
  symbols.addEventListener('change', () => goToSymbol(symbols.value));
  lineForm.addEventListener('submit', event => {
    event.preventDefault();
    symbols.value = '';
    goToLine(Number(lineInput.value));
  });
  editor.addEventListener('input', refresh);
  editor.addEventListener('scroll', syncScroll);
  for (const event of ['click', 'keyup', 'select', 'focus']) editor.addEventListener(event, showPosition);
  refresh();
  return { refresh, goToSymbol };
}
