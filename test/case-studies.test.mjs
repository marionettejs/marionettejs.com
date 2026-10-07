import { test } from 'node:test';
import assert from 'node:assert/strict';
import { studyPage } from '../content/case-studies.mjs';
import { vikunja } from '../content/case-studies/vikunja.mjs';

test('the Vue migration uses shared hero escaping and image metadata', () => {
  const image = { ...vikunja.image, width: 640, height: 320,
    alt: 'Task "details" & <actions>', caption: 'Vue & Marionette <capture>' };
  const { body } = studyPage({ ...vikunja, image });
  assert.match(body, /width="640" height="320" alt="Task &quot;details&quot; &amp; &lt;actions&gt;"/);
  assert.match(body, /Vue &amp; Marionette &lt;capture&gt;/);
  assert.match(body, /aria-label="Open the full hero image"/);
  assert.doesNotMatch(body, /<actions>|<capture>/);
});
