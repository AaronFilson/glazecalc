import { RecipeAnalysis, RecipeMaterial } from '../../core/models';
import { LibraryMaterial, compareUnity, formatChange, likeForLike, modernMaterials } from './compare';

const analysis = (uList: Record<string, number>, extra: Partial<RecipeAnalysis> = {}): RecipeAnalysis => ({
  uList,
  groups: { R2O: 0, RO: 1, R2O3: 0, RO2: 0 },
  loi: 10,
  ...extra
});

describe('comparing two unity formulas', () => {
  it('lines up every oxide in either, under the columns potters read, with the change', () => {
    const left = analysis({ CaO: 1, Al2O3: 0.3, SiO2: 3 });
    const right = analysis({ CaO: 0.8, MgO: 0.2, Al2O3: 0.35, SiO2: 3 }, { loi: 12 });
    const groups = compareUnity(left, right);
    expect(groups.map((g) => g.title)).toEqual(['Fluxes - RO', 'Stabilizers - R₂O₃', 'Glass Formers - RO₂', 'Balance']);
    const fluxes = groups[0].rows.map((r) => [r.label, r.left, r.right, formatChange(r.change, r.places)]);
    expect(fluxes).toEqual([
      ['CaO', 1, 0.8, '−0.200'],
      ['MgO', null, 0.2, '+0.200']
    ]);
    expect(groups[2].rows.map((r) => formatChange(r.change, r.places))).toEqual(['same']);
    const balance = Object.fromEntries(groups[3].rows.map((r) => [r.label, [r.left, r.right]]));
    expect(balance['Silica to alumina']).toEqual([10, 3 / 0.35]);
    expect(balance['Loss on ignition, %']).toEqual([10, 12]);
  });

  it("compares the calculated expansion, working it out from a saved recipe's analysis when it has no figure", () => {
    const left = analysis({ CaO: 1, SiO2: 2 }, { analysis: { CaO: 30, SiO2: 70 } });
    const right = analysis({ Na2O: 1, SiO2: 2 }, { expansion: 9.5 });
    const balance = compareUnity(left, right).at(-1)!;
    const row = balance.rows.find((r) => r.label === 'Expansion, ×10⁻⁶/°C')!;
    expect(row.left).toBeCloseTo(30 * 0.148 + 70 * 0.035, 9);
    expect(row.right).toBe(9.5);
    expect(formatChange(row.change, row.places)).toBe('+' + (9.5 - (30 * 0.148 + 70 * 0.035)).toFixed(2));
  });

  it('shows one side when the other has no recipe or no unity formula yet', () => {
    const groups = compareUnity(analysis({ CaO: 1, SiO2: 2, ZrO2: 0.1 }), null);
    // Anything else goes under a fourth column, shown only when there is any.
    expect(groups.map((g) => g.title)).toContain('Wildcards');
    // No change against a recipe that is not there.
    expect(groups[0].rows[0]).toMatchObject({ left: 1, right: null, change: null });
  });
});

describe('trying modern materials', () => {
  const library: LibraryMaterial[] = [
    {
      _id: 'c',
      name: 'Custer Spar',
      percentmole: 'percent',
      loi: 0,
      fields: [],
      status: 'discontinued',
      statusSince: '2023',
      substitutes: ['Potash feldspar (UK)', 'G-200 EU Feldspar']
    },
    { _id: 'u', name: 'Potash feldspar (UK)', percentmole: 'percent', loi: 0, fields: [], region: ['UK'] },
    { _id: 'g', name: 'G-200 EU Feldspar', percentmole: 'percent', loi: 0, fields: [], region: ['US'] },
    { _id: 'w', name: 'Whiting', percentmole: 'molecular', loi: 44, fields: [] },
    {
      _id: 'e',
      name: 'EPK Kaolin',
      aliases: ['EPK'],
      percentmole: 'percent',
      loi: 14,
      fields: [],
      status: 'scarce',
      substitutes: ['Gone Kaolin']
    }
  ];
  const find = (name: string) =>
    library.find((r) => r.name === name || (r.aliases ?? []).includes(name)) as LibraryMaterial | undefined;
  const recipe: RecipeMaterial[] = [
    { name: 'Custer Spar', amount: '40', percentmole: 'percent', loi: 0, fields: [] },
    { name: 'Whiting', amount: '20', percentmole: 'molecular', loi: 44, fields: [] },
    { name: 'EPK', amount: '15', percentmole: 'percent', loi: 14, fields: [] }
  ];

  it('swaps each material no longer current for its first substitute, one for one, at the same amount', () => {
    const { materials, swaps } = modernMaterials(recipe, find);
    expect(materials.map((m) => [m.name, m.amount])).toEqual([
      ['Potash feldspar (UK)', '40'],
      ['Whiting', '20'],
      // Its only substitute is not in the library, so it stays.
      ['EPK', '15']
    ]);
    expect(swaps).toEqual([
      { from: 'Custer Spar', status: 'Discontinued 2023', to: 'Potash feldspar (UK)', like: false, lead: false }
    ]);
    // The recipe given is not changed.
    expect(recipe[0].name).toBe('Custer Spar');
  });

  it('makes one line of materials that become the same one, adding their amounts', () => {
    const both: RecipeMaterial[] = [
      { name: 'Custer Spar', amount: '20', percentmole: 'percent', loi: 0, fields: [] },
      { name: 'Potash feldspar (UK)', amount: '10.5', percentmole: 'percent', loi: 0, fields: [] },
      { name: 'Whiting', amount: '20', percentmole: 'molecular', loi: 44, fields: [] }
    ];
    const { materials } = modernMaterials(both, find);
    expect(materials.map((m) => [m.name, m.amount])).toEqual([
      ['Potash feldspar (UK)', '30.5'],
      ['Whiting', '20']
    ]);
    // The recipe given is not changed.
    expect(both[1].amount).toBe('10.5');
  });

  it('prefers a substitute sold in the region chosen', () => {
    expect(modernMaterials(recipe, find, 'US').swaps[0].to).toBe('G-200 EU Feldspar');
    expect(modernMaterials(recipe, find, 'UK').swaps[0].to).toBe('Potash feldspar (UK)');
  });
});

describe('like for like', () => {
  const analysis = (name: string, fields: Array<[string, number]>, loi = 0) => ({
    name,
    percentmole: 'percent' as const,
    loi,
    fields: fields.map(([oxide, amount]) => ({ name: oxide, amount }))
  });
  const custer = analysis(
    'Custer',
    [
      ['SiO2', 68.5],
      ['Al2O3', 17],
      ['K2O', 10],
      ['Na2O', 3],
      ['CaO', 0.3]
    ],
    0.3
  );
  const g200 = analysis(
    'G-200 EU',
    [
      ['SiO2', 68.5],
      ['Al2O3', 17],
      ['K2O', 11],
      ['Na2O', 2.1],
      ['CaO', 0.5]
    ],
    0.5
  );
  const niter = analysis('Niter', [['K2O', 46.6]], 53.4);
  const frit = analysis('Soda frit', [
    ['SiO2', 70],
    ['Na2O', 15],
    ['CaO', 10],
    ['Al2O3', 5]
  ]);

  it('is much the same oxides gram for gram, not just the same kind of material', () => {
    expect(likeForLike(custer, g200)).toBe(true);
    expect(likeForLike(niter, frit)).toBe(false);
    // Nothing to compare with: not known to be alike.
    expect(likeForLike(custer, { name: 'Stain', fields: [] })).toBe(false);
  });
});
