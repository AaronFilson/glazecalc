import * as chai from 'chai';
import chemistry from '../../lib/chemistry/index.js';
import type { ChemistryError, MaterialField, MaterialInput } from '../../lib/chemistry/index.js';
import standardData from '../../data/index.js';

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

describe('glaze chemistry', () => {
  describe('molar masses', () => {
    it('should derive oxide molar masses from atomic weights', () => {
      expect(MW.SiO2).to.be.closeTo(60.083, 0.001);
      expect(MW.Al2O3).to.be.closeTo(101.961, 0.001);
      expect(MW.K2O).to.be.closeTo(94.195, 0.001);
      expect(MW.CaO).to.be.closeTo(56.077, 0.001);
      expect(MW.B2O3).to.be.closeTo(69.617, 0.001);
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
      const result = calculateUMF({ 'Potash Feldspar': 40, Silica: 30, Whiting: 20, Kaolin: 10 });
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
      const result = calculateUMF({ 'Potash Feldspar': 40, Silica: 30, Whiting: 20, Kaolin: 10 });
      expect(result.expansion).to.be.closeTo(7.49, 0.005);
      // Weight percent times each oxide's coefficient, on an analysis normalized to 100.
      expect(chemistry.expansion({ SiO2: 50, Na2O: 50 })).to.be.closeTo(50 * 0.035 + 50 * 0.387, 1e-9);
      expect(chemistry.expansion({ SiO2: 1, Na2O: 1 })).to.be.closeTo(50 * 0.035 + 50 * 0.387, 1e-9);
      // A colorant with no coefficient adds nothing but still counts in the total, as in Glazy.
      expect(chemistry.expansion({ SiO2: 50, CoO: 50 })).to.be.closeTo(50 * 0.035, 1e-9);
      expect(chemistry.expansion({})).to.equal(null);
    });

    it('should report fired oxide weight percents that total 100', () => {
      const result = calculateUMF({ 'Potash Feldspar': 40, Silica: 30, Whiting: 20, Kaolin: 10 });
      const total = Object.keys(result.analysis).reduce((sum, oxide) => sum + result.analysis[oxide], 0);
      expect(total).to.be.closeTo(100, 1e-9);
      expect(result.analysis.SiO2).to.be.closeTo(67.43, 0.01);
    });

    it('should not depend on batch size', () => {
      const small = calculateUMF({ 'Potash Feldspar': 40, Silica: 30, Whiting: 20, Kaolin: 10 });
      const large = calculateUMF({ 'Potash Feldspar': 4000, Silica: 3000, Whiting: 2000, Kaolin: 1000 });
      Object.keys(small.umf).forEach((oxide) => {
        expect(large.umf[oxide]).to.be.closeTo(small.umf[oxide], 1e-9);
      });
    });

    it('should match material names regardless of case, spacing and aliases', () => {
      const result = calculateUMF({ 'potash-feldspar': 40, FLINT: 30, whiting: 20, kaolin: 10 });
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
        { 'My Feldspar': 40, Silica: 30, Whiting: 20, Kaolin: 10, RIO: 1 },
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
      expect(calculateUMF({ 'Potash Feldspar': 25, Whiting: 10, Kaolin: 15, Silica: 50 }).warnings).to.eql([]);
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
          'book'
        ]);
      }
    });

    it('should use known statuses and regions, and give every name to one record only', () => {
      const seen = new Set<string>();
      for (const record of all) {
        if (record.status)
          expect(record.status, record.name).to.be.oneOf(['current', 'scarce', 'discontinued', 'historical']);
        for (const region of record.region ?? [])
          expect(region, record.name).to.be.oneOf(['US', 'UK', 'EU', 'CA', 'AU']);
        for (const name of [record.name, ...(record.aliases ?? [])]) {
          expect(seen.has(name.toLowerCase()), name).to.equal(false);
          seen.add(name.toLowerCase());
        }
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

    it('should name, for each old feldspar, a substitute sold in each region', () => {
      for (const record of old.filter((r) => r.category === 'feldspar')) {
        for (const region of ['US', 'UK', 'EU', 'AU']) {
          const sold = (record.substitutes ?? [])
            .map((name) => current(name, materials))
            .filter((sub) => sub && (!sub.region?.length || sub.region.includes(region)));
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
        'Potash Feldspar': 40,
        Silica: 20,
        Whiting: 10,
        Dolomite: 20,
        Talc: 5,
        Kaolin: 10
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
      expect(at('06')).to.be.closeTo(0.6, 0.01);
      expect(at('04')).to.be.closeTo(0.48, 0.01);
      expect(at('03')).to.be.closeTo(0.4, 0.01);
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
      expect(now.B2O3).to.be.closeTo(0.48, 1e-9);
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
      expect(() => calculateUMF({ Silica: 60, Kaolin: 40 })).to.throw(/no flux/);
    });

    it('should reject unknown materials', () => {
      expect(() => calculateUMF({ Unobtainium: 10 })).to.throw(/Unknown material/);
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
      expect(codeOf(twice('abc', '56'))).to.equal('invalid-oxide-amount');
      expect(codeOf(twice('56', 'abc'))).to.equal('invalid-oxide-amount');
      // A batch so large its sums overflow.
      expect(codeOf(() => calculateUMF({ Whiting: 1e308, Silica: 1e308 }))).to.equal('invalid-amount');
    });
  });
});
