import { codeTabs, initialCodePanels, isFocusedCodeLine } from '../site/assets/hero-code.js';
import { escapeHtml as escape } from '../scripts/html.mjs';

const line = (text, classes = '', attributes = '') => `<span class="hero-code-line ${classes}"${attributes}>${escape(text)}</span>`;
function sketch(frame) {
  const blank = '<span class="hero-code-line hero-code-blank" aria-hidden="true"></span>';
  return (frame.source.before ? line(frame.source.before, 'hero-code-muted') + blank : '') + frame.source.methods.map(method =>
    (method.label ? line(method.label, 'hero-code-muted') : '') +
    `<span class="hero-code-method" data-active="${method.name === frame.active}">${method.lines.map(text =>
      line(text, '', ` data-focus="${isFocusedCodeLine(method.name, frame.active, text)}"`)).join('')}</span>` + blank
  ).join('') + (frame.source.after ? line(frame.source.after, 'hero-code-muted') : '');
}

// The static frame is the same opening View the Application presents first.
// Controls become available when the interactive owner mounts; the code itself
// remains readable, selectable and keyboard-scrollable without JavaScript.
export function openingHeroCode() {
  const panels = initialCodePanels();
  return `<div class="hero-code" data-static-code>
    <div class="hero-code-heading"><span><img class="hero-code-mark" src="/assets/mark.svg" width="19" height="20" alt=""><i aria-hidden="true"></i> FOLLOW THE STRINGS</span>
      <button type="button" class="hero-replay" aria-label="Replay header startup" disabled title="Available with JavaScript">Replay startup <span aria-hidden="true">↻</span></button></div>
    <div class="hero-code-tabs" role="tablist" aria-label="Hero code sketches, interactive with JavaScript">${codeTabs.map(tab =>
      `<button type="button" role="tab" id="hero-initial-tab-${tab.id}" aria-selected="${tab.id === 'view'}" aria-controls="hero-initial-panel-${tab.id}" disabled title="Available with JavaScript"><span class="hero-file-icon" aria-hidden="true">JS</span>${tab.label}</button>`).join('')}</div>
    ${codeTabs.map(tab => `<section class="hero-code-panel" role="tabpanel" id="hero-initial-panel-${tab.id}" aria-labelledby="hero-initial-tab-${tab.id}"${tab.id === 'view' ? '' : ' hidden'}>
      <div class="hero-code-file"><span>${escape(panels[tab.id].source.file.split(' · ')[1])}</span><small>Marionette + @mnjs/html</small></div>
      <pre class="hero-code-source" tabindex="0" aria-label="Illustrative Marionette code: ${tab.label}"><code>${sketch(panels[tab.id])}</code></pre>
    </section>`).join('')}
    <div class="hero-trace-footer"><span class="hero-trace-step">Show the heading</span><span class="hero-trace-count">1 step</span></div>
    <div class="hero-code-follow"><span>Opening View</span></div>
    <p class="hero-code-note">Illustrative code, with the plumbing left out. Enable JavaScript to follow the walkthrough.</p>
  </div>`;
}
