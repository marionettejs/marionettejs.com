import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Marked } from 'marked';
import { clients } from '../scripts/agent-setup.mjs';
const codeBlocks = id => new Marked().lexer(clients.find(client => client.id === id).markdown).filter(token => token.type === 'code' && token.lang === 'sh');
const commandBlock = (id, startsWith) => {
  const matches = codeBlocks(id).filter(token => token.text.startsWith(startsWith));
  assert.equal(matches.length, 1, `${id}: expected one command starting with ${startsWith}`);
  return matches[0].text;
};
const diagnostic = (id, result) => `${id}: status=${result.status}, error=${result.error?.message || ''}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`;
const tree = async directory => Object.fromEntries(await Promise.all((await readdir(directory, { recursive: true, withFileTypes: true }))
  .filter(item => item.isFile()).map(async item => [join(item.parentPath, item.name).slice(directory.length), await readFile(join(item.parentPath, item.name), 'utf8')])));

test('project setup copies complete installed skills and refuses existing folders without changing them', async () => {
  const app = await mkdtemp(join(tmpdir(), 'marionette-setup-'));
  try {
    await symlink(resolve('node_modules'), join(app, 'node_modules'), 'dir');
    const original = await tree(resolve('node_modules/marionette/skills/marionette'));
    for (const id of ['codex', 'cursor', 'other']) {
      const folder = join(app, id === 'cursor' ? '.cursor/skills/marionette' : '.agents/skills/marionette');
      await rm(folder, { recursive: true, force: true });
      const command = commandBlock(id, 'node -e');
      const run = () => spawnSync('/bin/bash', ['-c', command], { cwd: app, encoding: 'utf8' });
      const first = run();
      assert.equal(first.status, 0, diagnostic(id, first));
      assert.deepEqual(await tree(folder), original, id);
      await rm(folder, { recursive: true });
      await mkdir(join(folder, 'scripts'), { recursive: true });
      await writeFile(join(folder, 'scripts/symbols.mjs'), 'Existing user skill');
      const before = await tree(folder);
      const result = run();
      assert.notEqual(result.status, 0, diagnostic(id, result));
      assert.match(result.stderr, /Skill folder already exists/);
      assert.deepEqual(await tree(folder), before, `${id}: refusal must not add or overwrite files`);
    }
  } finally { await rm(app, { recursive: true, force: true }); }
});

test('pinned plugin setup never installs after clone, fetch, or checkout fails', async () => {
  const app = await mkdtemp(join(tmpdir(), 'marionette-plugin-'));
  try {
    const bin = join(app, 'bin');
    await mkdir(bin);
    await writeFile(join(bin, 'git'), '#!/bin/sh\nprintf "git %s\\n" "$*" >> "$AGENT_SETUP_LOG"\nif [ "$1" = clone ] && [ "$AGENT_SETUP_FAIL" = clone ]; then exit 1; fi\nif [ "$3" = fetch ] && [ "$AGENT_SETUP_FAIL" = fetch ]; then exit 1; fi\nif [ "$3" = checkout ] && [ "$AGENT_SETUP_FAIL" = checkout ]; then exit 1; fi\n', { mode: 0o755 });
    for (const cli of ['claude', 'copilot']) await writeFile(join(bin, cli), '#!/bin/sh\nprintf "plugin %s\\n" "$*" >> "$AGENT_SETUP_LOG"\n', { mode: 0o755 });
    for (const id of ['claude', 'copilot']) for (const stage of ['clone', 'fetch', 'checkout', 'success']) {
      const log = join(app, `${id}-${stage}.log`);
      const command = commandBlock(id, 'git clone');
      const result = spawnSync('/bin/bash', ['-c', command], { cwd: app, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, AGENT_SETUP_LOG: log, AGENT_SETUP_FAIL: stage } });
      const calls = await readFile(log, 'utf8');
      if (stage === 'success') {
        assert.equal(result.status, 0, diagnostic(`${id}/${stage}`, result));
        assert.match(calls, /plugin plugin install marionette@marionettejs/);
      } else {
        assert.notEqual(result.status, 0, diagnostic(`${id}/${stage}`, result));
        assert.doesNotMatch(calls, /^plugin /m, `${id}: no marketplace registration or plugin install after ${stage} failure`);
        if (stage === 'clone') assert.doesNotMatch(calls, /^git -C /m);
      }
    }
  } finally { await rm(app, { recursive: true, force: true }); }
});
