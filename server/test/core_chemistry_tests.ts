// The core's chemistry on its own (lib/core/chemistry), with records that have ids and no names:
// what Glaze Vault and any other host see.
import { expect } from 'chai';
import identity from '../../lib/core/identity.js';
import materials from '../../lib/core/chemistry/materials.js';
import umf from '../../lib/core/chemistry/umf.js';

describe('the core chemistry, nameless', () => {
  // The app sets names as the identity (lib/chemistry/messages.js); these tests read ids, and put the
  // app's back after.
  let restore: () => void;
  before(() => {
    const appIdOf = (record: { name?: string }) => record.name;
    identity.setIdOf((record: { id?: unknown }) => record.id);
    identity.setLabelOf((record: { id?: unknown }) => record.id);
    restore = () => {
      identity.setIdOf(appIdOf);
      identity.setLabelOf(appIdOf);
    };
  });
  after(() => restore());

  const silica = { id: 7, formula: { SiO2: 1 } };
  const whiting = { id: 'w-1', formula: { CaO: 1, CO2: 1 } };

  it('works out a unity formula from records with ids and no names', () => {
    const result = umf.calculateUMF([
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
      materials.prepareMaterial({ id: 'x9', analysis: { Xx2O: 1 } });
      expect.fail('no problem');
    } catch (e) {
      const error = e as Error & { code: string; params: object };
      expect(error.message).to.equal('unknown-oxide');
      expect(error.params).to.deep.equal({ oxide: 'Xx2O', material: 'x9' });
    }
    const odd = materials.prepareMaterial({ id: 3, analysis: { SiO2: 50 } });
    expect(odd.id).to.equal(3);
    expect(odd.warningCodes).to.deep.equal([{ code: 'analysis-total', params: { material: 3, total: 50 } }]);
  });

  it('names the colorants by their oxides, as a list', () => {
    const iron = { id: 'fe', analysis: { FeO: 60, SiO2: 40 } };
    const result = umf.calculateUMF([{ material: iron, amount: 100 }]);
    expect(result.warningCodes.find((w: { code: string }) => w.code === 'colorant-flux')?.params).to.deep.equal({
      oxides: ['FeO']
    });
  });

  it('needs an identity, and finds a reference only through the host', () => {
    expect(() => materials.prepareMaterial({ formula: { SiO2: 1 } })).to.throw('no-name');
    expect(() => umf.calculateUMF([{ material: 'anything', amount: 1 }])).to.throw('unknown-material');
    const found = umf.calculateUMF([{ material: 'ref-1', amount: 1 }], {
      lookup: (reference: string) => (reference === 'ref-1' ? materials.prepareMaterial(whiting) : undefined)
    });
    expect(found.umf.CaO).to.be.closeTo(1, 1e-12);
  });
});
