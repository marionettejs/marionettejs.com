// Audit the actual HTTP reading surface against the artifact built from this checkout.
// Public URLs are opt-in; this does not deploy or change crawler settings.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const sha256 = value => createHash('sha256').update(value).digest('hex');

export async function checkRepresentation(base, path, expected, type, request = fetch) {
  const url = new URL(path, base);
  const response = await request(url, {
    redirect: 'manual', signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'MarionetteAgentAudit/1.0', Accept: type }
  });
  if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}`);
  const actualType = response.headers.get('content-type') || '';
  if (actualType.split(';', 1)[0].trim().toLowerCase() !== type.toLowerCase()) throw new Error(`${path}: expected ${type}, received ${actualType}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== sha256(expected)) throw new Error(`${path}: served bytes differ from this checkout's built artifact`);
  return { path, status: response.status, contentType: actualType, bytes: bytes.length, sha256: sha256(bytes) };
}

async function startPreview() {
  const child = spawn(process.execPath, ['scripts/dev.mjs', '--serve-built'], {
    cwd: root, env: { ...process.env, MARIONETTE_PREVIEW_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  try {
    const base = await new Promise((accept, reject) => {
      const timer = setTimeout(() => reject(new Error(`Preview did not start: ${output.slice(-1000)}`)), 20000);
      const fail = error => { clearTimeout(timer); reject(error); };
      child.once('error', fail);
      child.once('exit', code => fail(new Error(`Preview exited ${code}: ${output.slice(-1000)}`)));
      child.stderr.on('data', chunk => { output = (output + chunk).slice(-4000); });
      child.stdout.on('data', chunk => {
        output = (output + chunk).slice(-4000);
        const match = output.match(/Local preview: (http:\/\/127\.0\.0\.1:\d+\/)/);
        if (match) { clearTimeout(timer); accept(match[1]); }
      });
    });
    return { child, base };
  } catch (error) { child.kill(); throw error; }
}

export async function stopPreview(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}

export async function auditSite(base) {
  const manifest = JSON.parse(await readFile(resolve(root, 'dist/docs/manifest.json'), 'utf8'));
  const diagnostics = JSON.parse(await readFile(resolve(root, 'dist/docs/diagnostics.json'), 'utf8'));
  const artifacts = JSON.parse(await readFile(resolve(root, 'dist/docs/artifacts.json'), 'utf8'));
  const mime = path => path.endsWith('.md') ? 'text/markdown' : path.endsWith('.json') ? 'application/json' : 'text/plain';
  const entries = new Map([
    ['/llms.txt', 'text/plain'], ['/docs/llms.txt', 'text/plain'],
    ['/docs/manifest.json', 'application/json'], ['/reference/provenance.json', 'application/json'],
    ['/docs/diagnostics.json', 'application/json'], ['/errors/index.md', 'text/markdown'],
    ...manifest.pages.map(page => [page.route === 'docs' ? '/docs/index.md' : `/${page.route}.md`, 'text/markdown']),
    ...diagnostics.diagnostics.map(item => [`/errors/${item.code}.md`, 'text/markdown']),
    ['/docs/artifacts.json', 'application/json'],
    ...artifacts.artifacts.filter(item => /\.(md|json|txt)$/.test(item.path)).map(item => [item.path, mime(item.path)])
  ]);
  const results = [], failures = [];
  const work = [...entries];
  // Limit public server pressure and keep each response independently accountable.
  for (let offset = 0; offset < work.length; offset += 4) {
    await Promise.all(work.slice(offset, offset + 4).map(async ([path, type]) => {
      try {
        const expected = await readFile(resolve(root, 'dist', path.slice(1)));
        results.push(await checkRepresentation(base, path, expected, type));
      } catch (error) { failures.push({ path, message: error.message }); }
    }));
  }
  return {
    base, checkedAt: new Date().toISOString(), packageVersion: manifest.packageVersion,
    sourceRevision: manifest.sourceRevision, sourceContentSha256: manifest.contentSha256,
    checks: results.sort((a, b) => a.path.localeCompare(b.path)), failures,
    passed: failures.length === 0,
    scope: 'Direct HTTP reads of the built documentation. This does not establish search-engine indexing, browser WebMCP discovery, or model task success.'
  };
}

async function main(args) {
  let base, report, local = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--local') local = true;
    else if ((arg === '--base' || arg === '--report') && args[index + 1] && !args[index + 1].startsWith('--')) {
      if (arg === '--base') base = args[++index]; else report = args[++index];
    } else throw new Error('Usage: node scripts/check-agent-site.mjs (--local | --base URL) [--report FILE]');
  }
  if (local === Boolean(base)) throw new Error('Choose exactly one of --local or --base URL.');
  if (base) {
    const url = new URL(base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Base must be an HTTP(S) origin without credentials, path, query, or fragment.');
  }
  let preview;
  try {
    if (local) { preview = await startPreview(); base = preview.base; }
    const result = await auditSite(base);
    if (report) { await mkdir(dirname(resolve(report)), { recursive: true }); await writeFile(resolve(report), `${JSON.stringify(result, null, 2)}\n`); }
    console.log(`${result.passed ? 'PASS' : 'FAIL'}: ${result.checks.length} readable resources, ${result.failures.length} failures; ${result.packageVersion} @ ${result.sourceRevision}`);
    for (const failure of result.failures) console.error(failure.message);
    console.log(result.scope);
    if (!result.passed) process.exitCode = 1;
  } finally {
    if (preview) await stopPreview(preview.child);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
