const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const chemistry = require(__dirname + '/../../lib/chemistry');
const calculateUMF = chemistry.calculateUMF;
const MW = chemistry.MOLAR_MASS;

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
      var result = chemistry.formulaToAnalysis({ K2O: 1, Al2O3: 1, SiO2: 6 });
      expect(result.analysis.K2O).to.be.closeTo(16.92, 0.01);
      expect(result.analysis.Al2O3).to.be.closeTo(18.32, 0.01);
      expect(result.analysis.SiO2).to.be.closeTo(64.76, 0.01);
      expect(result.loi).to.eql(0);
    });

    it('should count CO2 in whiting as loss on ignition', () => {
      var result = chemistry.formulaToAnalysis({ CaO: 1, CO2: 1 });
      expect(result.analysis.CaO).to.be.closeTo(56.03, 0.01);
      expect(result.loi).to.be.closeTo(43.97, 0.01);
    });

    it('should count chemically bound water in kaolin as loss on ignition', () => {
      var result = chemistry.formulaToAnalysis({ Al2O3: 1, SiO2: 2, H2O: 2 });
      expect(result.analysis.Al2O3).to.be.closeTo(39.50, 0.01);
      expect(result.analysis.SiO2).to.be.closeTo(46.55, 0.01);
      expect(result.loi).to.be.closeTo(13.96, 0.01);
    });
  });

  describe('UMF calculation', () => {
    it('should give whole-number moles for a formula-weight batch', () => {
      // 1 mol CaCO3 + 3 mol SiO2 fires to CaO.3SiO2
      var result = calculateUMF([
        { material: 'Whiting', amount: MW.CaO + 44.009 },
        { material: 'Silica', amount: 3 * MW.SiO2 }
      ]);
      expect(result.umf.CaO).to.be.closeTo(1, 1e-9);
      expect(result.umf.SiO2).to.be.closeTo(3, 1e-9);
      expect(result.siAlRatio).to.eql(null);
    });

    it('should calculate a Leach 4321 celadon base', () => {
      var result = calculateUMF({ 'Potash Feldspar': 40, Silica: 30, Whiting: 20, Kaolin: 10 });
      expect(result.umf.K2O).to.be.closeTo(0.2645, 0.0001);
      expect(result.umf.CaO).to.be.closeTo(0.7355, 0.0001);
      expect(result.umf.Al2O3).to.be.closeTo(0.4071, 0.0001);
      expect(result.umf.SiO2).to.be.closeTo(3.7099, 0.0001);
      expect(result.siAlRatio).to.be.closeTo(9.114, 0.001);
      expect(result.loi).to.be.closeTo(10.19, 0.01);
      expect(result.groups.R2O + result.groups.RO).to.be.closeTo(1, 1e-9);
    });

    it('should report fired oxide weight percents that total 100', () => {
      var result = calculateUMF({ 'Potash Feldspar': 40, Silica: 30, Whiting: 20, Kaolin: 10 });
      var total = Object.keys(result.analysis)
        .reduce((sum, oxide) => sum + result.analysis[oxide], 0);
      expect(total).to.be.closeTo(100, 1e-9);
      expect(result.analysis.SiO2).to.be.closeTo(67.43, 0.01);
    });

    it('should not depend on batch size', () => {
      var small = calculateUMF({ 'Potash Feldspar': 40, Silica: 30, Whiting: 20, Kaolin: 10 });
      var large = calculateUMF({ 'Potash Feldspar': 4000, Silica: 3000, Whiting: 2000, Kaolin: 1000 });
      Object.keys(small.umf).forEach((oxide) => {
        expect(large.umf[oxide]).to.be.closeTo(small.umf[oxide], 1e-9);
      });
    });

    it('should match material names regardless of case, spacing and aliases', () => {
      var result = calculateUMF({ 'potash-feldspar': 40, FLINT: 30, whiting: 20, kaolin: 10 });
      expect(result.umf.K2O).to.be.closeTo(0.2645, 0.0001);
    });

    it('should accept user-entered analyses and include colorants', () => {
      var userMaterials = [{
        name: 'My Feldspar',
        analysis: { SiO2: 68.5, Al2O3: 17.0, K2O: 10.0, Na2O: 3.0, CaO: 0.3, Fe2O3: 0.1 },
        loi: 0.3
      }];
      var result = calculateUMF(
        { 'My Feldspar': 40, Silica: 30, Whiting: 20, Kaolin: 10, RIO: 1 },
        { materials: userMaterials });
      var feldsparMoles = {
        K2O: 40 * 0.100 / MW.K2O,
        Na2O: 40 * 0.030 / MW.Na2O,
        CaO: 40 * 0.003 / MW.CaO
      };
      var whitingCaO = 20 / (MW.CaO + 44.009);
      var flux = feldsparMoles.K2O + feldsparMoles.Na2O + feldsparMoles.CaO + whitingCaO;
      var iron = 40 * 0.001 / MW.Fe2O3 + 1 / MW.Fe2O3;
      expect(result.umf.K2O).to.be.closeTo(feldsparMoles.K2O / flux, 1e-9);
      expect(result.umf.Na2O).to.be.closeTo(feldsparMoles.Na2O / flux, 1e-9);
      expect(result.umf.Fe2O3).to.be.closeTo(iron / flux, 1e-9);
      expect(result.warnings).to.eql([]);
    });

    it('should accept a material object directly in a recipe line', () => {
      var result = calculateUMF([
        { material: { name: 'Calcium oxide', analysis: { CaO: 100 } }, amount: MW.CaO },
        { material: 'Silica', amount: 2 * MW.SiO2 }
      ]);
      expect(result.umf.SiO2).to.be.closeTo(2, 1e-9);
      expect(result.loi).to.eql(0);
    });

    it('should warn when an analysis does not total about 100%', () => {
      var result = calculateUMF([
        { material: { name: 'Bad spar', analysis: { SiO2: 50, K2O: 10 } }, amount: 10 }
      ]);
      expect(result.warnings.length).to.eql(1);
      expect(result.warnings[0]).to.contain('Bad spar');
    });
  });

  describe('app material format', () => {
    var dolomite = {
      name: 'Dolomite', percentmole: 'molecular', loi: 47.73,
      fields: [{ name: 'CaO', amount: '1' }, { name: 'MgO', amount: '1' }]
    };

    it('should derive the equivalent weight of a molecular formula from its LOI', () => {
      var weights = chemistry.materialWeights(dolomite);
      // CaMg(CO3)2 is 184.4 g per formula, which holds 2 moles of flux
      expect(weights.equivalent).to.be.closeTo(92.2, 0.01);
      expect(weights.unity.CaO).to.be.closeTo(0.5, 1e-4);
      expect(weights.unity.MgO).to.be.closeTo(0.5, 1e-4);
      expect(weights.firedWeight).to.be.closeTo((MW.CaO + MW.MgO) / 2, 0.01);
      expect(weights.molecularWeight).to.be.closeTo(184.4, 0.01);
    });

    it('should fall back to the molecular weight when no LOI is given', () => {
      var talc = {
        name: 'Talc', molecularweight: 379.27, loi: '',
        fields: [{ name: 'MgO', amount: '3' }, { name: 'SiO2', amount: '4' }]
      };
      var weights = chemistry.materialWeights(talc);
      expect(weights.loi).to.be.closeTo(4.75, 0.01);
      expect(weights.equivalent).to.be.closeTo(379.27 / 3, 0.01);
    });

    it('should convert a percent analysis to a unity formula', () => {
      var spar = {
        name: 'Spar', percentmole: 'percent', loi: 0,
        fields: [{ name: 'K2O', amount: '16.92' }, { name: 'Al2O3', amount: '18.32' },
          { name: 'SiO2', amount: '64.76' }]
      };
      var weights = chemistry.materialWeights(spar);
      expect(weights.unity.Al2O3).to.be.closeTo(1, 0.001);
      expect(weights.unity.SiO2).to.be.closeTo(6, 0.001);
      expect(weights.equivalent).to.be.closeTo(556.65, 0.1);
    });

    it('should warn when a stored equivalent weight disagrees with the formula', () => {
      var stored = JSON.parse(JSON.stringify(dolomite));
      stored.equivalent = 184;
      stored.fields.forEach((field) => field.amountUnity = 0.5);
      expect(chemistry.materialWeights(stored).warnings[0]).to.contain('stored equivalent weight');
    });

    it('should keep percent analyses on the raw basis when there is an LOI', () => {
      // Whiting as an analysis: 56.03% CaO and 43.97% LOI holds one mole of CaO per 100.08 g.
      var whiting = {
        name: 'Whiting analysis', percentmole: 'percent', loi: 43.97,
        fields: [{ name: 'CaO', amount: '56.03' }]
      };
      var weights = chemistry.materialWeights(whiting);
      expect(weights.equivalent).to.be.closeTo(100.08, 0.01);
      expect(weights.firedWeight).to.be.closeTo(MW.CaO, 0.01);
      expect(weights.warnings).to.eql([]);
    });

    it('should use the formula as written for a material with no flux', () => {
      var clay = { name: 'Clay', loi: 13.96, fields: [{ name: 'Al2O3', amount: '1' }, { name: 'SiO2', amount: '2' }] };
      var weights = chemistry.materialWeights(clay);
      expect(weights.unity.Al2O3).to.be.closeTo(1, 1e-9);
      expect(weights.unity.SiO2).to.be.closeTo(2, 1e-9);
      expect(weights.equivalent).to.be.closeTo(258.17, 0.01);
      expect(weights.equivalent).to.eql(weights.molecularWeight);
    });

    it('should let user materials override the built-in ones by name', () => {
      var cheapSilica = { name: 'Silica', analysis: { SiO2: 90, Al2O3: 10 } };
      var result = calculateUMF({ Whiting: 100.08, Silica: 100 }, { materials: [cheapSilica] });
      var flux = 100.08 / (MW.CaO + 44.009);
      expect(result.umf.Al2O3).to.be.closeTo(10 / MW.Al2O3 / flux, 1e-6);
      expect(result.umf.SiO2).to.be.closeTo(90 / MW.SiO2 / flux, 1e-6);
    });

    it('should reject an LOI of 100% or more', () => {
      var bad = { name: 'Bad', loi: 100, fields: [{ name: 'CaO', amount: '1' }] };
      expect(() => chemistry.materialWeights(bad)).to.throw(/LOI/);
    });

    it('should calculate a recipe from app materials and their amounts', () => {
      var result = calculateUMF([
        { material: dolomite, amount: 20 },
        { material: 'Silica', amount: 30 }
      ]);
      expect(result.umf.CaO).to.be.closeTo(0.5, 1e-4);
      expect(result.umf.SiO2).to.be.closeTo(30 / MW.SiO2 / (20 / 92.2), 0.001);
    });
  });

  describe('standard materials data', () => {
    var standard = fs.readFileSync(__dirname + '/../../materials.json', 'utf8')
      .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    var byName = {};
    standard.forEach((material) => byName[material.name] = material);

    it('should store weights and unity formulas that agree with each formula and LOI', () => {
      standard.forEach((material) => {
        var weights = chemistry.materialWeights(material);
        expect(weights.warnings, material.name).to.eql([]);
        expect(material.equivalent, material.name).to.be.closeTo(weights.equivalent, 0.01);
        expect(material.formulaweight, material.name)
          .to.be.closeTo(material.equivalent * (1 - material.loi / 100), 0.01);
        material.fields.forEach((field) => {
          expect(field.amountUnity, material.name + ' ' + field.name)
            .to.be.closeTo(weights.unity[field.name], 1e-4);
        });
      });
    });

    it('should match theoretical materials for a dolomite and talc glaze', () => {
      var fromData = calculateUMF([
        { material: byName.Orthoclase, amount: 40 },
        { material: byName.Silica, amount: 20 },
        { material: byName.Whiting, amount: 10 },
        { material: byName.Dolomite, amount: 20 },
        { material: byName.Talc, amount: 5 },
        { material: byName['China Clay'], amount: 10 }
      ]);
      var theoretical = calculateUMF({
        'Potash Feldspar': 40, Silica: 20, Whiting: 10, Dolomite: 20, Talc: 5, Kaolin: 10
      });
      Object.keys(theoretical.umf).forEach((oxide) => {
        expect(fromData.umf[oxide], oxide).to.be.closeTo(theoretical.umf[oxide], 0.001);
      });
    });

    it('should include phosphorus in bone ash', () => {
      var weights = chemistry.materialWeights(byName['Bone Ash']);
      expect(weights.unity.P2O5).to.be.closeTo(1 / 3, 1e-4);
      expect(weights.loi).to.eql(0);
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
      var bad = { name: 'Typo', analysis: { Si02: 100 } };
      expect(() => calculateUMF([{ material: bad, amount: 1 }])).to.throw(/Unknown oxide/);
    });

    it('should reject negative or non-numeric amounts', () => {
      expect(() => calculateUMF({ Whiting: -5 })).to.throw(/Invalid amount/);
      expect(() => calculateUMF({ Whiting: 'lots' })).to.throw(/Invalid amount/);
    });
  });
});
