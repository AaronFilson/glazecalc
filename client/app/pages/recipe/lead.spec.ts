import { calculateUMF } from '../../../../lib/chemistry';
import { Additive, RecipeMaterial } from '../../core/models';
import { LibraryMaterial } from './compare';
import { leadFreeBases, leadIn, recipeHasLead, replaceLead } from './lead';

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

// Red lead, Pb₃O₄: PbO with a little oxygen lost in the firing.
const RED_LEAD = material('Red lead', [['PbO', 1]], 2.33, { status: 'historical', substitutes: ['Lead frit'] });
const LEAD_FRIT = material(
  'Lead frit',
  [
    ['PbO', 1],
    ['SiO2', 2]
  ],
  0,
  { category: 'frit' }
);
// A calcium borosilicate, as 3124 and Standard Borax Frit are.
const BASE_FRIT = material(
  'Borosilicate frit',
  [
    ['Na2O', 0.3],
    ['CaO', 0.7],
    ['Al2O3', 0.25],
    ['B2O3', 0.6],
    ['SiO2', 2.6]
  ],
  0,
  { category: 'frit' }
);
const UK_FRIT = material(
  'UK borax frit',
  [
    ['Na2O', 0.35],
    ['CaO', 0.65],
    ['Al2O3', 0.3],
    ['B2O3', 0.7],
    ['SiO2', 2.8]
  ],
  0,
  { category: 'frit', region: ['UK'] }
);
// Half boron: a boron supplement, not a base.
const CALCIUM_BORATE = material(
  'Calcium borate frit',
  [
    ['CaO', 1],
    ['B2O3', 1.5],
    ['SiO2', 0.6]
  ],
  0,
  { category: 'frit' }
);
const ALKALI_FRIT = material(
  'Alkali frit',
  [
    ['Na2O', 0.7],
    ['K2O', 0.1],
    ['CaO', 0.2],
    ['Al2O3', 0.1],
    ['B2O3', 0.1],
    ['SiO2', 3]
  ],
  0,
  { category: 'frit' }
);
const KAOLIN = material(
  'China Clay',
  [
    ['Al2O3', 1],
    ['SiO2', 2]
  ],
  13.96,
  { category: 'clay' }
);
const SILICA = material('Silica', [['SiO2', 1]], 0, { category: 'silica' });
const WHITING = material('Whiting', [['CaO', 1]], 43.97, { category: 'flux' });
const ZINC = material('Zinc Oxide', [['ZnO', 1]], 0, { category: 'flux' });
const standard = [RED_LEAD, LEAD_FRIT, BASE_FRIT, UK_FRIT, CALCIUM_BORATE, ALKALI_FRIT, KAOLIN, SILICA, WHITING, ZINC];
const find = (name: string) => standard.find((m) => m.name === name);

const recipe = (lines: Array<[LibraryMaterial, string]>): RecipeMaterial[] =>
  lines.map(([m, amount]) => ({ ...structuredClone(m), amount }));
const HONEY = recipe([
  [RED_LEAD, '55'],
  [KAOLIN, '15'],
  [SILICA, '30']
]);
const additive = (name: string, oxide: string, amount: string): Additive => ({
  name,
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: oxide, amount: '1' }],
  amount,
  unit: 'percent'
});
const IRON = additive('Red iron oxide', 'Fe2O3', '4');
const unity = (lines: RecipeMaterial[]): Record<string, number> =>
  calculateUMF(lines.map((m) => ({ material: m, amount: m.amount ?? '' }))).umf;

describe('replacing lead', () => {
  it('says how much lead a recipe has', () => {
    expect(recipeHasLead(HONEY)).toBe(true);
    expect(recipeHasLead(recipe([[SILICA, '30']]))).toBe(false);
    // A line with no amount yet is not lead in the glaze.
    expect(recipeHasLead(recipe([[RED_LEAD, '']]))).toBe(false);
    const lead = leadIn(HONEY);
    expect(lead.unity).toBeCloseTo(1, 6);
    expect(lead.percent).toBeGreaterThan(50);
  });

  it('offers lead-free borosilicate frits sold in the region, best first: no lead, no calcium borate', () => {
    const names = (region: string) => leadFreeBases(HONEY, [], find, standard, region, 1060).map((b) => b.name);
    expect(names('US')).toEqual(['Borosilicate frit']);
    expect(names('UK').sort()).toEqual(['Borosilicate frit', 'UK borax frit']);
    const [choice] = leadFreeBases(HONEY, [], find, standard, 'US', 1060);
    expect(choice.boron).toBeGreaterThan(10);
  });

  it('rebuilds the glaze without lead: its silica and alumina, boron for the firing, on the old batch total', () => {
    const { materials, changes, cautions } = replaceLead(HONEY, [IRON], find, standard, 'US', {
      base: 'Borosilicate frit',
      celsius: 1060,
      mode: 'rebuild'
    });
    const names = materials.map((m) => m.name);
    expect(names).not.toContain('Red lead');
    expect(names).toContain('Borosilicate frit');
    expect(materials.reduce((sum, m) => sum + Number(m.amount), 0)).toBeCloseTo(100, 0);
    const [was, now] = [unity(HONEY), unity(materials)];
    expect(now['PbO']).toBeUndefined();
    expect(now['B2O3']).toBeCloseTo(0.48, 1);
    expect((now['K2O'] ?? 0) + (now['Na2O'] ?? 0)).toBeCloseTo(0.3, 1);
    expect(now['Al2O3']).toBeCloseTo(was['Al2O3'], 1);
    expect(now['SiO2']).toBeCloseTo(was['SiO2'], 0);
    expect(changes).toContain('Red lead 55 → 0');
    expect(changes.some((c) => c.startsWith('Borosilicate frit ') && c.endsWith(', new'))).toBe(true);
    expect(cautions).toContain('An iron honey glaze is less warm without lead, and can turn olive.');
  });

  it('keeps the colour on the base frit and kaolin, 85 to 15', () => {
    const { materials } = replaceLead(HONEY, [IRON], find, standard, 'US', {
      base: 'Borosilicate frit',
      celsius: 1060,
      mode: 'colour'
    });
    expect(materials.map((m) => [m.name, m.amount])).toEqual([
      ['Borosilicate frit', '85'],
      ['China Clay', '15']
    ]);
  });

  it('chooses bases by their role, and to keep the colour only those that bring enough alumina', () => {
    // Tagged by its maker as a craze cure: never a base, whatever its oxides.
    const tagged = { ...BASE_FRIT, name: 'Craze cure', fritRole: 'low-expansion' as const };
    const withTag = [...standard, tagged];
    const names = leadFreeBases(HONEY, [], (n) => withTag.find((m) => m.name === n), withTag, 'US', 1060).map(
      (b) => b.name
    );
    expect(names).not.toContain('Craze cure');
    // A base too thin in alumina for 85:15 with kaolin is not offered to keep the colour.
    const thin = material(
      'Thin frit',
      [
        ['Na2O', 0.3],
        ['CaO', 0.7],
        ['B2O3', 0.6],
        ['SiO2', 2.6]
      ],
      0,
      { category: 'frit', fritRole: 'base' }
    );
    const all = [...standard, thin];
    const colour = leadFreeBases(HONEY, [], (n) => all.find((m) => m.name === n), all, 'US', 1060, 'colour');
    expect(colour.map((b) => b.name)).toEqual(['Borosilicate frit']);
  });

  it('keeps raw clay in a rebuild, adds what the potter tries, and says what each material does', () => {
    const noClay = recipe([
      [RED_LEAD, '70'],
      [SILICA, '30']
    ]);
    const { materials, report } = replaceLead(noClay, [], find, standard, 'US', {
      base: 'Borosilicate frit',
      celsius: 1060,
      mode: 'rebuild',
      tries: [{ material: WHITING, must: true }]
    });
    const amount = (name: string) => Number(materials.find((m) => m.name === name)?.amount ?? 0);
    const total = materials.reduce((sum, m) => sum + Number(m.amount), 0);
    // Kaolin added at 10% or more, so the glaze stays suspended.
    expect(amount('China Clay') / total).toBeGreaterThanOrEqual(0.099);
    expect(amount('Whiting')).toBeGreaterThan(0);
    expect(report!.uses.map((use) => use.name)).toContain('Borosilicate frit');
    expect(report!.uses.find((use) => use.name === 'China Clay')!.supplies).toContain('alumina');
  });

  it('warns about colours that come from lead, and uses no zinc with chrome', () => {
    const chrome = additive('Chromium Oxide', 'Cr2O3', '1');
    const copper = additive('Copper carbonate', 'CuO', '2');
    const { materials, cautions } = replaceLead(HONEY, [chrome, copper], find, standard, 'US', {
      base: 'Borosilicate frit',
      celsius: 1060,
      mode: 'rebuild'
    });
    expect(materials.map((m) => m.name)).not.toContain('Zinc Oxide');
    expect(cautions).toContain('Copper turns bluer, toward turquoise, without lead.');
    expect(cautions.some((c) => c.startsWith('Red, orange or yellow from chrome comes from lead'))).toBe(true);
  });
});
