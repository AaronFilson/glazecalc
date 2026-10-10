import { TestBed } from '@angular/core/testing';
import { PreferencesService } from '../../core/preferences.service';
import { answer, httpMock, settle, testProviders } from '../../testing/test-providers';
import { LocalEquivalents } from './local-equivalents';

// Feldspars as analyses (weight %), as the library keeps them.
const feldspar = (name: string, region: string[], k: number, na: number, extra: object = {}) => ({
  _id: name,
  name,
  category: 'feldspar',
  region,
  percentmole: 'percent',
  loi: 0.3,
  fields: [
    { name: 'SiO2', amount: String(68 - (k - 10)) },
    { name: 'Al2O3', amount: '18' },
    { name: 'K2O', amount: String(k) },
    { name: 'Na2O', amount: String(na) }
  ],
  ...extra
});

describe('LocalEquivalents', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async (region: string) => {
    TestBed.inject(PreferencesService).region.set(region);
    const fixture = TestBed.createComponent(LocalEquivalents);
    await fixture.whenStable();
    answer('/materials/getStandard', [
      feldspar('Custer Spar', ['US'], 10, 3, { status: 'discontinued', statusSince: '2023' }),
      feldspar('Kalifeldspat (Bodmer 537)', ['EU'], 10.5, 2.8),
      feldspar('Feldspath potassique FP325 (Ceradel)', ['EU'], 9, 3.5),
      feldspar('Natronfeldspat LF 90', ['EU'], 0.5, 10),
      // Sold in the EU too, so not listed for a potter there.
      feldspar('FFF Feldspar', ['UK', 'EU'], 8, 3),
      feldspar('Soda Feldspar (UK)', ['UK'], 0.4, 10.5),
      {
        _id: 'w',
        name: 'Whiting',
        category: 'flux',
        percentmole: 'molecular',
        loi: 44,
        fields: [{ name: 'CaO', amount: '1' }]
      }
    ]);
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const rows = () =>
      [...element.querySelectorAll('tbody tr')]
        .filter((row) => row.querySelectorAll('td').length)
        .map((row) => [...row.children].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim()));
    return { fixture, element, rows };
  };

  it('lists what a potter in the EU cannot buy there, each with the closest that they can, by chemistry', async () => {
    const { element, rows } = await create('DE');
    expect(element.querySelector('caption')?.textContent).toContain(
      'Materials not sold in the EU, each with the closest sold there'
    );
    expect(element.querySelector('.equivalents-kind')?.textContent).toContain('Feldspars and stones');
    const [custer, soda] = rows();
    expect(custer![0]).toBe('Custer Spar (Discontinued 2023)');
    expect(custer![1]).toBe('US');
    // The two closest, nearest first, with how far apart they are.
    expect(custer![2]).toMatch(
      /^Kalifeldspat \(Bodmer 537\) \(differs by 1,2 g per 100 g\) ?Feldspath potassique FP325 \(Ceradel\) \(differs/
    );
    expect(soda![0]).toBe('Soda Feldspar (UK)');
    expect(soda![2]).toMatch(/^Natronfeldspat LF 90 /);
    expect(rows().map((row) => row[0])).not.toContain('FFF Feldspar');
  });

  it('says when nothing sold there is close, and follows another country chosen', async () => {
    const { fixture, element, rows } = await create('US');
    expect(element.querySelector('caption')?.textContent).toContain('Materials not sold in the US');
    // From the US, the EU's and UK's feldspars are the ones listed, against Custer, which is no longer current.
    expect(rows().map((row) => row[0])).toContain('Kalifeldspat (Bodmer 537)');
    expect(rows().find((row) => row[0] === 'Natronfeldspat LF 90')?.[2]).toBe(
      'Nothing within 15 g per 100 g: compare by chemistry.'
    );
    const select = element.querySelector('select') as HTMLSelectElement;
    select.value = 'GB';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(element.querySelector('caption')?.textContent).toContain('Materials not sold in the UK');
  });
});
