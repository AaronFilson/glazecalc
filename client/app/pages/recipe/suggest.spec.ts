import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { calculateUMF } from '../../../../lib/chemistry';
import { RecipeMaterial } from '../../core/models';
import { provideEnglish } from '../../testing/i18n';
import { LibraryMaterial } from './compare';
import { planSuggestion, suggestAmounts } from './suggest';

const material = (
  name: string,
  fields: Array<[string, number]>,
  loi: number,
  info: Partial<LibraryMaterial> = {}
): LibraryMaterial => ({
  _id: name,
  name,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount })),
  ...info
});

// Niter, KNO₃: potash, with the nitrogen and most of the oxygen lost in the firing.
const NITER = material('Niter', [['K2O', 1]], 53.42, { status: 'historical', substitutes: ['Soda frit'] });
const SODA_FRIT = material(
  'Soda frit',
  [
    ['Na2O', 0.7],
    ['CaO', 0.3],
    ['Al2O3', 0.1],
    ['B2O3', 0.1],
    ['SiO2', 3]
  ],
  0
);
const POTASH_FELDSPAR = material(
  'Potash feldspar',
  [
    ['K2O', 1],
    ['Al2O3', 1],
    ['SiO2', 6]
  ],
  0
);
const UK_FELDSPAR = material(
  'UK potash feldspar',
  [
    ['K2O', 0.8],
    ['Na2O', 0.2],
    ['Al2O3', 1],
    ['SiO2', 6]
  ],
  0,
  { region: ['UK'] }
);
const OLD_SPAR = material(
  'Old potash spar',
  [
    ['K2O', 1],
    ['Al2O3', 1],
    ['SiO2', 7]
  ],
  0,
  { status: 'discontinued', substitutes: ['Potash feldspar'] }
);
const IDEAL_SPAR = material(
  'Orthoclase',
  [
    ['K2O', 1],
    ['Al2O3', 1],
    ['SiO2', 6]
  ],
  0,
  { category: 'feldspar', source: { name: 'formula', kind: 'theoretical' } }
);
const WHITING = material('Whiting', [['CaO', 1]], 43.97);
const KAOLIN = material(
  'Kaolin',
  [
    ['Al2O3', 1],
    ['SiO2', 2]
  ],
  13.96
);
const SILICA = material('Silica', [['SiO2', 1]], 0);
const TALC = material(
  'Talc',
  [
    ['MgO', 3],
    ['SiO2', 4]
  ],
  4.75
);
const LITHARGE = material('Litharge', [['PbO', 1]], 0, { status: 'historical', substitutes: ['Lead frit'] });
const LEAD_FRIT = material(
  'Lead frit',
  [
    ['PbO', 1],
    ['SiO2', 2]
  ],
  0
);

// Potash too, but it dissolves in water: never suggested.
const PEARL_ASH = material('Pearl ash', [['K2O', 1]], 31.84, { soluble: true });
const library = [
  NITER,
  PEARL_ASH,
  SODA_FRIT,
  POTASH_FELDSPAR,
  UK_FELDSPAR,
  OLD_SPAR,
  IDEAL_SPAR,
  WHITING,
  KAOLIN,
  SILICA,
  TALC,
  LITHARGE,
  LEAD_FRIT
];
const find = (name: string) => library.find((m) => m.name === name);
const recipe = (lines: Array<[LibraryMaterial, string]>): RecipeMaterial[] =>
  lines.map(([m, amount]) => ({ ...structuredClone(m), amount }));
const unity = (lines: RecipeMaterial[]): Record<string, number> => {
  const { umf } = calculateUMF(lines.map((m) => ({ material: m, amount: m.amount ?? '' })));
  return { ...umf, KNaO: (umf['K2O'] ?? 0) + (umf['Na2O'] ?? 0) };
};

const OLD = recipe([
  [NITER, '10'],
  [WHITING, '20'],
  [KAOLIN, '20'],
  [SILICA, '40'],
  [TALC, '10']
]);

describe('suggesting amounts for a swap that is not like for like', () => {
  // A material's status is a message.
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideEnglish() });
    TestBed.inject(TranslocoService);
  });

  it('asks what brings back an oxide the swap leaves short: current materials sold in the region, best first', () => {
    const plan = planSuggestion(OLD, find, library, 'US');
    expect(plan.swaps.map((s) => [s.from, s.to, s.like])).toEqual([['Niter', 'Soda frit', false]]);
    expect(plan.shortfalls).toHaveLength(1);
    const [short] = plan.shortfalls;
    expect(short).toMatchObject({ oxide: 'K2O', from: ['Niter'], instead: ['Soda frit'] });
    expect(short.was).toBeCloseTo(unity(OLD)['K2O'], 6);
    expect(short.now).toBeLessThan(0.9 * short.was);
    // Not the discontinued spar, the ideal mineral, the UK-only feldspar, the soluble
    // pearl ash, or one already in the recipe.
    expect(short.choices).toEqual([{ name: 'Potash feldspar', percent: 17 }]);
    // Sold in the UK, it is offered there.
    const uk = planSuggestion(OLD, find, library, 'UK').shortfalls[0].choices.map((c) => c.name);
    expect(uk).toContain('UK potash feldspar');
  });

  it('works out the amounts with what was chosen, changing the recipe as little as it can', () => {
    const suggestion = suggestAmounts(OLD, find, [POTASH_FELDSPAR], 'US');
    const amounts = Object.fromEntries(suggestion.materials.map((m) => [m.name, m.amount]));
    // What did not need changing keeps its amount as typed.
    expect(amounts['Whiting']).toBe('20');
    expect(amounts['Talc']).toBe('10');
    expect(amounts['Niter']).toBeUndefined();
    expect(Number(amounts['Potash feldspar'])).toBeGreaterThan(20);
    expect(suggestion.changes).toContain(`Potash feldspar ${amounts['Potash feldspar']}, new`);
    expect(suggestion.changes).toContain(`Silica 40 → ${amounts['Silica']}`);
    expect(suggestion.stillShort).toEqual([]);
    const [was, now] = [unity(OLD), unity(suggestion.materials)];
    expect(now['KNaO']).toBeCloseTo(was['KNaO'], 2);
    for (const oxide of ['CaO', 'MgO', 'Al2O3', 'SiO2']) expect(now[oxide]).toBeCloseTo(was[oxide], 1);
  });

  it('says what is still short when nothing is brought in, and drops a replacement it has no use for', () => {
    const suggestion = suggestAmounts(OLD, find, [], 'US');
    expect(suggestion.stillShort).toEqual(['potash (K₂O)']);
    // The soda frit stands in for some of the potash, so it stays.
    expect(suggestion.materials.map((m) => m.name)).toContain('Soda frit');
    expect(suggestion.unused).toEqual([]);
  });

  it('tries materials the potter adds, uses those that help, and leaves out what they say not to use', () => {
    // Added to try: the feldspar brings the potash back; the UK feldspar is not needed beside it.
    const tries = [POTASH_FELDSPAR, UK_FELDSPAR].map((material) => ({ material, must: false }));
    const tried = suggestAmounts(OLD, find, [], 'US', { tries });
    const names = tried.materials.map((m) => m.name);
    expect(names.filter((name) => name.includes('feldspar'))).toHaveLength(1);
    expect(tried.stillShort).toEqual([]);
    // What each does, in words.
    const feldspar = tried.report.uses.find((use) => use.name.includes('feldspar'))!;
    expect(feldspar.supplies).toMatch(/^(all|most of) the potash/);
    expect(feldspar.needed).toBe(true);
    // Told not to use the first, the match uses the other.
    const used = names.find((name) => name.includes('feldspar'))!;
    const other = suggestAmounts(OLD, find, [], 'US', { tries, avoid: [used] });
    expect(other.materials.map((m) => m.name)).not.toContain(used);
    expect(other.materials.map((m) => m.name).some((name) => name.includes('feldspar'))).toBe(true);
    // A must stays in even where it adds little.
    const must = suggestAmounts(OLD, find, [], 'US', {
      tries: [
        { material: WHITING, must: true },
        { material: TALC, must: true }
      ]
    });
    expect(must.materials.map((m) => m.name)).toEqual(expect.arrayContaining(['Whiting', 'Talc']));
  });

  it('needs nothing brought in when the replacement carries what the old material gave', () => {
    const old = recipe([
      [LITHARGE, '55'],
      [KAOLIN, '15'],
      [SILICA, '30']
    ]);
    // With lead allowed in Settings.
    expect(planSuggestion(old, find, library, '', { allowLead: true }).shortfalls).toEqual([]);
    const suggestion = suggestAmounts(old, find, [], '', { allowLead: true });
    const amounts = Object.fromEntries(suggestion.materials.map((m) => [m.name, m.amount]));
    // The frit carries the silica: more of it, the kaolin as it was, and the 0.4 of
    // silica still wanted is a token amount, so the silica goes.
    expect(Number(amounts['Lead frit'])).toBeGreaterThan(80);
    expect(amounts['Kaolin']).toBe('15');
    expect(amounts['Silica']).toBeUndefined();
    expect(suggestion.changes).toContain('Silica 30 → 0');
    const [was, now] = [unity(old), unity(suggestion.materials)];
    for (const oxide of ['PbO', 'Al2O3', 'SiO2']) expect(now[oxide]).toBeCloseTo(was[oxide], 1);
  });
});
