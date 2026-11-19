// The core's chemistry on its own (lib/core/chemistry), with records that have ids and no names:
// what Glaze Vault and any other host see. Its host has the catalog's tables and the core's own readers: a
// record's id is its identity and its label. Glazecalc's host (lib/chemistry/host.js) is passed only by
// Glazecalc's calls.
import { expect } from 'chai';
import type { Host } from '../../lib/core/index.ts';
import * as chemistry from '../../lib/core/chemistry/index.ts';
import { OXIDES, CONES, LIMITS, STULL, DENSITIES, EXPANSION, POLICY } from '../../lib/catalog/index.ts';

const HOST: Host = {
  oxides: OXIDES,
  cones: CONES,
  limits: LIMITS,
  stull: STULL,
  densities: DENSITIES,
  expansion: EXPANSION,
  policy: POLICY
};

describe('the core chemistry, nameless', () => {
  const silica = { id: 7, formula: { SiO2: 1 } };
  const whiting = { id: 'w-1', formula: { CaO: 1, CO2: 1 } };

  it('works out a unity formula from records with ids and no names', () => {
    const result = chemistry.calculateUMF(HOST, [
      { material: silica, amount: 30 },
      { material: whiting, amount: 20 }
    ]);
    expect(result.umf.CaO).to.be.closeTo(1, 1e-12);
    expect(result.umf.SiO2).to.be.closeTo(30 / 60.083 / (20 / 100.086), 1e-3);
    expect(result).to.not.have.property('warnings');
    expect(result.warningCodes).to.deep.equal([]);
  });

  it('puts ids, never words, in its problems and warnings', () => {
    try {
      chemistry.prepareMaterial(HOST, { id: 'x9', analysis: { Xx2O: 1 } });
      expect.fail('no problem');
    } catch (e) {
      const error = e as Error & { code: string; params: object };
      expect(error.message).to.equal('unknown-oxide');
      expect(error.params).to.deep.equal({ oxide: 'Xx2O', material: 'x9' });
    }
    const odd = chemistry.prepareMaterial(HOST, { id: 3, analysis: { SiO2: 50 } });
    expect(odd.id).to.equal(3);
    expect(odd.warningCodes).to.deep.equal([{ code: 'analysis-total', params: { material: 3, total: 50 } }]);
  });

  it('names the colorants by their oxides, as a list', () => {
    const iron = { id: 'fe', analysis: { FeO: 60, SiO2: 40 } };
    const result = chemistry.calculateUMF(HOST, [{ material: iron, amount: 100 }]);
    expect(result.warningCodes.find((w: { code: string }) => w.code === 'colorant-flux')?.params).to.deep.equal({
      oxides: ['FeO']
    });
  });

  it('needs an identity, and finds a reference only through the host', () => {
    expect(() => chemistry.prepareMaterial(HOST, { formula: { SiO2: 1 } })).to.throw('no-name');
    expect(() => chemistry.calculateUMF(HOST, [{ material: 'anything', amount: 1 }])).to.throw('unknown-material');
    const found = chemistry.calculateUMF(HOST, [{ material: 'ref-1', amount: 1 }], {
      lookup: (reference: string) => (reference === 'ref-1' ? chemistry.prepareMaterial(HOST, whiting) : undefined)
    });
    expect(found.umf.CaO).to.be.closeTo(1, 1e-12);
  });
});
