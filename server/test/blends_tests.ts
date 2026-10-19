import { expect } from 'chai';
import recipe from '../../lib/recipe/index.js';
import type { BlendLine } from '../../lib/recipe/index.js';

// Blends for test tiles (lib/recipe/blends.js): the tiles of line, biaxial
// and triaxial blends, and each tile's recipe mixed from the corners.

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const round = (value: number) => Math.round(value * 1e6) / 1e6;

describe('Blends: tiles', () => {
  it('a line blend runs from all A to all B in even steps', () => {
    const blend = recipe.blendTiles('line', 5)!;
    expect(blend.corners).to.equal(2);
    expect(blend.rows).to.equal(1);
    expect(blend.tiles.map((t) => t.shares)).to.eql([
      [1, 0],
      [0.75, 0.25],
      [0.5, 0.5],
      [0.25, 0.75],
      [0, 1]
    ]);
    expect(blend.tiles.map((t) => [t.number, t.row, t.col])).to.eql([
      [1, 0, 0],
      [2, 0, 1],
      [3, 0, 2],
      [4, 0, 3],
      [5, 0, 4]
    ]);
  });

  it('rounds shares that come out a hair off', () => {
    const shares = recipe.blendTiles('line', 11)!.tiles.map((t) => t.shares[1]);
    expect(shares).to.eql([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  });

  it('a biaxial blend is a square grid with a corner recipe at each corner', () => {
    const blend = recipe.blendTiles('biaxial', 3)!;
    expect(blend.tiles).to.have.length(9);
    expect(blend.corners).to.equal(4);
    const at = (row: number, col: number) => blend.tiles.find((t) => t.row === row && t.col === col)!;
    expect(at(0, 0).shares).to.eql([1, 0, 0, 0]);
    expect(at(0, 2).shares).to.eql([0, 1, 0, 0]);
    expect(at(2, 0).shares).to.eql([0, 0, 1, 0]);
    expect(at(2, 2).shares).to.eql([0, 0, 0, 1]);
    expect(at(1, 1).shares).to.eql([0.25, 0.25, 0.25, 0.25]);
    expect(at(0, 1).shares).to.eql([0.5, 0.5, 0, 0]);
    expect(at(1, 2).number).to.equal(6);
  });

  it('a triaxial blend is a triangle: A at the top, B bottom left, C bottom right', () => {
    const blend = recipe.blendTiles('triaxial', 3)!;
    expect(blend.tiles.map((t) => [t.number, t.row, t.col, t.shares])).to.eql([
      [1, 0, 0, [1, 0, 0]],
      [2, 1, 0, [0.5, 0.5, 0]],
      [3, 1, 1, [0.5, 0, 0.5]],
      [4, 2, 0, [0, 1, 0]],
      [5, 2, 1, [0, 0.5, 0.5]],
      [6, 2, 2, [0, 0, 1]]
    ]);
  });

  it('every tile’s shares add up to 1, and a triaxial blend of n rows has n(n+1)/2 tiles', () => {
    for (const kind of ['line', 'biaxial', 'triaxial'] as const) {
      const { min, max } = recipe.BLEND_STEPS[kind];
      for (let steps = min; steps <= max; steps++) {
        const blend = recipe.blendTiles(kind, steps)!;
        for (const tile of blend.tiles) expect(round(sum(tile.shares)), `${kind} ${steps}`).to.equal(1);
        const count = kind === 'line' ? steps : kind === 'biaxial' ? steps * steps : (steps * (steps + 1)) / 2;
        expect(blend.tiles).to.have.length(count);
        expect(blend.tiles.map((t) => t.number)).to.eql(blend.tiles.map((_, i) => i + 1));
      }
    }
    expect(recipe.blendTiles('triaxial', 11)!.tiles).to.have.length(66);
  });

  it('refuses steps out of range and unknown kinds', () => {
    expect(recipe.blendTiles('line', 1)).to.equal(null);
    expect(recipe.blendTiles('line', 22)).to.equal(null);
    expect(recipe.blendTiles('biaxial', 9)).to.equal(null);
    expect(recipe.blendTiles('triaxial', 2.5)).to.equal(null);
    expect(recipe.blendTiles('square' as never, 3)).to.equal(null);
  });
});

const line = (name: string, amount: string, extra: Partial<BlendLine> = {}): BlendLine => ({ name, amount, ...extra });

describe('Blends: mixing the corners', () => {
  const celadon = {
    materials: [line('Custer', '40'), line('Whiting', '20'), line('Silica', '40')],
    additives: [line('Red iron oxide', '2', { unit: 'percent' })]
  };
  // In grams, not percent: 500 g of base.
  const matte = {
    materials: [line('Custer', '250'), line('Dolomite', '100'), line('EPK', '150')],
    additives: [line('Rutile', '20', { unit: 'grams' })]
  };

  it('mixes two recipes as percents of their bases, whatever scale each is in', () => {
    const mixed = recipe.mixRecipes([celadon, matte], [0.5, 0.5])!;
    expect(mixed.materials.map((m) => [m.line.name, round(m.amount)])).to.eql([
      ['Custer', 45],
      ['Whiting', 10],
      ['Silica', 20],
      ['Dolomite', 10],
      ['EPK', 15]
    ]);
    expect(round(sum(mixed.materials.map((m) => m.amount)))).to.equal(100);
    // 2% of one, and 20 g on a 500 g base (4%) of the other.
    expect(mixed.additives.map((a) => [a.line.name, round(a.amount)])).to.eql([
      ['Red iron oxide', 1],
      ['Rutile', 2]
    ]);
  });

  it('gives a corner tile its corner’s recipe, in percent, leaving out what it does not have', () => {
    const mixed = recipe.mixRecipes([celadon, matte], [0, 1])!;
    expect(mixed.materials.map((m) => [m.line.name, round(m.amount)])).to.eql([
      ['Custer', 50],
      ['Dolomite', 20],
      ['EPK', 30]
    ]);
    expect(mixed.additives.map((a) => [a.line.name, round(a.amount)])).to.eql([['Rutile', 4]]);
  });

  it('treats a colorant in parts as parts of the base', () => {
    const base = {
      materials: [line('Custer', '5'), line('Silica', '5')],
      additives: [line('Cobalt', '0.1', { unit: 'parts' })]
    };
    expect(round(recipe.mixRecipes([base], [1])!.additives[0].amount)).to.equal(1);
  });

  it('reads a colorant saved before units as a percent', () => {
    const base = { materials: [line('Custer', '50'), line('Silica', '50')], additives: [line('Copper', '3')] };
    expect(round(recipe.mixRecipes([base], [1])!.additives[0].amount)).to.equal(3);
  });

  it('counts the same saved material as one line, by its id, even if renamed', () => {
    const a = { materials: [line('Silica', '100', { _id: 's1' })] };
    const b = { materials: [line('Quartz', '50', { _id: 's1' }), line('Whiting', '50')] };
    const mixed = recipe.mixRecipes([a, b], [0.5, 0.5])!;
    expect(mixed.materials.map((m) => [m.line.name, round(m.amount)])).to.eql([
      ['Silica', 75],
      ['Whiting', 25]
    ]);
  });

  it('matches materials without ids by name, whatever their case', () => {
    const a = { materials: [line('silica', '100')] };
    const b = { materials: [line('SILICA', '100')] };
    expect(recipe.mixRecipes([a, b], [0.3, 0.7])!.materials).to.have.length(1);
  });

  it('mixes four corners of a biaxial tile and three of a triaxial', () => {
    const only = (name: string) => ({ materials: [line(name, '10')] });
    const corners = [only('A'), only('B'), only('C'), only('D')];
    const tile = recipe.blendTiles('biaxial', 3)!.tiles[4];
    expect(recipe.mixRecipes(corners, tile.shares)!.materials.map((m) => round(m.amount))).to.eql([25, 25, 25, 25]);
    const tri = recipe.blendTiles('triaxial', 5)!.tiles[7];
    const mixed = recipe.mixRecipes(corners.slice(0, 3), tri.shares)!;
    expect(round(sum(mixed.materials.map((m) => m.amount)))).to.equal(100);
  });

  it('returns null when a corner with a share has no base, and ignores an empty one with none', () => {
    const empty = { materials: [line('Silica', '')] };
    expect(recipe.mixRecipes([celadon, empty], [0.5, 0.5])).to.equal(null);
    expect(recipe.mixRecipes([celadon, empty], [1, 0])).to.not.equal(null);
  });
});

describe('Comparing two unity formulas (lib/recipe/compare.js)', () => {
  const analysis = (uList: Record<string, number>, extra: object = {}) => ({
    uList,
    groups: { R2O: 0, RO: 1 },
    loi: 10,
    ...extra
  });

  it('lines up every oxide under its column, with the change, and a balance group of keys', () => {
    const groups = recipe.compareUnity(
      analysis({ CaO: 1, Al2O3: 0.3, SiO2: 3 }),
      analysis({ CaO: 0.8, MgO: 0.2, Al2O3: 0.35, SiO2: 3 }, { loi: 12 })
    );
    expect(groups.map((g) => g.key)).to.eql(['fluxes', 'stabilizers', 'glassFormers', 'balance']);
    expect(groups[0].rows.map((r) => [r.label, r.left, r.right, r.change === null ? null : round(r.change)])).to.eql([
      ['CaO', 1, 0.8, -0.2],
      ['MgO', null, 0.2, 0.2]
    ]);
    const balance = Object.fromEntries(groups[3].rows.map((r) => [r.key, [r.left, r.right]]));
    expect(balance.silicaToAlumina).to.eql([10, 3 / 0.35]);
    expect(balance.loi).to.eql([10, 12]);
  });

  it('works out expansion from the fired analysis, and has no change against a missing recipe', () => {
    const only = recipe.compareUnity(
      analysis({ CaO: 1, SiO2: 2, ZrO2: 0.1 }, { analysis: { CaO: 30, SiO2: 70 } }),
      null
    );
    expect(only.map((g) => g.key)).to.include('wildcards');
    expect(only[0].rows[0]).to.include({ left: 1, right: null, change: null });
    const expands = only.at(-1)!.rows.find((r) => r.key === 'expansion')!;
    expect(expands.left).to.be.closeTo(30 * 0.148 + 70 * 0.035, 1e-9);
  });
});
