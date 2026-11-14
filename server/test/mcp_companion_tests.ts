// The teaching companion's tools and prompts (docs/adr/0017-mcp-server.md): vary_material, compare_recipes,
// the Stull chart position in recipe answers, and the prompts that use them. Each tool is checked against
// the tools it reuses (analyze_recipe, blend_recipes) so the three never disagree.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import chemistry from '../../lib/chemistry/index.js';
import recipe from '../../lib/recipe/index.js';
import { BRITT_RULE, COURSE_GUIDE, courseUnits, matchTopic, UNIT_KEYWORDS } from '../mcp/course.ts';
import { EXPANSION_FIT_FLAG, fluxRatioOf } from '../mcp/tools/companion.ts';
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

  it('keeps the base’s own analysis of the material it varies: the first tile is the base alone', async () => {
    // The potter's own whiting, with magnesia in it, under the library's name.
    const own = [
      { material: 'Whiting', amount: 20, analysis: { CaO: 40, MgO: 12, SiO2: 6 }, loi: 40 },
      { material: 'Custer Spar', amount: 40 },
      { material: 'EPK', amount: 20 },
      { material: 'Silica', amount: 20 }
    ];
    const result = await data('vary_material', { recipe: own, material: 'Whiting', from: 0, to: 10, steps: 3 });
    const [alone, more] = await Promise.all(
      [own, [{ ...own[0]!, amount: 30 }, ...own.slice(1)]].map(
        async (lines) => (await data('analyze_recipe', { lines })).unityFormula
      )
    );
    // The library's whiting took the base's own place, so even the base alone lost its magnesia.
    for (const [tile, unity] of [
      [result.tiles[0], alone],
      [result.tiles[2], more]
    ]) {
      expect([tile.unity.fluxes.CaO, tile.unity.fluxes.MgO, tile.unity.SiO2], 'tile ' + tile.number).to.eql([
        unity.CaO,
        unity.MgO,
        unity.SiO2
      ]);
    }
  });

  it('keeps two of the base’s own analyses under one name apart, each line with its own chemistry', async () => {
    // Two wood ashes, analysed apart and given under the same name: the tiles' lines were found by name, so
    // both took the last one's chemistry, even in the first tile (the base alone).
    const ashes = [
      { material: 'Wood ash', amount: 20, analysis: { CaO: 50, SiO2: 10, MgO: 5 }, loi: 30 },
      { material: 'Wood ash', amount: 20, analysis: { K2O: 12, SiO2: 55, Al2O3: 10, CaO: 15 }, loi: 5 },
      { material: 'Silica', amount: 30 },
      { material: 'EPK', amount: 30 }
    ];
    const unityOf = async (lines: Json[]) => (await data('analyze_recipe', { lines })).unityFormula;
    const figures = (unity: Json) => [unity.SiO2, unity.Al2O3, unity.CaO, unity.K2O, unity.MgO];
    const tileFigures = (tile: Json) => figures({ ...tile.unity, ...tile.unity.fluxes });
    const added = await data('vary_material', { recipe: ashes, material: 'Whiting', from: 0, to: 10, steps: 3 });
    expect(tileFigures(added.tiles[0]), 'the base alone').to.eql(figures(await unityOf(ashes)));
    expect(tileFigures(added.tiles[2]), 'with 10 of whiting').to.eql(
      figures(await unityOf([...ashes, { material: 'Whiting', amount: 10 }]))
    );
    // In place of silica, too.
    const replaced = await data('vary_material', {
      recipe: ashes,
      material: 'Whiting',
      to: 10,
      steps: 2,
      mode: 'replace',
      instead: 'Silica'
    });
    expect(tileFigures(replaced.tiles[1])).to.eql(
      figures(
        await unityOf([
          ...ashes.slice(0, 2),
          { material: 'Silica', amount: 20 },
          ashes[3]!,
          { material: 'Whiting', amount: 10 }
        ])
      )
    );
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
      'questions to check what I learned',
      'wait for my answer',
      'specific_gravity_water',
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

describe('the teaching companion: matchTopic (server/mcp/course.ts)', () => {
  it('finds a unit by its id, number or title, in any case or accent', () => {
    expect(matchTopic('blending')?.id).to.equal('blending');
    expect(matchTopic('unit 3')?.id).to.equal('oxides');
    expect(matchTopic('12')?.id).to.equal('firing');
    expect(matchTopic('  THE UNITY FORMULA ')?.id).to.equal('unity-formula');
    expect(matchTopic('Tell me about limits and the Stull chart please')?.id).to.equal('limits-and-stull');
  });

  it('finds a unit by its keywords, by the start of a word', () => {
    expect(matchTopic('line blends')?.id).to.equal('blending');
    expect(matchTopic('a triaxial blend')?.id).to.equal('blending');
    expect(matchTopic('what is a shino?')?.id).to.equal('special-surfaces');
    expect(matchTopic('Gerstley Borate substitutes')?.id).to.equal('recipes-and-substitutes');
    expect(matchTopic('specific gravity of my slurry')?.id).to.equal('slurry-and-application');
    expect(matchTopic('reduction firing in a gas kiln')?.id).to.equal('firing');
    expect(matchTopic('copper reds')?.id).to.equal('color-in-bases');
    expect(matchTopic('wild clay')?.id).to.equal('clay');
  });

  it('matches nothing rather than guess: no video for a topic no unit covers', () => {
    expect(matchTopic('')).to.equal(undefined);
    expect(matchTopic('   ')).to.equal(undefined);
    expect(matchTopic('how to price my mugs at a market')).to.equal(undefined);
    expect(matchTopic('unit 99')).to.equal(undefined);
    // A keyword inside another word is not a match: "rust" is not at the start of "trust".
    expect(matchTopic('trust')).to.equal(undefined);
  });

  it('every unit has keywords and every keyword list names a unit of the guide', () => {
    const ids = courseUnits().map((unit) => unit.id);
    expect(ids).to.have.length(12);
    expect(Object.keys(UNIT_KEYWORDS).sort()).to.eql([...ids].sort());
  });

  it('does not send a topic to a unit by a word it only shares a part of', () => {
    expect(matchTopic('why does my glaze crawl')?.id).to.not.equal('special-surfaces');
    expect(matchTopic('refiring a pot')?.id).to.not.equal('firing');
    expect(matchTopic('fireclay')?.id).to.not.equal('firing');
    expect(matchTopic('Firing')?.id).to.equal('firing');
  });

  it('takes the units it is given, so it can be checked without the guide', () => {
    const units = [
      { id: 'glazes', number: 1, title: 'Glazes', videos: [], reads: [], exercises: [], checks: [], lab: false }
    ];
    expect(matchTopic('glazes', units)?.id).to.equal('glazes');
    expect(matchTopic('line blends', units)).to.equal(undefined);
  });
});

describe('MCP: the round 14 teaching fixes', () => {
  const prompt = async (name: string, args: object): Promise<Json> => {
    const answer = await rpc('prompts/get', { name, arguments: args });
    expect(answer.body.error, JSON.stringify(answer.body.error)).to.equal(undefined);
    return answer.body.result as Json;
  };
  /** The addresses of the resources a prompt attaches, in order. */
  const attachedUris = (got: Json): string[] =>
    got.messages
      .filter((message: Json) => message.content.type === 'resource')
      .map((message: Json) => message.content.resource.uri as string);

  it('a lesson whose warning names two safety sections attaches both and puts both first', async () => {
    const got = await prompt('glaze_course_lesson', { unit: 'special-surfaces' });
    const text: string = got.messages[0].content.text;
    expect(text).to.include('safe-mixing#materials and safe-mixing#kiln');
    expect(text).to.include('carbon monoxide').and.to.include('fitted respirator');
    const uris = attachedUris(got);
    expect(uris[1]).to.match(/\/safe-mixing\/materials$/);
    expect(uris[2]).to.match(/\/safe-mixing\/kiln$/);
  });

  it('the firing lesson is lab work and attaches the kiln section first', async () => {
    const got = await prompt('glaze_course_lesson', { unit: 'firing' });
    const text: string = got.messages[0].content.text;
    expect(text).to.include('lab work').and.to.include('safe-mixing#kiln').and.to.include('carbon monoxide');
    const uris = attachedUris(got);
    expect(uris[1]).to.match(/\/safe-mixing\/kiln$/);
    expect(uris.filter((uri) => uri.endsWith('/safe-mixing/kiln'))).to.have.length(1);
    expect(uris.some((uri) => uri.endsWith('/safe-mixing/habits'))).to.equal(false);
  });

  it('the lesson names the next unit and its first video, and the last unit ends the course', async () => {
    const units = courseUnits();
    const first = await prompt('glaze_course_lesson', { unit: 'The unity formula' });
    const text: string = first.messages[0].content.text;
    expect(first.description).to.equal('Unit 1: The unity formula');
    expect(text).to.include(`unit 2, ${units[1]!.title}`);
    expect(text).to.include(units[1]!.videos[0]!.title).and.to.include(units[1]!.videos[0]!.url);
    const last = await prompt('glaze_course_lesson', { unit: '12' });
    expect(last.messages[0].content.text).to.include('the course is done');
  });

  it('teach_me attaches the sections the topic is about first', async () => {
    const crazing = attachedUris(await prompt('teach_me', { topic: 'crazing' }));
    expect(
      crazing.some((uri) => uri.endsWith('/glazing-basics/fit-and-defects')),
      crazing.join()
    ).to.equal(true);
    const reduction = attachedUris(await prompt('teach_me', { topic: 'reduction' }));
    expect(
      reduction.some((uri) => uri.endsWith('/glazing-basics/atmosphere')),
      reduction.join()
    ).to.equal(true);
  });

  it('the recipe and material prompts point to the safe mixing guide and to the hazards get_material lists', async () => {
    const got = await Promise.all([
      prompt('what_does_this_material_do', { material: 'Whiting' }),
      prompt('explain_recipe', { recipe: 'Custer Spar 40, Silica 30, Whiting 20, EPK 10' }),
      prompt('diagnose_glaze_fault', { recipe: 'Custer Spar 40, Silica 30, Whiting 20, EPK 10', fault: 'crazing' })
    ]);
    for (const answer of got) {
      const text: string = answer.messages[0].content.text;
      expect(text).to.include('safe mixing guide first').and.to.include('/guides/safe-mixing#materials');
    }
  });

  it('everything that names John Britt says to link his videos by title only and never retell them', async () => {
    const tools = (await rpc('tools/list')).body.result.tools as Json[];
    const prompts = (await rpc('prompts/list')).body.result.prompts as Json[];
    const named = [...tools, ...prompts].filter((item) => /John Britt/.test(item.description ?? ''));
    expect(named.map((item) => item.name)).to.include.members(['search_guides', 'glaze_course_lesson', 'teach_me']);
    for (const item of named) expect(item.description, item.name).to.include(BRITT_RULE);
    const init = await rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' }
    });
    expect(init.body.result.instructions).to.include(BRITT_RULE);
  });

  it('a section of the companion read alone, or found by search, carries the rule', async () => {
    const read = await rpc('resources/read', { uri: `glazecalc://guides/en/${COURSE_GUIDE}/blending` });
    expect(read.body.result.contents[0].text).to.include(BRITT_RULE);
    const found = await data('search_guides', { query: 'triaxial blend', guide: COURSE_GUIDE });
    expect(found.results.length).to.be.above(0);
    for (const hit of found.results) expect(hit.note).to.equal(BRITT_RULE);
    const other = await data('search_guides', { query: 'respirator', guide: 'safe-mixing' });
    for (const hit of other.results) expect(hit).not.to.have.property('note');
  });
});

describe('MCP: the round 12 companion additions', () => {
  const MATTE = [
    { material: 'Custer Spar', amount: 30 },
    { material: 'Dolomite', amount: 25 },
    { material: 'EPK', amount: 25 },
    { material: 'Silica', amount: 20 }
  ];
  const groups = chemistry.OXIDE_GROUPS as Record<string, string>;
  const sumOf = (fluxes: Record<string, number>, group: string) =>
    sum(
      Object.entries(fluxes)
        .filter(([oxide]) => groups[oxide] === group)
        .map(([, amount]) => amount)
    );

  it('fluxRatioOf sums the alkalis against the RO fluxes, null with none', () => {
    expect(fluxRatioOf({ K2O: 0.2, Na2O: 0.1, CaO: 0.6, MgO: 0.1 })).to.eql({ R2O: 0.3, RO: 0.7 });
    expect(fluxRatioOf({})).to.equal(null);
    expect(fluxRatioOf(undefined)).to.equal(null);
  });

  it('vary_material: a flux ratio on every tile, and its R2O share in the trend', async () => {
    const result = await data('vary_material', { recipe: BASE, material: 'Whiting', to: 20 });
    for (const tile of result.tiles) {
      expect(tile.fluxRatio.R2O, 'tile ' + tile.number).to.be.closeTo(sumOf(tile.unity.fluxes, 'R2O'), 0.003);
      expect(tile.fluxRatio.RO, 'tile ' + tile.number).to.be.closeTo(sumOf(tile.unity.fluxes, 'RO'), 0.003);
    }
    // More whiting: more lime, so the alkalis' share falls.
    expect(result.trend.fluxRatio).to.include({ direction: 'falls' });
    expect(result.trend.fluxRatio.first).to.equal(result.tiles[0].fluxRatio.R2O);
  });

  it('vary_material: firstCaution and firstConeFitChange are the first tiles where they happen', async () => {
    for (const args of [
      { recipe: BASE, material: 'Whiting', to: 40, steps: 11, firing: { cone: '6' } },
      { recipe: BASE, material: 'Ferro Frit 3134', to: 60, steps: 7, firing: { cone: '10' } },
      { recipe: BASE, material: 'Silica', to: 60, steps: 6, firing: { cone: '04' } }
    ]) {
      const result = await data('vary_material', args);
      const tiles: Json[] = result.tiles;
      const start: string[] = tiles[0]!.cautions;
      const cautionAt = tiles.find((tile) => tile.cautions.some((c: string) => !start.includes(c)));
      if (cautionAt) {
        expect(result.trend.firstCaution, JSON.stringify(args)).to.eql({
          tile: cautionAt.number,
          cautions: cautionAt.cautions.filter((c: string) => !start.includes(c))
        });
      } else {
        expect(result.trend, JSON.stringify(args)).to.not.have.property('firstCaution');
      }
      const fitAt = tiles.find((tile) => tile.coneFit !== tiles[0]!.coneFit);
      if (fitAt) {
        expect(result.trend.firstConeFitChange).to.eql({
          tile: fitAt.number,
          from: tiles[0]!.coneFit,
          to: fitAt.coneFit
        });
      } else {
        expect(result.trend).to.not.have.property('firstConeFitChange');
      }
    }
    // Without a firing there is no cone fit, so no change in it.
    const unfired = await data('vary_material', { recipe: BASE, material: 'Whiting', to: 40, steps: 5 });
    expect(unfired.trend).to.not.have.property('firstConeFitChange');
  });

  it('compare_recipes: a summary of what matters, from each side', async () => {
    const result = await data('compare_recipes', { a: WITH_WHITING, b: MATTE, firing: { cone: '6' } });
    const { a, b, summary } = result;
    expect(summary.fluxRatio).to.eql({
      a: a.fluxRatio,
      b: b.fluxRatio,
      change: Number((b.fluxRatio.R2O - a.fluxRatio.R2O).toFixed(3))
    });
    expect(summary.silicaToAlumina).to.include({ a: a.silicaToAlumina, b: b.silicaToAlumina });
    expect(summary.SiO2).to.include({ a: a.unity.SiO2, b: b.unity.SiO2 });
    expect(summary.Al2O3).to.include({ a: a.unity.Al2O3, b: b.unity.Al2O3 });
    expect(summary.B2O3).to.include({ a: 0, b: 0, change: 0 });
    expect(summary.expansion).to.include({ a: a.expansion, b: b.expansion, fitThreshold: EXPANSION_FIT_FLAG });
    expect(summary.expansion.change).to.be.closeTo(b.expansion - a.expansion, 0.011);
    expect(summary.expansion.fitFlag).to.equal(Math.abs(summary.expansion.change) >= 0.3);
    if (summary.expansion.fitFlag) expect(summary.expansion.fitNote).to.include('test both');
    expect(summary.stull).to.eql({ a: a.stull.region, b: b.stull.region });
    expect(summary.cautions.onlyA).to.eql(a.cautions.filter((c: string) => !b.cautions.includes(c)));
    expect(summary.cautions.onlyB).to.eql(b.cautions.filter((c: string) => !a.cautions.includes(c)));
    expect(summary.coneFit).to.eql({ a: a.coneFit, b: b.coneFit });
    // Without a firing, no cone fit in the summary.
    expect((await data('compare_recipes', { a: WITH_WHITING, b: MATTE })).summary).to.not.have.property('coneFit');
  });

  it('compare_recipes: the expansion flag is raised at a difference of 0.3 or more, not below', async () => {
    // The same recipe twice: no change, no flag.
    const same = await data('compare_recipes', { a: BASE, b: BASE });
    expect(same.summary.expansion).to.include({ change: 0, fitFlag: false });
    expect(same.summary.expansion).to.not.have.property('fitNote');
    // Much more soda feldspar against much more silica: a large difference, flagged.
    const far = await data('compare_recipes', {
      a: [
        { material: 'Silica', amount: 40 },
        { material: 'Whiting', amount: 20 },
        { material: 'EPK', amount: 20 },
        { material: 'Custer Spar', amount: 20 }
      ],
      b: [
        { material: 'Nepheline Syenite (typical)', amount: 60 },
        { material: 'Whiting', amount: 10 },
        { material: 'EPK', amount: 10 },
        { material: 'Silica', amount: 20 }
      ]
    });
    expect(Math.abs(far.summary.expansion.change)).to.be.at.least(0.3);
    expect(far.summary.expansion.fitFlag).to.equal(true);
  });

  it('compare_recipes: by recipe id only signed in, and never with both lines and an id', async () => {
    expect(await refused('compare_recipes', { aRecipeId: '0123456789abcdef01234567', b: MATTE })).to.include(
      'Sign in to Glazecalc'
    );
    expect(await refused('compare_recipes', { a: BASE, aRecipeId: '0123456789abcdef01234567', b: MATTE })).to.include(
      'not both'
    );
    expect(await refused('compare_recipes', { a: BASE })).to.include('Give Recipe B');
    expect((await call('compare_recipes', { a: BASE, bRecipeId: 'x'.repeat(41) })).isError).to.equal(true);
  });

  it('both tools declare an output schema, and their answers keep to it', async () => {
    const tools: Json[] = (await rpc('tools/list')).body.result.tools;
    const vary = tools.find((t) => t.name === 'vary_material')!;
    const compare = tools.find((t) => t.name === 'compare_recipes')!;
    expect(vary.outputSchema.type).to.equal('object');
    expect(vary.outputSchema.properties).to.include.keys('tiles', 'trend', 'note');
    expect(compare.outputSchema.properties).to.include.keys('a', 'b', 'differences', 'materials', 'summary');
    expect(compare.inputSchema.properties).to.include.keys('aRecipeId', 'bRecipeId');
    expect(compare.inputSchema.required ?? []).to.not.include('a');
    // The SDK checks each answer against the schema: a range of answers comes back, not a validation error.
    for (const args of [
      { recipe: BASE, material: 'Whiting', to: 20, firing: { cone: '14' } },
      {
        recipe: WITH_WHITING,
        material: 'Dolomite',
        to: 10,
        mode: 'replace',
        instead: 'Whiting',
        limitSet: 'hesselberth-roy'
      }
    ]) {
      await data('vary_material', args);
    }
    await data('compare_recipes', { a: WITH_WHITING, b: MATTE, labels: ['One', 'Two'], firing: { cone: '14' } });
  });
});

describe('MCP: teach_me', () => {
  const prompt = async (args: object): Promise<Json> => {
    const answer = await rpc('prompts/get', { name: 'teach_me', arguments: args });
    expect(answer.body.error, JSON.stringify(answer.body.error)).to.equal(undefined);
    return answer.body.result as Json;
  };

  it('links the matched unit’s videos by his titles, with credit, and never retells them', async () => {
    const got = await prompt({ topic: 'line blends', language: 'de' });
    const text: string = got.messages[0].content.text;
    const unit = courseUnits().find((u) => u.id === 'blending')!;
    for (const video of unit.videos) expect(text).to.include(`- ${video.title}: ${video.url}`);
    for (const part of [
      'unit 5',
      'johnbrittpottery.com',
      'Do not retell, summarise or quote',
      'not connected with him',
      'do not add others',
      'His videos are in English',
      'language: "de"',
      'leach test',
      'safe mixing guide'
    ]) {
      expect(text).to.include(part);
    }
    expect(got.description).to.equal('Teach me: line blends');
    // Lab work: the safe mixing habits come attached, with the unit's guide sections (three at most).
    const resources = got.messages.slice(1).map((m: Json) => m.content.resource.uri as string);
    expect(resources[0]).to.include('safe-mixing/habits');
    expect(resources.length).to.be.within(2, 4);
  });

  it('with no matching unit: no video at all, the guide sections attached instead', async () => {
    const got = await prompt({ topic: 'pinholes in my glaze' });
    const text: string = got.messages[0].content.text;
    expect(text).to.not.include('youtube.com');
    expect(text).to.include('do not guess one');
    expect(text).to.not.include('His videos');
    const resources = got.messages.slice(1);
    expect(resources.length).to.be.within(1, 3);
    for (const message of resources) expect(message.content.resource.uri).to.not.include(COURSE_GUIDE);
  });

  it('speaks to the level asked for, new by default, and never invents a recipe', async () => {
    const plain = (await prompt({ topic: 'boron' })).messages[0].content.text as string;
    expect(plain).to.include('I am new to glaze chemistry');
    expect(plain).to.include('Do not invent a recipe');
    const expert = (
      await prompt({ topic: 'boron', level: 'experienced', recipe: 'Custer Spar 40, Silica 30', cone: '6' })
    ).messages[0].content.text as string;
    expect(expert).to.include('I am experienced');
    expect(expert).to.include('My recipe:');
    expect(expert).to.include('fired to 6');
    expect(expert).to.include('Use my recipe as given');
    expect(expert).to.not.include('Do not invent');
    const bad = await rpc('prompts/get', { name: 'teach_me', arguments: { topic: 'boron', level: 'guru' } });
    expect(bad.body.error).to.have.property('code');
    const long = await rpc('prompts/get', { name: 'teach_me', arguments: { topic: 'x'.repeat(201) } });
    expect(long.body.error).to.have.property('code');
  });

  it('completes the topic from the units and the guides’ headings', async () => {
    const answer = await rpc('completion/complete', {
      ref: { type: 'ref/prompt', name: 'teach_me' },
      argument: { name: 'topic', value: 'blen' }
    });
    expect(answer.body.result.completion.values).to.include('blending');
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
    for (const unit of courseUnits()) {
      expect(unit.exercises.length, unit.id).to.be.within(1, 3);
      expect(unit.checks.length, unit.id).to.be.within(2, 3);
      for (const q of unit.checks) expect(q, unit.id).to.match(/\?$/);
    }
    const file = readFileSync(
      path.join(import.meta.dirname, '..', '..', 'client', 'public', 'i18n', 'guides', COURSE_GUIDE, 'en.md'),
      'utf8'
    );
    expect(file).not.to.match(/Lark Books, now part of/);
  });
});
