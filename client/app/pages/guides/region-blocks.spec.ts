import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PreferencesService } from '../../core/preferences.service';
import { testProviders } from '../../testing/test-providers';
import { FoodLimits } from './food-limits';
import { ShopList } from './shop-list';
import { SilicaLimit } from './silica-limit';

// The parts of the guides drawn from region data (lib/regions): each starts at
// the reader's region and can show another country's.
const create = async (component: Type<unknown>, region: string) => {
  TestBed.inject(PreferencesService).region.set(region);
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const text = (selector: string) => (element.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  // Each row's cells as text; a shop's name and its town are on two lines.
  const rows = () =>
    [...element.querySelectorAll('tbody tr')].map((row) =>
      [...row.children].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
    );
  const choose = async (code: string) => {
    const select = element.querySelector('select') as HTMLSelectElement;
    select.value = code;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  return { element, text, rows, choose };
};

beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: testProviders() });
});

describe('ShopList', () => {
  it("lists shops in the reader's country, linked, with what they sell and the packs seen", async () => {
    const { element, text, rows } = await create(ShopList, 'GB');
    expect(text('caption')).toBe('Some shops selling raw glaze materials in United Kingdom (checked 8 October 2026)');
    const [potterycrafts] = rows();
    expect(potterycrafts![0]).toBe('Potterycrafts' + 'Stoke-on-Trent');
    expect(potterycrafts![1]).toBe('raw glaze materials, frits, oxides and kilns');
    expect(potterycrafts![2]).toBe('1 kg, 5 kg and 25 kg');
    expect(potterycrafts![3]).toContain('Grolleg China Clay P3298');
    expect(element.querySelector('th a')?.getAttribute('href')).toBe(
      'https://potterycrafts.co.uk/collections/raw-materials'
    );
    expect(text('.region-sources')).toContain('potterycrafts.co.uk');
  });

  it('writes packs under a kilogram in grams, and pounds in the US', async () => {
    const { rows, choose } = await create(ShopList, 'GR');
    expect(rows()[0]![2]).toBe('100 g and 500 g');
    await choose('US');
    expect(rows()[0]![2]).toBe('5 lb and 50 lb');
  });

  it("shows a shop's note, and where none sells here, shops elsewhere that say they deliver", async () => {
    const { text, rows, choose } = await create(ShopList, 'DE');
    expect(rows()[0]![3]).toContain('Sells to private buyers in Germany only.');
    await choose('LU');
    expect(text('p')).toBe('We found no shop selling raw glaze materials in Luxembourg.');
    expect(text('caption')).toContain('Shops elsewhere that say they deliver to Luxembourg');
    expect(rows()[0]![0]).toBe("Aux Couleurs d'Argiles" + 'Libramont-Recogne, Belgium');
    // The page that says so is among the sources.
    expect(text('.region-sources')).toContain('auxcouleursdargile.be');
  });
});

describe('SilicaLimit', () => {
  it("gives the reader's limit, what kind it is and what sets it, against the EU's", async () => {
    const { element, text, rows } = await create(SilicaLimit, 'DE');
    // A potter in Germany reads numbers the German way.
    expect(rows()).toEqual([['Quartz and cristobalite', '0,05 mg/m³']]);
    const paragraph = text('p');
    expect(paragraph).toContain('An assessment criterion, not a binding limit.');
    expect(paragraph).toContain('Set by TRGS 559');
    expect(paragraph).toContain("Lower than the EU's binding limit of 0,1 mg/m³.");
    const links = [...element.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('https://www.baua.de/DE/Angebote/Regelwerk/TRGS/TRGS-559');
    expect(links).toContain('https://www.baua.de/DE/Home/Home_node.html');
  });

  it('shows cristobalite where its limit differs, and an action level where there is one', async () => {
    const { text, rows, choose } = await create(SilicaLimit, 'FR');
    expect(rows()).toEqual([
      ['Quartz', '0,1 mg/m³'],
      ['Cristobalite', '0,05 mg/m³']
    ]);
    expect(text('p')).toContain("The same as the EU's binding limit.");
    await choose('US');
    expect(rows()).toEqual([
      ['Quartz and cristobalite', '0,05 mg/m³'],
      ['Action level', '0,025 mg/m³']
    ]);
    expect(text('p')).not.toContain('EU');
  });

  it('leaves out an agency whose page could not be read', async () => {
    const { element } = await create(SilicaLimit, 'PT');
    expect(element.textContent).toContain('Decreto-Lei n.º 301/2000');
    expect(element.textContent).not.toContain('national body for safety at work');
  });
});

describe('FoodLimits', () => {
  it("shows the reader's own rules, in the law's units", async () => {
    const { text, rows } = await create(FoodLimits, 'NL');
    expect(rows()[0]).toEqual(['Pieces that cannot be filled, or no deeper than 25 mm', '6 µg/dm²', '4 µg/dm²']);
    const paragraph = text('p');
    expect(paragraph).toContain('Set by Warenwetregeling verpakkingen en gebruiksartikelen');
    expect(paragraph).toContain('In force from 29 May 2026.');
    expect(paragraph).toContain('may be sold until stocks run out');
  });

  it("falls back to the EU's in a member state without its own, and says where none is known", async () => {
    const { text, rows, choose } = await create(FoodLimits, 'PT');
    expect(text('p')).toContain("The EU's rules apply here.");
    expect(text('p')).toContain('Directive 84/500/EEC');
    expect(rows().map((row) => row[1])).toEqual(['0,8 mg/dm²', '4 mg/L', '1,5 mg/L']);
    await choose('NZ');
    expect(text('p')).toBe('We have not yet confirmed the rules in New Zealand.');
  });

  it('says how a US sample is judged', async () => {
    const { rows } = await create(FoodLimits, 'US');
    expect(rows()[0]).toEqual(['Flatware, no deeper than 25 mm (average of 6 pieces)', '3 µg/mL', '0.5 µg/mL']);
    expect(rows()[2]).toEqual(['Cups and mugs (any one of 6)', '0.5 µg/mL', '0.5 µg/mL']);
  });
});
