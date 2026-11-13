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
function openingHeroCode(prefix) {
  const panels = initialCodePanels();
  return `<div class="hero-code" data-static-code>
    <div class="hero-code-heading"><span><img class="hero-code-mark" src="/assets/mark.svg" width="19" height="20" alt=""><i aria-hidden="true"></i> FOLLOW THE STRINGS</span>
      <button type="button" class="hero-replay" disabled title="Available with JavaScript">Replay startup <span aria-hidden="true">↻</span></button></div>
    <div class="hero-code-tabs" role="tablist" aria-label="Hero code sketches, interactive with JavaScript">${codeTabs.map(tab =>
      `<button type="button" role="tab" id="${prefix}-tab-${tab.id}" aria-selected="${tab.id === 'view'}" aria-controls="${prefix}-panel-${tab.id}" disabled title="Available with JavaScript"><span class="hero-file-icon" aria-hidden="true">JS</span>${tab.label}</button>`).join('')}</div>
    ${codeTabs.map(tab => `<section class="hero-code-panel" role="tabpanel" id="${prefix}-panel-${tab.id}" aria-labelledby="${prefix}-tab-${tab.id}"${tab.id === 'view' ? '' : ' hidden'}>${tab.id !== 'view' ? '' : `
      <div class="hero-code-file"><span>${escape(panels[tab.id].source.file.split(' · ')[1])}</span><small>Marionette + @mnjs/html</small></div>
      <pre class="hero-code-source" tabindex="0" aria-label="Illustrative Marionette code: ${tab.label}"><code>${sketch(panels[tab.id])}</code></pre>
    `}</section>`).join('')}
    <div class="hero-trace-footer"><span class="hero-trace-step">Show the heading</span><span class="hero-trace-count">1 step</span></div>
    <div class="hero-code-follow"><span>Opening View</span></div>
    <p class="hero-code-note">Illustrative code, with the plumbing left out. Enable JavaScript to follow the walkthrough.</p>
  </div>`;
}

export function openingHeroRig() {
  // Native disclosures work before any script arrives. Responsive alternatives
  // keep the approved compact default closed without inline scripts or UA sniffing.
  return ['wide', 'compact'].map(size => `<details class="rig hero-live-code hero-code-fallback-${size}" data-code-fallback${size === 'wide' ? ' open' : ''}>
    <summary class="hero-code-toggle">Explore the code <span aria-hidden="true">＋</span></summary>
    <section class="demo hero-code-frame" aria-label="An illustrative Marionette sketch">${openingHeroCode('hero-initial-' + size)}</section>
    <p class="rig-caption">An illustrative sketch. <span>A few strings worth following.</span></p>
  </details>`).join('');
}
