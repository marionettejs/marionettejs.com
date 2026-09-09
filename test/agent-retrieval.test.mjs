import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRepresentation } from '../scripts/check-agent-site.mjs';

test('HTTP retrieval rejects blocked, redirected, stale and incorrectly typed documentation', async () => {
  const path = '/docs/region.md', content = Buffer.from('# Region\nVersion: 5.0.0-beta.1\n');
  const check = response => checkRepresentation('https://example.test/', path, content, 'text/markdown', async () => response);
  await assert.rejects(check(new Response('Forbidden', { status: 403 })), /HTTP 403/);
  await assert.rejects(check(new Response('', { status: 301, headers: { Location: '/docs/v4/' } })), /HTTP 301/);
  await assert.rejects(check(new Response('<html>Bot challenge</html>', { headers: { 'Content-Type': 'text/html' } })), /expected text\/markdown/);
  await assert.rejects(check(new Response('# Backbone.Marionette v4', { headers: { 'Content-Type': 'text/markdown' } })), /served bytes differ/);
  const result = await check(new Response(content, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } }));
  assert.equal(result.bytes, content.length);
  assert.equal(result.status, 200);
});
