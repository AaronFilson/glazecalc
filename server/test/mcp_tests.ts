// The MCP endpoint (docs/adr/0017-mcp-server.md; docs/integrations-plan.md,
// Phases 2 and 3): the public tools with no account, the read tools with a
// personal access token, who may call it and how often.
import chemistry from '../../lib/chemistry/index.js';
import standardData from '../../data/index.js';
import recipe from '../../lib/recipe/index.js';
import { MOST_LINES, resetFits, FITS_PER_MINUTE, guarded, ToolProblem, UNEXPECTED } from '../mcp/common.ts';
import { countTokenDelete, MCP_LIMITS, TOKEN_DELETES_PER_HOUR, TOKEN_WRITE_LIMITS } from '../lib/rate_limit.ts';
import { READ_ONLY_TOKEN, TOO_MANY_CHANGES } from '../mcp/tools/account_write.ts';
import Activity from '../models/activity.ts';
import Note from '../models/note.ts';
import RecordVersion from '../models/record_version.ts';
import ShareLink from '../models/share_link.ts';
import Trash, { TRASH_MAX_ACCOUNT } from '../models/trash.ts';
import { GUIDE_IDS, termsOf } from '../mcp/guides.ts';
import { findMaterial } from '../mcp/library.ts';
import { MOST_STREAMS_PER_ADDRESS, sdkSubscribers, streamsOpen } from '../mcp/index.ts';
import { SERVER_INFO } from '../mcp/server.ts';
import { PLACES } from '../mcp/words.ts';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import * as site from '../lib/site.ts';
import { hashToken } from '../lib/token_auth.ts';
import AccessToken from '../models/access_token.ts';
import Material from '../models/material.ts';
import Recipe from '../models/recipe.ts';
import User from '../models/user.ts';
import { api, base, expect, makeUser, sessionToken } from './support/app.ts';
import { makeToken } from './support/tokens.ts';

const PROTOCOL = '2025-06-18';

const plain = (text: string): string => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
/**
 * A guide file as the server reads it (markdownOf in server/mcp/guides.ts): from the built
 * client where it has the file, else from the sources. Reading the same copy keeps the word
 * picked below right whether a build has run or not, and when that build is stale.
 */
const guideFile = (id: string, file: string): string | null => {
  for (const place of PLACES) {
    try {
      return readFileSync(path.join(place, 'guides', id, file), 'utf8');
    } catch {
      // Not built, or not translated: the next place.
    }
  }
  return null;
};
/** A word in the English guides whose search term is in no guide in the language. */
const onlyInEnglish = (language: string): string => {
  const read = (file: string): string[] =>
    GUIDE_IDS.flatMap((id) => {
      const text = guideFile(id, file);
      return text === null ? [] : [plain(text)];
    });
  const theirs = read(`${language}.md`).join(' ');
  const words = new Set(
    read('en.md')
      .join(' ')
      .match(/\b[a-z]{6,}\b/g)
  );
  const word = ['bucket', ...words].find(
    (candidate) => words.has(candidate) && !theirs.includes(termsOf(candidate)[0]!)
  );
  if (!word) throw new Error(`Every word of the English guides is in the ${language} ones`);
  return word;
};

const DAY = 24 * 60 * 60 * 1000;

interface Answer {
  status: number;
  headers: Headers;
  body: Record<string, unknown> | null;
}

let id = 0;

/** A JSON-RPC request to /mcp, as a 2025 client sends it; the answer from JSON or a one-event stream. */
const rpc = async (method: string, params: object = {}, headers: Record<string, string> = {}): Promise<Answer> => {
  const res = await fetch(base() + '/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': PROTOCOL,
      ...headers
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params })
  });
  const text = await res.text();
  const data = text.includes('data: ')
    ? text
        .split('\n')
        .find((line) => line.startsWith('data: '))!
        .slice(6)
    : text;
  return {
    status: res.status,
    headers: res.headers,
    body: data ? (JSON.parse(data) as Record<string, unknown>) : null
  };
};

// A tool's data is checked field by field, as JSON: any, as chai takes it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
type Json = Record<string, any>;
type ToolResult = { structuredContent?: Json; content: Array<{ text: string }>; isError?: boolean };

/** Calls a tool; the result (structured data, or the refusal's text with isError). */
const call = async (name: string, args: object, headers: Record<string, string> = {}): Promise<ToolResult> => {
  const answer = await rpc('tools/call', { name, arguments: args }, headers);
  expect(answer.status, JSON.stringify(answer.body)).to.equal(200);
  if (answer.body!.error) throw new Error(JSON.stringify(answer.body!.error));
  return answer.body!.result as ToolResult;
};
const data = async (name: string, args: object, headers: Record<string, string> = {}) => {
  const result = await call(name, args, headers);
  expect(result.isError, result.content[0]?.text).to.not.equal(true);
  return result.structuredContent!;
};
const toolNames = async (headers: Record<string, string> = {}): Promise<string[]> =>
  ((await rpc('tools/list', {}, headers)).body!.result as { tools: Array<{ name: string }> }).tools
    .map((tool) => tool.name)
    .sort();
const bearer = (token: string) => ({ authorization: 'Bearer ' + token });

const PUBLIC_TOOLS = [
  'analyze_recipe',
  'check_limits',
  'convert_cone_temperature',
  'get_material',
  'match_from_materials',
  'search_guides',
  'search_materials',
  'suggest_substitutes'
];
const ACCOUNT_TOOLS = [
  'get_firing',
  'get_my_settings',
  'get_recipe',
  'get_shelf',
  'list_firings',
  'list_my_materials',
  'list_notes',
  'list_recipes',
  'match_with_what_i_have'
];
const WRITE_TOOLS = [
  'add_my_material',
  'add_notebook_entry',
  'add_to_shelf',
  'create_recipe',
  'move_to_trash',
  'remove_from_shelf',
  'undo_shelf_change',
  'update_my_material',
  'update_recipe'
];

const LINES = [
  { material: 'Custer Spar', amount: 40 },
  { material: 'Whiting', amount: 20 },
  { material: 'EPK', amount: 20 },
  { material: 'Silica', amount: 20 }
];

describe('MCP: the endpoint', () => {
  it('starts a session-less exchange, sets no cookie and keeps nothing in caches', async () => {
    const answer = await rpc('initialize', {
      protocolVersion: PROTOCOL,
      capabilities: {},
      clientInfo: { name: 'test', version: '1' }
    });
    expect(answer.status).to.equal(200);
    const result = answer.body!.result as { serverInfo: { name: string }; capabilities: object; instructions: string };
    expect(result.serverInfo.name).to.equal('glazecalc');
    expect(result.capabilities).to.include.keys('tools', 'resources', 'prompts', 'completions');
    expect(result.instructions).to.include('not proof that a glaze is food safe');
    expect(answer.headers.get('set-cookie')).to.equal(null);
    expect(answer.headers.get('mcp-session-id')).to.equal(null);
    expect(answer.headers.get('cache-control')).to.match(/^no-store/);
  });

  it('lists the public tools, read-only, and no account tools without a token', async () => {
    expect(await toolNames()).to.eql(PUBLIC_TOOLS);
    const tools = ((await rpc('tools/list')).body!.result as { tools: Json[] }).tools;
    for (const tool of tools) {
      expect(tool.annotations, tool.name).to.include({ readOnlyHint: true, destructiveHint: false });
      expect(tool.description, tool.name).to.be.a('string').and.have.length.above(40);
      expect(tool.inputSchema.type, tool.name).to.equal('object');
    }
  });

  it('answers only POST: GET, DELETE and the rest are 405', async () => {
    for (const method of ['GET', 'DELETE', 'PUT', 'OPTIONS']) {
      const res = await fetch(base() + '/mcp', { method });
      expect(res.status, method).to.equal(405);
      expect(res.headers.get('allow')).to.equal('POST');
    }
    expect((await fetch(base() + '/mcp/other', { method: 'POST' })).status).to.equal(404);
  });

  it('takes only JSON, and at most 256 kB of it', async () => {
    const plain = await fetch(base() + '/mcp', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hi'
    });
    expect(plain.status).to.equal(415);
    const big = await fetch(base() + '/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: { pad: 'x'.repeat(300 * 1024) } })
    });
    expect(big.status).to.equal(413);
  });

  it('refuses a batch of messages, for any revision, before any is answered', async () => {
    for (const version of [PROTOCOL, '2025-11-25', '2025-03-26']) {
      const batch = Array.from({ length: 100 }, (_, i) => ({ jsonrpc: '2.0', id: i + 1, method: 'ping' }));
      const res = await fetch(base() + '/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': version
        },
        body: JSON.stringify(batch)
      });
      expect(res.status, version).to.equal(400);
      const body = (await res.json()) as { error: { code: number; message: string }; result?: unknown };
      expect(body.error.code).to.equal(-32600);
      expect(body.error.message).to.include('Batches');
    }
    // One message is still answered.
    expect((await rpc('ping')).status).to.equal(200);
  });

  it('refuses another site’s pages and other host names (DNS rebinding)', async () => {
    const elsewhere = await rpc('tools/list', {}, { origin: 'https://evil.example' });
    expect(elsewhere.status).to.equal(403);
    // The site's own pages may.
    expect((await rpc('tools/list', {}, { origin: 'https://glazecalc.test' })).status).to.equal(200);
    // fetch will not set Host, so the request is written by hand.
    const http = await import('node:http');
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        base() + '/mcp',
        { method: 'POST', headers: { host: 'attacker.example', 'content-type': 'application/json' } },
        (res) => {
          res.resume();
          resolve(res.statusCode!);
        }
      );
      req.on('error', reject);
      req.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));
    });
    expect(status).to.equal(403);
  });

  it('is listed for the MCP Registry as the server it is (server.json)', () => {
    const listing = JSON.parse(readFileSync(new URL('../../server.json', import.meta.url), 'utf8'));
    expect(listing.$schema).to.match(
      /^https:\/\/static\.modelcontextprotocol\.io\/schemas\/[\d-]+\/server\.schema\.json$/
    );
    // The domain the registry checks is the site's own, reversed.
    expect(listing.name).to.equal('com.glazecalcapp/glazecalc');
    expect(listing.version).to.equal(SERVER_INFO.version);
    expect(listing.title).to.equal(SERVER_INFO.title);
    // The registry takes at most 100 characters.
    expect(listing.description.length).to.be.within(1, 100);
    expect(listing.remotes).to.have.length(1);
    expect(listing.remotes[0]).to.include({ type: 'streamable-http', url: SERVER_INFO.websiteUrl + '/mcp' });
    expect(listing.remotes[0].headers[0]).to.include({ name: 'Authorization', isRequired: false, isSecret: true });
  });

  it('publishes its Protected Resource Metadata', async () => {
    for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp']) {
      const res = await fetch(base() + path);
      expect(res.status, path).to.equal(200);
      expect(await res.json()).to.deep.include({
        resource: 'https://glazecalc.test/mcp',
        bearer_methods_supported: ['header'],
        scopes_supported: ['data:read', 'data:write']
      });
    }
  });
});

describe('MCP: the public tools', () => {
  it('search_materials and get_material read the library', async () => {
    const found = await data('search_materials', { query: 'gerstley' });
    expect(found.materials.map((m: { name: string }) => m.name)).to.include('Gerstley Borate');
    const colorants = await data('search_materials', { query: 'cobalt', includeColorants: true });
    expect(colorants.materials.some((m: { kind: string }) => m.kind === 'additive')).to.equal(true);

    const epk = await data('get_material', { name: 'epk' });
    expect(epk.material).to.include({ name: 'EPK Kaolin', category: 'clay', oxidesAre: 'weight percent', loi: 13.9 });
    expect(epk.material.oxides.SiO2).to.equal(45.7);
    const missing = await call('get_material', { name: 'Unobtainium' });
    expect(missing.isError).to.equal(true);
  });

  it('analyze_recipe gives the unity formula the app works out', async () => {
    const result = await data('analyze_recipe', { lines: LINES });
    const lines = LINES.map((line) => ({ material: findMaterial(line.material)!, amount: line.amount }));
    const expected = chemistry.calculateUMF(lines);
    expect(result.unityFormula.SiO2).to.equal(Number(expected.umf.SiO2!.toFixed(3)));
    expect(result.groups.R2O + result.groups.RO).to.be.closeTo(1, 0.002);
    expect(result.silicaToAlumina).to.equal(Number(expected.siAlRatio!.toFixed(2)));
    expect(result.expansion).to.be.a('number');
  });

  it('analyze_recipe takes a material by its analysis, and names the ones it cannot find', async () => {
    const custom = await data('analyze_recipe', {
      lines: [
        { material: 'My local feldspar', amount: 60, analysis: { SiO2: 68, Al2O3: 18, K2O: 10, Na2O: 3 }, loi: 0.5 },
        { material: 'Whiting', amount: 20 },
        { material: 'Silica', amount: 20 }
      ]
    });
    expect(custom.unityFormula.K2O).to.be.above(0);
    const unknown = await call('analyze_recipe', { lines: [{ material: 'Custer Feldspar', amount: 50 }] });
    expect(unknown.isError).to.equal(true);
    expect(unknown.content[0]!.text).to.include('Custer Feldspar').and.include('Custer Spar');
  });

  it(`takes at most ${MOST_LINES} lines`, async () => {
    const lines = Array.from({ length: MOST_LINES + 1 }, () => ({ material: 'Silica', amount: 1 }));
    const answer = await rpc('tools/call', { name: 'analyze_recipe', arguments: { lines } });
    const result = answer.body!.result as ToolResult | undefined;
    // A refusal either way: a protocol error or a tool error, never an answer.
    expect(Boolean(answer.body!.error) || result?.isError === true).to.equal(true);
  });

  it('check_limits gives the app’s cautions as data and words, in the language asked', async () => {
    const lines = [
      { material: 'Custer Spar', amount: 70 },
      { material: 'Whiting', amount: 10 },
      { material: 'Silica', amount: 20 }
    ];
    const english = await data('check_limits', { lines, firing: { cone: '6' } });
    expect(english).to.include({ band: 'mid', celsius: 1222 });
    expect(english.limitSet.id).to.equal('glazecalc');
    const checks = english.cautions.map((c: { check: string }) => c.check);
    expect(checks).to.include('alkali').and.include('clay-low');
    const alkali = english.cautions.find((c: { check: string }) => c.check === 'alkali');
    expect(alkali).to.include({ severity: 'likely', quantity: 'K2O+Na2O', direction: 'above' });
    expect(alkali.text).to.match(/[a-z]/);

    const german = await data('check_limits', { lines, firing: { fahrenheit: 2232 }, language: 'de-AT' });
    const deAlkali = german.cautions.find((c: { check: string }) => c.check === 'alkali');
    expect(deAlkali.text).to.not.equal(alkali.text);
    // A language not offered is answered in English.
    const other = await data('check_limits', { lines, firing: { cone: '6' }, language: 'xx' });
    expect(other.cautions.find((c: { check: string }) => c.check === 'alkali').text).to.equal(alkali.text);

    const lowFire = await data('check_limits', {
      lines: [
        { material: 'Ferro Frit 3134', amount: 80 },
        { material: 'EPK', amount: 5 },
        { material: 'Silica', amount: 15 }
      ],
      firing: { cone: '04' }
    });
    expect(lowFire.band).to.equal('low');
    expect(lowFire.cautions.map((c: { check: string }) => c.check)).to.include('alumina-low');

    const badCone = await call('check_limits', { lines, firing: { cone: '10' } });
    expect(badCone.isError).to.equal(true);
    expect(badCone.content[0]!.text).to.include('06, 05');
    const badSet = await call('check_limits', { lines, limitSet: 'nope' });
    expect(badSet.isError).to.equal(true);
  });

  it('check_limits says whether the chemistry fits the firing given, with its figures and sources', async () => {
    const fritty = [
      { material: 'Ferro Frit 3134', amount: 80 },
      { material: 'EPK', amount: 5 },
      { material: 'Silica', amount: 15 }
    ];
    // A low-fire glaze fired at 1300 °C: more boron than Katz asks for, less silica and alumina than H&R's least.
    const hot = await data('check_limits', { lines: fritty, firing: { celsius: 1300 } });
    expect(hot.coneFit).to.include({ verdict: 'cooler', looksLike: 'low', strength: 'firm' });
    expect(hot.coneFit.against.ends[0]).to.include({ scale: 'temperature', cone: '1300', band: 'high' });
    expect(hot.coneFit.signals.map((s: { oxide: string; source: string }) => [s.oxide, s.source])).to.eql([
      ['B2O3', 'katz'],
      ['SiO2', 'hesselberth-roy'],
      ['Al2O3', 'hesselberth-roy']
    ]);
    expect(hot.coneFit.text).to.include('looks more like a low-fire glaze than one for 1300 °C');
    expect(hot.coneFit.text).to.include('a guide, not a test');
    expect(hot.coneFit.sources.map((s: { title: string }) => s.title).join(' ')).to.include('Katz');
    // The same figures whichever limit set is chosen.
    const set = await data('check_limits', { lines: fritty, firing: { celsius: 1300 }, limitSet: 'glazecalc' });
    expect(set.coneFit.verdict).to.equal('cooler');
    // Much soda and potash: the figures do not reach it. No firing: no check.
    const alkaline = [
      { material: 'Custer Spar', amount: 70 },
      { material: 'Whiting', amount: 10 },
      { material: 'Silica', amount: 20 }
    ];
    const skipped = await data('check_limits', { lines: alkaline, firing: { cone: '6' } });
    expect(skipped.coneFit).to.include({ verdict: 'skipped', skipped: 'alkali' });
    expect(skipped.coneFit.text).to.include("can't compare");
    expect(await data('check_limits', { lines: alkaline })).to.not.have.property('coneFit');
    // An SK cone with no measured bend says so.
    const sk = await data('check_limits', { lines: fritty, firing: { cone: '6a', chart: 'sk' } });
    expect(sk.coneFit).to.include({ verdict: 'skipped', skipped: 'noTemperature' });
  });

  it('check_limits names every limit set it takes', async () => {
    const tools = ((await rpc('tools/list')).body!.result as { tools: Json[] }).tools;
    const tool = tools.find((t) => t.name === 'check_limits')!;
    const described = tool.inputSchema.properties.limitSet.description as string;
    for (const id of Object.keys(recipe.LIMIT_SETS)) expect(described).to.include(`"${id}"`);
  });

  it('convert_cone_temperature reads the Orton and SK charts', async () => {
    expect(await data('convert_cone_temperature', { cone: '6' })).to.include({ celsius: 1222, fahrenheit: 2232 });
    const sk = recipe.inScale(1230, 'F');
    expect(await data('convert_cone_temperature', { cone: '7', chart: 'sk' })).to.include({
      celsius: 1230,
      fahrenheit: sk
    });
    const near = await data('convert_cone_temperature', { celsius: 1060 });
    expect(near.nearestOrton[0]).to.eql({ cone: '04', celsius: 1060 });
    expect(near.fahrenheit).to.equal(1940);
    expect((await call('convert_cone_temperature', {})).isError).to.equal(true);
    expect((await call('convert_cone_temperature', { cone: '99' })).isError).to.equal(true);
  });

  it('suggest_substitutes swaps old materials and suggests amounts', async () => {
    resetFits();
    const result = await data('suggest_substitutes', {
      lines: [
        { material: 'Gerstley Borate', amount: 30 },
        { material: 'Custer Spar', amount: 30 },
        { material: 'EPK', amount: 15 },
        { material: 'Silica', amount: 25 }
      ],
      region: 'US'
    });
    expect(result.swaps.map((s: { from: string }) => s.from))
      .to.include('Gerstley Borate')
      .and.include('Custer Spar');
    const names = result.recipe.map((line: { material: string }) => line.material);
    expect(names).to.not.include('Gerstley Borate');
    expect(new Set(names).size, 'each material once').to.equal(names.length);
    expect(result.changes.join(' ')).to.include('→');
    const modern = await data('suggest_substitutes', {
      lines: [
        { material: 'Silica', amount: 20 },
        { material: 'Whiting', amount: 20 }
      ]
    });
    expect(modern.swaps).to.eql([]);
  });

  it('match_from_materials remakes a recipe from what is given', async () => {
    resetFits();
    const have = ['Minspar 200', 'Whiting', 'EPK', 'Silica'];
    const result = await data('match_from_materials', { lines: LINES, have });
    const allowed = have.map((name) => findMaterial(name)!.name);
    for (const line of result.recipe) if (line.amount > 0) expect(allowed).to.include(line.material);
    const unknown = await call('match_from_materials', { lines: LINES, have: ['Moon dust'] });
    expect(unknown.isError).to.equal(true);
  });
});

describe('MCP: a tool that fails', () => {
  it('says what is wrong for a refusal it knows, and nothing about an error it does not, which it logs', async () => {
    const logged: string[] = [];
    const write = process.stderr.write.bind(process.stderr);
    const level = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'error';
    process.stderr.write = ((chunk: string) => {
      logged.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    try {
      expect(await guarded(() => Promise.reject(new ToolProblem('No such cone.')))).to.eql({
        content: [{ type: 'text', text: 'No such cone.' }],
        isError: true
      });
      const flux = Object.assign(new Error('The recipe has no flux.'), { code: 'no-flux', params: {} });
      expect(((await guarded(() => Promise.reject(flux))) as ToolResult).content[0]!.text).to.not.equal(UNEXPECTED);
      const secret = 'mongodb://admin:hunter2@db.internal/glazecalc';
      for (const err of [
        new Error('connect failed to ' + secret),
        Object.assign(new Error('getaddrinfo ' + secret), { code: 'ENOTFOUND' }),
        'thrown as a string ' + secret
      ]) {
        const result = (await guarded(() => Promise.reject(err))) as ToolResult;
        expect(result).to.eql({ content: [{ type: 'text', text: UNEXPECTED }], isError: true });
      }
    } finally {
      process.stderr.write = write;
      process.env.LOG_LEVEL = level;
    }
    expect(logged.join('')).to.include('An MCP tool failed').and.include('ENOTFOUND');
    expect(logged.join('')).to.not.include('hunter2');
  });
});

describe('MCP: the guides, resources and prompts', () => {
  const result = async (method: string, params: object = {}): Promise<Json> => {
    const answer = await rpc(method, params);
    expect(answer.status, JSON.stringify(answer.body)).to.equal(200);
    expect(answer.body!.error, JSON.stringify(answer.body!.error)).to.equal(undefined);
    return answer.body!.result as Json;
  };
  const read = async (uri: string): Promise<{ mimeType: string; text: string }> =>
    (await result('resources/read', { uri })).contents[0];

  it('search_guides finds sections, with their excerpts, addresses and resources', async () => {
    const found = await data('search_guides', { query: 'crawling' });
    expect(found.language).to.equal('en');
    expect(found).not.to.have.property('note');
    expect(found.results.length).to.be.within(1, 5);
    const defects = found.results.find((hit: Json) => hit.section === 'fit-and-defects');
    expect(defects).to.include({
      guide: 'glazing-basics',
      guideTitle: 'Glazing from first principles',
      heading: 'Glaze fit and defects',
      language: 'en',
      url: site.siteUrl() + '/guides/glazing-basics#fit-and-defects',
      resource: 'glazecalc://guides/en/glazing-basics/fit-and-defects'
    });
    expect(defects.excerpt.toLowerCase()).to.include('crawl');
    expect(defects.excerpt.length).to.be.below(260);
    // The site's own marks are made plain.
    for (const hit of found.results) expect(hit.excerpt).not.to.match(/\{\{|\*\*|:::/);

    // One guide, and a limit.
    const firing = await data('search_guides', { query: 'cone', guide: 'firing', limit: 2 });
    expect(firing.results).to.have.length(2);
    for (const hit of firing.results) expect(hit.guide).to.equal('firing');
  });

  it('search_guides searches the language asked, and the English guides where it finds nothing', async () => {
    const german = await data('search_guides', { query: 'Kegel', language: 'de-AT' });
    expect(german.language).to.equal('de');
    expect(german.results[0].url.startsWith(site.siteUrl() + '/de/guides/')).to.equal(true);
    expect(german.results[0].resource).to.match(/^glazecalc:\/\/guides\/de\//);

    // A word of the English guides that the German ones do not have. Not a
    // fixed word: a German guide shows a section in English until it is
    // translated again (npm run i18n:sources), and the search finds it there.
    const fallback = await data('search_guides', { query: onlyInEnglish('de'), language: 'de' });
    expect(fallback.language).to.equal('en');
    expect(fallback.note).to.include('English');
    expect(fallback.results[0].url).to.match(/\/de\/guides\//);
    expect(fallback.results[0].resource).to.match(/^glazecalc:\/\/guides\/en\//);

    expect((await data('search_guides', { query: 'zzqxv' })).results).to.eql([]);
    expect((await call('search_guides', { query: '' })).isError).to.equal(true);
    expect((await call('search_guides', { query: 'cone', guide: 'nope' })).isError).to.equal(true);
  });

  it('lists the guides and the cone charts as resources, and the templates for the rest', async () => {
    const { resources } = await result('resources/list');
    expect(resources.map((r: Json) => r.uri).sort()).to.eql([
      'glazecalc://cones',
      'glazecalc://guides/en/firing',
      'glazecalc://guides/en/glazing-basics',
      'glazecalc://guides/en/home-safety',
      'glazecalc://guides/en/making-a-glaze',
      'glazecalc://guides/en/safe-mixing'
    ]);
    for (const resource of resources) {
      expect(resource.name, resource.uri).to.be.a('string').and.not.equal('');
      expect(resource.mimeType, resource.uri).to.match(/^(text\/markdown|application\/json)$/);
    }
    const { resourceTemplates } = await result('resources/templates/list');
    expect(resourceTemplates.map((t: Json) => t.uriTemplate).sort()).to.eql([
      'glazecalc://guides/{language}/{guide}',
      'glazecalc://guides/{language}/{guide}/{section}',
      'glazecalc://materials/{name}'
    ]);
  });

  it('reads a guide, a section, a material and the cone charts', async () => {
    const guide = await read('glazecalc://guides/en/firing');
    expect(guide.mimeType).to.equal('text/markdown');
    expect(guide.text).to.match(/^# Firing a basic kiln\n/);
    expect(guide.text).to.include('Source: ' + site.siteUrl() + '/guides/firing');
    expect(guide.text).to.include('## The kiln sitter');
    // Both scales, Orton's parts only, and no marks of the site's own.
    expect(guide.text).to.include('180 °F (100 °C)');
    expect(guide.text).not.to.match(/\{\{|^:::/m);

    const section = await read('glazecalc://guides/de/firing/cone-pack');
    expect(section.text).to.match(/^# Brennen mit einem einfachen Ofen\n\n## Einen Kegelsatz aufstellen\n/);
    expect(section.text).to.include('Source: ' + site.siteUrl() + '/de/guides/firing#cone-pack');

    // Who to call is drawn for the reader's country on the site: the resource says so.
    const swallowed = await read('glazecalc://guides/en/home-safety/if-something-is-swallowed');
    expect(swallowed.text).to.include(
      '(The guide on the website shows who to call for poison advice in your country: ' +
        site.siteUrl() +
        '/guides/home-safety#if-something-is-swallowed)'
    );

    // A language not offered is answered in English.
    expect((await read('glazecalc://guides/xx/firing')).text).to.match(/^# Firing a basic kiln/);

    const material = JSON.parse((await read('glazecalc://materials/Custer%20Spar')).text);
    expect(material.name).to.equal(findMaterial('Custer Spar')!.name);
    expect(material.oxides).to.have.property('SiO2');

    const charts = JSON.parse((await read('glazecalc://cones')).text);
    expect(charts.orton.cones).to.deep.include({ cone: '6', celsius: 1222, fahrenheit: 2232 });
    expect(charts.sk.cones.length).to.be.above(30);

    for (const uri of [
      'glazecalc://guides/en/nope',
      'glazecalc://guides/en/firing/nope',
      'glazecalc://materials/Unobtainium',
      'glazecalc://elsewhere'
    ]) {
      const answer = await rpc('resources/read', { uri });
      expect(answer.body!.error, uri).to.have.property('code');
    }
  });

  it('offers four prompts, each naming the tools to use', async () => {
    const { prompts } = await result('prompts/list');
    expect(prompts.map((p: Json) => p.name).sort()).to.eql([
      'diagnose_glaze_fault',
      'explain_recipe',
      'make_lead_free',
      'replace_discontinued'
    ]);
    for (const prompt of prompts) {
      expect(prompt.description, prompt.name).to.have.length.above(40);
      expect(
        prompt.arguments.find((a: Json) => a.name === 'recipe'),
        prompt.name
      ).to.include({ required: true });
    }

    const recipeText = 'Custer Spar 40, Silica 30, Whiting 20, EPK 10';
    const diagnosis = await result('prompts/get', {
      name: 'diagnose_glaze_fault',
      arguments: { recipe: recipeText, fault: 'crawling', cone: '6', language: 'de' }
    });
    const [ask, guide] = diagnosis.messages;
    expect(ask.role).to.equal('user');
    for (const part of [
      recipeText,
      'crawling',
      'fired to 6',
      'analyze_recipe',
      'check_limits',
      'search_guides',
      'language: "de"',
      'leach test'
    ]) {
      expect(ask.content.text).to.include(part);
    }
    expect(guide.content.type).to.equal('resource');
    expect(guide.content.resource).to.include({
      uri: 'glazecalc://guides/de/glazing-basics/fit-and-defects',
      mimeType: 'text/markdown'
    });

    const leadFree = await result('prompts/get', {
      name: 'make_lead_free',
      arguments: { recipe: 'Lead Bisilicate 60, EPK 20, Silica 20', region: 'UK' }
    });
    expect(leadFree.messages[0].content.text).to.include('suggest_substitutes');
    expect(leadFree.messages[0].content.text).to.include('I buy materials in UK.');
    expect(leadFree.messages[0].content.text).not.to.include('Answer in the language');

    for (const name of ['replace_discontinued', 'explain_recipe']) {
      const got = await result('prompts/get', { name, arguments: { recipe: recipeText } });
      expect(got.messages[0].content.text, name).to.include(recipeText);
    }
    // The recipe is required.
    expect((await rpc('prompts/get', { name: 'explain_recipe', arguments: {} })).body!.error).to.have.property('code');
  });

  it('completes a fault, a guide and a language', async () => {
    const complete = async (ref: object, argument: object) =>
      ((await result('completion/complete', { ref, argument })).completion as Json).values;
    const guides = { type: 'ref/resource', uri: 'glazecalc://guides/{language}/{guide}' };
    expect(await complete({ type: 'ref/prompt', name: 'diagnose_glaze_fault' }, { name: 'fault', value: 'cr' })).to.eql(
      ['crawling', 'crazing']
    );
    expect(await complete(guides, { name: 'guide', value: 'f' })).to.eql(['firing']);
    expect(await complete(guides, { name: 'language', value: 'zh' })).to.have.members(['zh-Hans', 'zh-Hant']);
  });
});

describe('MCP: personal access tokens', () => {
  it('adds the account tools for a working token, and records its use', async () => {
    const { user } = await makeUser();
    const token = await makeToken(user);
    // The write tools too, so an assistant with a read-only token can say why it changes nothing.
    expect(await toolNames(bearer(token))).to.eql([...PUBLIC_TOOLS, ...ACCOUNT_TOOLS, ...WRITE_TOOLS].sort());
    expect((await AccessToken.findOne({ hash: hashToken(token) }))!.lastUsedAt).to.be.an.instanceOf(Date);
  });

  it('answers a list tool that fails with the same plain refusal as the others, never the error', async () => {
    const { user } = await makeUser();
    const headers = bearer(await makeToken(user));
    const secret = 'mongodb://admin:hunter2@db.internal/glazecalc';
    const write = process.stderr.write.bind(process.stderr);
    const counts = [Recipe, Material].map((model) => [model, model.countDocuments] as const);
    process.stderr.write = (() => true) as typeof process.stderr.write;
    for (const [model] of counts) {
      (model as { countDocuments: unknown }).countDocuments = () =>
        Promise.reject(new Error('connect failed to ' + secret));
    }
    try {
      for (const name of ['list_recipes', 'list_my_materials']) {
        const result = await call(name, {}, headers);
        expect(result, name).to.eql({ content: [{ type: 'text', text: UNEXPECTED }], isError: true });
      }
    } finally {
      for (const [model, original] of counts) (model as { countDocuments: unknown }).countDocuments = original;
      process.stderr.write = write;
    }
  });

  it('answers 401 with the metadata for a token that does not work, and never takes the session', async () => {
    const { user, token: session } = await makeUser();
    const trial = sessionToken(await api().post('/guest').send({}))!;
    const trialUser = await User.findOne({ guest: true }).sort({ _id: -1 });
    const tries = {
      unknown: 'glazecalc_pat_' + 'a'.repeat(49),
      expired: await makeToken(user, { expiresAt: new Date(Date.now() - DAY) }),
      revoked: await makeToken(user, { revokedAt: new Date() }),
      trial: await makeToken(trialUser!),
      oauth: await makeToken(user, { kind: 'oauth' }),
      session
    };
    for (const [what, token] of Object.entries(tries)) {
      const answer = await rpc('tools/list', {}, bearer(token));
      expect(answer.status, what).to.equal(401);
      const challenge = answer.headers.get('www-authenticate')!;
      expect(challenge, what).to.match(/^Bearer realm="glazecalc", error="invalid_token"/);
      expect(challenge, what).to.include(
        'resource_metadata="https://glazecalc.test/.well-known/oauth-protected-resource/mcp"'
      );
      expect(answer.headers.get('set-cookie'), what).to.equal(null);
    }
    const basic = await rpc('tools/list', {}, { authorization: 'Basic dXNlcjpwYXNz' });
    expect(basic.status).to.equal(401);
    expect(basic.headers.get('www-authenticate')).to.include('error="invalid_request"');
    // A session cookie riding along is not read: the public tools only.
    expect(await toolNames({ cookie: 'glazecalc_session=' + session })).to.eql(PUBLIC_TOOLS);
    expect(await toolNames({ cookie: 'glazecalc_session=' + trial })).to.eql(PUBLIC_TOOLS);
  });

  describe('the read tools', () => {
    let headers: Record<string, string>;
    let recipeId: string;
    let otherRecipeId: string;
    let firingId: string;
    let goneId: string;
    let mine: Awaited<ReturnType<typeof makeUser>>;

    before(async () => {
      mine = await makeUser();
      const other = await makeUser();
      headers = bearer(await makeToken(mine.user));
      const session = { Authorization: 'Bearer ' + mine.token };
      const material = (name: string, amount: number) => ({ ...findMaterial(name)!, amount: String(amount) });
      const made = await api()
        .post('/recipe/create')
        .set(session)
        .send({
          title: 'Satin white',
          materials: [
            material('Custer Spar', 40),
            material('Whiting', 20),
            material('EPK', 20),
            material('Silica', 20)
          ],
          notes: ['Lovely on porcelain']
        });
      expect(made).to.have.status(200);
      recipeId = made.body._id;
      await api()
        .post('/recipe/create')
        .set(session)
        .send({ title: 'Old celadon', materials: [material('Silica', 50), material('Whiting', 50)] });
      const gone = await api()
        .post('/recipe/create')
        .set(session)
        .send({ title: 'In the Trash', materials: [material('Silica', 50)] });
      await api().post('/notes/create').set(session).send({
        title: 'Gone with it',
        content: 'About the recipe in the Trash',
        relatedCollection: 'recipes',
        relatedId: gone.body._id
      });
      goneId = gone.body._id;
      await api()
        .delete('/recipe/delete/' + gone.body._id)
        .set(session);
      const theirs = await api()
        .post('/recipe/create')
        .set({ Authorization: 'Bearer ' + other.token })
        .send({ title: 'Not yours', materials: [material('Silica', 50)] });
      otherRecipeId = theirs.body._id;
      const firing = await api()
        .post('/firing/create')
        .set(session)
        .send({
          title: 'Bisque 04',
          kiln: 'Skutt',
          fieldsIncluded: ['time', 'temperature'],
          rows: [
            ['0:00', '20'],
            ['8:00', '1060']
          ]
        });
      firingId = firing.body._id;
      await api().post('/notes/create').set(session).send({
        title: 'Test tiles',
        content: 'Crawled at the rim',
        relatedCollection: 'recipes',
        relatedId: recipeId
      });
      await api()
        .post('/materials/create')
        .set(session)
        .send({
          name: 'Local red clay',
          fields: [
            { name: 'SiO2', amount: '60' },
            { name: 'Al2O3', amount: '20' },
            { name: 'Fe2O3', amount: '6' }
          ],
          formulaweight: 1,
          loi: 8,
          molecularweight: 1,
          percentmole: 'percent',
          equivalent: 1
        });
      // The shelf keeps a standard material's id, as the app's libraryKey does.
      const standard = standardData.load<{ _id: unknown; name: string }>('materials');
      const shelf = ['Minspar 200', 'Whiting', 'EPK Kaolin', 'Silica'].map((name) =>
        String(standard.find((m) => m.name === name)!._id)
      );
      await User.updateOne({ _id: mine.user._id }, { $set: { shelf, 'preferences.region': 'US' } });
    });

    it('list and get only the account’s own recipes, never one in the Trash', async () => {
      const list = await data('list_recipes', {}, headers);
      expect(list.recipes.map((r: { title: string }) => r.title)).to.eql(['Old celadon', 'Satin white']);
      expect(list.total).to.equal(2);
      const search = await data('list_recipes', { search: 'custer' }, headers);
      expect(search.recipes.map((r: { title: string }) => r.title)).to.eql(['Satin white']);
      const one = await data('get_recipe', { id: recipeId, firing: { cone: '6' } }, headers);
      expect(one).to.include({ title: 'Satin white', notes: 'Lovely on porcelain' });
      expect(one.materials).to.have.length(4);
      expect(one.analysis.unityFormula.SiO2).to.be.above(2);
      expect(one.checks.band).to.equal('mid');
      // The account's limit set (Hesselberth & Roy's until another is chosen); nothing saved, no check.
      expect(one.checks.limitSet.id).to.equal('hesselberth-roy');
      expect(one).to.not.have.property('firing');
      expect(one).to.not.have.property('sgTarget');
      // The chemistry against the firing asked about: a stoneware glaze with no boron at cone 6 fits; at cone 04, it looks hotter.
      expect(one.coneFit).to.include({ verdict: 'fits', looksLike: null });
      const low = await data('get_recipe', { id: recipeId, firing: { cone: '04' } }, headers);
      expect(low.coneFit).to.include({ verdict: 'hotter', strength: 'firm' });
      expect(low.coneFit.text).to.include('where food or drink will touch');
      expect((await data('get_recipe', { id: recipeId }, headers)).checks).to.equal(undefined);
      expect(await data('get_recipe', { id: recipeId }, headers)).to.not.have.property('coneFit');
      const theirs = await call('get_recipe', { id: otherRecipeId }, headers);
      expect(theirs.isError).to.equal(true);
      expect((await call('get_recipe', { id: 'nonsense' }, headers)).isError).to.equal(true);
    });

    it('get_recipe checks a recipe for its saved firing band against the limit set chosen in Settings', async () => {
      await Recipe.updateOne({ _id: recipeId }, { $set: { firing: 'high', sgTarget: 1.45 } });
      await User.updateOne({ _id: mine.user._id }, { $set: { 'preferences.limitSet': 'glazecalc' } });
      try {
        const saved = await data('get_recipe', { id: recipeId }, headers);
        expect(saved).to.include({ firing: 'high', sgTarget: 1.45 });
        expect(saved.checks.limitSet.id).to.equal('glazecalc');
        // The app's own set has no high band: cone 10 is checked as mid fire, as the recipe page does.
        expect(saved.checks.bandUsed).to.equal('mid');
        expect(saved.checks.firingFrom).to.equal('recipe');
        expect(saved.checks).to.not.have.property('celsius');
        // The band chosen on the recipe, read at its cone (10), as the recipe page does.
        expect(saved.coneFit.against).to.deep.include({ bands: ['high'], chosen: 'high' });
        await User.updateOne({ _id: mine.user._id }, { $set: { 'preferences.limitSet': 'hesselberth-roy' } });
        expect((await data('get_recipe', { id: recipeId }, headers)).checks.band).to.equal('high');
        // A firing asked about wins over the saved one.
        const asked = await data('get_recipe', { id: recipeId, firing: { cone: '04' } }, headers);
        expect(asked.checks.band).to.equal('low');
        expect(asked.checks).to.not.have.property('firingFrom');
      } finally {
        await Recipe.updateOne({ _id: recipeId }, { $unset: { firing: 1, sgTarget: 1 } });
        await User.updateOne({ _id: mine.user._id }, { $unset: { 'preferences.limitSet': 1 } });
      }
    });

    it('get_recipe gives the stated firing and checks a range at both its bands; list_recipes filters by cone and atmosphere', async () => {
      await Recipe.updateOne(
        { _id: recipeId },
        {
          $set: {
            firedAt: { scale: 'orton', low: '6', high: '10', tested: ['10'], atmospheres: ['reduction'] },
            foodSurface: true,
            // The second log is gone (in the Trash, or deleted): an assistant is never given its id.
            firings: [
              { firing: firingId, result: 'glossy', cone: '10', atmosphere: 'reduction' },
              { firing: new mongoose.Types.ObjectId().toString() }
            ],
            // A result at a cone outside the range is kept, and given as it is.
            coneResults: [
              { cone: '10', atmosphere: 'reduction', summary: 'Glossy, breaks brown on edges' },
              { cone: '5', summary: 'Underfired' }
            ]
          }
        }
      );
      try {
        const one = await data('get_recipe', { id: recipeId }, headers);
        expect(one.firedAt).to.eql({
          scale: 'orton',
          low: '6',
          high: '10',
          tested: ['10'],
          atmospheres: ['reduction'],
          bands: ['mid', 'high']
        });
        expect(one.foodSurface).to.equal(true);
        expect(one.firings).to.eql([{ firingId, result: 'glossy', cone: '10', atmosphere: 'reduction' }]);
        expect(one.coneResults).to.eql([
          { cone: '10', atmosphere: 'reduction', summary: 'Glossy, breaks brown on edges' },
          { cone: '5', summary: 'Underfired' }
        ]);
        expect(one.checks.band).to.equal('mid');
        expect(one.checks.firingFrom).to.equal('firedAt');
        expect(one.checksAtOtherBands.high.band).to.equal('high');
        expect(one.coneFit.against.bands).to.eql(['mid', 'high']);
        expect(one.coneFit.verdict).to.equal('fits');
        const titles = (list: Json) => list.recipes.map((r: { title: string }) => r.title);
        expect(titles(await data('list_recipes', { cone: '8' }, headers))).to.eql(['Satin white']);
        expect(titles(await data('list_recipes', { cone: '06' }, headers))).to.eql([]);
        expect(titles(await data('list_recipes', { cone: '8', scale: 'sk' }, headers))).to.eql([]);
        // Across scales, approximately: SK 12 is Kyoto's Orton 10; a temperature within 15 °C of the range.
        expect(titles(await data('list_recipes', { cone: '12', scale: 'sk' }, headers))).to.eql(['Satin white']);
        expect(titles(await data('list_recipes', { cone: '1240', scale: 'temperature' }, headers))).to.eql([
          'Satin white'
        ]);
        expect(titles(await data('list_recipes', { cone: '1100', scale: 'temperature' }, headers))).to.eql([]);
        expect(titles(await data('list_recipes', { atmosphere: 'reduction' }, headers))).to.eql(['Satin white']);
        expect(titles(await data('list_recipes', { atmosphere: 'oxidation' }, headers))).to.eql([]);
        expect((await data('list_recipes', { cone: '10' }, headers)).recipes[0].firedAt.tested).to.eql(['10']);
        expect((await call('list_recipes', { cone: '6a' }, headers)).isError).to.equal(true);
      } finally {
        await Recipe.updateOne(
          { _id: recipeId },
          { $unset: { firedAt: 1, foodSurface: 1, firings: 1, coneResults: 1 } }
        );
      }
    });

    it('read the materials, the shelf, the firing logs, the notebook and the settings', async () => {
      const materials = await data('list_my_materials', {}, headers);
      expect(materials.materials.map((m: { name: string }) => m.name)).to.eql(['Local red clay']);
      expect(materials.materials[0].oxides.Fe2O3).to.equal(6);
      const shelf = await data('get_shelf', {}, headers);
      expect(shelf.materials).to.include('Whiting');
      const firings = await data('list_firings', {}, headers);
      expect(firings.firings[0]).to.include({ title: 'Bisque 04', kiln: 'Skutt', rows: 2 });
      const firing = await data('get_firing', { id: firingId }, headers);
      expect(firing.columns).to.eql(['time', 'temperature']);
      const notes = await data('list_notes', { about: recipeId }, headers);
      expect(notes.notes[0]).to.include({ content: 'Crawled at the rim' });
      // Not the notes about a record in the Trash, asked for or not.
      const all = await data('list_notes', {}, headers);
      expect(all.notes.map((n: { content: string }) => n.content)).to.eql(['Crawled at the rim']);
      expect(all.total).to.equal(1);
      expect((await data('list_notes', { about: goneId }, headers)).total).to.equal(0);
      expect((await data('list_notes', { search: 'Trash' }, headers)).total).to.equal(0);
      const settings = await data('get_my_settings', {}, headers);
      expect(settings.region).to.equal('US');
      expect(settings).to.include({ limitSet: 'hesselberth-roy', currency: '' });
      await User.updateOne(
        { _id: mine.user._id },
        { $set: { 'preferences.currency': 'EUR', prices: [{ key: 'library:whiting', perKg: 1.25 }] } }
      );
      const priced = await data('get_my_settings', {}, headers);
      expect(priced.currency).to.equal('EUR');
      // The currency, never the prices.
      expect(JSON.stringify(priced)).to.not.include('1.25');
      expect(priced).to.not.have.property('prices');
    });

    it('match_with_what_i_have uses the account’s shelf', async () => {
      resetFits();
      const match = await data('match_with_what_i_have', { recipeId }, headers);
      const names = match.recipe
        .filter((line: { amount: number }) => line.amount > 0)
        .map((line: { material: string }) => line.material);
      expect(names).to.not.include('Custer Spar');
      expect(names).to.include('Minspar 200');
      expect((await call('match_with_what_i_have', {}, headers)).isError).to.equal(true);
    });
  });
});

/** Opens a subscription stream (subscriptions/listen, 2026-07-28); resolves once its headers come. */
const listen = async (signal: AbortSignal): Promise<globalThis.Response> =>
  fetch(base() + '/mcp', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2026-07-28',
      'mcp-method': 'subscriptions/listen'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++id,
      method: 'subscriptions/listen',
      params: {
        notifications: { toolsListChanged: true },
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' },
          'io.modelcontextprotocol/clientCapabilities': {}
        }
      }
    })
  });

const until = async (ok: () => boolean, what: string): Promise<void> => {
  for (let i = 0; i < 100 && !ok(); i++) await new Promise((resolve) => setTimeout(resolve, 20));
  expect(ok(), what).to.equal(true);
};

describe('MCP: the write tools', () => {
  let mine: Awaited<ReturnType<typeof makeUser>>;
  let headers: Record<string, string>;
  let ownedBy: string;
  beforeEach(async () => {
    mine = await makeUser();
    ownedBy = String(mine.user._id);
    headers = bearer(await makeToken(mine.user, { scopes: ['data:write'] }));
  });
  afterEach(() => {
    process.env.RATE_LIMITS = 'off';
  });

  it('say they change things, and need a token that can', async () => {
    const tools = ((await rpc('tools/list', {}, headers)).body!.result as { tools: Json[] }).tools;
    for (const name of WRITE_TOOLS) {
      const tool = tools.find((t) => t.name === name)!;
      expect(tool.annotations, name).to.include({ readOnlyHint: false, openWorldHint: false });
      expect(tool.description, name).to.include('Needs an access token that can read and change your records.');
    }
    const init = await rpc('initialize', {
      protocolVersion: PROTOCOL,
      capabilities: {},
      clientInfo: { name: 't', version: '1' }
    });
    const instructions = (init.body!.result as { instructions: string }).instructions;
    expect(instructions).to.include('move_to_trash').and.include('read-only token').and.not.include('never change');
  });

  it('refuse a read-only token, changing nothing', async () => {
    const read = bearer(await makeToken(mine.user, { scopes: ['data:read'] }));
    const id = (
      await api()
        .post('/recipe/create')
        .set('Authorization', 'Bearer ' + mine.token)
        .send({ title: 'Mine', materials: [{ name: 'Silica', amount: '1' }] })
    ).body._id as string;
    const calls: Array<[string, object]> = [
      ['create_recipe', { title: 'New', lines: LINES }],
      ['update_recipe', { id, title: 'Changed' }],
      ['add_notebook_entry', { content: 'Hello' }],
      ['add_my_material', { name: 'Spar', analysis: { SiO2: 70, Al2O3: 18, K2O: 12 } }],
      ['update_my_material', { id, name: 'x' }],
      ['add_to_shelf', { materials: ['Silica'] }],
      ['remove_from_shelf', { materials: ['Silica'] }],
      ['undo_shelf_change', {}],
      ['move_to_trash', { kind: 'recipe', id }]
    ];
    for (const [name, args] of calls) {
      const result = await call(name, args, read);
      expect(result.isError, name).to.equal(true);
      expect(result.content[0]!.text, name).to.equal(READ_ONLY_TOKEN);
    }
    expect(await Recipe.countDocuments({ ownedBy })).to.equal(1);
    expect((await Recipe.findById(id))!.title).to.equal('Mine');
    expect(await Activity.countDocuments({ ownedBy })).to.equal(0);
    expect((await User.findById(mine.user._id))!.shelf ?? []).to.eql([]);
  });

  it('create_recipe saves a recipe with the unity formula the server works out, as the account’s', async () => {
    const made = await data(
      'create_recipe',
      {
        title: 'Satin',
        lines: LINES,
        colorants: [{ name: 'Cobalt Carbonate', amount: 1 }],
        notes: 'From the assistant',
        firing: 'mid'
      },
      headers
    );
    const expected = await data('analyze_recipe', { lines: LINES }, headers);
    expect(made.analysis.unityFormula).to.eql(expected.unityFormula);
    const saved = (await Recipe.findById(made.id).lean())!;
    expect(saved).to.include({ ownedBy, title: 'Satin', firing: 'mid', includeAdditives: false });
    expect(saved.notes).to.eql(['From the assistant']);
    expect(saved.materials).to.have.length(4);
    // A library material keeps the id the app keeps for it.
    expect((saved.materials[0] as { _id?: string })._id).to.be.a('string');
    expect((saved.computed[0] as { uList: Record<string, number> }).uList.SiO2).to.be.closeTo(
      expected.unityFormula.SiO2,
      0.01
    );
    expect(saved.additives).to.have.length(1);
    expect(saved.additives[0]).to.include({ name: 'Cobalt carbonate', amount: '1', unit: 'percent' });
    const [line] = await Activity.find({ ownedBy }).lean();
    expect(line).to.include({ action: 'create', fromCollection: 'recipes', via: 'pat', title: 'Satin' });
    expect(line!.client).to.equal('Test token');
    // It reads as any other.
    expect((await data('list_recipes', {}, headers)).recipes[0].title).to.equal('Satin');
    // A material not found, or a recipe with no flux, is refused and nothing is saved.
    for (const lines of [[{ material: 'Unobtainium', amount: 10 }], [{ material: 'Silica', amount: 10 }]]) {
      const refused = await call('create_recipe', { title: 'Bad', lines }, headers);
      expect(refused.isError).to.equal(true);
    }
    expect(await Recipe.countDocuments({ ownedBy })).to.equal(1);
  });

  it('keep within the account’s limit on records', async () => {
    process.env.ACCOUNT_MAX_RECORDS = '1';
    try {
      expect((await call('add_notebook_entry', { content: 'One' }, headers)).isError).to.not.equal(true);
      const tries: Array<[string, object]> = [
        ['create_recipe', { title: 'Two', lines: LINES }],
        ['add_notebook_entry', { content: 'Two' }],
        ['add_my_material', { name: 'Spar', analysis: { SiO2: 70, Al2O3: 18, K2O: 12 } }]
      ];
      for (const [name, args] of tries) {
        const refused = await call(name, args, headers);
        expect(refused.isError, name).to.equal(true);
        expect(refused.content[0]!.text, name).to.include('An account can keep up to 1 records');
      }
    } finally {
      delete process.env.ACCOUNT_MAX_RECORDS;
    }
  });

  it('update_recipe changes only the account’s own recipe, keeping a version Undo puts back', async () => {
    const { id } = await data('create_recipe', { title: 'Satin', lines: LINES }, headers);
    const changed = await data(
      'update_recipe',
      { id, title: 'Satin 2', lines: [...LINES.slice(0, 3), { material: 'Silica', amount: 30 }] },
      headers
    );
    expect(changed.changed).to.have.members(['title', 'materials']);
    expect(changed.analysis.unityFormula.SiO2).to.be.above(0);
    const versions = await RecordVersion.find({ ownedBy, recordId: id }).lean();
    expect(versions).to.have.length(1);
    expect(versions[0]).to.include({ by: 'pat', fromCollection: 'recipes' });
    const log = await Activity.find({ ownedBy }).sort({ at: 1, _id: 1 }).lean();
    expect(log.map((l) => [l.action, l.title])).to.eql([
      ['create', 'Satin'],
      ['change', 'Satin 2']
    ]);
    const undone = await api()
      .post('/recipe/undo/' + id)
      .set('Authorization', 'Bearer ' + mine.token);
    expect(undone.body.record.title).to.equal('Satin');

    const other = await makeUser();
    const theirs = (
      await api()
        .post('/recipe/create')
        .set('Authorization', 'Bearer ' + other.token)
        .send({ title: 'Theirs', materials: [{ name: 'Silica', amount: '1' }] })
    ).body._id as string;
    for (const target of [theirs, 'not-an-id', new mongoose.Types.ObjectId().toString()]) {
      const refused = await call('update_recipe', { id: target, title: 'Mine now' }, headers);
      expect(refused.isError, target).to.equal(true);
      expect(refused.content[0]!.text).to.include('No recipe with id');
    }
    expect((await Recipe.findById(theirs))!.title).to.equal('Theirs');
    expect((await call('update_recipe', { id }, headers)).isError).to.equal(true);
  });

  it('add_notebook_entry adds to the Notebook page', async () => {
    const { id } = await data('add_notebook_entry', { title: 'Tiles', content: 'Crawled at the rim' }, headers);
    const note = (await Note.findById(id).lean())!;
    expect(note).to.include({ ownedBy, relatedCollection: 'Notes', relatedId: 'general notes', title: 'Tiles' });
    const listed = await data('list_notes', {}, headers);
    expect(listed.notes.map((n: { id: string }) => n.id)).to.include(id);
  });

  it('add_my_material and update_my_material keep the account’s materials, by name, with versions', async () => {
    const added = await data(
      'add_my_material',
      { name: 'Local spar', analysis: { SiO2: 68, Al2O3: 18, K2O: 10, Na2O: 3 }, loi: 0.5 },
      headers
    );
    const saved = (await Material.findById(added.id).lean())!;
    expect(saved).to.include({ ownedBy, percentmole: 'percent', loi: 0.5 });
    expect(saved.fields).to.have.length(4);
    expect(saved.equivalent).to.be.above(0);
    // Another of the same name is refused; a recipe can use it by name.
    const twice = await call('add_my_material', { name: 'local SPAR', analysis: { SiO2: 1 } }, headers);
    expect(twice.content[0]!.text).to.include('You already have a material named Local spar');
    await data(
      'create_recipe',
      { title: 'With mine', lines: [{ material: 'Local spar', amount: 60 }, ...LINES.slice(1)] },
      headers
    );

    const changed = await data('update_my_material', { id: added.id, name: 'Local spar 2', loi: 1 }, headers);
    expect(changed.changed).to.have.members(['name', 'loi', 'fields']);
    expect((await Material.findById(added.id).lean())!).to.include({ name: 'Local spar 2', loi: 1 });
    expect(await RecordVersion.countDocuments({ ownedBy, recordId: added.id, by: 'pat' })).to.equal(1);
    const other = await makeUser();
    const copy: Record<string, unknown> = { ...saved };
    delete copy._id;
    const theirs = await Material.create({ ...copy, ownedBy: String(other.user._id) });
    const refused = await call('update_my_material', { id: String(theirs._id), name: 'x' }, headers);
    expect(refused.content[0]!.text).to.include('No material with id');
  });

  it('add_to_shelf and remove_from_shelf keep the shelf as the app does', async () => {
    const added = await data('add_to_shelf', { materials: ['Whiting', 'epk', 'Silica'] }, headers);
    expect(added.added).to.have.length(3);
    const shelf = (await User.findById(mine.user._id))!.shelf!;
    const standard = standardData.load<{ _id: unknown; name: string }>('materials');
    expect(shelf).to.include(String(standard.find((m) => m.name === 'Whiting')!._id));
    expect((await data('get_shelf', {}, headers)).materials).to.have.length(3);
    // Twice is once.
    await data('add_to_shelf', { materials: ['Whiting'] }, headers);
    expect((await User.findById(mine.user._id))!.shelf).to.have.length(3);
    const unknown = await call('add_to_shelf', { materials: ['Unobtainium'] }, headers);
    expect(unknown.isError).to.equal(true);

    const removed = await data('remove_from_shelf', { materials: ['Whiting', 'Custer Spar'] }, headers);
    expect(removed.removed).to.eql(['Whiting']);
    expect(removed.notOnShelf).to.eql(['Custer Spar']);
    expect((await User.findById(mine.user._id))!.shelf).to.have.length(2);
  });

  it('keep the shelf as it was before a change, undo_shelf_change puts it back once, and each change is logged', async () => {
    const nothing = await call('undo_shelf_change', {}, headers);
    expect(nothing.isError).to.equal(true);
    expect(nothing.content[0]!.text).to.include('no change to the shelf');
    await data('add_to_shelf', { materials: ['Whiting'] }, headers);
    const first = (await User.findById(mine.user._id))!.shelf!;
    await data('add_to_shelf', { materials: ['Silica', 'EPK'] }, headers);
    const shelf = (await User.findById(mine.user._id))!.shelf!;
    expect(shelf).to.have.length(3);
    // The new materials come after the earlier one, which Undo keeps.
    expect(shelf[0]).to.equal(first[0]);
    expect((await User.findById(mine.user._id))!.shelfPrevious).to.eql(first);
    // Twice is once, and a change that changes nothing keeps the earlier list for Undo.
    await data('add_to_shelf', { materials: ['Whiting'] }, headers);
    expect((await User.findById(mine.user._id))!.shelfPrevious).to.eql(first);
    const removed = await data('remove_from_shelf', { materials: ['Silica'] }, headers);
    expect(removed.undo).to.include('undo_shelf_change');
    expect((await User.findById(mine.user._id))!.shelfPrevious).to.eql(shelf);
    const undone = await data('undo_shelf_change', {}, headers);
    expect(undone).to.eql({ restored: true, materialsOnShelf: 3 });
    expect((await User.findById(mine.user._id))!.shelf).to.eql(shelf);
    expect((await call('undo_shelf_change', {}, headers)).isError).to.equal(true);
    const lines = await Activity.find({ ownedBy, fromCollection: 'shelf' }).sort({ at: 1, _id: 1 }).lean();
    expect(lines.map((l) => [l.action, l.title, l.via])).to.eql([
      ['change', 'Whiting', 'pat'],
      ['change', 'Silica, EPK Kaolin', 'pat'],
      ['change', 'Silica', 'pat'],
      ['undo', 'Shelf', 'pat']
    ]);
  });

  it('move_to_trash moves the account’s own record to the Trash, never deleting it', async () => {
    const { id } = await data('create_recipe', { title: 'Satin', lines: LINES }, headers);
    const shared = await api()
      .post('/share/recipe/' + id)
      .set('Authorization', 'Bearer ' + mine.token);
    const moved = await data('move_to_trash', { kind: 'recipe', id }, headers);
    expect(moved).to.include({ kind: 'recipe', id, title: 'Satin' });
    expect(await Recipe.countDocuments({ _id: id })).to.equal(0);
    const entry = (await Trash.findOne({ ownedBy, recordId: id }).lean())!;
    expect(entry).to.include({ fromCollection: 'recipes', by: 'pat' });
    // Its share link stopped.
    expect(shared).to.have.status(200);
    expect(await ShareLink.countDocuments({ recipeId: id })).to.equal(0);
    expect((await Activity.findOne({ ownedBy, action: 'trash' }).lean())!.title).to.equal('Satin');
    // Put back on the website, it is as it was.
    const back = await api()
      .post('/trash/restore/' + String(entry._id))
      .set('Authorization', 'Bearer ' + mine.token);
    expect(back.body.record.title).to.equal('Satin');

    const other = await makeUser();
    const theirs = (
      await api()
        .post('/notes/create')
        .set('Authorization', 'Bearer ' + other.token)
        .send({ content: 'Theirs', relatedCollection: 'Notes', relatedId: 'general notes' })
    ).body._id as string;
    const refused = await call('move_to_trash', { kind: 'note', id: theirs }, headers);
    expect(refused.content[0]!.text).to.include('No notebook entry with id');
    expect(await Note.countDocuments({ _id: theirs })).to.equal(1);
    // The wrong kind finds nothing either.
    expect((await call('move_to_trash', { kind: 'firing', id }, headers)).isError).to.equal(true);
  });

  it('move_to_trash is refused when the Trash is full, and past the token’s removals an hour', async () => {
    const recipes = await Recipe.insertMany(
      Array.from({ length: 2 }, (_, i) => ({ title: 'R' + i, materials: [{}], ownedBy }))
    );
    await Trash.insertMany(
      Array.from({ length: TRASH_MAX_ACCOUNT }, () => ({
        ownedBy,
        fromCollection: 'notes',
        record: {},
        trashedAt: new Date()
      }))
    );
    const full = await call('move_to_trash', { kind: 'recipe', id: String(recipes[0]!._id) }, headers);
    expect(full.content[0]!.text).to.include('the Trash is full');
    expect(await Recipe.countDocuments({ ownedBy })).to.equal(2);
    await Trash.deleteMany({ ownedBy });

    const row = (await AccessToken.findOne({ userId: mine.user._id }))!;
    process.env.RATE_LIMITS = 'on';
    for (let i = 0; i < TOKEN_DELETES_PER_HOUR; i++) expect(await countTokenDelete(String(row._id))).to.equal(true);
    const over = await call('move_to_trash', { kind: 'recipe', id: String(recipes[1]!._id) }, headers);
    expect(over.content[0]!.text).to.include(`moved ${TOKEN_DELETES_PER_HOUR} records to the Trash`);
    expect(await Recipe.countDocuments({ ownedBy })).to.equal(2);
  });

  it(`count against the account’s ${TOKEN_WRITE_LIMITS.minute} changes a minute, with the record routes`, async function () {
    this.timeout(30000);
    process.env.RATE_LIMITS = 'on';
    for (let i = 0; i < TOKEN_WRITE_LIMITS.minute; i++) {
      expect((await call('add_notebook_entry', { content: 'n' + i }, headers)).isError).to.not.equal(true);
    }
    const over = await call('add_notebook_entry', { content: 'over' }, headers);
    expect(over.content[0]!.text).to.equal(TOO_MANY_CHANGES);
    // The same count as the record routes, for any token of the account; reading goes on.
    const rest = await api()
      .post('/notes/create')
      .set('Authorization', 'Bearer ' + (await makeToken(mine.user, { scopes: ['data:write'] })))
      .send({ content: 'x', relatedCollection: 'Notes', relatedId: 'general notes' });
    expect(rest).to.have.status(429);
    expect((await call('list_notes', {}, headers)).isError).to.not.equal(true);
    expect(await Note.countDocuments({ ownedBy })).to.equal(TOKEN_WRITE_LIMITS.minute);
  });

  it('stop the moment the token is revoked, and never take an OAuth token', async () => {
    expect((await call('add_notebook_entry', { content: 'Before' }, headers)).isError).to.not.equal(true);
    const row = (await AccessToken.findOne({ userId: mine.user._id }))!;
    await api()
      .delete('/tokens/' + String(row._id))
      .set('Authorization', 'Bearer ' + mine.token);
    const after = await rpc('tools/call', { name: 'add_notebook_entry', arguments: { content: 'After' } }, headers);
    expect(after.status).to.equal(401);
    const oauth = await makeToken(mine.user, { kind: 'oauth', scopes: ['data:write'] });
    const viaOauth = await rpc(
      'tools/call',
      { name: 'add_notebook_entry', arguments: { content: 'OAuth' } },
      bearer(oauth)
    );
    expect(viaOauth.status).to.equal(401);
    expect(await Note.countDocuments({ ownedBy })).to.equal(1);
  });
});

describe('MCP: subscription streams', () => {
  it(`keeps at most ${MOST_STREAMS_PER_ADDRESS} open from one address, and ends each when its client goes`, async () => {
    const clients = Array.from({ length: MOST_STREAMS_PER_ADDRESS }, () => new AbortController());
    const streams = await Promise.all(clients.map((client) => listen(client.signal)));
    for (const stream of streams) {
      expect(stream.status).to.equal(200);
      expect(stream.headers.get('content-type')).to.include('text/event-stream');
    }
    expect(streamsOpen()).to.equal(MOST_STREAMS_PER_ADDRESS);
    await until(() => sdkSubscribers() === MOST_STREAMS_PER_ADDRESS, 'the SDK serves each stream');
    const over = await listen(new AbortController().signal);
    expect(over.status).to.equal(429);
    expect(((await over.json()) as { error: { message: string } }).error.message).to.include('subscription streams');
    // Other requests from the address are still answered.
    expect((await rpc('ping')).status).to.equal(200);
    // The clients go: the server ends their streams, and the address may open more.
    for (const client of clients) client.abort();
    await until(() => streamsOpen() === 0 && sdkSubscribers() === 0, 'every stream ended, in the SDK too');
    const again = new AbortController();
    const next = await listen(again.signal);
    expect(next.status).to.equal(200);
    again.abort();
    await until(() => streamsOpen() === 0 && sdkSubscribers() === 0, 'the last stream ended');
  });
});

describe('MCP: limits', () => {
  afterEach(() => {
    process.env.RATE_LIMITS = 'off';
  });

  it('allows 60 requests a minute from one address without a token, more for an account', async function () {
    // About 360 requests: more than the default 5 s on a busy machine.
    this.timeout(30000);
    const { user } = await makeUser();
    const token = await makeToken(user);
    process.env.RATE_LIMITS = 'on';
    let refused: Answer | null = null;
    for (let i = 0; i < 61 && !refused; i++) {
      const answer = await rpc('ping');
      if (answer.status !== 200) refused = answer;
    }
    expect(refused?.status).to.equal(429);
    // The address is used up; a token is counted per account instead, with its own, larger limit.
    for (let i = 0; i < MCP_LIMITS.minute.account; i++) {
      expect((await rpc('ping', {}, bearer(token))).status).to.equal(200);
    }
    expect((await rpc('ping', {}, bearer(token))).status).to.equal(429);
  });

  it('counts a batch as the one request it is, and answers none of its messages', async () => {
    const { user } = await makeUser();
    const headers = bearer(await makeToken(user));
    process.env.RATE_LIMITS = 'on';
    const batch = Array.from({ length: 100 }, (_, i) => ({
      jsonrpc: '2.0',
      id: i + 1,
      method: 'tools/call',
      params: { name: 'match_from_materials', arguments: { lines: LINES, have: ['Whiting'] } }
    }));
    resetFits();
    for (let i = 0; i < 3; i++) {
      const res = await fetch(base() + '/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
        body: JSON.stringify(batch)
      });
      expect(res.status).to.equal(400);
    }
    // None of the 300 fits was worked out, so the caller has them all still.
    expect((await call('match_from_materials', { lines: LINES, have: ['Whiting'] }, headers)).isError).to.not.equal(
      true
    );
  });

  it(`works out at most ${FITS_PER_MINUTE} substitutions or matches a minute for one caller`, async () => {
    const { user } = await makeUser();
    const headers = bearer(await makeToken(user));
    resetFits();
    process.env.RATE_LIMITS = 'on';
    const args = { lines: LINES, have: ['Minspar 200', 'Whiting', 'EPK', 'Silica'] };
    for (let i = 0; i < FITS_PER_MINUTE; i++)
      expect((await call('match_from_materials', args, headers)).isError).to.not.equal(true);
    const over = await call('match_from_materials', args, headers);
    expect(over.isError).to.equal(true);
    expect(over.content[0]!.text).to.include('Too many');
    // The other tools still answer.
    expect((await call('analyze_recipe', { lines: LINES }, headers)).isError).to.not.equal(true);
  });
});
