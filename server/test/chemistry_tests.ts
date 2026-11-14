import * as chai from 'chai';
import chemistry from '../../lib/chemistry/index.js';
import type { ChemistryError, MaterialField, MaterialInput } from '../../lib/chemistry/index.js';
import standardData from '../../data/index.js';
import library from '../../lib/recipe/library.js';
import paste from '../../lib/recipe/paste.js';

const expect = chai.expect;
const calculateUMF = chemistry.calculateUMF;
const MW = chemistry.MOLAR_MASS;

/** A material as stored in data/materials.ndjson. */
interface StandardMaterial extends MaterialInput {
  equivalent: number;
  formulaweight: number;
  loi: number;
  rawformula: string;
  fields: MaterialField[];
}

/** What every standard material and additive records about itself (server/models/library_info.ts). */
interface LibraryRecord {
  name: string;
  aliases?: string[];
  category?: string;
  region?: string[];
  status?: string;
  statusSince?: string;
  substitutes?: string[];
  replaces?: string[];
  hazards?: string;
  notes?: string[];
  fluorine?: boolean;
  source?: { name?: string; url?: string; kind?: string };
  noChemistry?: boolean;
  chemistryOf?: string;
}

// Atomic weights for the raw formulas: the library's, and the elements that
// only leave in the firing (fluorine in cryolite and fluorspar, nitrogen in nitrates).
const ATOMIC_WEIGHTS: Record<string, number> = { ...chemistry.ATOMIC_WEIGHTS, F: 18.998, N: 14.007 };
// Elements that leave as gases in the firing (or, as oxygen, come and go).
const GASES = ['O', 'H', 'C', 'F', 'N'];

/** Atoms in a formula as written, such as Ca₃(PO₄)₂ or Na₂O•2B₂O₃•10H₂O, scaled by k. */
const atomsIn = (formula: string, k = 1): Record<string, number> => {
  const atoms: Record<string, number> = {};
  const plain = formula.replace(/[₀-₉]/g, (digit) => String(digit.charCodeAt(0) - 0x2080));
  for (const part of plain.split('•')) {
    const [, coefficient, rest] = part.trim().match(/^(\d*\.?\d*)(.*)$/)!;
    const stack: Array<Record<string, number>> = [{}];
    const tokens = rest.matchAll(/([A-Z][a-z]?)(\d*)|(\()|\)(\d*)/g);
    let read = '';
    for (const [token, element, count, open, groupCount] of tokens) {
      read += token;
      const top = stack[stack.length - 1];
      if (element) {
        expect(ATOMIC_WEIGHTS, 'an element in ' + formula).to.have.property(element);
        top[element] = (top[element] ?? 0) + Number(count || 1);
      } else if (open) stack.push({});
      else {
        const inner = stack.pop()!;
        const outer = stack[stack.length - 1];
        Object.entries(inner).forEach(([e, n]) => (outer[e] = (outer[e] ?? 0) + n * Number(groupCount || 1)));
      }
    }
    expect(read, 'all of ' + formula).to.equal(rest);
    Object.entries(stack[0]).forEach(([e, n]) => (atoms[e] = (atoms[e] ?? 0) + n * Number(coefficient || 1) * k));
  }
  return atoms;
};
const massOf = (atoms: Record<string, number>): number =>
  Object.entries(atoms).reduce((mass, [element, n]) => mass + ATOMIC_WEIGHTS[element] * n, 0);

// The reference data: CIAAW's abridged standard atomic weights of 2024, as printed there with their
// uncertainty (https://www.ciaaw.org/abridged-atomic-weights.htm). Zirconium's was revised in 2024.
const CIAAW_2024: Record<string, string> = {
  H: '1.0080 ± 0.0002',
  Li: '6.94 ± 0.06',
  B: '10.81 ± 0.02',
  C: '12.011 ± 0.002',
  O: '15.999 ± 0.001',
  Na: '22.990 ± 0.001',
  Mg: '24.305 ± 0.002',
  Al: '26.982 ± 0.001',
  Si: '28.085 ± 0.001',
  P: '30.974 ± 0.001',
  S: '32.06 ± 0.02',
  K: '39.098 ± 0.001',
  Ca: '40.078 ± 0.004',
  Ti: '47.867 ± 0.001',
  V: '50.942 ± 0.001',
  Cr: '51.996 ± 0.001',
  Mn: '54.938 ± 0.001',
  Fe: '55.845 ± 0.002',
  Co: '58.933 ± 0.001',
  Ni: '58.693 ± 0.001',
  Cu: '63.546 ± 0.003',
  Zn: '65.38 ± 0.02',
  Sr: '87.62 ± 0.01',
  Zr: '91.222 ± 0.003',
  Sn: '118.71 ± 0.01',
  Sb: '121.76 ± 0.01',
  Ba: '137.33 ± 0.01',
  Ce: '140.12 ± 0.01',
  Pr: '140.91 ± 0.01',
  Pb: '207.2 ± 1.1'
};

describe('glaze chemistry', () => {
  describe('molar masses', () => {
    it("should use CIAAW 2024's standard atomic weights, as its abridged table rounds them", () => {
      expect(Object.keys(chemistry.ATOMIC_WEIGHTS).sort()).to.eql(Object.keys(CIAAW_2024).sort());
      for (const [element, printed] of Object.entries(CIAAW_2024)) {
        const [value, uncertainty] = printed.split(' ± ');
        const places = value.split('.')[1]?.length ?? 0;
        // Ba, Ce and Pr are a place longer, as in CIAAW's full table: the same once rounded.
        expect(Number(chemistry.ATOMIC_WEIGHTS[element].toFixed(places)), element).to.equal(Number(value));
        expect(chemistry.ATOMIC_WEIGHTS[element], element).to.be.closeTo(Number(value), Number(uncertainty));
      }
    });

    it('should derive oxide molar masses from atomic weights (CIAAW 2024)', () => {
      expect(MW.SiO2).to.be.closeTo(60.083, 0.001);
      expect(MW.Al2O3).to.be.closeTo(101.961, 0.001);
      expect(MW.K2O).to.be.closeTo(94.195, 0.001);
      expect(MW.CaO).to.be.closeTo(56.077, 0.001);
      expect(MW.B2O3).to.be.closeTo(69.617, 0.001);
      expect(MW.ZrO2).to.be.closeTo(123.22, 0.001);
    });
  });

  describe('theoretical material analyses', () => {
    it('should compute potash feldspar (K2O.Al2O3.6SiO2) weight percents', () => {
      const result = chemistry.formulaToAnalysis({ K2O: 1, Al2O3: 1, SiO2: 6 });
      expect(result.analysis.K2O).to.be.closeTo(16.92, 0.01);
      expect(result.analysis.Al2O3).to.be.closeTo(18.32, 0.01);
      expect(result.analysis.SiO2).to.be.closeTo(64.76, 0.01);
      expect(result.loi).to.eql(0);
    });

    it('should count CO2 in whiting as loss on ignition', () => {
      const result = chemistry.formulaToAnalysis({ CaO: 1, CO2: 1 });
      expect(result.analysis.CaO).to.be.closeTo(56.03, 0.01);
      expect(result.loi).to.be.closeTo(43.97, 0.01);
    });

    it('should count chemically bound water in kaolin as loss on ignition', () => {
      const result = chemistry.formulaToAnalysis({ Al2O3: 1, SiO2: 2, H2O: 2 });
      expect(result.analysis.Al2O3).to.be.closeTo(39.5, 0.01);
      expect(result.analysis.SiO2).to.be.closeTo(46.55, 0.01);
      expect(result.loi).to.be.closeTo(13.96, 0.01);
    });
  });

  describe('UMF calculation', () => {
    it('should give whole-number moles for a formula-weight batch', () => {
      // 1 mol CaCO3 + 3 mol SiO2 fires to CaO.3SiO2
      const result = calculateUMF([
        { material: 'Whiting', amount: MW.CaO + 44.009 },
        { material: 'Silica', amount: 3 * MW.SiO2 }
      ]);
      expect(result.umf.CaO).to.be.closeTo(1, 1e-9);
      expect(result.umf.SiO2).to.be.closeTo(3, 1e-9);
      expect(result.siAlRatio).to.eql(null);
    });

    it('should calculate a Leach 4321 celadon base', () => {
      const result = calculateUMF({
        'Potash Feldspar (theoretical)': 40,
        Silica: 30,
        Whiting: 20,
        'Kaolin (theoretical)': 10
      });
      expect(result.umf.K2O).to.be.closeTo(0.2645, 0.0001);
      expect(result.umf.CaO).to.be.closeTo(0.7355, 0.0001);
      expect(result.umf.Al2O3).to.be.closeTo(0.4071, 0.0001);
      expect(result.umf.SiO2).to.be.closeTo(3.7099, 0.0001);
      expect(result.siAlRatio).to.be.closeTo(9.114, 0.001);
      expect(result.loi).to.be.closeTo(10.19, 0.01);
      expect(result.groups.R2O + result.groups.RO).to.be.closeTo(1, 1e-9);
    });

    it("should calculate the expansion as Digitalfire and Glazy do: Leach 4321's 7.49", () => {
      // Glazy's help works this glaze through to 7.49 (https://help.glazy.org/concepts/analyses).
      const result = calculateUMF({
        'Potash Feldspar (theoretical)': 40,
        Silica: 30,
        Whiting: 20,
        'Kaolin (theoretical)': 10
      });
      expect(result.expansion).to.be.closeTo(7.49, 0.005);
      // Weight percent times each oxide's coefficient, on an analysis normalized to 100.
      expect(chemistry.expansion({ SiO2: 50, Na2O: 50 })).to.be.closeTo(50 * 0.035 + 50 * 0.387, 1e-9);
      expect(chemistry.expansion({ SiO2: 1, Na2O: 1 })).to.be.closeTo(50 * 0.035 + 50 * 0.387, 1e-9);
      // A colorant with no coefficient adds nothing but still counts in the total, as in Glazy.
      expect(chemistry.expansion({ SiO2: 50, CoO: 50 })).to.be.closeTo(50 * 0.035, 1e-9);
      expect(chemistry.expansion({})).to.equal(null);
    });

    // The README's 4321 (its screenshot: Orthoclase, Silica, Whiting and China Clay), worked out here without the
    // library: atomic weights from CIAAW 2024 above, and each record's oxides and LOI as stored.
    it("should give the README's Leach 4321 as an independent calculation does, from CIAAW 2024 and the records", () => {
      const weight = (element: string) => Number(CIAAW_2024[element].split(' ± ')[0]);
      const molar = (oxide: string) =>
        [...oxide.matchAll(/([A-Z][a-z]?)(\d*)/g)].reduce(
          (sum, [, element, n]) => sum + weight(element) * Number(n || 1),
          0
        );
      const records: StandardMaterial[] = standardData.load('materials');
      const recipe = [
        ['Orthoclase', 40],
        ['Silica', 30],
        ['Whiting', 20],
        ['China Clay', 10]
      ] as const;
      const moles: Record<string, number> = {};
      for (const [name, grams] of recipe) {
        const record = records.find((r) => r.name === name)!;
        // Moles of each fired oxide in one formula; the raw formula weighs its fired oxides over (1 - LOI).
        expect(record.percentmole, name).to.equal('molecular');
        const fired = record.fields.reduce((sum, f) => sum + Number(f.amount) * molar(f.name), 0);
        const raw = fired / (1 - record.loi / 100);
        for (const f of record.fields) moles[f.name] = (moles[f.name] ?? 0) + (grams / raw) * Number(f.amount);
      }
      const flux = moles.K2O + moles.CaO;
      const mine: Record<string, number> = Object.fromEntries(Object.entries(moles).map(([o, m]) => [o, m / flux]));
      const published = { K2O: 0.26448, CaO: 0.73552, Al2O3: 0.40705, SiO2: 3.70983 };
      for (const [oxide, value] of Object.entries(published))
        expect(mine[oxide].toFixed(5), oxide).to.equal(String(value));
      expect((mine.SiO2 / mine.Al2O3).toFixed(4)).to.equal('9.1139');

      const theirs = calculateUMF(
        recipe.map(([name, grams]) => ({ material: records.find((r) => r.name === name)!, amount: grams }))
      );
      expect(Object.keys(theirs.umf).sort()).to.eql(Object.keys(mine).sort());
      for (const oxide of Object.keys(mine)) expect(theirs.umf[oxide], oxide).to.be.closeTo(mine[oxide], 1e-12);
      expect(theirs.siAlRatio).to.be.closeTo(mine.SiO2 / mine.Al2O3, 1e-12);
    });

    // Digitalfire's G1214M (https://digitalfire.com/article/g1214m+cone+5-7+20x5+glossy+transparent+glaze): its
    // published fired analysis, as one material, gives its published unity formula and expansion, to its places.
    it("should round-trip Digitalfire's G1214M: its analysis gives its unity formula and expansion, 7.15", () => {
      const analysis = {
        CaO: 14.84,
        K2O: 2.13,
        MgO: 0.09,
        Na2O: 2.78,
        TiO2: 0.31,
        B2O3: 4.79,
        Al2O3: 11.74,
        SiO2: 63.08,
        Fe2O3: 0.23,
        MnO: 0.03
      };
      const published = {
        CaO: 0.79,
        K2O: 0.07,
        MgO: 0.01,
        Na2O: 0.13,
        TiO2: 0.01,
        B2O3: 0.21,
        Al2O3: 0.34,
        SiO2: 3.14,
        Fe2O3: 0.0,
        MnO: 0.0
      };
      const result = calculateUMF([{ material: { name: 'G1214M', analysis }, amount: 100 }]);
      expect(Object.keys(result.umf).sort()).to.eql(Object.keys(published).sort());
      for (const [oxide, value] of Object.entries(published)) {
        expect(result.umf[oxide].toFixed(2), oxide).to.equal(value.toFixed(2));
      }
      expect(result.expansion).to.be.closeTo(7.149, 0.0005);
      expect(result.expansion!.toFixed(2)).to.equal('7.15');
      expect(result.warnings).to.eql([]);
    });

    it('should report fired oxide weight percents that total 100', () => {
      const result = calculateUMF({
        'Potash Feldspar (theoretical)': 40,
        Silica: 30,
        Whiting: 20,
        'Kaolin (theoretical)': 10
      });
      const total = Object.keys(result.analysis).reduce((sum, oxide) => sum + result.analysis[oxide], 0);
      expect(total).to.be.closeTo(100, 1e-9);
      expect(result.analysis.SiO2).to.be.closeTo(67.43, 0.01);
    });

    it('should not depend on batch size', () => {
      const small = calculateUMF({
        'Potash Feldspar (theoretical)': 40,
        Silica: 30,
        Whiting: 20,
        'Kaolin (theoretical)': 10
      });
      const large = calculateUMF({
        'Potash Feldspar (theoretical)': 4000,
        Silica: 3000,
        Whiting: 2000,
        'Kaolin (theoretical)': 1000
      });
      Object.keys(small.umf).forEach((oxide) => {
        expect(large.umf[oxide]).to.be.closeTo(small.umf[oxide], 1e-9);
      });
    });

    it('should match material names regardless of case, spacing and aliases', () => {
      const result = calculateUMF({
        'potash-feldspar (Theoretical)': 40,
        FLINT: 30,
        whiting: 20,
        'KAOLIN-THEORETICAL': 10
      });
      expect(result.umf.K2O).to.be.closeTo(0.2645, 0.0001);
    });

    it('should accept user-entered analyses and include colorants', () => {
      const userMaterials = [
        {
          name: 'My Feldspar',
          analysis: { SiO2: 68.5, Al2O3: 17.0, K2O: 10.0, Na2O: 3.0, CaO: 0.3, Fe2O3: 0.1 },
          loi: 0.3
        }
      ];
      const result = calculateUMF(
        { 'My Feldspar': 40, Silica: 30, Whiting: 20, 'Kaolin (theoretical)': 10, 'Red Iron Oxide (theoretical)': 1 },
        { materials: userMaterials }
      );
      const feldsparMoles = {
        K2O: (40 * 0.1) / MW.K2O,
        Na2O: (40 * 0.03) / MW.Na2O,
        CaO: (40 * 0.003) / MW.CaO
      };
      const whitingCaO = 20 / (MW.CaO + 44.009);
      const flux = feldsparMoles.K2O + feldsparMoles.Na2O + feldsparMoles.CaO + whitingCaO;
      const iron = (40 * 0.001) / MW.Fe2O3 + 1 / MW.Fe2O3;
      expect(result.umf.K2O).to.be.closeTo(feldsparMoles.K2O / flux, 1e-9);
      expect(result.umf.Na2O).to.be.closeTo(feldsparMoles.Na2O / flux, 1e-9);
      expect(result.umf.Fe2O3).to.be.closeTo(iron / flux, 1e-9);
      expect(result.warnings).to.eql([]);
    });

    it('should accept a material object directly in a recipe line', () => {
      const result = calculateUMF([
        { material: { name: 'Calcium oxide', analysis: { CaO: 100 } }, amount: MW.CaO },
        { material: 'Silica', amount: 2 * MW.SiO2 }
      ]);
      expect(result.umf.SiO2).to.be.closeTo(2, 1e-9);
      expect(result.loi).to.eql(0);
    });

    it('should warn when an analysis does not total about 100%', () => {
      const result = calculateUMF([{ material: { name: 'Bad spar', analysis: { SiO2: 50, K2O: 10 } }, amount: 10 }]);
      expect(result.warnings.length).to.eql(1);
      expect(result.warnings[0]).to.contain('Bad spar');
    });

    it('should warn when the fluxes are only traces, as in a slip of clay and silica', () => {
      const records: StandardMaterial[] = standardData.load('materials');
      const library = new Map(records.map((m) => [m.name, m]));
      const slip = calculateUMF([
        { material: library.get('Silica')!, amount: 60 },
        { material: library.get('EPK Kaolin')!, amount: 40 }
      ]);
      expect(slip.warningCodes.map((w) => w.code)).to.deep.equal(['trace-flux']);
      // A glaze, even one with much silica, is not.
      expect(
        calculateUMF({ 'Potash Feldspar (theoretical)': 25, Whiting: 10, 'Kaolin (theoretical)': 15, Silica: 50 })
          .warnings
      ).to.eql([]);
    });

    it('should keep colorant oxides as fluxes, and warn when they are most of the flux or silica runs past 10', () => {
      const codes = (recipe: Record<string, number>) => calculateUMF(recipe).warningCodes.map((w) => w.code);
      // Silica and kaolin with 5% cobalt carbonate: cobalt is all the flux, and the silica is over 30.
      const cobalt = calculateUMF({ Silica: 70, 'Kaolin (theoretical)': 25, 'Cobalt Carbonate (theoretical)': 5 });
      expect(cobalt.umf.CoO).to.be.closeTo(1, 1e-9);
      expect(cobalt.umf.SiO2).to.be.above(30);
      expect(cobalt.warningCodes.map((w) => w.code)).to.deep.equal(['colorant-flux', 'silica-high']);
      // Not that it says little about the melt: colorants melt too (Digitalfire: "Manganese is an active
      // melter"). The formula is scaled to them, so it compares only with other colorant-rich glazes.
      expect(cobalt.warnings[0]).to.equal(
        'Colorant oxides (CoO) are most of the flux, so the unity formula is scaled to them; compare it only with other colorant-rich glazes, not with limits for ordinary glazes.'
      );
      expect(cobalt.warnings[1]).to.equal(
        'The unity formula has 32.32 SiO₂, unusually high for a glaze: the recipe is for a very high firing, has too little flux, or is not a glaze.'
      );
      // Traditional Shinos reach 10.1 to 12.8 and melt, at a very high firing: Kamado feldspar with 20%
      // kaolin is 11.2. Still past 10, so still said, but not as more than a glaze can melt.
      const records: StandardMaterial[] = standardData.load('materials');
      const named = (name: string) => records.find((record) => record.name === name)!;
      const shino = calculateUMF([
        { material: named('Kamado Feldspar (釜戸長石)'), amount: 80 },
        { material: named('China Clay'), amount: 20 }
      ]);
      expect(shino.umf.SiO2).to.be.closeTo(11.23, 0.01);
      expect(shino.warningCodes.map((w) => w.code)).to.deep.equal(['silica-high']);
      expect(shino.warnings[0]).to.match(/^The unity formula has 11\.23 SiO₂, unusually high for a glaze: .*firing/);
      expect(shino.warnings[0]).to.not.match(/can melt/);
      // Most of the flux: 10 g of whiting is 0.0999 mol CaO; cobalt carbonate is 118.9 g a mole.
      expect(
        codes({ Whiting: 10, 'Cobalt Carbonate (theoretical)': 9.7, Silica: 30, 'Kaolin (theoretical)': 10 })
      ).to.deep.equal([]);
      expect(
        codes({ Whiting: 10, 'Cobalt Carbonate (theoretical)': 14.5, Silica: 30, 'Kaolin (theoretical)': 10 })
      ).to.deep.equal(['colorant-flux']);
      // Silica past 10: 59 g of silica is 9.8 on 10 g of whiting, 61 g is 10.2.
      expect(codes({ Whiting: 10, Silica: 59 })).to.deep.equal([]);
      expect(codes({ Whiting: 10, Silica: 61 })).to.deep.equal(['silica-high']);
      // Where the flux is only a trace, that is the warning: the unity formula means nothing anyway.
      expect(codes({ Silica: 99.5, Whiting: 0.5 })).to.deep.equal(['trace-flux']);
      // Never on the examples: the README's Leach 4321 (the landing page's) and a copper glaze.
      expect(
        codes({ 'Potash Feldspar (theoretical)': 40, Silica: 30, Whiting: 20, 'Kaolin (theoretical)': 10 })
      ).to.deep.equal([]);
      expect(
        codes({
          'Potash Feldspar (theoretical)': 40,
          Silica: 30,
          Whiting: 20,
          'Kaolin (theoretical)': 10,
          'Copper Carbonate (theoretical)': 5
        })
      ).to.deep.equal([]);
    });
  });

  describe('app material format', () => {
    const dolomite = {
      name: 'Dolomite',
      percentmole: 'molecular',
      loi: 47.73,
      fields: [
        { name: 'CaO', amount: '1' },
        { name: 'MgO', amount: '1' }
      ]
    };

    it('should derive the equivalent weight of a molecular formula from its LOI', () => {
      const weights = chemistry.materialWeights(dolomite);
      // CaMg(CO3)2 is 184.4 g per formula, which holds 2 moles of flux
      expect(weights.equivalent).to.be.closeTo(92.2, 0.01);
      expect(weights.unity.CaO).to.be.closeTo(0.5, 1e-4);
      expect(weights.unity.MgO).to.be.closeTo(0.5, 1e-4);
      expect(weights.firedWeight).to.be.closeTo((MW.CaO + MW.MgO) / 2, 0.01);
      expect(weights.molecularWeight).to.be.closeTo(184.4, 0.01);
    });

    it('should fall back to the molecular weight when no LOI is given', () => {
      const talc = {
        name: 'Talc',
        molecularweight: 379.27,
        loi: '',
        fields: [
          { name: 'MgO', amount: '3' },
          { name: 'SiO2', amount: '4' }
        ]
      };
      const weights = chemistry.materialWeights(talc);
      expect(weights.loi).to.be.closeTo(4.75, 0.01);
      expect(weights.equivalent).to.be.closeTo(379.27 / 3, 0.01);
    });

    it('should convert a percent analysis to a unity formula', () => {
      const spar = {
        name: 'Spar',
        percentmole: 'percent',
        loi: 0,
        fields: [
          { name: 'K2O', amount: '16.92' },
          { name: 'Al2O3', amount: '18.32' },
          { name: 'SiO2', amount: '64.76' }
        ]
      };
      const weights = chemistry.materialWeights(spar);
      expect(weights.unity.Al2O3).to.be.closeTo(1, 0.001);
      expect(weights.unity.SiO2).to.be.closeTo(6, 0.001);
      expect(weights.equivalent).to.be.closeTo(556.65, 0.1);
    });

    it('should warn when a stored equivalent weight disagrees with the formula', () => {
      const stored: MaterialInput & { fields: MaterialField[] } = JSON.parse(JSON.stringify(dolomite));
      stored.equivalent = 184;
      stored.fields.forEach((field) => (field.amountUnity = 0.5));
      expect(chemistry.materialWeights(stored).warnings[0]).to.contain('stored equivalent weight');
    });

    it('should not warn about a trace oxide whose stored amount was rounded', () => {
      // 0.04% Fe2O3 in a whiting is 0.00025 mol per unity formula, stored to 4 places as
      // 0.0003: 20% off, though the stored weights are right.
      const traced: MaterialInput = {
        name: 'Whiting with a trace of iron',
        percentmole: 'percent',
        loi: 43.96,
        fields: [
          { name: 'CaO', amount: '56.00' },
          { name: 'Fe2O3', amount: '0.04' }
        ]
      };
      const weights = chemistry.materialWeights(traced);
      const stored = {
        ...traced,
        equivalent: weights.equivalent,
        fields: traced.fields!.map((field) => ({
          ...field,
          amountUnity: Number(weights.unity[field.name].toFixed(4))
        }))
      };
      expect(stored.fields[1].amountUnity / weights.unity.Fe2O3).to.be.closeTo(1.2, 0.01);
      expect(chemistry.materialWeights(stored).warnings).to.eql([]);
    });

    it('should keep percent analyses on the raw basis when there is an LOI', () => {
      // Whiting as an analysis: 56.03% CaO and 43.97% LOI holds one mole of CaO per 100.08 g.
      const whiting = {
        name: 'Whiting analysis',
        percentmole: 'percent',
        loi: 43.97,
        fields: [{ name: 'CaO', amount: '56.03' }]
      };
      const weights = chemistry.materialWeights(whiting);
      expect(weights.equivalent).to.be.closeTo(100.08, 0.01);
      expect(weights.firedWeight).to.be.closeTo(MW.CaO, 0.01);
      expect(weights.warnings).to.eql([]);
    });

    it('should use the formula as written for a material with no flux', () => {
      const clay = {
        name: 'Clay',
        loi: 13.96,
        fields: [
          { name: 'Al2O3', amount: '1' },
          { name: 'SiO2', amount: '2' }
        ]
      };
      const weights = chemistry.materialWeights(clay);
      expect(weights.unity.Al2O3).to.be.closeTo(1, 1e-9);
      expect(weights.unity.SiO2).to.be.closeTo(2, 1e-9);
      expect(weights.equivalent).to.be.closeTo(258.17, 0.01);
      expect(weights.equivalent).to.eql(weights.molecularWeight);
    });

    it('should let user materials override the built-in ones by name', () => {
      const cheapSilica = { name: 'Silica', analysis: { SiO2: 90, Al2O3: 10 } };
      const result = calculateUMF({ Whiting: 100.08, Silica: 100 }, { materials: [cheapSilica] });
      const flux = 100.08 / (MW.CaO + 44.009);
      expect(result.umf.Al2O3).to.be.closeTo(10 / MW.Al2O3 / flux, 1e-6);
      expect(result.umf.SiO2).to.be.closeTo(90 / MW.SiO2 / flux, 1e-6);
    });

    it('should reject an LOI of 100% or more', () => {
      const bad = { name: 'Bad', loi: 100, fields: [{ name: 'CaO', amount: '1' }] };
      expect(() => chemistry.materialWeights(bad)).to.throw(/LOI/);
    });

    it('should calculate a recipe from app materials and their amounts', () => {
      const result = calculateUMF([
        { material: dolomite, amount: 20 },
        { material: 'Silica', amount: 30 }
      ]);
      expect(result.umf.CaO).to.be.closeTo(0.5, 1e-4);
      expect(result.umf.SiO2).to.be.closeTo(30 / MW.SiO2 / (20 / 92.2), 0.001);
    });
  });

  describe('standard library', () => {
    const materials: Array<StandardMaterial & LibraryRecord> = standardData.load('materials');
    const additives: Array<StandardMaterial & LibraryRecord> = standardData.load('additives');
    const all = [...materials, ...additives];
    const names = new Map<string, string>();
    for (const record of all)
      for (const name of [record.name, ...(record.aliases ?? [])]) names.set(name.toLowerCase(), record.name);

    it('should give every record a category and a named source', () => {
      for (const record of all) {
        expect(record.category, record.name).to.be.oneOf([
          'feldspar',
          'clay',
          'frit',
          'boron',
          'flux',
          'silica',
          'alumina',
          'opacifier',
          'colorant',
          'suspender',
          'other'
        ]);
        expect(record.source?.name, record.name).to.be.a('string');
        expect(record.source?.kind, record.name).to.be.oneOf([
          'manufacturer',
          'supplier',
          'sds',
          'digitalfire',
          'glazy',
          'theoretical',
          'book',
          'research'
        ]);
      }
    });

    it('should use known statuses and regions, and give every name to one record only', () => {
      const seen = new Set<string>();
      for (const record of all) {
        if (record.status)
          expect(record.status, record.name).to.be.oneOf(['current', 'scarce', 'discontinued', 'historical']);
        for (const region of record.region ?? [])
          expect(region, record.name).to.be.oneOf(['US', 'UK', 'EU', 'CA', 'AU', 'JP']);
        for (const name of [record.name, ...(record.aliases ?? [])]) {
          expect(seen.has(name.toLowerCase()), name).to.equal(false);
          seen.add(name.toLowerCase());
        }
      }
    });

    // Japan's feldspathic rocks (docs/asia-plan.md, Phase C item 6): one supplier's typical analyses,
    // each saying so, with what makes it differ and a warning against swapping it one for one.
    it("should give Japan's materials as one supplier's typical analyses, to check, with a warning against swapping", () => {
      const japanese = materials.filter((record) => record.region?.includes('JP'));
      expect(japanese.map((record) => record.name)).to.eql([
        'Amakusa Pottery Stone (天草陶石)',
        'Fukushima Feldspar (福島長石)',
        'Kamado Feldspar (釜戸長石)',
        'Synthetic Wood Ash (合成土灰)',
        'Synthetic Rice-Straw Ash (合成藁灰)',
        'Tsushima Feldspar (対馬長石)',
        'Masuda Feldspar (益田長石)',
        'Korean Kaolin (韓国カオリン)',
        'Synthetic Isu Ash (合成柞灰)'
      ]);
      for (const record of japanese) {
        expect(record.region, record.name).to.eql(['JP']);
        expect(record.source?.kind, record.name).to.equal('supplier');
        expect(record.source?.name, record.name).to.contain('佐賀県陶磁器原料');
        expect(record.notes?.[0], record.name).to.match(/^A typical analysis from one supplier in Arita: check it/);
        expect(chemistry.materialWeights(record).warnings, record.name).to.eql([]);
      }
      const notes = (name: string) => japanese.find((record) => record.name.startsWith(name))!.notes![0]!;
      expect(notes('Amakusa')).to.contain('graded by its iron').and.contain('not a feldspar');
      expect(notes('Fukushima')).to.contain('72.1% SiO₂');
      expect(notes('Kamado')).to.contain('aplite').and.contain('Do not swap it');
      // Not added: Mikumo feldspar (only Digitalfire's analysis, of no stated origin).
      for (const record of all) expect(record.name, record.name).not.to.match(/Mikumo|三雲/);
    });

    // Ash differs from wood to wood and batch to batch, so one analysis is not "the" ash. A synthetic
    // ash (合成) is a supplier's blend and may be current; a natural ash only as a historical record
    // with a sourced analysis, a note saying how it was made and how much ash varies, and a substitute.
    it('should keep natural ashes historical, sourced and labelled, and synthetic ones synthetic', () => {
      const ashes = materials.filter(
        (r) =>
          /\bash\b|土灰|柞灰|藁灰|松灰|栗灰/i.test(r.name) && !['Bone Ash', 'Pearl Ash', 'Soda Ash'].includes(r.name)
      );
      expect(ashes.length).to.be.greaterThan(0);
      for (const record of ashes) {
        if (/^Synthetic /.test(record.name)) {
          expect(record.name, record.name).to.contain('合成');
          expect(record.source?.kind, record.name).to.equal('supplier');
          continue;
        }
        expect(record.status, record.name).to.equal('historical');
        expect(record.source?.url, record.name).to.match(/^https:\/\//);
        expect(record.notes?.[0], record.name).to.match(/^Historical/);
        expect(record.notes?.[0], record.name).to.match(/one sample|one of six samples|average of six/);
        expect(record.notes?.[0], record.name).to.match(/burnt|burning/);
        expect(record.hazards, record.name).to.contain('caustic');
      }
    });

    it('should name a modern substitute for everything discontinued, scarce or historical', () => {
      for (const record of all.filter((r) => ['discontinued', 'scarce', 'historical'].includes(r.status ?? ''))) {
        expect((record.substitutes ?? []).length, record.name).to.be.greaterThan(0);
      }
    });

    // What a swap to modern materials can find (client/app/pages/recipe/compare.ts):
    // a current material, or for a colorant among the materials, an additive.
    const current = (name: string, records: LibraryRecord[]) =>
      records.find((r) => r.name === name && (!r.status || r.status === 'current'));
    const old = materials.filter((r) => r.status && r.status !== 'current');

    it('should name, for each old material, a substitute the swap can find', () => {
      for (const record of old) {
        const found = (record.substitutes ?? []).filter(
          (name) => current(name, materials) || (record.category === 'colorant' && current(name, additives))
        );
        expect(found.length, record.name).to.be.greaterThan(0);
      }
    });

    it("should name, for each old feldspar, a substitute each region's library lists", () => {
      for (const record of old.filter((r) => r.category === 'feldspar')) {
        for (const region of ['US', 'UK', 'EU', 'AU', 'JP']) {
          const sold = (record.substitutes ?? [])
            .map((name) => current(name, materials))
            .filter((sub) => sub && library.inRegion(sub, region));
          expect(sold.length, record.name + ' in ' + region).to.be.greaterThan(0);
        }
      }
    });

    it('should list each current record that replaces another among its substitutes, for the swap to find', () => {
      for (const record of all.filter((r) => !r.status || r.status === 'current')) {
        for (const name of record.replaces ?? []) {
          const replaced = all.find((r) => r.name === name)!;
          expect(replaced.substitutes ?? [], record.name + ' replaces ' + name).to.include(record.name);
        }
      }
    });

    it('should give the year a status began as a year alone, as it goes into a sentence in each language', () => {
      for (const record of all.filter((r) => r.statusSince)) {
        expect(record.statusSince, record.name).to.match(/^\d{4}$/);
      }
    });

    it('should keep a region only for a named product among the colorants and additives', () => {
      // A generic oxide, carbonate or mineral is sold everywhere, so every region lists it.
      // These are one maker's product, or sold under that name in one region, as their notes say.
      const named = [
        'Bentonite',
        'Veegum T',
        'Macaloid',
        'Spanish red iron oxide',
        'Crocus martis',
        'Bentonit 57 (Carl Jäger / Bodmer Ton 507)',
        'Bentonita (Prodesco)',
        'Bentonite Trubond (Miles, Queensland)'
      ];
      for (const additive of additives.filter((a) => a.region?.length)) {
        expect(named, additive.name + ' is sold everywhere').to.include(additive.name);
      }
    });

    it('should mark every material whose hazards say it gives off fluorine, so it is not suggested', () => {
      for (const record of materials.filter((r) => /fluorine/i.test(r.hazards ?? ''))) {
        expect(record.fluorine, record.name).to.equal(true);
      }
    });

    it('should refer only to records in the library', () => {
      for (const record of all) {
        for (const ref of [
          ...(record.substitutes ?? []),
          ...(record.replaces ?? []),
          record.chemistryOf ?? []
        ].flat()) {
          expect(names.has(ref.toLowerCase()), record.name + ' -> ' + ref).to.equal(true);
        }
      }
    });

    // One name, one material (the 1.0 chemistry review): calculateUMF reads a name from the chemistry's own
    // formula materials (lib/chemistry/materials.js), and the calculator from this library. "Potash Feldspar" was
    // K₂O•Al₂O₃•6SiO₂ on the start page and Potclays 3426 in the calculator.
    it("should give each of the chemistry's formula materials the chemistry the library gives its name", () => {
      const percents = (material: MaterialInput) =>
        Object.fromEntries(
          Object.entries(chemistry.molesPerGram(material)).map(([oxide, moles]) => [oxide, moles * MW[oxide] * 100])
        );
      for (const builtIn of chemistry.FORMULA_MATERIALS) {
        const ours = percents(builtIn);
        for (const name of [builtIn.name, ...(builtIn.aliases ?? [])]) {
          const same = (other: string) => paste.compactName(other) === paste.compactName(name);
          for (const record of all.filter((r) => [r.name, ...(r.aliases ?? [])].some(same))) {
            const label = `${name} (${builtIn.name}) and ${record.name}`;
            const theirs = percents(record);
            expect(chemistry.materialWeights(record).loi, label + ': LOI').to.be.closeTo(
              chemistry.materialWeights(builtIn).loi,
              0.01
            );
            for (const oxide of new Set([...Object.keys(ours), ...Object.keys(theirs)])) {
              expect(theirs[oxide] ?? 0, label + ': ' + oxide).to.be.closeTo(ours[oxide] ?? 0, 0.01);
            }
          }
        }
      }
    });

    it('should store additive chemistry that agrees with its analysis and LOI', () => {
      for (const additive of additives.filter((a) => !a.noChemistry && !a.chemistryOf)) {
        const weights = chemistry.materialWeights(additive);
        expect(weights.warnings, additive.name).to.eql([]);
        expect(additive.equivalent, additive.name).to.be.closeTo(weights.equivalent, 0.01);
        additive.fields.forEach((field) => {
          expect(field.amountUnity, additive.name + ' ' + field.name).to.be.closeTo(weights.unity[field.name], 1e-4);
        });
      }
    });
  });

  describe('standard materials data', () => {
    const standard: StandardMaterial[] = standardData.load('materials');
    const byName: Record<string, StandardMaterial> = {};
    standard.forEach((material) => (byName[material.name] = material));

    it('should store weights and unity formulas that agree with each formula and LOI', () => {
      standard.forEach((material) => {
        const weights = chemistry.materialWeights(material);
        expect(weights.warnings, material.name).to.eql([]);
        expect(material.equivalent, material.name).to.be.closeTo(weights.equivalent, 0.01);
        expect(material.formulaweight, material.name).to.be.closeTo(
          material.equivalent * (1 - material.loi / 100),
          0.01
        );
        material.fields.forEach((field) => {
          expect(field.amountUnity, material.name + ' ' + field.name).to.be.closeTo(weights.unity[field.name], 1e-4);
        });
      });
    });

    it('should match theoretical materials for a dolomite and talc glaze', () => {
      const fromData = calculateUMF([
        { material: byName.Orthoclase, amount: 40 },
        { material: byName.Silica, amount: 20 },
        { material: byName.Whiting, amount: 10 },
        { material: byName.Dolomite, amount: 20 },
        { material: byName.Talc, amount: 5 },
        { material: byName['China Clay'], amount: 10 }
      ]);
      const theoretical = calculateUMF({
        'Potash Feldspar (theoretical)': 40,
        Silica: 20,
        Whiting: 10,
        Dolomite: 20,
        Talc: 5,
        'Kaolin (theoretical)': 10
      });
      Object.keys(theoretical.umf).forEach((oxide) => {
        expect(fromData.umf[oxide], oxide).to.be.closeTo(theoretical.umf[oxide], 0.001);
      });
    });

    it("should give each raw formula its oxides' metals, and its LOI", () => {
      standard
        // Feldspars and the like are written as an oxide analysis, which the fields copy.
        .filter((material) => material.percentmole !== 'percent' && !material.rawformula.includes(':'))
        .forEach((material) => {
          const fromFields: Record<string, number> = {};
          material.fields.forEach((field) =>
            Object.entries(atomsIn(field.name, Number(field.amount))).forEach(
              ([e, n]) => (fromFields[e] = (fromFields[e] ?? 0) + n)
            )
          );
          // Scale the raw formula to the fields by their first metal, then every metal must agree.
          const raw = atomsIn(material.rawformula);
          const metals = Object.keys(raw).filter((e) => !GASES.includes(e));
          const k = fromFields[metals[0]] / raw[metals[0]];
          const scaled = atomsIn(material.rawformula, k);
          const fieldMetals = Object.keys(fromFields).filter((e) => !GASES.includes(e));
          expect(fieldMetals.sort(), material.name).to.eql(metals.sort());
          metals.forEach((e) => expect(fromFields[e], material.name + ' ' + e).to.be.closeTo(scaled[e], 1e-9));

          // What is lost on firing is the raw formula less its oxides.
          const fired = material.fields.reduce((sum, field) => sum + Number(field.amount) * MW[field.name], 0);
          const loi = (1 - fired / massOf(scaled)) * 100;
          expect(material.loi, material.name + ' LOI').to.be.closeTo(loi, 0.05);
        });
    });

    it('should include phosphorus in bone ash', () => {
      const weights = chemistry.materialWeights(byName['Bone Ash']);
      expect(weights.unity.P2O5).to.be.closeTo(1 / 3, 1e-4);
      expect(weights.loi).to.eql(0);
    });
  });

  describe('formula display', () => {
    it('should write the counts in a formula as subscripts', () => {
      expect(chemistry.formatFormula('Al2O3')).to.equal('Al₂O₃');
      expect(chemistry.formatFormula('Ca3(PO4)2')).to.equal('Ca₃(PO₄)₂');
      expect(chemistry.formatFormula('Pr6O11')).to.equal('Pr₆O₁₁');
    });

    it('should leave coefficients, amounts and text already in subscripts as they are', () => {
      expect(chemistry.formatFormula('2CaO•3B2O3•5H2O')).to.equal('2CaO•3B₂O₃•5H₂O');
      expect(chemistry.formatFormula('CaO: 0.304; SiO2: 8.10')).to.equal('CaO: 0.304; SiO₂: 8.10');
      expect(chemistry.formatFormula('CaCO₃')).to.equal('CaCO₃');
      expect(chemistry.formatFormula(undefined)).to.equal('');
    });

    it('should name an oxide in an error with subscripts', () => {
      const bad = { name: 'Typo', analysis: { Al2O3: -1 } };
      expect(() => calculateUMF([{ material: bad, amount: 1 }])).to.throw('Invalid amount for Al₂O₃ in material Typo');
    });
  });

  describe('bounded least squares', () => {
    const { boundedLeastSquares } = chemistry;
    const near = (x: number[], want: number[]) => x.forEach((v, i) => expect(v).to.be.closeTo(want[i], 1e-9));

    it('should solve exactly, stop at bounds, and hold a variable whose bounds meet', () => {
      near(boundedLeastSquares({ columns: [[1]], b: [2], lo: [0], hi: [Infinity] }), [2]);
      // Two columns that together make the target.
      near(
        boundedLeastSquares({
          columns: [
            [1, 1],
            [1, -1]
          ],
          b: [2, 0],
          lo: [0, 0],
          hi: [Infinity, Infinity]
        }),
        [1, 1]
      );
      // A cap is a hard upper bound; the other variable does what it can.
      near(
        boundedLeastSquares({
          columns: [
            [1, 0],
            [0, 1]
          ],
          b: [2, 3],
          lo: [0, 0],
          hi: [1, Infinity]
        }),
        [1, 3]
      );
      // Nothing negative: the best non-negative answer, not the unconstrained one (-1).
      near(boundedLeastSquares({ columns: [[1]], b: [-1], lo: [0], hi: [Infinity] }), [0]);
      near(
        boundedLeastSquares({
          columns: [
            [1, 0],
            [0, 1]
          ],
          b: [2, 3],
          lo: [0.5, 0],
          hi: [0.5, Infinity]
        }),
        [0.5, 3]
      );
    });

    it('should pull toward the given amounts in proportion to lambda', () => {
      // |x - 2|^2 + lambda |x - 0|^2 is least at 2 / (1 + lambda).
      near(boundedLeastSquares({ columns: [[1]], b: [2], lo: [0], hi: [Infinity], lambda: 1, pullTo: [0] }), [1]);
    });

    it('should put a price on each variable', () => {
      // |x - 2|^2 + 2 cost x is least at 2 - cost, and no lower than its bound.
      near(boundedLeastSquares({ columns: [[1]], b: [2], lo: [0], hi: [Infinity], cost: [0.5] }), [1.5]);
      near(boundedLeastSquares({ columns: [[1]], b: [2], lo: [0.5], hi: [Infinity], cost: [3] }), [0.5]);
    });

    it('should give a number for a column of zeros, and not hold back a tiny column', () => {
      // A column of zeros with a rebate (a price below nothing) came back NaN: 0 times Infinity.
      const zeros = boundedLeastSquares({ columns: [[0, 0]], b: [1, 1], lo: [0], hi: [Infinity], cost: [-1] });
      expect(zeros.every(Number.isFinite)).to.equal(true);
      // With a pull, it goes where the pull and the price put it, as no row has a say: 2 - (-1)/1 = 3.
      near(
        boundedLeastSquares({
          columns: [[0, 0]],
          b: [1, 1],
          lo: [0],
          hi: [Infinity],
          lambda: 1,
          pullTo: [2],
          cost: [-1]
        }),
        [3]
      );
      // Beside a column of zeros, the others are solved as ever.
      near(
        boundedLeastSquares({
          columns: [
            [1, 0],
            [0, 0],
            [0, 1]
          ],
          b: [2, 3],
          lo: [0, 0, 0],
          hi: [Infinity, 5, Infinity]
        }),
        [2, 0, 3]
      );
      // Tiny columns beside a large one: half a millionth of it, where the ridge for the large one (1e-13 of
      // its square) held the small one at 98% of what it takes; a ten-millionth, where its slope was under
      // the large one's tolerance and it did not move at all.
      for (const tiny of [2e-6, 1e-7]) {
        const x = boundedLeastSquares({
          columns: [
            [tiny, 0],
            [0, 1]
          ],
          b: [tiny, 1],
          lo: [0, 0],
          hi: [Infinity, Infinity]
        });
        expect(x[0], String(tiny)).to.be.closeTo(1, 1e-4);
        expect(x[1]).to.be.closeTo(1, 1e-9);
      }
    });

    it('should cope with near-duplicate columns, and match a slow method on random problems', () => {
      let seed = 11;
      const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
      const value = (columns: number[][], b: number[], x: number[]) =>
        b.reduce((sum, target, r) => sum + (columns.reduce((t, c, j) => t + c[r] * x[j], 0) - target) ** 2, 0);
      for (let trial = 0; trial < 20; trial++) {
        const rows = 4 + Math.floor(random() * 6);
        const n = 3 + Math.floor(random() * 6);
        const columns = Array.from({ length: n }, () => Array.from({ length: rows }, () => random()));
        columns[1] = columns[0].map((v) => v * 1.001);
        const b = Array.from({ length: rows }, () => random() * 2);
        const lo = new Array(n).fill(0);
        const hi = Array.from({ length: n }, () => (random() < 0.3 ? 0.3 : Infinity));
        const x = boundedLeastSquares({ columns, b, lo, hi });
        // Projected gradient, run long: slow but sure.
        const y = lo.slice();
        const step = 1 / columns.reduce((s, c) => s + c.reduce((t, v) => t + v * v, 0), 0);
        for (let it = 0; it < 20000; it++) {
          const r = b.map((target, i) => columns.reduce((t, c, j) => t + c[i] * y[j], 0) - target);
          columns.forEach(
            (c, j) => (y[j] = Math.min(hi[j], Math.max(0, y[j] - step * c.reduce((t, v, i) => t + v * r[i], 0))))
          );
        }
        expect(value(columns, b, x)).to.be.at.most(value(columns, b, y) + 1e-6);
        x.forEach((v, j) => expect(v).to.be.within(lo[j] - 1e-9, hi[j] + 1e-9));
      }
    });
  });

  describe('suggested amounts for a swap', () => {
    const records: StandardMaterial[] = standardData.load('materials');
    const library = new Map(records.map((m) => [m.name, m]));
    const lines = (recipe: Array<[string, number]>) =>
      recipe.map(([name, amount]) => ({ material: library.get(name)!, amount }));
    /** The unity formula, with potash and soda together as potters count them. */
    const unity = (recipe: Array<[string, number]>): Record<string, number> => {
      const { umf } = calculateUMF(lines(recipe));
      return { ...umf, KNaO: (umf.K2O ?? 0) + (umf.Na2O ?? 0) };
    };
    const fit = (old: Array<[string, number]>, modern: Array<[string, number]>) => {
      const target = chemistry.oxideMoles(lines(old));
      const { amounts } = chemistry.fitAmounts(
        modern.map(([name, start]) => ({ material: library.get(name)!, start })),
        target
      );
      return modern.map(([name], i): [string, number] => [name, amounts[i]]);
    };

    it('should bring red lead back with a lead frit, taking out the silica and clay it brings', () => {
      const old: Array<[string, number]> = [
        ['Lead, Red', 55],
        ['China Clay', 15],
        ['Silica', 30]
      ];
      const suggested = fit(old, [
        ['Lead Bisilicate Frit (Potclays 2261)', 55],
        ['China Clay', 15],
        ['Silica', 30]
      ]);
      const [frit, clay, silica] = suggested.map(([, amount]) => amount);
      // The frit carries a third of its weight as silica: more frit, much less silica.
      expect(frit).to.be.closeTo(81.6, 1);
      expect(clay).to.be.closeTo(9.7, 0.5);
      expect(silica).to.be.closeTo(6.2, 1);
      const [was, now] = [unity(old), unity(suggested)];
      for (const oxide of ['PbO', 'Al2O3', 'SiO2'] as const) {
        expect(now[oxide], oxide).to.be.closeTo(was[oxide], 0.02 * was[oxide]);
      }
    });

    it("should bring niter's potash back with feldspar, leaving the rest as it was", () => {
      const old: Array<[string, number]> = [
        ['Niter', 10],
        ['Whiting', 20],
        ['China Clay', 20],
        ['Silica', 40],
        ['Talc', 10]
      ];
      const suggested = fit(old, [
        ['Ferro Frit 3110', 10],
        ['Whiting', 20],
        ['China Clay', 20],
        ['Silica', 40],
        ['Talc', 10],
        ['G-200 EU Feldspar', 0]
      ]);
      const amount = Object.fromEntries(suggested);
      // What did not need changing is exactly as it was.
      expect(amount['Whiting']).to.equal(20);
      expect(amount['Talc']).to.equal(10);
      // The feldspar's silica and alumina come out of the silica and clay.
      expect(amount['G-200 EU Feldspar']).to.be.closeTo(33, 2);
      expect(amount['China Clay']).to.be.lessThan(10);
      expect(amount['Silica']).to.be.lessThan(30);
      const [was, now] = [unity(old), unity(suggested)];
      expect(now.KNaO).to.be.closeTo(was.KNaO, 0.01);
      for (const oxide of ['CaO', 'MgO', 'Al2O3', 'SiO2'] as const) {
        expect(now[oxide], oxide).to.be.closeTo(was[oxide], 0.02 * was[oxide]);
      }
    });

    it('should leave a recipe that already matches as it is', () => {
      const recipe: Array<[string, number]> = [
        ['Whiting', 20],
        ['China Clay', 25],
        ['Silica', 35]
      ];
      expect(fit(recipe, recipe)).to.deep.equal(recipe);
    });

    it('should never suggest less than nothing', () => {
      const suggested = fit(
        [
          ['Niter', 10],
          ['Silica', 40]
        ],
        [
          ['Ferro Frit 3110', 10],
          ['Silica', 40]
        ]
      );
      for (const [name, amount] of suggested) expect(amount, name).to.be.at.least(0);
    });

    it('should give a shared cap to the member that helps most, keeping each one its least', () => {
      // A cone 02 style glaze: its calcium mostly from the frit, a little from whiting and more dolomite.
      const glaze = (whiting: number, dolomite: number) =>
        chemistry.oxideMoles(
          lines([
            ['Ferro Frit 3134', 60],
            ['Whiting', whiting],
            ['Dolomite', dolomite],
            ['China Clay', 15],
            ['Silica', 13]
          ])
        );
      const target = glaze(4, 8);
      const pool = (whiting: object, dolomite: object) => [
        { material: library.get('Ferro Frit 3134')!, start: 0 },
        { material: library.get('China Clay')!, start: 0 },
        { material: library.get('Silica')!, start: 0 },
        { material: library.get('Whiting')!, start: 0, group: 'raw calcium', ...whiting },
        { material: library.get('Dolomite')!, start: 0, group: 'raw calcium', ...dolomite }
      ];
      const groups = { 'raw calcium': 5 };
      const capped = chemistry.bestFit(pool({}, {}), target, { groups });
      expect(capped.amounts[3] + capped.amounts[4]).to.be.closeTo(5, 1e-6);
      // No split of the 5 g matches better: here all of it goes to the dolomite, for its magnesia.
      for (let whiting = 0; whiting <= 5; whiting += 0.5) {
        const split = chemistry.bestFit(
          pool({ least: whiting, most: whiting }, { least: 5 - whiting, most: 5 - whiting }),
          target
        );
        expect(capped.miss, 'whiting ' + whiting).to.be.at.most(split.miss + 1e-9);
      }
      expect(capped.amounts[4]).to.be.closeTo(5, 1e-6);
      // A member's least holds under the cap, the rest of the cap going to the other.
      const { amounts } = chemistry.fitAmounts(pool({ least: 1 }, { least: 1 }), glaze(2, 10), { groups });
      expect(amounts[3]).to.be.at.least(1 - 1e-9);
      expect(amounts[4]).to.be.at.least(1 - 1e-9);
      expect(amounts[3] + amounts[4]).to.be.at.most(5 + 1e-6);
    });

    it('should keep a cap on an amount and a cap on a share together', () => {
      // Clay Ceram is the group's one member and, outside the share, gets its rebate: set one at a time,
      // the two prices pulled against each other, and after ten rounds the group's 12.46 came back at 40.
      const pool = [
        { material: library.get('Ferro Frit 4113')!, start: 0, least: 15.6838, group: 's' },
        { material: library.get('Niter')!, start: 0 },
        { material: library.get('Eckalite 2 Kaolin')!, start: 0, least: 1.219, group: 's' },
        { material: library.get('Lead, Red')!, start: 0 },
        { material: library.get('Clay Ceram (Unimin, Granville)')!, start: 0, least: 1.219, group: 'g' }
      ];
      const target = {
        K2O: 0.059929,
        SiO2: 0.739948,
        Al2O3: 0.193607,
        Fe2O3: 0.002237,
        TiO2: 0.005106,
        Na2O: 0.03768,
        PbO: 0.1164,
        MgO: 0.001891,
        B2O3: 0.069023,
        CaO: 0.084026
      };
      const options = { groups: { g: 12.4568 }, shares: { s: 0.3401 } };
      for (const { amounts } of [
        chemistry.bestFit(pool, target, options),
        chemistry.fitAmounts(pool, target, options)
      ]) {
        const batch = amounts.reduce((sum, amount) => sum + amount, 0);
        expect(amounts[4], 'the group').to.be.at.most(12.4568 * (1 + 1e-6));
        expect((amounts[0] + amounts[2]) / batch, 'the share').to.be.at.most(0.3401 * (1 + 1e-6));
        pool.forEach((line, i) => expect(amounts[i]).to.be.at.least((line.least ?? 0) * (1 - 1e-9)));
      }
    });

    it('should say when there is nothing to work out', () => {
      expect(() => chemistry.fitAmounts([], { CaO: 1 })).to.throw(/no materials/);
      expect(() => chemistry.fitAmounts([{ material: library.get('Silica')!, start: 1 }], {})).to.throw(/no oxides/);
    });
  });

  describe('frit roles', () => {
    const frits = (
      standardData.load('materials') as Array<StandardMaterial & LibraryRecord & { fritRole?: string }>
    ).filter((record) => record.category === 'frit');
    const percent = (record: StandardMaterial, oxide: string) => {
      const { unity, equivalent } = chemistry.materialWeights(record);
      return ((unity[oxide] ?? 0) * MW[oxide] * 100) / equivalent;
    };

    it('should give every frit a role from its maker', () => {
      const roles = [
        'base',
        'base-alkaline',
        'alkali',
        'boron',
        'low-expansion',
        'opacified',
        'zinc',
        'matte',
        'stoneware',
        'lead'
      ];
      for (const frit of frits) expect(frit.fritRole, frit.name).to.be.oneOf(roles);
      for (const frit of frits) expect(frit.fritRole === 'lead', frit.name).to.equal(percent(frit, 'PbO') > 0);
    });

    it("should keep each base frit within a base frit's chemistry, to catch a mistyped analysis", () => {
      // The research's window: boron 10-30%, silica 40% or more, calcium 8% or more,
      // soda, potash and lithia 3-13%, and at most 3% of each minor oxide.
      for (const frit of frits.filter((f) => f.fritRole === 'base')) {
        const alkali = percent(frit, 'Na2O') + percent(frit, 'K2O') + percent(frit, 'Li2O');
        expect(percent(frit, 'B2O3'), frit.name).to.be.within(10, 30);
        expect(percent(frit, 'SiO2'), frit.name).to.be.at.least(40);
        expect(percent(frit, 'CaO'), frit.name).to.be.at.least(8);
        expect(alkali, frit.name).to.be.within(3, 13);
        for (const oxide of ['MgO', 'ZnO', 'BaO', 'SrO', 'ZrO2', 'Li2O'])
          expect(percent(frit, oxide), frit.name + ' ' + oxide).to.be.at.most(3);
      }
    });
  });

  describe('choosing among many materials', () => {
    const records: StandardMaterial[] = standardData.load('materials');
    const library = new Map(records.map((m) => [m.name, m]));
    const molesOf = (recipe: Array<[string, number]>) =>
      chemistry.oxideMoles(recipe.map(([name, amount]) => ({ material: library.get(name)!, amount })));
    const NITER = molesOf([
      ['Niter', 10],
      ['Whiting', 20],
      ['China Clay', 20],
      ['Silica', 40],
      ['Talc', 10]
    ]);
    const own = (name: string, start: number) => ({ material: library.get(name)!, start });
    const offer = (name: string, extra: object = {}) => ({ material: library.get(name)!, start: 0, ...extra });
    const names = (lines: Array<{ material: { name: string } }>, indexes: number[]) =>
      indexes.map((i) => lines[i].material.name);
    const POTASH = ['G-200 EU Feldspar', 'Mahavir Potash Feldspar', 'Minspar 200', 'Nepheline Syenite A270'];

    it("should bring niter's potash back with one material from many, keeping the recipe's own", () => {
      const lines = [
        own('Ferro Frit 3110', 10),
        own('Whiting', 20),
        own('China Clay', 20),
        own('Silica', 40),
        own('Talc', 10),
        ...POTASH.map((name) => offer(name)),
        offer('Wollastonite (NYAD 400)'),
        offer('Ferro Frit 3124'),
        offer('Zinc Oxide')
      ];
      const result = chemistry.selectMaterials(lines, NITER);
      const chosen = names(lines, result.chosen);
      // One new material, a potash source; the recipe's whiting and talc as they were.
      expect(chosen.filter((name) => !['Ferro Frit 3110', 'Whiting', 'China Clay', 'Silica', 'Talc'].includes(name)))
        .to.have.length(1)
        .and.to.satisfy((added: string[]) => POTASH.includes(added[0]));
      expect(result.amounts[1]).to.equal(20);
      expect(result.amounts[4]).to.equal(10);
      expect(result.miss).to.be.below(1);
      // Each material says what it supplies; the feldspar, all the potash.
      const feldspar = result.contributions.find((c) => POTASH.includes(lines[c.index].material.name))!;
      expect(feldspar.supplies[0]).to.include({ oxide: 'K2O' });
      expect(feldspar.supplies[0].share).to.be.closeTo(1, 0.01);
      expect(feldspar.missWithout).to.be.above(result.miss);
    });

    it("should respect 'must use', 'don't use' and a limit on new materials, saying what the limit costs", () => {
      const lines = [
        own('Ferro Frit 3110', 10),
        own('Whiting', 20),
        own('China Clay', 20),
        own('Silica', 40),
        own('Talc', 10),
        offer('G-200 EU Feldspar', { avoid: true }),
        offer('Mahavir Potash Feldspar'),
        offer('Ferro Frit 3124', { must: true })
      ];
      const result = chemistry.selectMaterials(lines, NITER);
      const chosen = names(lines, result.chosen);
      expect(chosen).not.to.include('G-200 EU Feldspar');
      expect(chosen).to.include('Ferro Frit 3124');
      expect(chosen).to.include('Mahavir Potash Feldspar');
      // No new materials allowed beyond the must: the potash source goes, and its cost is told.
      const limited = chemistry.selectMaterials(lines, NITER, { extras: 0 });
      expect(names(lines, limited.chosen)).not.to.include('Mahavir Potash Feldspar');
      expect(limited.countCost).to.be.above(0);
      expect(limited.miss).to.be.above(result.miss);
    });

    it('should name an oxide that nothing offered supplies', () => {
      const target = molesOf([
        ['Lithium Carbonate', 5],
        ['Whiting', 20],
        ['China Clay', 25],
        ['Silica', 50]
      ]);
      const lines = [own('Whiting', 20), own('China Clay', 25), own('Silica', 50), offer('Talc')];
      expect(chemistry.selectMaterials(lines, target).unreachable).to.deep.equal(['Li2O']);
    });

    it('should keep raw calcium sources to a shared cap, and say what lifting it would gain', () => {
      // Calcium only from whiting and fluorspar, capped together at 5 g.
      const target = molesOf([
        ['Whiting', 15],
        ['G-200 EU Feldspar', 40],
        ['Silica', 30],
        ['China Clay', 15]
      ]);
      const lines = [
        own('G-200 EU Feldspar', 40),
        own('Silica', 30),
        own('China Clay', 15),
        offer('Whiting', { group: 'raw calcium' }),
        offer('Fluorspar', { group: 'raw calcium' })
      ];
      const result = chemistry.selectMaterials(lines, target, { groups: { 'raw calcium': 5 } });
      expect(result.amounts[3] + result.amounts[4]).to.be.at.most(5 + 1e-6);
      // The shared cap's price is told too, named by its largest member.
      const shared = result.capped.find((c) => c.group === 'raw calcium')!;
      expect(shared.most).to.equal(5);
      // Fluorspar is lighter than whiting for its calcium, so together they come to less than 15 g.
      expect(shared.wouldBe).to.be.within(10, 15);
      expect(shared.missLifted).to.be.below(result.miss);
      // With a cap of its own, the price of the cap is told.
      const single = chemistry.selectMaterials(
        [own('G-200 EU Feldspar', 40), own('Silica', 30), own('China Clay', 15), offer('Whiting', { most: 5 })],
        target
      );
      expect(single.capped).to.have.length(1);
      expect(single.capped[0].wouldBe).to.be.closeTo(15, 1);
      expect(single.capped[0].missLifted).to.be.below(single.miss);
    });

    it("should say what lifting a cap alone would give, keeping every other line's least", () => {
      // Zinc capped at 5 g, and the clay held at 10 g or more, as Replace lead holds it.
      const target = molesOf([
        ['Ferro Frit 3134', 80],
        ['China Clay', 3],
        ['Silica', 10],
        ['Zinc Oxide', 7]
      ]);
      const lines = [
        { ...own('Ferro Frit 3134', 80), must: true },
        { ...own('China Clay', 3), must: true, least: 10 },
        own('Silica', 10),
        offer('Zinc Oxide', { most: 5, least: 1 })
      ];
      const result = chemistry.selectMaterials(lines, target, { keepOwn: true });
      expect(result.amounts[3]).to.be.closeTo(5, 1e-6);
      expect(result.capped).to.have.length(1);
      const [zinc] = result.capped;
      expect(zinc.wouldBe).to.be.closeTo(7, 0.1);
      // With the clay still at 10 g: not the exact match it would be if the clay could go back to 3.
      const lifted = chemistry.bestFit(
        lines.map((line, i) => ({ ...line, least: i === 1 ? 10 : 0, most: undefined })),
        target
      );
      expect(zinc.missLifted).to.be.closeTo(lifted.miss, 1e-3);
      expect(zinc.missLifted).to.be.above(1);
    });

    // The staging case behind ADR 12's note on closeness: nepheline syenite and
    // Gerstley Borate replaced from a shelf with Custer Spar and Frit 3134.
    const GERSTLEY = molesOf([
      ['Nepheline Syenite (typical)', 40],
      ['Silica', 25],
      ['Gerstley Borate', 15],
      ['EPK Kaolin', 20]
    ]);
    const SHELF = () => [
      offer('Custer Spar'),
      own('Silica', 25),
      offer('Whiting'),
      { ...own('EPK Kaolin', 20), group: 'raw clay' },
      offer('Ferro Frit 3134'),
      offer('Talc')
    ];
    const share = (amounts: number[], i: number) => amounts[i] / amounts.reduce((sum, a) => sum + a, 0);

    it('should keep a share of the batch to its cap, and say what lifting it would give', () => {
      const lines = SHELF();
      const free = chemistry.selectMaterials(lines, GERSTLEY);
      // Custer Spar has less alumina than nepheline syenite: the free match takes it from more kaolin.
      expect(share(free.amounts, 3)).to.be.above(0.25);
      const held = chemistry.selectMaterials(lines, GERSTLEY, { shares: { 'raw clay': 0.2 } });
      expect(share(held.amounts, 3)).to.be.at.most(0.2 + 1e-6);
      const [clay] = held.capped;
      expect(clay).to.include({ index: 3, group: 'raw clay' });
      const total = held.amounts.reduce((sum, a) => sum + a, 0);
      // In grams of this batch: the cap's 20%, and the free match's share.
      expect(clay.most / total).to.be.closeTo(0.2, 1e-6);
      expect(clay.wouldBe / total).to.be.closeTo(share(free.amounts, 3), 0.01);
      expect(clay.missLifted).to.be.below(held.miss);
      // A calcined kaolin, outside the cap, takes up the rest at little cost to the match.
      const calcined = chemistry.selectMaterials([...lines, offer('Calcined Kaolin (theoretical)')], GERSTLEY, {
        shares: { 'raw clay': 0.2 }
      });
      expect(share(calcined.amounts, 3)).to.be.at.most(0.2 + 1e-6);
      expect(calcined.amounts[6]).to.be.above(3);
      expect(calcined.miss).to.be.below(free.miss + 0.5);
    });

    it('should not put an amount back at its start where that breaks a shared cap', () => {
      // The free match wants the clay at its start of 20 g; capped with the silica at 44 g, it comes
      // to within 5% of its start, where an amount is tried back at its start.
      const lines = [
        { ...own('EPK Kaolin', 20), group: 'clay and silica' },
        { ...own('Silica', 25), group: 'clay and silica' },
        own('Custer Spar', 40),
        own('Whiting', 15)
      ];
      const target = molesOf([
        ['EPK Kaolin', 20],
        ['Silica', 25],
        ['Custer Spar', 40],
        ['Whiting', 15]
      ]);
      // Unheld, everything is as it was.
      expect(chemistry.fitAmounts(lines, target).amounts).to.deep.equal([20, 25, 40, 15]);
      const { amounts } = chemistry.fitAmounts(lines, target, { groups: { 'clay and silica': 44 } });
      expect(amounts[0] + amounts[1]).to.be.at.most(44 + 1e-6);
      // A cap on a share of the batch holds too: the other lines take up what the clay cannot.
      const shared = chemistry.fitAmounts(lines, target, { shares: { 'clay and silica': 0.44 } }).amounts;
      expect(share(shared, 0) + share(shared, 1)).to.be.at.most(0.44 + 1e-6);
    });

    it('should keep every material used at its least, not only the last one raised to it', () => {
      // Raising Bone Ash to its least once took Godfrey Spar, raised before it, to 0.74 (least 9.17).
      const leasts: Array<[string, number, object?]> = [
        ['Standard Porcelain China Clay', 4.4988, { start: 5.6 }],
        ['Godfrey Spar', 9.1696],
        ['Eckalite 2 Kaolin', 8.6795],
        ['Bone Ash', 14.1091],
        ['Nepheline Syenite (Norwegian, UK)', 10.1633, { avoid: true }],
        ['Litharge', 4.763],
        ['Hymod AT Ball Clay', 13.4878],
        ['Potash Feldspar (Valentine Clays)', 6.2934],
        ['Talc', 12.9392, { must: true }],
        ['Lead Bisilicate Frit 10.05 (Keramikos)', 14.0001],
        ['China Clay', 14.635],
        ['FFP 45 Feldspar', 12.798],
        ['Grolleg China Clay', 1.067]
      ];
      const lines = leasts.map(([name, least, extra]) => ({ ...offer(name, extra), least }));
      const target = {
        SiO2: 0.78733,
        Al2O3: 0.13688,
        Fe2O3: 0.00782,
        K2O: 0.04947,
        TiO2: 0.00219,
        Na2O: 0.01333,
        CaO: 0.12833,
        MgO: 0.00696,
        B2O3: 0.18208,
        PbO: 0.07001,
        MnO: 0.00043
      };
      const result = chemistry.selectMaterials(lines, target);
      expect(result.chosen.length).to.be.above(1);
      for (const i of result.chosen) {
        expect(result.amounts[i], lines[i].material.name).to.be.at.least(lines[i].least * (1 - 1e-6));
      }
    });

    it('should say what each material supplies in one order every browser agrees on', () => {
      // Shares compared by their difference rounded were not a total order (0.92 tied 0.94 and 0.94
      // tied 0.97, but 0.92 did not tie 0.97), so Safari could name them in another order than Chrome.
      // Now: largest first in bands of 5%, then the oxide the glaze has most of, then by name.
      const target = chemistry.oxideMoles(
        (
          [
            ['Potash Feldspar (Potclays 3426)', 8.1],
            ['Nepheline Syenite A270', 16.2],
            ['Mondré & Manz Frit M 1233', 2.3],
            ['Vibrantz Frit 90368', 4.9]
          ] as Array<[string, number]>
        ).map(([name, amount]) => ({ material: library.get(name)!, amount }))
      );
      const lines = [
        'Lead, Red',
        'Low Expansion Frit (Potterycrafts P2960)',
        'Kaolin 233 (Carl Jäger)',
        'Fusion Frit F-2',
        'Dolomite',
        'Cornwall Stone',
        'Ferro Frit 4113'
      ].map((name) => offer(name));
      const result = chemistry.selectMaterials(lines, target);
      const band = (share: number) => Math.round(20 * share);
      let pairs = 0;
      for (const { supplies } of result.contributions) {
        supplies.slice(1).forEach((part, k) => {
          expect(band(part.share)).to.be.at.most(band(supplies[k].share));
          pairs++;
        });
      }
      expect(pairs).to.be.above(2);
    });

    it('should make up a flux nothing offered supplies from the others, keeping the formula near', () => {
      // Lithium carbonate's lithia, with no lithium on hand: a fifth of the fluxes.
      const lithium = molesOf([
        ['Lithium Carbonate', 4],
        ['Custer Spar', 30],
        ['Whiting', 16],
        ['EPK Kaolin', 20],
        ['Silica', 30]
      ]);
      const lines = [own('Custer Spar', 30), own('Whiting', 16), own('EPK Kaolin', 20), own('Silica', 30)];
      const result = chemistry.selectMaterials(lines, lithium);
      expect(result.unreachable).to.deep.equal(['Li2O']);
      const { oxides } = chemistry.closeness(lithium, result.moles);
      const row = (oxide: string) => oxides.find((o) => o.oxide === oxide)!;
      expect(row('Li2O').verdict).to.equal('far');
      // Silica and alumina per mole of the new fluxes stay within three times near; they came out
      // 26% high (silica 4.73 for 3.76) when the other fluxes did not make up the lithia.
      expect(row('SiO2').verdict).to.not.equal('far');
      expect(row('Al2O3').verdict).to.not.equal('far');
      expect(row('SiO2').now / row('SiO2').was).to.be.below(1.1);
    });

    it('should say how near a match comes, oxide by oxide in the unity formula, with a verdict', () => {
      const old = molesOf([
        ['Custer Spar', 40],
        ['Whiting', 20],
        ['EPK Kaolin', 20],
        ['Silica', 20]
      ]);
      const same = chemistry.closeness(old, old);
      expect(same.verdict).to.equal('close');
      // Fluxes first, potash and soda together after them, then alumina, then silica.
      const order = same.oxides.map((o) => o.oxide);
      expect(order).to.deep.equal(['K2O', 'Na2O', 'KNaO', 'CaO', 'Al2O3', 'SiO2']);
      for (const o of same.oxides) expect(o).to.include({ difference: 0, verdict: 'close' });
      // A soda spar for the potash spar: potash and soda together close, apart off.
      const soda = chemistry.closeness(
        old,
        molesOf([
          ['Minspar 200', 41.1],
          ['Whiting', 19.6],
          ['EPK Kaolin', 18.9],
          ['Silica', 20.5]
        ])
      );
      expect(soda.verdict).to.equal('fair');
      const verdicts = Object.fromEntries(soda.oxides.map((o) => [o.oxide, o.verdict]));
      expect(verdicts).to.include({ K2O: 'off', Na2O: 'off', KNaO: 'close', CaO: 'close', Al2O3: 'close' });
      // Half the alumina is far: a different glaze.
      const thin = chemistry.closeness(
        old,
        molesOf([
          ['Custer Spar', 40],
          ['Whiting', 20],
          ['EPK Kaolin', 5],
          ['Silica', 30]
        ])
      );
      expect(thin.verdict).to.equal('poor');
      expect(thin.oxides.find((o) => o.oxide === 'Al2O3')!.verdict).to.equal('far');
    });

    it('should not call two formulas with no fluxes close: a target with none has no unity formula', () => {
      // Silica and kaolin against silica and alumina: no rows to compare, and every row of none was "close".
      expect(() => chemistry.closeness({ SiO2: 1, Al2O3: 0.2 }, { SiO2: 3, Al2O3: 0.1 }))
        .to.throw(/no flux/)
        .with.property('code', 'no-flux');
      // A match with no fluxes, against a target that has them, is poor, however small the target's fluxes.
      const fluxless = chemistry.closeness({ CaO: 0.01, SiO2: 0.03, Al2O3: 0.003 }, { SiO2: 3, Al2O3: 0.3 });
      expect(fluxless.verdict).to.equal('poor');
    });

    it('should order oxides that tie by name the same in every language the reader has', () => {
      // TiO2 and ZrO2, neither in the target, tie on group and amount; in Estonian, localeCompare
      // without a locale put ZrO2 first. Here every comparison without a locale is made Estonian.
      const target = { CaO: 1, Al2O3: 0.4, SiO2: 3 };
      const moles = { CaO: 1, Al2O3: 0.4, SiO2: 3, TiO2: 0.05, ZrO2: 0.05 };
      const original = String.prototype.localeCompare;
      const estonian = function (this: string, that: string, locales?: string | string[], options?: object) {
        return original.call(this, that, locales ?? 'et', options);
      };
      String.prototype.localeCompare = estonian as typeof original;
      let order: string[];
      try {
        order = chemistry.closeness(target, moles).oxides.map((o) => o.oxide);
      } finally {
        String.prototype.localeCompare = original;
      }
      expect(order.indexOf('TiO2')).to.be.below(order.indexOf('ZrO2'));
    });

    describe('what it says of the materials', () => {
      // A cone 6 glaze matched from what is on the shelf, as Match with what I have does.
      const recipe: Array<[string, number]> = [
        ['Custer Spar', 20],
        ['Ferro Frit 3134', 20],
        ['Whiting', 15],
        ['EPK Kaolin', 20],
        ['Silica', 25]
      ];
      const target = molesOf(recipe);
      const old = new Map(recipe);
      const shelf = [
        'G-200 EU Feldspar',
        'Mahavir Potash Feldspar',
        'Minspar 200',
        'Nepheline Syenite A270',
        'Ferro Frit 3134',
        'Ferro Frit 3124',
        'Whiting',
        'Dolomite',
        'Talc',
        'EPK Kaolin',
        'Silica',
        'Wollastonite (NYAD 400)',
        'Zinc Oxide',
        'Gerstley Borate'
      ].map((name) => ({ material: library.get(name)!, start: old.get(name) ?? 0, least: 1 }));
      const withMust = <T extends object>(lines: T[], index: number) =>
        lines.map((line, i) => (i === index ? { ...line, must: true } : line));

      it('should offer a material not used only for what adding it really gains, chosen again', () => {
        const result = chemistry.selectMaterials(shelf, target);
        // The other feldspars would only stand in for the one used: none is worth offering.
        expect(result.unused.filter((u) => u.helps >= 0.05)).to.deep.equal([]);
        for (const { index, helps } of result.unused) {
          const added = chemistry.selectMaterials(withMust(shelf, index), target);
          expect(helps, shelf[index].material.name).to.be.at.most(Math.max(0, result.miss - added.miss) + 1e-9);
        }
        // Under a limit on new materials, the potash source left out is worth adding back, by what it gives.
        const lines = [
          own('Ferro Frit 3110', 10),
          own('Whiting', 20),
          own('China Clay', 20),
          own('Silica', 40),
          own('Talc', 10),
          offer('Mahavir Potash Feldspar'),
          offer('Ferro Frit 3124', { must: true })
        ];
        const limited = chemistry.selectMaterials(lines, NITER, { extras: 0 });
        const feldspar = limited.unused.find((u) => u.index === 5)!;
        const added = chemistry.selectMaterials(withMust(lines, 5), NITER, { extras: 0 });
        expect(feldspar.helps).to.be.above(0.05);
        expect(feldspar.helps).to.be.closeTo(limited.miss - added.miss, 1e-9);
      });

      it('should measure what each material used is worth against the best match within the recipe', () => {
        const result = chemistry.selectMaterials(shelf, target);
        const plain = shelf.map((line) => ({ ...line, least: 0 }));
        const bestWith = (use: Set<number>) =>
          chemistry.bestFit(
            plain.filter((_, i) => use.has(i)),
            target
          ).miss;
        const used = new Set(result.chosen);
        for (const { index, missWithout } of result.contributions) {
          const without = new Set(used);
          without.delete(index);
          expect(missWithout - result.miss, shelf[index].material.name).to.be.closeTo(
            bestWith(without) - bestWith(used),
            0.01
          );
        }
      });
    });

    it("should keep the recipe's own materials when asked, and hold a must's least while choosing", () => {
      // Two calcium sources: the fewest materials would drop the wollastonite for more whiting.
      const recipe: Array<[string, number]> = [
        ['Whiting', 15],
        ['Wollastonite (NYAD 400)', 4],
        ['G-200 EU Feldspar', 30],
        ['China Clay', 20],
        ['Silica', 31]
      ];
      const mine = recipe.map(([name, amount]) => own(name, amount));
      const fewest = chemistry.selectMaterials(mine, molesOf(recipe));
      expect(names(mine, fewest.chosen)).not.to.include('Wollastonite (NYAD 400)');
      const kept = chemistry.selectMaterials(mine, molesOf(recipe), { keepOwn: true });
      expect(kept.chosen).to.deep.equal([0, 1, 2, 3, 4]);
      expect(kept.amounts).to.deep.equal([15, 4, 30, 20, 31]);
      const lines = [
        own('Ferro Frit 3110', 10),
        own('Whiting', 20),
        own('China Clay', 20),
        own('Silica', 40),
        own('Talc', 10),
        ...POTASH.map((name) => offer(name))
      ];
      // Clay held at no less than 25 g from the start: the choice is made around it.
      const held = [...lines];
      held[2] = { ...own('China Clay', 20), must: true, least: 25 } as (typeof held)[2];
      const result = chemistry.selectMaterials(held, NITER);
      expect(result.amounts[2]).to.be.at.least(25 - 1e-6);
      const free = chemistry.selectMaterials(lines, NITER);
      expect(result.miss).to.be.at.least(free.miss);
      expect(result.miss - result.best).to.be.below(0.5);
    });

    it('should try a material under its least at nothing and at its least, keeping the better', () => {
      const lines = [
        own('Whiting', 20),
        own('Silica', 35),
        own('China Clay', 20),
        own('G-200 EU Feldspar', 25),
        offer('Talc', { least: 8 })
      ];
      const recipe = (talc: number): Array<[string, number]> => [
        ['Whiting', 20],
        ['Silica', 35],
        ['China Clay', 20],
        ['G-200 EU Feldspar', 25],
        ['Talc', talc]
      ];
      // A trace of magnesia is not worth 8 g of talc; most of 8 g is.
      expect(chemistry.selectMaterials(lines, molesOf(recipe(1))).amounts[4]).to.equal(0);
      expect(chemistry.selectMaterials(lines, molesOf(recipe(6))).amounts[4]).to.be.closeTo(8, 1e-6);
    });

    it('should add back materials each worth a closer match, when asked, and rank fast with the plain best', () => {
      const lines = [
        own('Ferro Frit 3110', 10),
        own('Whiting', 20),
        own('China Clay', 20),
        own('Silica', 40),
        own('Talc', 10),
        ...POTASH.map((name) => offer(name)),
        offer('Wollastonite (NYAD 400)')
      ];
      const fewest = chemistry.selectMaterials(lines, NITER);
      const closer = chemistry.selectMaterials(lines, NITER, { closer: true });
      expect(closer.miss).to.be.at.most(fewest.miss + 1e-9);
      expect(closer.chosen.length).to.be.at.least(fewest.chosen.length);
      // The plain best match: no nearer than the best, and no slower to find than fitAmounts' first step.
      const best = chemistry.bestFit(lines, NITER);
      expect(best.amounts).to.have.length(lines.length);
      expect(best.miss).to.be.closeTo(fewest.best, 0.05);
      expect(best.miss).to.be.at.most(chemistry.fitAmounts(lines, NITER).miss + 1e-9);
    });

    it('should call materials alike only when they would do the same job in the match', () => {
      const lines = [
        own('Whiting', 20),
        own('China Clay', 20),
        own('Silica', 40),
        own('Talc', 10),
        offer('G-200 EU Feldspar'),
        offer('Mahavir Potash Feldspar'),
        offer('Flint')
      ];
      const result = chemistry.selectMaterials(lines, NITER);
      const pairs = result.alike.map((pair) => [lines[pair.used].material.name, lines[pair.other].material.name]);
      // Silica and flint are alike; flint and a feldspar, both mostly silica, are not.
      expect(pairs).to.deep.include(['Silica', 'Flint']);
      for (const [used, other] of pairs) {
        expect(
          [used, other].filter((name) => POTASH.includes(name) || name === 'G-200 EU Feldspar').length
        ).to.not.equal(1);
      }
    });
  });

  describe('replacing lead', () => {
    const records: StandardMaterial[] = standardData.load('materials');
    const library = new Map(records.map((m) => [m.name, m]));
    const molesOf = (recipe: Array<[string, number]>) =>
      chemistry.oxideMoles(recipe.map(([name, amount]) => ({ material: library.get(name)!, amount })));
    /** In the unity formula: per mole of the fluxes, lead included. */
    const unityOf = (moles: Record<string, number>): Record<string, number> => {
      const fluxes = Object.entries(moles)
        .filter(([oxide]) => ['R2O', 'RO'].includes(chemistry.OXIDE_GROUPS[oxide]))
        .reduce((sum, [, amount]) => sum + amount, 0);
      return Object.fromEntries(Object.entries(moles).map(([oxide, amount]) => [oxide, amount / fluxes]));
    };

    it("should set boron by Katz's rule for the firing", () => {
      const at = (cone: string) => chemistry.boronFor(chemistry.CONES.find((c) => c.cone === cone)!.celsius);
      expect(at('06')).to.be.closeTo(0.61, 0.005);
      expect(at('04')).to.be.closeTo(0.49, 0.005);
      expect(at('03')).to.be.closeTo(0.41, 0.005);
      // Katz's baseline is cone 10, 1305 °C, where no boron is needed.
      expect(chemistry.boronFor(1305)).to.equal(0);
      expect(chemistry.boronFor(1400)).to.equal(0);
    });

    it("should rebuild a lead-only glaze's fluxes, keeping its silica and alumina", () => {
      const old = molesOf([
        ['Lead, Red', 55],
        ['China Clay', 15],
        ['Silica', 30]
      ]);
      const was = unityOf(old);
      const now = unityOf(chemistry.leadFreeTarget(old, { celsius: 1060 }));
      expect(now.PbO).to.equal(undefined);
      // Lead's whole share goes to other fluxes: soda and potash, calcium, a little zinc, strontium, magnesia.
      expect(now.K2O + now.Na2O).to.be.closeTo(0.3, 1e-9);
      expect(now.K2O).to.be.closeTo(now.Na2O, 1e-9);
      expect(now.CaO).to.be.closeTo(0.6, 1e-9);
      expect(now.ZnO).to.be.closeTo(0.1, 1e-9);
      expect(now.SrO ?? 0).to.equal(0);
      expect(now.SiO2).to.be.closeTo(was.SiO2, 1e-9);
      expect(now.Al2O3).to.be.closeTo(was.Al2O3, 1e-9);
      // Katz's need at cone 04 (1060 °C), from cone 10 at 1305 °C.
      expect(now.B2O3).to.be.closeTo(0.49, 1e-9);
    });

    it('should keep the fluxes a glaze has, raise alumina to 0.2, and leave out zinc and magnesia for chrome', () => {
      // A honey satin: PbO 0.72 with calcium and potash, little alumina for a lead-free glaze.
      const old = { PbO: 0.72, CaO: 0.206, K2O: 0.074, Al2O3: 0.12, SiO2: 3.05, B2O3: 0.7 };
      const now = unityOf(chemistry.leadFreeTarget(old, { celsius: 1060, noZincOrMagnesia: true }));
      // Soda and potash come up to 0.3 as the glaze has them: all potash.
      expect(now.K2O).to.be.closeTo(0.3, 1e-9);
      expect(now.Na2O ?? 0).to.equal(0);
      expect(now.CaO).to.be.closeTo(0.6, 1e-9);
      expect(now.ZnO ?? 0).to.equal(0);
      expect(now.MgO ?? 0).to.equal(0);
      expect(now.SrO).to.be.closeTo(0.1, 1e-9);
      expect(now.Al2O3).to.equal(0.2);
      // More boron than Katz's already: kept.
      expect(now.B2O3).to.be.closeTo(0.7, 1e-9);
    });

    it('should leave out zinc, magnesia or strontium on their own, and want more alumina at mid fire', () => {
      const old = { PbO: 0.72, CaO: 0.206, K2O: 0.074, Al2O3: 0.12, SiO2: 3.05, B2O3: 0.7 };
      const lowFire = unityOf(chemistry.leadFreeTarget(old, { celsius: 1060, noZinc: true, noStrontium: true }));
      expect(lowFire.ZnO ?? 0).to.equal(0);
      expect(lowFire.SrO ?? 0).to.equal(0);
      expect(lowFire.MgO).to.be.closeTo(0.1, 1e-9);
      expect(lowFire.Al2O3).to.equal(0.2);
      const midFire = unityOf(chemistry.leadFreeTarget(old, { celsius: 1222, noMagnesia: true }));
      expect(midFire.MgO ?? 0).to.equal(0);
      expect(midFire.ZnO).to.be.closeTo(0.1, 1e-9);
      expect(midFire.Al2O3).to.equal(0.25);
      // The fluxes keep their total either way.
      const fluxes = (u: Record<string, number>) =>
        ['K2O', 'Na2O', 'CaO', 'MgO', 'ZnO', 'SrO'].reduce((sum, oxide) => sum + (u[oxide] ?? 0), 0);
      expect(fluxes(lowFire)).to.be.closeTo(1, 1e-9);
      expect(fluxes(midFire)).to.be.closeTo(1, 1e-9);
    });

    it('should need the firing, and a flux', () => {
      expect(() => chemistry.leadFreeTarget({ PbO: 1, SiO2: 2 }, { celsius: 0 })).to.throw(/firing temperature/);
      expect(() => chemistry.leadFreeTarget({ SiO2: 2 }, { celsius: 1060 })).to.throw(/no flux/);
    });

    it('should fit a lead-free recipe to the rebuilt formula, keeping raw whiting and zinc to their most', () => {
      const target = chemistry.leadFreeTarget(
        molesOf([
          ['Lead, Red', 55],
          ['China Clay', 15],
          ['Silica', 30]
        ]),
        { celsius: 1060 }
      );
      const names = ['Standard Borax Frit (Potclays 2263)', 'China Clay', 'Silica', 'Whiting', 'Zinc Oxide'];
      const { amounts, moles } = chemistry.fitAmounts(
        names.map((name, i) => ({
          material: library.get(name)!,
          start: [55, 15, 30, 0, 0][i],
          most: i >= 3 ? 5 : undefined
        })),
        target,
        { near: { B2O3: 0.05, Al2O3: 0.02, K2O: 0.15, Na2O: 0.15 }, alkalis: 0.03, fluxTotal: 0.03 }
      );
      expect(amounts[3]).to.be.at.most(5);
      expect(amounts[4]).to.be.at.most(5);
      const [want, got] = [unityOf(target), unityOf(moles)];
      for (const oxide of ['B2O3', 'Al2O3', 'SiO2', 'CaO'])
        expect(got[oxide], oxide).to.be.closeTo(want[oxide], 0.05 * want[oxide]);
    });
  });

  describe('invalid input', () => {
    it('should reject a recipe with no flux', () => {
      expect(() => calculateUMF({ Silica: 60, 'Kaolin (theoretical)': 40 })).to.throw(/no flux/);
    });

    it('should reject unknown materials', () => {
      expect(() => calculateUMF({ Unobtainium: 10 })).to.throw(/Unknown material/);
    });

    it('should find a material by its name in any script, and refuse extra names that leave no key or share one', () => {
      const codeOf = (work: () => unknown): string | undefined => {
        try {
          work();
        } catch (e) {
          return (e as ChemistryError).code;
        }
        return undefined;
      };
      type Named = MaterialInput & { aliases?: string[]; noChemistry?: boolean };
      const standard = (
        [...standardData.load('materials'), ...standardData.load('additives')] as unknown as Named[]
      ).filter((record) => record.fields?.length && !record.noChemistry);
      const kamado = standard.find((record) => record.name.startsWith('Kamado Feldspar'))!;
      const alone = (material: MaterialInput) => calculateUMF([{ material, amount: 100 }]);
      // A Japanese or Russian name kept nothing of itself, so any one found whichever such material came last.
      expect(calculateUMF({ 釜戸長石: 100 }, { materials: [kamado] }).umf).to.deep.equal(alone(kamado).umf);
      expect(codeOf(() => calculateUMF({ 福島長石: 100 }, { materials: [kamado] }))).to.equal('unknown-material');
      // Accents and full-width letters fold away; ASCII names are read as before.
      const spar: MaterialInput = { name: 'Feldspáth sodique', analysis: { Na2O: 11.8, Al2O3: 19.4, SiO2: 68.7 } };
      expect(calculateUMF({ 'FELDSPATH SODIQUE': 100 }, { materials: [spar] }).umf).to.deep.equal(alone(spar).umf);
      expect(calculateUMF({ ＳＩＬＩＣＡ: 30, Whiting: 20 }).umf).to.deep.equal(
        calculateUMF({ Silica: 30, Whiting: 20 }).umf
      );
      // Every standard name and alias finds its own record: each record's names in one batch, beside a flux
      // (for those with none), come to the record's own unity formula.
      const flux = { material: { name: 'A flux', analysis: { CaO: 56 }, loi: 44 }, amount: 10 };
      for (const record of standard) {
        const names = [record.name, ...(record.aliases ?? [])];
        const own = calculateUMF([{ material: record, amount: 100 }, flux]).umf;
        const lines = names.map((name) => ({ material: name, amount: 100 / names.length }));
        const found = calculateUMF([...lines, flux], { materials: standard }).umf;
        expect(Object.keys(found).sort(), record.name).to.deep.equal(Object.keys(own).sort());
        for (const [oxide, moles] of Object.entries(own)) expect(found[oxide], record.name).to.be.closeTo(moles, 1e-9);
      }
      // Among the extra materials, a name or alias with no letters or digits, or one two of them share, is refused.
      const whiting: Named = { name: 'My whiting', analysis: { CaO: 56 }, loi: 44 };
      expect(codeOf(() => calculateUMF({ Silica: 1 }, { materials: [{ ...whiting, name: '—' }] }))).to.equal(
        'blank-name'
      );
      expect(codeOf(() => calculateUMF({ Silica: 1 }, { materials: [{ ...whiting, aliases: ['()'] }] }))).to.equal(
        'blank-name'
      );
      expect(
        codeOf(() => calculateUMF({ Silica: 1 }, { materials: [whiting, { ...whiting, name: 'my-Whiting!' }] }))
      ).to.equal('duplicate-name');
      expect(
        codeOf(() => calculateUMF({ Silica: 1 }, { materials: [whiting, { ...spar, aliases: ['MY WHITING'] }] }))
      ).to.equal('duplicate-name');
      // Its own name again among its aliases is no clash, and an extra material still replaces a built-in one.
      expect(
        codeOf(() => calculateUMF({ 'my whiting': 1 }, { materials: [{ ...whiting, aliases: ['My Whiting'] }] }))
      ).to.equal(undefined);
      expect(calculateUMF({ Whiting: 1 }, { materials: [{ ...whiting, name: 'Whiting' }] }).loi).to.equal(44);
    });

    it('should reject misspelled oxides such as Si02', () => {
      const bad = { name: 'Typo', analysis: { Si02: 100 } };
      expect(() => calculateUMF([{ material: bad, amount: 1 }])).to.throw(/Unknown oxide/);
    });

    it('should reject negative or non-numeric amounts', () => {
      expect(() => calculateUMF({ Whiting: -5 })).to.throw(/Invalid amount/);
      // Not a number, which the types rule out; the check is for callers without them.
      expect(() => calculateUMF({ Whiting: 'lots' } as unknown as Record<string, number>)).to.throw(/Invalid amount/);
    });

    it('should refuse, by code, materials and batches that would give negative or not-a-number results', () => {
      const codeOf = (work: () => unknown): string | undefined => {
        try {
          work();
        } catch (e) {
          return (e as ChemistryError).code;
        }
        return undefined;
      };
      const withWhiting = (material: MaterialInput) => () =>
        calculateUMF([
          { material, amount: 10 },
          { material: 'Whiting', amount: 10 }
        ]);
      // A formula's counts: at least 0, numbers, and something left after firing.
      expect(codeOf(withWhiting({ name: 'Odd', formula: { CaO: -1, SiO2: 2 } }))).to.equal('invalid-oxide-amount');
      expect(codeOf(withWhiting({ name: 'Odd', formula: { CaO: NaN } }))).to.equal('invalid-oxide-amount');
      expect(codeOf(withWhiting({ name: 'Odd', formula: { CaO: 0 } }))).to.equal('no-oxides');
      expect(codeOf(() => chemistry.materialWeights({ name: 'Water', formula: { H2O: 1 } }))).to.equal('no-oxides');
      // An analysis's LOI, as the stored shape's.
      expect(codeOf(withWhiting({ name: 'Odd', analysis: { CaO: 56 }, loi: 150 }))).to.equal('loi-range');
      expect(codeOf(withWhiting({ name: 'Odd', analysis: { CaO: 56 }, loi: -50 }))).to.equal('loi-range');
      // An oxide given twice: each amount checked, in either order.
      const twice = (first: string, second: string) => () =>
        chemistry.materialWeights({
          name: 'Twice',
          percentmole: 'percent',
          fields: [
            { name: 'CaO', amount: first },
            { name: 'CaO', amount: second }
          ]
        });
      // Oxides in percent or moles, in any case, and nothing else: "Percent" is percent, not moles.
      const given = (percentmole: string) => () =>
        chemistry.materialWeights({ name: 'Odd', percentmole, fields: [{ name: 'CaO', amount: '56' }] });
      expect(codeOf(given('weight'))).to.equal('unknown-percentmole');
      expect(codeOf(given('percent'))).to.equal(undefined);
      expect(codeOf(given('molecular'))).to.equal(undefined);
      expect(given('Percent')()).to.deep.equal(given('percent')());
      expect(given(' MOLECULAR ')()).to.deep.equal(given('molecular')());
      // None, as an additive saved before it had one, is moles as ever: absent, null or blank alike.
      expect(given('')()).to.deep.equal(given('molecular')());
      expect(codeOf(twice('abc', '56'))).to.equal('invalid-oxide-amount');
      expect(codeOf(twice('56', 'abc'))).to.equal('invalid-oxide-amount');
      // A batch so large its sums overflow.
      expect(codeOf(() => calculateUMF({ Whiting: 1e308, Silica: 1e308 }))).to.equal('invalid-amount');
      // An amount is a number or a plain decimal, as saved: not what Number() would also read.
      for (const odd of ['1e1', '0x10', true, '12,5', 'Infinity']) {
        expect(
          codeOf(() => calculateUMF({ Whiting: odd as unknown as number, Silica: 30 })),
          String(odd)
        ).to.equal('invalid-amount');
      }
      const plain = calculateUMF({ Whiting: 20, Silica: 30 }).umf;
      expect(calculateUMF({ Whiting: ' 20 ', Silica: '30.0' } as unknown as Record<string, number>).umf).to.deep.equal(
        plain
      );
      expect(
        calculateUMF({ Whiting: 20, Silica: 30, Kaolin: '' } as unknown as Record<string, number>).umf
      ).to.deep.equal(plain);
    });

    it('should refuse an LOI or molecular weight that is given but not a number, and say when the two disagree', () => {
      const codeOf = (work: () => unknown): string | undefined => {
        try {
          work();
        } catch (e) {
          return (e as ChemistryError).code;
        }
        return undefined;
      };
      const whiting = { name: 'My whiting', percentmole: 'molecular', fields: [{ name: 'CaO', amount: '1' }] };
      const weights = (extra: object) => chemistry.materialWeights({ ...whiting, ...extra } as MaterialInput);
      for (const odd of ['43,97', Infinity, NaN, 'abc', true]) {
        expect(
          codeOf(() => weights({ loi: odd })),
          String(odd)
        ).to.equal('invalid-loi');
        expect(
          codeOf(() => weights({ molecularweight: odd })),
          String(odd)
        ).to.equal('invalid-molecular-weight');
      }
      // In percent too, where the LOI is all there is.
      expect(
        codeOf(() =>
          chemistry.materialWeights({
            ...whiting,
            percentmole: 'percent',
            fields: [{ name: 'CaO', amount: '56' }],
            loi: '43,97'
          })
        )
      ).to.equal('invalid-loi');
      // Left out (absent, null or blank) is still left out; given, either one sets the LOI.
      for (const blank of [undefined, null, '', '  ']) expect(weights({ loi: blank }).loi).to.equal(0);
      expect(weights({ loi: '43.97' }).loi).to.equal(43.97);
      expect(weights({ molecularweight: '100.09' }).loi).to.be.closeTo(43.97, 0.01);
      // Both, agreeing to half a point: no warning. Further apart: the LOI is used, with a warning.
      expect(weights({ loi: 43.6, molecularweight: 100.09 }).warningCodes).to.deep.equal([]);
      const apart = weights({ loi: 30, molecularweight: 100.09 });
      expect(apart.loi).to.equal(30);
      expect(apart.warningCodes.map((w) => w.code)).to.deep.equal(['loi-molecular-weight']);
      expect(apart.warnings[0]).to.equal(
        'The LOI of My whiting (30.00%) does not match its molecular weight, which gives 43.97%; the LOI was used.'
      );
      // Every standard material's LOI and molecular weight agree.
      const standard = [...standardData.load('materials'), ...standardData.load('additives')];
      for (const record of standard as unknown as Array<MaterialInput & { noChemistry?: boolean }>) {
        if (record.fields?.length && !record.noChemistry) {
          expect(
            chemistry.materialWeights(record).warningCodes.map((w) => w.code),
            record.name
          ).to.not.include('loi-molecular-weight');
        }
      }
    });
  });
});
