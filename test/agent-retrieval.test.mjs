import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRepresentation, stopPreview } from '../scripts/check-agent-site.mjs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('HTTP retrieval rejects blocked, redirected, stale and incorrectly typed documentation', async () => {
  const path = '/docs/region.md', content = Buffer.from('# Region\nVersion: 5.0.0-beta.1\n');
  const check = response => checkRepresentation('https://example.test/', path, content, 'text/markdown', async () => response);
  await assert.rejects(check(new Response('Forbidden', { status: 403 })), /HTTP 403/);
  await assert.rejects(check(new Response('', { status: 301, headers: { Location: '/docs/v4/' } })), /HTTP 301/);
  await assert.rejects(check(new Response('<html>Bot challenge</html>', { headers: { 'Content-Type': 'text/html' } })), /expected text\/markdown/);
  await assert.rejects(check(new Response(content, { headers: { 'Content-Type': 'text/markdown-incorrect' } })), /expected text\/markdown/);
  await assert.rejects(check(new Response('# Backbone.Marionette v4', { headers: { 'Content-Type': 'text/markdown' } })), /served bytes differ/);
  const result = await check(new Response(content, { headers: { 'Content-Type': 'Text/Markdown; charset=utf-8' } }));
  assert.equal(result.bytes, content.length);
  assert.equal(result.status, 200);
});

test('preview cleanup settles after both a live child and an already signalled child', { timeout: 5000 }, async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
  await once(child, 'spawn');
  await stopPreview(child);
  assert.equal(child.signalCode, 'SIGTERM');
  assert.equal(child.exitCode, null);
  await stopPreview(child);
});

test('HTTP audit preview serves an existing artifact without build scripts or source watchers', { timeout: 5000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'marionette-built-preview-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'scripts'));
  await mkdir(join(directory, 'dist'));
  await copyFile(new URL('../scripts/dev.mjs', import.meta.url), join(directory, 'scripts/dev.mjs'));
  await writeFile(join(directory, 'dist/example.md'), '# Existing artifact\n');
  const child = spawn(process.execPath, [join(directory, 'scripts/dev.mjs'), '--serve-built'], {
    env: { ...process.env, MARIONETTE_PREVIEW_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => stopPreview(child));
  const url = await new Promise((resolve, reject) => {
    let output = '';
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`Preview exited ${code}: ${output}`)));
    child.stderr.on('data', chunk => { output += chunk; });
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/Local preview: (http:\/\/127\.0\.0\.1:\d+\/)/);
      if (match) resolve(match[1]);
    });
  });
  const response = await fetch(new URL('example.md', url));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '# Existing artifact\n');
  await stopPreview(child);
});
