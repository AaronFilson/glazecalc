// Checks the MCP endpoint (POST /mcp, docs/adr/0017-mcp-server.md) against the
// protocol, from outside, with the tools the protocol's own project publishes:
//
//   1. The official conformance suite, for each revision the server serves:
//      2026-07-28 (stateless) and 2025-11-25 (the initialize handshake), each
//      exactly as that revision requires (--requirements). Scenarios that need
//      the suite's own test tools, resources and prompts (test_simple_text and
//      the like, which a real server has no reason to carry) are listed, with
//      why, in scripts/mcp-conformance/<revision>.yml; anything else failing
//      fails this, and so does a listed one that starts passing.
//   2. The MCP Inspector's command line, as a client would use the server:
//      tools/list (with its schema portability check), a tool call, the
//      resources, a guide section and the prompts.
//
//   npm run test:mcp            starts the server on MCP_PORT (3190) with its own
//                               database (MCP_MONGODB_URI, glazecalc_mcp_conformance),
//                               runs both, and stops it
//   MCP_URL=http://host/mcp npm run test:mcp   checks a server already running
//   MCP_INSPECTOR_ONLY=1 MCP_URL=...           only step 2: a handful of requests, under
//                                               a deployed site's limit per address
//
// MongoDB must be running for the first. The suite and the Inspector are not the
// app's dependencies: they are installed apart, at the exact versions and with
// the lockfile in scripts/mcp-conformance/ (package.json, package-lock.json),
// by npm ci there with no install scripts, which this does when they are missing.
// CI runs that step itself, with no secrets in its environment.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REVISIONS = ['2026-07-28', '2025-11-25'];

const root = fileURLToPath(new URL('..', import.meta.url));
/** Where the suite and the Inspector are installed, and their command names there. */
const tools = path.join(root, 'scripts', 'mcp-conformance');
const bin = path.join(tools, 'node_modules', '.bin');
export const VERSIONS = JSON.parse(readFileSync(path.join(tools, 'package.json'), 'utf8')).dependencies;
const port = process.env.MCP_PORT || '3190';
const given = process.env.MCP_URL;
const url = given || `http://localhost:${port}/mcp`;
const windows = process.platform === 'win32';

const quote = (arg) => (/^[\w@./:=,-]+$/.test(arg) ? arg : JSON.stringify(arg));

/** Runs a command (through the shell, for npm's .cmd shims on Windows); resolves with its exit code and output. */
const run = (command, args, { cwd = root, echo = true } = {}) =>
  new Promise((resolve) => {
    const child = spawn([command, ...args].map(quote).join(' '), {
      cwd,
      shell: true,
      // The installed tools first, so nothing else of the same name is run.
      env: { ...process.env, PATH: bin + path.delimiter + (process.env.PATH ?? '') }
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
      if (echo) process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      err += chunk;
      if (echo) process.stderr.write(chunk);
    });
    child.on('close', (code) => resolve({ code: code ?? 1, out, err }));
  });

/** Starts the app on its own port and database, and waits until it answers. */
const startServer = async () => {
  const server = spawn(process.execPath, ['server/main.ts'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: port,
      MONGODB_URI: process.env.MCP_MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_mcp_conformance',
      APP_URL: `http://localhost:${port}`,
      SITE_URL: '',
      MAIL_TRANSPORT: 'log',
      // The suite sends many requests at once from one address.
      RATE_LIMITS: 'off'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  server.stdout.on('data', (chunk) => (log += chunk));
  server.stderr.on('data', (chunk) => (log += chunk));
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error('The server stopped:\n' + log);
    try {
      if ((await fetch(`http://localhost:${port}/api/health`)).ok) return server;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error('The server did not answer within a minute:\n' + log);
};

/** The JSON an Inspector command printed (it may print a notice before it). */
const jsonOf = (text) => JSON.parse(text.slice(text.indexOf('{')));

const failures = [];
const check = (ok, what) => {
  console.log((ok ? 'ok   ' : 'FAIL ') + what);
  if (!ok) failures.push(what);
};

const inspector = async (what, args, test) => {
  const result = await run('mcp-inspector', ['--cli', url, '--transport', 'http', ...args], {
    echo: false
  });
  if (result.code !== 0) {
    check(false, `${what} (exit ${result.code})\n${result.out}\n${result.err}`);
    return;
  }
  let body;
  try {
    body = jsonOf(result.out);
  } catch {
    check(false, `${what}: no JSON in\n${result.out}`);
    return;
  }
  check(test(body), what);
};

/** Installs the suite and the Inspector from their lockfile, when they are not there yet. */
const install = async () => {
  if (['conformance', 'mcp-inspector'].every((name) => existsSync(path.join(bin, name)))) return;
  console.log(
    'Installing ' +
      Object.entries(VERSIONS)
        .map(([name, version]) => name + '@' + version)
        .join(' and ')
  );
  const result = await run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: tools });
  if (result.code !== 0) throw new Error('npm ci in scripts/mcp-conformance failed');
};

const main = async () => {
  await install();
  const server = given ? null : await startServer();
  // The suite writes its results under the directory it runs in: not the repository.
  const work = mkdtempSync(path.join(tmpdir(), 'glazecalc-mcp-'));
  try {
    // A deployed site (the Live checks) answers 60 requests a minute to one
    // address: the suite sends far more, so only the Inspector's few run there.
    for (const revision of process.env.MCP_INSPECTOR_ONLY ? [] : REVISIONS) {
      console.log(`\n== Conformance suite, ${revision} ==`);
      const baseline = path.join(root, 'scripts', 'mcp-conformance', revision + '.yml');
      const result = await run(
        'conformance',
        ['server', '--url', url, '--requirements', revision, '--expected-failures', baseline],
        { cwd: work }
      );
      check(result.code === 0, `conformance ${revision}`);
    }

    // The authorization server (docs/adr/0024-authorization-server.md): its metadata, as the
    // suite's authorization-server scenario checks it. The suite's other one,
    // authorization-code-grant, needs a person to say yes on the consent page, so it is left to
    // the checks with real clients (deploy/README.md); the auth/* scenarios test clients.
    if (!process.env.MCP_INSPECTOR_ONLY) {
      console.log('\n== Conformance suite, authorization server ==');
      const result = await run(
        'conformance',
        ['authorization', '--url', new URL(url).origin, '--scenario', 'authorization-server-metadata-endpoint'],
        { cwd: work }
      );
      check(result.code === 0, 'conformance authorization-server-metadata-endpoint');
    }

    console.log('\n== MCP Inspector ==');
    await inspector('tools/list, with portable schemas', ['--method', 'tools/list', '--strict'], (body) =>
      ['search_materials', 'analyze_recipe', 'check_limits', 'search_guides'].every((name) =>
        body.tools.some((tool) => tool.name === name)
      )
    );
    await inspector(
      'tools/call convert_cone_temperature',
      ['--method', 'tools/call', '--tool-name', 'convert_cone_temperature', '--tool-arg', 'celsius=1222'],
      (body) => body.structuredContent?.nearestOrton?.[0]?.cone === '6'
    );
    await inspector(
      'tools/call search_guides',
      ['--method', 'tools/call', '--tool-name', 'search_guides', '--tool-arg', 'query=crawling'],
      (body) => body.structuredContent?.results?.length > 0
    );
    await inspector('resources/list', ['--method', 'resources/list'], (body) =>
      body.resources.some((resource) => resource.uri === 'glazecalc://cones')
    );
    await inspector(
      'resources/read a guide section',
      ['--method', 'resources/read', '--uri', 'glazecalc://guides/en/firing/kiln-sitter'],
      (body) => /kiln sitter/i.test(body.contents?.[0]?.text ?? '')
    );
    await inspector('prompts/list', ['--method', 'prompts/list'], (body) => body.prompts.length >= 4);
    await inspector(
      'prompts/get diagnose_glaze_fault',
      [
        '--method',
        'prompts/get',
        '--prompt-name',
        'diagnose_glaze_fault',
        '--prompt-args',
        'recipe=Custer Spar 40, Silica 30, Whiting 20, EPK 10',
        'fault=crawling'
      ],
      (body) => body.messages?.[0]?.content?.text?.includes('crawling')
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
    if (server) {
      server.kill(windows ? undefined : 'SIGTERM');
    }
  }
  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nThe MCP endpoint passes.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
