import { TestBed } from '@angular/core/testing';
import { Additive, Material } from '../core/models';
import { text } from '../testing/test-providers';
import { StandardList } from './standard-list';

const record = (name: string, extra: Partial<Material> = {}): Material => ({
  _id: name,
  name,
  percentmole: 'percent',
  loi: 0,
  fields: [{ name: 'SiO2', amount: '100' }],
  ...extra
});

const RECORDS: Array<Material | Additive> = [
  record('Silica', { category: 'silica', source: { name: 'Theoretical formula', kind: 'theoretical' } }),
  record('Custer Spar', {
    category: 'feldspar',
    region: ['US'],
    status: 'discontinued',
    statusSince: '2023',
    substitutes: ['G-200 EU Feldspar', 'Mahavir Potash Feldspar'],
    source: { name: 'Pacer data sheet', url: 'https://example.com/custer.pdf', date: '2005-03', kind: 'manufacturer' }
  }),
  record('Grolleg China Clay', { category: 'clay', region: ['UK'], aliases: ['Grolleg'], hazards: 'Contains quartz.' }),
  { _id: 'z', name: 'Stain (proprietary)', category: 'colorant', noChemistry: true, fields: [] }
];

describe('StandardList', () => {
  beforeEach(() => localStorage.clear());

  const create = async (records = RECORDS) => {
    const fixture = TestBed.createComponent(StandardList);
    fixture.componentRef.setInput('records', records);
    fixture.componentRef.setInput('noun', 'materials');
    await fixture.whenStable();
    const names = () =>
      [...fixture.nativeElement.querySelectorAll('tbody tr td:first-child')].map((td: Element) =>
        td.firstChild?.textContent?.trim()
      );
    const set = async (label: string, value: string) => {
      const control = [...fixture.nativeElement.querySelectorAll('.standard-tools label')]
        .find((l: Element) => l.textContent?.trim() === label)!
        .parentElement!.querySelector('input, select') as HTMLInputElement | HTMLSelectElement;
      control.value = value;
      control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
      await fixture.whenStable();
    };
    return { fixture, names, set };
  };

  it('lists every record in name order, with a count', async () => {
    const { fixture, names } = await create();
    expect(names()).toEqual(['Custer Spar', 'Grolleg China Clay', 'Silica', 'Stain (proprietary)']);
    expect(text(fixture, '.standard-count')).toBe('Showing 4 of 4 materials');
  });

  it('filters by name or other name, by kind, and by region', async () => {
    const { names, set } = await create();
    await set('Filter', 'grolleg');
    expect(names()).toEqual(['Grolleg China Clay']);
    await set('Filter', '');
    await set('Kind', 'feldspar');
    expect(names()).toEqual(['Custer Spar']);
    await set('Kind', '');
    // UK: UK records and general ones, not US-only ones; remembered for next time.
    await set('Sold in', 'UK');
    expect(names()).toEqual(['Grolleg China Clay', 'Silica', 'Stain (proprietary)']);
    expect(localStorage.getItem('region')).toBe('UK');
  });

  it('shows the region chosen last as chosen, not just filtered by', async () => {
    localStorage.setItem('region', 'UK');
    const { fixture, names } = await create();
    const select = [...fixture.nativeElement.querySelectorAll('.standard-tools select')].find((s: HTMLSelectElement) =>
      [...s.options].some((o) => o.value === 'UK')
    ) as HTMLSelectElement;
    expect(select.value).toBe('UK');
    expect(names()).toEqual(['Grolleg China Clay', 'Silica', 'Stain (proprietary)']);
  });

  it('says what a current record is like and what it replaces', async () => {
    const { fixture } = await create([
      record('G-200 EU Feldspar', {
        status: 'current',
        substitutes: ['Mahavir Potash Feldspar'],
        replaces: ['Custer Spar']
      })
    ]);
    expect(text(fixture, 'tbody')).toContain('Similar: Mahavir Potash Feldspar');
    expect(text(fixture, 'tbody')).toContain('Replaces: Custer Spar');
    expect(text(fixture, 'tbody')).not.toContain('Use instead');
  });

  it('marks what is no longer current, says what to use, and links the source', async () => {
    const { fixture } = await create();
    const custer = [...fixture.nativeElement.querySelectorAll('tbody tr')][0] as HTMLElement;
    expect(custer.querySelector('.status-badge')?.textContent?.trim()).toBe('Discontinued 2023');
    expect(custer.textContent).toContain('Use instead: G-200 EU Feldspar, Mahavir Potash Feldspar');
    const link = custer.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Pacer data sheet');
    expect(link.getAttribute('href')).toBe('https://example.com/custer.pdf');
    expect(custer.textContent).toContain('(2005-03)');
    expect(text(fixture, 'details')).toContain('Contains quartz.');
    expect(text(fixture, 'tbody')).toContain('No chemistry: left out of the unity formula');
  });
});
