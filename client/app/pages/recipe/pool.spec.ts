import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { Selection } from '../../../../lib/chemistry';
import { RecipeMaterial } from '../../core/models';
import { provideEnglish } from '../../testing/i18n';
import { LibraryMaterial } from './compare';
import { explain, recipeFrom, suggestable } from './pool';

const material = (name: string, info: Partial<LibraryMaterial> = {}): LibraryMaterial => ({
  _id: name,
  name,
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: 'SiO2', amount: 1 }],
  ...info
});

// What each material supplies, and what changed, are messages.
beforeEach(() => {
  TestBed.configureTestingModule({ providers: provideEnglish() });
  TestBed.inject(TranslocoService);
});

const line = (name: string, start: number, info: Partial<RecipeMaterial> = {}) => ({
  material: { ...material(name), amount: start ? String(start) : '', ...info } as RecipeMaterial,
  start
});
const selection = (amounts: number[], extra: Partial<Selection> = {}): Selection => ({
  amounts,
  moles: {},
  miss: 0.2,
  best: 0.1,
  chosen: amounts.map((_, i) => i).filter((i) => amounts[i] > 0),
  unreachable: [],
  contributions: [],
  unused: [],
  alike: [],
  capped: [],
  countCost: 0,
  ...extra
});

describe('what a substitution may offer, and how it explains itself', () => {
  it('offers current materials sold in the region, not soluble, fluorine, formula-only or lead ones', () => {
    const offered = (info: Partial<LibraryMaterial>, allowLead = false) =>
      suggestable(material('M', info), { region: 'US', allowLead });
    expect(offered({})).toBe(true);
    expect(offered({ status: 'discontinued' })).toBe(false);
    expect(offered({ region: ['UK'] })).toBe(false);
    expect(offered({ soluble: true })).toBe(false);
    expect(offered({ fluorine: true })).toBe(false);
    expect(offered({ category: 'feldspar', source: { name: 'formula', kind: 'theoretical' } })).toBe(false);
    const lead = { fields: [{ name: 'PbO', amount: 1 }] };
    expect(offered(lead)).toBe(false);
    expect(offered(lead, true)).toBe(true);
  });

  it('says what each material supplies, whether it is needed, and what else could have helped', () => {
    const lines = [line('Feldspar', 0), line('Whiting', 20), line('Silica', 30), line('Redart', 0)];
    const report = explain(
      selection([33.12, 20, 24, 0], {
        contributions: [
          {
            index: 0,
            supplies: [
              { oxide: 'K2O', share: 1 },
              { oxide: 'Al2O3', share: 0.71 }
            ],
            missWithout: 9
          },
          { index: 1, supplies: [{ oxide: 'CaO', share: 0.8 }], missWithout: 0.25 },
          { index: 2, supplies: [{ oxide: 'SiO2', share: 0.12 }], missWithout: 3 }
        ],
        unused: [{ index: 3, helps: 0.1 }],
        alike: [{ used: 0, other: 3 }],
        capped: [{ index: 1, most: 15.464, wouldBe: 24, missLifted: 0.1 }]
      }),
      lines,
      1
    );
    expect(report.uses).toEqual([
      {
        name: 'Feldspar',
        amount: '33.1',
        supplies: 'all the potash and 71% of the alumina',
        needed: true,
        fixed: false
      },
      { name: 'Whiting', amount: '20', supplies: 'most of the calcium', needed: false, fixed: false },
      { name: 'Silica', amount: '24', supplies: '12% of the silica', needed: true, fixed: false }
    ]);
    expect(report.couldHelp).toEqual([{ name: 'Redart', helps: 0.1 }]);
    expect(report.alike).toEqual([{ used: 'Feldspar', other: 'Redart' }]);
    // As percents of the batch, 77.12 here.
    expect(report.capped).toHaveLength(1);
    expect(report.capped[0]).toMatchObject({ name: 'Whiting', members: ['Whiting'] });
    expect(report.capped[0].most).toBeCloseTo(20.05, 1);
    expect(report.capped[0].wouldBe).toBeCloseTo(31.1, 1);
  });

  it('turns a selection into recipe lines: unchanged text kept, new and dropped materials said', () => {
    const lines = [line('Whiting', 20), line('Silica', 40), line('Feldspar', 0), line('Frit', 55, { amount: '' })];
    const replacements = new Set(['Silica']);
    const made = recipeFrom(
      selection([20, 0, 33.08, 50]),
      [...lines.slice(0, 3), { ...lines[3], added: true }],
      replacements,
      1
    );
    expect(made.materials.map((m) => [m.name, m.amount])).toEqual([
      ['Whiting', '20'],
      ['Feldspar', '33.1'],
      ['Frit', '50']
    ]);
    // A replacement the fit has no use for is "not needed"; a material in place of the lead is new.
    expect(made.unused).toEqual(['Silica']);
    expect(made.changes).toEqual(['Feldspar 33.1, new', 'Frit 50, new']);
  });
});
