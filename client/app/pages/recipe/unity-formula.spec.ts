import { TestBed } from '@angular/core/testing';
import { text } from '../../testing/test-providers';
import { UnityFormula, silicaAluminaRatio, unityColumns } from './unity-formula';

describe('unityColumns', () => {
  it('groups oxides into fluxes, stabilizers, glass formers and wildcards', () => {
    const columns = unityColumns({ K2O: 0.3, CaO: 0.7, Al2O3: 0.4, B2O3: 0.2, SiO2: 3.5, Fe2O3: 0.05, TiO2: 0.1 });
    expect(columns.map((c) => c.title)).toEqual(['Fluxes - RO', 'Stabilizers - R₂O₃', 'Glass Formers - RO₂', 'Wildcards']);
    expect(columns[0].oxides.map((o) => o.label)).toEqual(['K₂O', 'CaO']);
    expect(columns[1].oxides.map((o) => o.label)).toEqual(['Al₂O₃', 'B₂O₃']);
    expect(columns[2].oxides.map((o) => o.label)).toEqual(['SiO₂']);
    expect(columns[3].oxides.map((o) => o.label)).toEqual(['Fe₂O₃', 'TiO₂']);
  });

  it('lists colorant fluxes such as FeO with the fluxes they count toward', () => {
    expect(unityColumns({ CaO: 0.9, FeO: 0.1 })[0].oxides.map((o) => o.label)).toEqual(['CaO', 'FeO']);
  });

  it('skips zero amounts and leaves out an empty wildcard column', () => {
    const columns = unityColumns({ CaO: 1, SiO2: 3, PbO: 0 });
    expect(columns).toHaveLength(3);
    expect(columns[0].oxides.map((o) => o.label)).toEqual(['CaO']);
  });
});

describe('silicaAluminaRatio', () => {
  it('prefers the saved ratio', () => {
    expect(silicaAluminaRatio({ uList: { SiO2: 3, Al2O3: 0.3 }, siAlRatio: 9.5 })).toBe(9.5);
  });

  it('works it out for recipes saved before the ratio was stored', () => {
    expect(silicaAluminaRatio({ uList: { SiO2: 3, Al2O3: 0.3 } })).toBeCloseTo(10);
  });

  it('is null without alumina', () => {
    expect(silicaAluminaRatio({ uList: { SiO2: 3, CaO: 1 } })).toBeNull();
  });
});

describe('UnityFormula', () => {
  it('shows each oxide to three places and the ratio to two', async () => {
    const fixture = TestBed.createComponent(UnityFormula);
    fixture.componentRef.setInput('analysis', { uList: { CaO: 1, Al2O3: 0.3, SiO2: 3.14159 } });
    await fixture.whenStable();
    const shown = text(fixture);
    expect(shown).toContain('CaO : 1.000');
    expect(shown).toContain('SiO₂ : 3.142');
    expect(shown).toContain('Ratio of Silica to Alumina : 10.47');
  });
});
