import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { Additive, Material } from '../../core/models';
import { provideEnglish } from '../../testing/i18n';
import { pastLimits, rawClayPercent, sizeNotes } from './checks';

const material = (name: string, info: Partial<Material> = {}): Material => ({
  name,
  percentmole: 'molecular',
  loi: 0,
  fields: [],
  ...info
});
const line = (name: string, amount: number, info: Partial<Material> = {}) => ({
  material: material(name, info),
  amount
});
const additive = (name: string, oxide: string): Additive => ({
  name,
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: oxide, amount: '1' }],
  amount: '2',
  unit: 'percent'
});
const BASE = [line('Frit', 80, { category: 'frit' }), line('Kaolin', 20, { category: 'clay' })];
const GLOSSY = { CaO: 0.7, Na2O: 0.15, K2O: 0.15, Al2O3: 0.3, B2O3: 0.5, SiO2: 3 };

// The warnings are messages.
beforeEach(() => {
  TestBed.configureTestingModule({ providers: provideEnglish() });
  TestBed.inject(TranslocoService);
});

describe('saying what is past a limit', () => {
  it('says nothing for a glaze within every limit', () => {
    expect(pastLimits({ lines: BASE, unity: GLOSSY, celsius: 1060 })).toEqual([]);
  });

  it('words boron past the low-fire limits in two strengths', () => {
    const [tends] = pastLimits({ lines: BASE, unity: { ...GLOSSY, B2O3: 0.9 }, celsius: 1060 });
    expect(tends).toContain('more boron (0.90) than most cone 06-04 glazes');
    expect(tends).toContain('tends to melt early and run');
    const [likely] = pastLimits({ lines: BASE, unity: { ...GLOSSY, B2O3: 1.1 }, celsius: 1060 });
    expect(likely).toContain('will probably melt early and run');
    // Thin on alumina, it is likely sooner.
    const [thin] = pastLimits({ lines: BASE, unity: { ...GLOSSY, B2O3: 0.85, Al2O3: 0.12 }, celsius: 1060 });
    expect(thin).toContain('will probably');
  });

  it('uses the limits for the firing: what is fine at cone 04 is a lot of boron at cone 6', () => {
    const unity = { ...GLOSSY, B2O3: 0.4 };
    expect(pastLimits({ lines: BASE, unity, celsius: 1060 })).toEqual([]);
    const [mid] = pastLimits({ lines: BASE, unity, celsius: 1222 });
    expect(mid).toContain('a lot of boron for cone 6');
    // Too little boron to melt at low fire.
    const [under] = pastLimits({ lines: BASE, unity: { ...GLOSSY, B2O3: 0.3 }, celsius: 1060 });
    expect(under).toContain('less boron (0.30) than glazes usually need at this firing (about 0.48)');
  });

  it('says only what is new or worse than the old recipe', () => {
    const unity = { ...GLOSSY, B2O3: 0.9 };
    expect(pastLimits({ lines: BASE, unity, old: unity, celsius: 1060 })).toEqual([]);
    expect(pastLimits({ lines: BASE, unity, old: { ...unity, B2O3: 0.6 }, celsius: 1060 })).toHaveLength(1);
  });

  it('warns of raw whiting at low fire, as the app’s own guideline', () => {
    const lines = [...BASE, line('Whiting', 8)];
    const [whiting] = pastLimits({ lines, unity: GLOSSY, celsius: 1060 });
    expect(whiting).toContain('At 7% it tends to pinhole');
    expect(whiting).toContain("5% is this app's guideline");
    expect(pastLimits({ lines, unity: { ...GLOSSY, B2O3: 0.2 }, celsius: 1222 })).toEqual([]);
  });

  it('warns of zinc with chrome, iron or copper, and below cone 03', () => {
    const unity = { ...GLOSSY, ZnO: 0.1 };
    const chrome = pastLimits({ lines: BASE, unity, celsius: 1186, additives: [additive('Chromium Oxide', 'Cr2O3')] });
    expect(chrome.some((w) => w.startsWith('Zinc turns chrome greens brown'))).toBe(true);
    const low = pastLimits({ lines: BASE, unity, celsius: 1060 });
    expect(low.some((w) => w.startsWith('Below about cone 03, zinc'))).toBe(true);
  });

  it('warns of soluble and fluorine materials, a frit doing the wrong job, and clay out of range', () => {
    const lines = [
      line('Calcium borate frit', 60, { category: 'frit', fritRole: 'boron' }),
      line('Borax', 10, { soluble: true }),
      line('Fluorspar', 5, { fluorine: true }),
      line('Kaolin', 25, { category: 'clay' })
    ];
    const warnings = pastLimits({ lines, unity: GLOSSY });
    expect(warnings.some((w) => w.startsWith('Borax dissolves in water'))).toBe(true);
    expect(warnings.some((w) => w.startsWith('Fluorspar and cryolite release fluorine'))).toBe(true);
    expect(warnings.some((w) => w.startsWith('A calcium borate frit is normally a small boron top-up'))).toBe(true);
    expect(warnings.some((w) => w.startsWith('Over 20% raw clay (25%)'))).toBe(true);
    const bare = pastLimits({ lines: [line('Frit', 100, { category: 'frit' })], unity: GLOSSY, oldClay: 20 });
    expect(bare.some((w) => w.startsWith('This has no raw clay; the old recipe had 20%.'))).toBe(true);
  });

  it('says how the expansion moves against the old recipe', () => {
    const at = (was: number, now: number) => pastLimits({ lines: BASE, unity: GLOSSY, expansion: { was, now } });
    expect(at(6.5, 6.6)).toEqual([]);
    expect(at(6.5, 6.8)[0]).toContain('this one may craze');
    expect(at(6.5, 7.2)[0]).toContain('this one will probably craze');
    expect(at(7.0, 6.2)[0]).toContain('can shiver');
  });

  it('notes many materials and amounts too small to weigh well', () => {
    const many = Array.from({ length: 8 }, (_, i) => line('M' + i, i === 0 ? 0.5 : 14));
    const notes = sizeNotes(many);
    expect(notes[0]).toContain('This recipe has 8 base materials');
    expect(notes.some((n) => n.startsWith('M0 is 0.5% of the batch'))).toBe(true);
    expect(sizeNotes(BASE)).toEqual([]);
    expect(
      rawClayPercent([
        { name: 'Kaolin', category: 'clay', amount: '20' },
        { name: 'Frit', amount: '80' }
      ])
    ).toBe(20);
  });
});
