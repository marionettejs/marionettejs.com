import { test } from 'node:test';
import assert from 'node:assert/strict';
import { studyPage } from '../content/case-studies.mjs';
import { comparisonPercent } from '../site/assets/image-comparison.js';
import { vikunja } from '../content/case-studies/vikunja.mjs';

test('the Vue migration uses shared hero escaping and image metadata', () => {
  const image = { ...vikunja.image, width: 640, height: 320,
    alt: 'Task "details" & <actions>', caption: 'Vue & Marionette <capture>' };
  const { body } = studyPage({ ...vikunja, image: { ...image, comparison: undefined } });
  assert.match(body, /width="640" height="320" alt="Task &quot;details&quot; &amp; &lt;actions&gt;"/);
  assert.match(body, /Vue &amp; Marionette &lt;capture&gt;/);
  assert.match(body, /aria-label="Open the full hero image"/);
  assert.doesNotMatch(body, /<actions>|<capture>/);
});

test('comparison pointer positions use one frame and clamp at its bounds', () => {
  assert.equal(comparisonPercent(100, 100, 720), 0);
  assert.equal(comparisonPercent(460, 100, 720), 50);
  assert.equal(comparisonPercent(820, 100, 720), 100);
  assert.equal(comparisonPercent(90, 100, 720), 0);
  assert.equal(comparisonPercent(900, 100, 720), 100);
  assert.equal(comparisonPercent(100, 100, 0), 50);
});

test('the comparison escapes metadata and keeps an accessible static fallback', () => {
  const image = { ...vikunja.image, alt: 'Task "details" & <actions>', caption: 'Vue & <capture>', comparison: { beforeLabel: 'Vue & <before>', afterLabel: 'Marionette "after"' } };
  const { body } = studyPage({ ...vikunja, image });
  assert.match(body, /alt="Marionette &quot;after&quot; task view from the authentic paired capture"/);
  assert.match(body, /Vue &amp; &lt;before&gt;/);
  assert.match(body, /Marionette &quot;after&quot;/);
  assert.match(body, /type="range" min="0" max="100"/);
  assert.match(body, /data-comparison-controls hidden/);
  assert.match(body, /The Marionette view remains readable without JavaScript/);
  assert.match(body, /Original chart/);
});
