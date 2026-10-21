// The teaching companion's tools and prompts (docs/adr/0017-mcp-server.md): vary_material, compare_recipes,
// the Stull chart position in recipe answers, and the prompts that use them. Each tool is checked against
// the tools it reuses (analyze_recipe, blend_recipes) so the three never disagree.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import recipe from '../../lib/recipe/index.js';
import { COURSE_GUIDE, courseUnits } from '../mcp/course.ts';
import { base, expect } from './support/app.ts';

let id = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
type Json = Record<string, any>;
type ToolResult = { structuredContent?: Json; content: Array<{ text: string }>; isError?: boolean };

const rpc = async (method: string, params: object = {}): Promise<{ status: number; body: Json }> => {
  const res = await fetch(base() + '/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18'
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params })
  });
  const text = await res.text();
  const line = text.includes('data: ')
    ? text
        .split('\n')
        .find((l) => l.startsWith('data: '))!
        .slice(6)
    : text;
  return { status: res.status, body: JSON.parse(line) as Json };
};
const call = async (name: string, args: object): Promise<ToolResult> => {
  const answer = await rpc('tools/call', { name, arguments: args });
  expect(answer.status, JSON.stringify(answer.body)).to.equal(200);
  if (answer.body.error) throw new Error(JSON.stringify(answer.body.error));
  return answer.body.result as ToolResult;
};
const data = async (name: string, args: object): Promise<Json> => {
  const result = await call(name, args);
  expect(result.isError, result.content[0]?.text).to.not.equal(true);
  return result.structuredContent!;
};
/** The words of a refusal; fails when the call was not one. */
const refused = async (name: string, args: object): Promise<string> => {
  const result = await call(name, args);
  expect(result.isError, JSON.stringify(result.structuredContent)).to.equal(true);
  return result.content[0]!.text;
};

const BASE = [
  { material: 'Custer Spar', amount: 40 },
  { material: 'Silica', amount: 30 },
  { material: 'EPK', amount: 20 }
];
const WITH_WHITING = [...BASE, { material: 'Whiting', amount: 10 }];
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('the teaching companion: varyMaterial (lib/recipe/blends.js)', () => {
  const lines = [
    { name: 'A', amount: 60 },
    { name: 'B', amount: 40 }
  ];

  it('adds the material on top of the base, or to its own line', () => {
    const added = recipe.varyMaterial(lines, 'C', [0, 10], 'add');
    expect(added.tiles!.map((t) => t.lines)).to.eql([lines, [...lines, { name: 'C', amount: 10 }]]);
    const own = recipe.varyMaterial(lines, 'B', [0, 10], 'add');
    expect(own.tiles![1]!.lines).to.eql([
      { name: 'A', amount: 60 },
      { name: 'B', amount: 50 }
    ]);
  });

  it('replaces another material so the total stays the same, and drops a line that reaches nothing', () => {
    const replaced = recipe.varyMaterial(lines, 'C', [0, 10, 40], 'replace', 'B');
    expect(replaced.tiles!.map((t) => sum(t.lines.map((l) => l.amount)))).to.eql([100, 100, 100]);
    expect(replaced.tiles![2]!.lines).to.eql([
      { name: 'A', amount: 60 },
      { name: 'C', amount: 40 }
    ]);
  });

  it('says the first amount at which the material it replaces would run out', () => {
    expect(recipe.varyMaterial(lines, 'C', [0, 20, 50, 60], 'replace', 'B')).to.eql({ tooMuch: 50 });
  });
});

describe('MCP: vary_material', () => {
  it('puts the material on top of the base in exact steps, the base lines unchanged', async () => {
    const result = await data('vary_material', { recipe: BASE, material: 'Whiting', from: 0, to: 20, steps: 5 });
    expect(result).to.include({ material: 'Whiting', mode: 'add', from: 0, to: 20, steps: 5, baseTotal: 90 });
    expect(result.tiles.map((t: Json) => t.amount)).to.eql([0, 5, 10, 15, 20]);
    expect(result.tiles.map((t: Json) => t.total)).to.eql([90, 95, 100, 105, 110]);
    expect(result.note).to.include('not a test result');
    // The first tile is the base alone, as analyze_recipe works it out.
    const base = await data('analyze_recipe', { lines: BASE });
    expect(result.tiles[0].unity.SiO2).to.equal(base.unityFormula.SiO2);
    expect(result.tiles[0].stull).to.eql(base.stull);
    expect(result.tiles[0].recipe.map((l: Json) => l.material)).to.eql(['Custer Spar', 'Silica', 'EPK Kaolin']);
    // The base lines keep their weights, so their percents shrink as the material grows.
    const last = result.tiles[4];
    expect(last.recipe.map((l: Json) => l.material)).to.eql(['Custer Spar', 'Silica', 'EPK Kaolin', 'Whiting']);
    expect(last.recipe.find((l: Json) => l.material === 'Custer Spar').percent).to.equal(36.36);
    expect(last.recipe.find((l: Json) => l.material === 'Whiting').percent).to.equal(18.18);
    expect(last.amountPercent).to.equal(18.18);
    for (const tile of result.tiles) {
      expect(sum(tile.recipe.map((l: Json) => l.percent)), 'tile ' + tile.number).to.be.closeTo(100, 0.1);
    }
  });

  it('shows whiting raising lime and lowering silica and alumina per unit of flux, in the trend', async () => {
    const result = await data('vary_material', { recipe: BASE, material: 'Whiting', to: 20 });
    expect(result.steps).to.equal(5);
    expect(result.from).to.equal(0);
    const [first, last] = [result.tiles[0].unity, result.tiles.at(-1).unity];
    expect(last.fluxes.CaO).to.be.greaterThan(first.fluxes.CaO ?? 0);
    expect(last.SiO2).to.be.lessThan(first.SiO2);
    expect(last.Al2O3).to.be.lessThan(first.Al2O3);
    const by = (oxide: string) => result.trend.oxides.find((o: Json) => o.oxide === oxide);
    expect(by('CaO')).to.include({ direction: 'rises' });
    expect(by('SiO2')).to.include({ direction: 'falls' });
    expect(by('Al2O3')).to.include({ direction: 'falls' });
    expect(by('CaO').last).to.equal(last.fluxes.CaO);
    expect(result.trend.stullRegions).to.be.an('array').with.length.above(0);
  });

  it('puts a Stull point on every tile, the one recipe.stullPoint gives', async () => {
    const result = await data('vary_material', { recipe: BASE, material: 'Silica', to: 30, steps: 4 });
    const regions = new Set<string>();
    for (const tile of result.tiles) {
      const analysis = await data('analyze_recipe', {
        lines: tile.recipe.map((l: Json) => ({ material: l.material, amount: l.percent }))
      });
      const point = recipe.stullPoint(analysis.unityFormula)!;
      expect(tile.stull).to.include({ region: point.region, crazed: point.crazed, onChart: point.region !== null });
      expect(tile.stull.silica).to.be.closeTo(point.silica, 0.02);
      regions.add(tile.stull.region ?? 'off the chart');
    }
    expect(result.trend.stullRegions).to.include.members([...regions]);
    expect(result.trend.silicaToAlumina.direction).to.equal('rises');
  });

  it('replaces another material when asked, so every tile keeps the same total', async () => {
    const result = await data('vary_material', {
      recipe: WITH_WHITING,
      material: 'Dolomite',
      to: 10,
      steps: 3,
      mode: 'replace',
      instead: 'whiting'
    });
    expect(result).to.include({ mode: 'replace', instead: 'Whiting', baseTotal: 100 });
    expect(result.tiles.map((t: Json) => t.total)).to.eql([100, 100, 100]);
    expect(result.tiles.map((t: Json) => t.amount)).to.eql([0, 5, 10]);
    const whiting = (tile: Json) => tile.recipe.find((l: Json) => l.material === 'Whiting')?.percent;
    expect(whiting(result.tiles[0])).to.equal(10);
    expect(whiting(result.tiles[1])).to.equal(5);
    // Whiting reached nothing in the last tile, so it is not a line there.
    expect(whiting(result.tiles[2])).to.equal(undefined);
    expect(result.tiles[2].unity.fluxes.MgO).to.be.greaterThan(result.tiles[0].unity.fluxes.MgO ?? 0);
  });

  it('takes a firing: a coneFit verdict on every tile, and a limit set', async () => {
    const result = await data('vary_material', {
      recipe: BASE,
      material: 'Whiting',
      to: 20,
      steps: 3,
      firing: { cone: '6' },
      limitSet: 'hesselberth-roy'
    });
    expect(result).to.include({ limitSet: 'hesselberth-roy', celsius: 1222 });
    for (const tile of result.tiles) expect(tile.coneFit, 'tile ' + tile.number).to.be.a('string');
    expect((await data('vary_material', { recipe: BASE, material: 'Whiting', to: 5 })).tiles[0]).to.not.have.property(
      'coneFit'
    );
  });

  it('takes at most 11 steps and at least 2, and exactly as many as asked', async () => {
    const eleven = await data('vary_material', { recipe: BASE, material: 'Whiting', to: 10, steps: 11 });
    expect(eleven.tiles).to.have.length(11);
    expect(eleven.tiles.map((t: Json) => t.amount)).to.eql([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const two = await data('vary_material', { recipe: BASE, material: 'Whiting', from: 5, to: 10, steps: 2 });
    expect(two.tiles.map((t: Json) => t.amount)).to.eql([5, 10]);
    // The inputs' own limits: a step count, an amount and a recipe's size, refused by the schema in words.
    for (const args of [
      { recipe: BASE, material: 'Whiting', to: 10, steps: 12 },
      { recipe: BASE, material: 'Whiting', to: 10, steps: 1 },
      { recipe: BASE, material: 'Whiting', to: 10, steps: 2.5 },
      { recipe: BASE, material: 'Whiting', to: -1 },
      { recipe: BASE, material: 'Whiting', from: -1, to: 10 },
      { recipe: BASE, material: 'Whiting', to: 100001 },
      { recipe: BASE, material: '', to: 10 },
      { recipe: BASE, material: 'x'.repeat(201), to: 10 },
      { recipe: BASE, material: 'Whiting', to: 10, mode: 'swap' },
      { recipe: [], material: 'Whiting', to: 10 },
      { recipe: Array.from({ length: 41 }, () => BASE[0]), material: 'Whiting', to: 10 },
      { recipe: BASE, to: 10 },
      { recipe: BASE, material: 'Whiting' }
    ]) {
      const result = await call('vary_material', args);
      expect(result.isError, JSON.stringify(args)).to.equal(true);
    }
  });

  it('refuses in words: a range that does not grow, unknown materials, replacing without or too much', async () => {
    expect(await refused('vary_material', { recipe: BASE, material: 'Whiting', from: 10, to: 10 })).to.include(
      'must be more than from'
    );
    expect(await refused('vary_material', { recipe: BASE, material: 'Whiting', from: 10, to: 5 })).to.include(
      'must be more than from'
    );
    const moon = await refused('vary_material', { recipe: BASE, material: 'Moon dust', to: 5 });
    expect(moon).to.include('Not in the Glazecalc library: Moon dust');
    expect(await refused('vary_material', { recipe: BASE, material: 'Whiting', to: 5, mode: 'replace' })).to.include(
      'needs `instead`'
    );
    expect(await refused('vary_material', { recipe: BASE, material: 'Whiting', to: 5, instead: 'EPK' })).to.include(
      '`instead` goes with mode "replace"'
    );
    const absent = await refused('vary_material', {
      recipe: BASE,
      material: 'Whiting',
      to: 5,
      mode: 'replace',
      instead: 'Dolomite'
    });
    expect(absent).to.include('Dolomite is not in the base recipe').and.to.include('Custer Spar, Silica, EPK');
    expect(
      await refused('vary_material', { recipe: BASE, material: 'EPK', to: 5, mode: 'replace', instead: 'epk' })
    ).to.include('cannot replace itself');
    const tooMuch = await refused('vary_material', {
      recipe: BASE,
      material: 'Whiting',
      to: 25,
      steps: 6,
      mode: 'replace',
      instead: 'EPK'
    });
    expect(tooMuch)
      .to.include('EPK Kaolin would run out')
      .and.to.include('at most 20')
      .and.to.include('25 was asked for');
    expect(await refused('vary_material', { recipe: [{ material: 'Silica', amount: 0 }], material: 'Whiting', to: 5 }))
      .to.include('The base recipe has no amounts')
      .and.to.include('mix');
    expect(
      await refused('vary_material', { recipe: BASE, material: 'Whiting', to: 5, limitSet: 'nonsense' })
    ).to.include('No limit set nonsense');
    expect(
      await refused('vary_material', { recipe: BASE, material: 'Whiting', to: 5, firing: { cone: '99' } })
    ).to.be.a('string');
    // A base with no flux has no unity formula: the tiles say so rather than the call failing.
    const noFlux = await refused('vary_material', {
      recipe: [{ material: 'Silica', amount: 10 }],
      material: 'EPK',
      to: 5
    });
    expect(noFlux).to.include('The base recipe:');
  });
});

describe('MCP: compare_recipes', () => {
  const MATTE = [
    { material: 'Custer Spar', amount: 30 },
    { material: 'Dolomite', amount: 25 },
    { material: 'EPK', amount: 25 },
    { material: 'Silica', amount: 20 }
  ];

  it('gives each side its chemistry and the same differences blend_recipes gives with two steps', async () => {
    const result = await data('compare_recipes', { a: WITH_WHITING, b: MATTE, labels: ['Original', 'Matte'] });
    expect(result.a.label).to.equal('Original');
    expect(result.b.label).to.equal('Matte');
    for (const side of [result.a, result.b]) {
      expect(side.unity.SiO2).to.be.greaterThan(0);
      expect(side.stull).to.have.keys('silica', 'alumina', 'ratio', 'region', 'onChart', 'crazed');
      expect(side.cautions).to.be.an('array');
      expect(side).to.not.have.property('coneFit');
    }
    const blended = await data('blend_recipes', { a: WITH_WHITING, b: MATTE, steps: 2 });
    expect(result.differences).to.eql(blended.differences);
    expect(result.differences.length).to.be.greaterThan(0);
    expect(result.a.silicaToAlumina).to.equal(blended.tiles[0].silicaToAlumina);
    expect(result.b.unity).to.eql(blended.tiles[1].unity);
    expect(result.note).to.include('not a test result');
  });

  it('says which materials are in A only, in B only and in both, with their percents', async () => {
    const result = await data('compare_recipes', { a: WITH_WHITING, b: MATTE });
    expect(result.a.label).to.equal('A');
    expect(result.materials.onlyInA).to.eql([{ material: 'Whiting', percent: 10 }]);
    expect(result.materials.onlyInB).to.eql([{ material: 'Dolomite', percent: 25 }]);
    expect(result.materials.inBoth.map((m: Json) => m.material)).to.eql(['Custer Spar', 'Silica', 'EPK Kaolin']);
    expect(result.materials.inBoth[0]).to.eql({ material: 'Custer Spar', a: 40, b: 30 });
  });

  it('takes a firing and a limit set, as the other tools do, and says when the limits do not reach', async () => {
    const six = await data('compare_recipes', { a: WITH_WHITING, b: MATTE, firing: { cone: '6' } });
    expect(six).to.include({ limitSet: 'glazecalc', celsius: 1222 });
    for (const side of [six.a, six.b]) expect(side.coneFit).to.be.a('string');
    const top = await data('compare_recipes', { a: WITH_WHITING, b: MATTE, firing: { cone: '14' } });
    expect(top.limitBand).to.equal('top');
    expect(top.limitsNote).to.include('cone 12 up');
    expect(await refused('compare_recipes', { a: WITH_WHITING, b: MATTE, limitSet: 'nonsense' })).to.include(
      'No limit set nonsense'
    );
  });

  it('refuses in words, by recipe, and by the schema', async () => {
    expect(await refused('compare_recipes', { a: WITH_WHITING, b: [{ material: 'Moon dust', amount: 1 }] })).to.include(
      'Not in the Glazecalc library'
    );
    expect(await refused('compare_recipes', { a: WITH_WHITING, b: [{ material: 'Silica', amount: 0 }] })).to.include(
      'Recipe B has no amounts'
    );
    expect(await refused('compare_recipes', { a: [{ material: 'Silica', amount: 10 }], b: MATTE })).to.include(
      'Recipe A:'
    );
    for (const args of [
      { a: WITH_WHITING },
      { b: MATTE },
      { a: WITH_WHITING, b: MATTE, labels: ['only one'] },
      { a: WITH_WHITING, b: MATTE, labels: ['one', 'two', 'three'] },
      { a: WITH_WHITING, b: MATTE, labels: ['x'.repeat(61), 'B'] },
      { a: [], b: MATTE },
      { a: WITH_WHITING, b: MATTE, firing: { cone: '99' } }
    ]) {
      expect((await call('compare_recipes', args)).isError, JSON.stringify(args)).to.equal(true);
    }
  });
});

describe('MCP: the Stull chart point in recipe answers', () => {
  // Two cone 6 recipes the chart tells apart: a glossy one and a matte one.
  const GLOSSY = [
    { material: 'Custer Spar', amount: 40 },
    { material: 'Whiting', amount: 20 },
    { material: 'EPK', amount: 15 },
    { material: 'Silica', amount: 25 }
  ];
  const MATTE = [
    { material: 'Custer Spar', amount: 45 },
    { material: 'Whiting', amount: 25 },
    { material: 'EPK', amount: 30 }
  ];

  it('analyze_recipe and check_limits give the point recipe.stullPoint gives, rounded', async () => {
    for (const lines of [GLOSSY, MATTE]) {
      const analysis = await data('analyze_recipe', { lines });
      const point = recipe.stullPoint(analysis.unityFormula)!;
      expect(analysis.stull).to.include({ region: point.region, crazed: point.crazed, onChart: true });
      expect(analysis.stull.silica).to.be.closeTo(point.silica, 0.01);
      expect(analysis.stull.alumina).to.be.closeTo(point.alumina, 0.01);
      expect(analysis.stull.ratio).to.be.closeTo(point.ratio, 0.01);
      const checks = await data('check_limits', { lines });
      expect(checks.stull).to.eql(analysis.stull);
    }
    const [glossy, matte] = [
      await data('analyze_recipe', { lines: GLOSSY }),
      await data('analyze_recipe', { lines: MATTE })
    ];
    expect(matte.stull.alumina).to.be.greaterThan(glossy.stull.alumina);
    expect(matte.stull.region).to.not.equal(glossy.stull.region);
  });

  it('blend_recipes tiles carry it, the corners the same as analyze_recipe', async () => {
    const blended = await data('blend_recipes', { a: GLOSSY, b: MATTE, steps: 3 });
    expect(blended.tiles[0].stull).to.eql((await data('analyze_recipe', { lines: GLOSSY })).stull);
    expect(blended.tiles[2].stull.region).to.equal((await data('analyze_recipe', { lines: MATTE })).stull.region);
    expect(blended.tiles[1].stull.alumina).to.be.within(blended.tiles[0].stull.alumina, blended.tiles[2].stull.alumina);
  });

  it('a recipe off the chart says so: no region, onChart false', async () => {
    // Almost all silica and very little alumina is past the chart's silica.
    const analysis = await data('analyze_recipe', {
      lines: [
        { material: 'Silica', amount: 95 },
        { material: 'Whiting', amount: 5 },
        { material: 'EPK', amount: 1 }
      ]
    });
    expect(analysis.stull.onChart).to.equal(false);
    expect(analysis.stull.region).to.equal(null);
    expect(analysis.stull.crazed).to.equal(false);
  });
});

describe('MCP: the companion prompts', () => {
  const prompt = async (name: string, args: object): Promise<Json> => {
    const answer = await rpc('prompts/get', { name, arguments: args });
    expect(answer.body.error, JSON.stringify(answer.body.error)).to.equal(undefined);
    return answer.body.result as Json;
  };

  it('the lesson names the new tools, offers to save, and still tells the assistant not to retell the videos', async () => {
    const lesson = await prompt('glaze_course_lesson', { unit: 'blending' });
    const text: string = lesson.messages[0].content.text;
    for (const part of [
      'vary_material',
      'compare_recipes',
      'solve_target',
      'blend_recipes',
      'offer to save',
      'add_notebook_entry',
      'given about',
      'create_firing_log',
      'link_firing',
      'Read back exactly what you will save',
      'save it only if I say yes',
      'Do not retell, summarise or quote',
      'not connected with him',
      'leach test'
    ]) {
      expect(text).to.include(part);
    }
  });

  it('what_does_this_material_do runs get_material, then vary_material on the base given', async () => {
    const got = await prompt('what_does_this_material_do', {
      material: 'Whiting',
      recipe: 'Custer Spar 40, Silica 30, EPK 20',
      cone: '6',
      language: 'de'
    });
    expect(got.description).to.equal('What Whiting does');
    const text: string = got.messages[0].content.text;
    for (const part of [
      'Whiting',
      'My base recipe:',
      'Custer Spar 40',
      'fired to 6',
      'get_material',
      'vary_material',
      'Stull',
      'Use my base recipe as given',
      'language: "de"',
      'not a test',
      'leach test'
    ]) {
      expect(text).to.include(part);
    }
    expect(text).not.to.include('I have not given a base recipe');
  });

  it('what_does_this_material_do asks for a base when none is given, and never invents one', async () => {
    const got = await prompt('what_does_this_material_do', { material: 'Talc' });
    const text: string = got.messages[0].content.text;
    expect(text).to.include('I have not given a base recipe. Ask me for one');
    expect(text).to.include('Do not invent a recipe');
    expect(text).not.to.include('My base recipe:');
    const missing = await rpc('prompts/get', { name: 'what_does_this_material_do', arguments: {} });
    expect(missing.body.error).to.have.property('code');
  });

  it('completes the material from the library', async () => {
    const answer = await rpc('completion/complete', {
      ref: { type: 'ref/prompt', name: 'what_does_this_material_do' },
      argument: { name: 'material', value: 'whit' }
    });
    expect(answer.body.result.completion.values).to.include('Whiting');
  });

  it('the server instructions name both new tools', async () => {
    const answer = await rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' }
    });
    expect(answer.body.result.instructions).to.include('vary_material').and.to.include('compare_recipes');
  });
});

describe('the companion guide and the server agree', () => {
  it('every tool or prompt a Try exercise names is registered on the server', async () => {
    const tools = (await rpc('tools/list')).body.result.tools.map((t: Json) => t.name);
    const prompts = (await rpc('prompts/list')).body.result.prompts.map((p: Json) => p.name);
    const known = new Set<string>([...tools, ...prompts]);
    const named = new Set<string>();
    for (const unit of courseUnits()) {
      for (const exercise of unit.exercises) {
        for (const [, name] of exercise.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)) named.add(name!);
        for (const [, name] of exercise.matchAll(/\*\*([a-z]+(?:_[a-z]+)+)\*\*/g)) named.add(name!);
      }
    }
    expect([...named].length).to.be.greaterThan(10);
    for (const name of named) expect(known.has(name), name).to.equal(true);
    // The companion's own pieces are among them.
    expect(named).to.include.members(['vary_material', 'compare_recipes', 'what_does_this_material_do']);
  });

  it('the exercises keep to the limits the prompt and the page expect', () => {
    for (const unit of courseUnits()) expect(unit.exercises.length, unit.id).to.be.within(1, 3);
    const file = readFileSync(
      path.join(import.meta.dirname, '..', '..', 'client', 'public', 'i18n', 'guides', COURSE_GUIDE, 'en.md'),
      'utf8'
    );
    expect(file).not.to.match(/Lark Books, now part of/);
  });
});
