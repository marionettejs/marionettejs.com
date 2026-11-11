import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('verification image tracks the locked Playwright browser version', async () => {
  const workflow = await readFile(new URL('../.github/workflows/check.yml', import.meta.url), 'utf8');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
  const image = workflow.match(/^\s+image: mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-noble@sha256:[a-f0-9]{64}$/m);
  assert.ok(image, 'Pin the official Playwright image by version and registry digest');
  assert.equal(image[1], pkg.devDependencies.playwright, 'Update the image version and digest when upgrading Playwright');
  assert.equal(image[1], lock.packages['node_modules/playwright'].version);
  assert.equal(image[1], lock.packages['node_modules/playwright-core'].version);
});
