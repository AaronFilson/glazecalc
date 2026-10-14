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
  TestBed.inject(PreferencesService).remember('region', region);
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

// Japan (docs/asia-plan.md, Phase C): the law's own units and words, in English for now.
describe('Japan', () => {
  it('gives the control concentration as a formula, the value for all free silica, JSOH and the mask classes', async () => {
    const { element, text, rows } = await create(SilicaLimit, 'JP');
    expect(text('caption')).toBe(
      'The yardstick for respirable crystalline silica in the air of a work area in Japan (checked October 13, 2026)'
    );
    expect(rows()).toEqual([
      ['Control concentration, where Q is the free silica in the dust, in %', '3.0 / (1.19Q + 1) mg/m³'],
      ['Control concentration for dust that is all free silica', '0.025 mg/m³'],
      ['Recommended by JSOH', '0.03 mg/m³']
    ]);
    const paragraphs = [...element.querySelectorAll('p')].map((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(paragraphs[0]).toContain('A control concentration (管理濃度)');
    expect(paragraphs[0]).toContain('not a limit on what one person breathes');
    expect(paragraphs[0]).toContain('Set by 作業環境評価基準（昭和63年労働省告示第79号）別表.');
    expect(paragraphs[0]).not.toContain('EU');
    expect(paragraphs[1]).toBe(
      'JSOH (Japan Society for Occupational Health) recommends this value in its Recommendation of Occupational Exposure Limits (2025–2026). It is not law.'
    );
    expect(paragraphs[2]).toContain(
      'Dust masks here are sold by class: DS2 or RS2 for glaze dust, or DS3 or RS3 for more protection'
    );
    expect(paragraphs[2]).toContain('国家検定');
    const links = [...element.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('https://www.jaish.gr.jp/horei/hor1-18/hor1-18-2-1-2.html');
    expect(links).toContain('https://www.sanei.or.jp/english/files/topics/oels/oel_en_2025.pdf');
    expect(links).toContain('https://www.mhlw.go.jp/content/11201000/000587014.pdf');
    expect(links).toContain('https://anzeninfo.mhlw.go.jp/anzen/gmsds/14808-60-7.html');
  });

  it("gives the ceramic limits in the law's units, at most, with what cooking ware means", async () => {
    const { text, rows } = await create(FoodLimits, 'JP');
    expect(rows()).toEqual([
      ['Pieces that cannot be filled, or less than 2.5 cm deep', '8 µg/cm²', '0.7 µg/cm²'],
      ['Other pieces under 1.1 L, not for cooking', '2 µg/mL', '0.5 µg/mL'],
      ['Other pieces from 1.1 L to under 3 L, not for cooking', '1 µg/mL', '0.25 µg/mL'],
      ['Other pieces of 3 L or more, not for cooking', '0.5 µg/mL', '0.25 µg/mL'],
      ['Cooking ware, 2.5 cm deep or more', '0.5 µg/mL', '0.05 µg/mL']
    ]);
    const paragraph = text('p');
    expect(paragraph).toContain('Set by 食品、添加物等の規格基準（昭和34年厚生省告示第370号）第3 D.');
    expect(paragraph).toContain('A piece passes if it releases no more than the limit');
    expect(paragraph).toContain('sake warmers (tokkuri) and chawanmushi cups');
    expect(paragraph).not.toContain("The EU's rules apply here.");
  });

  it('lists shops by their own names, and none with a town not read on its pages', async () => {
    const { rows } = await create(ShopList, 'JP');
    expect(rows().map((row) => row[0])).toEqual([
      '陶芸百貨店' + '埼玉県上尾市',
      '丸二陶料',
      'ヤマニファーストセラミック' + '島根県松江市'
    ]);
    expect(rows()[1]![2]).toBe('1 kg, 25 kg, and 30 kg');
  });
});

// Türkiye (docs/asia-plan.md): its law's own formula and names, in English for now.
describe('Türkiye', () => {
  it("gives the binding limit as the law's formula, the values for all quartz and all cristobalite, and FFP classes", async () => {
    const { element, text, rows } = await create(SilicaLimit, 'TR');
    expect(text('caption')).toBe(
      'The workplace limit for respirable crystalline silica in Türkiye, an 8-hour average (checked October 14, 2026)'
    );
    expect(rows()).toEqual([
      ['Limit for respirable quartz, where Q is the silica (SiO₂) in the dust, in %', '10 / (Q + 2) mg/m³'],
      ['Quartz, for dust that is all quartz', '0.098 mg/m³'],
      ['Cristobalite, for dust that is all cristobalite', '0.049 mg/m³']
    ]);
    const paragraphs = [...element.querySelectorAll('p')].map((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(paragraphs[0]).toContain('A binding limit.');
    expect(paragraphs[0]).toContain('Set by Tozla Mücadele Yönetmeliği (RG 05.11.2013/28812), Ek-1.');
    expect(paragraphs[0]).toContain("Türkiye has not adopted the EU's binding limit (Directive (EU) 2017/2398).");
    expect(paragraphs[0]).toContain('Tridymite has the same limit as cristobalite');
    // Not an EU member state: no comparison with the EU's limit.
    expect(paragraphs[0]).not.toContain('Lower than');
    expect(paragraphs[0]).not.toContain('The same as');
    expect(paragraphs[1]).toContain(
      'Dust masks here are sold by class: FFP2 for glaze dust, or FFP3 for more protection'
    );
    expect(paragraphs[1]).toContain('Regulation (EU) 2016/425');
    expect(paragraphs[2]).toContain(
      'Çalışma ve Sosyal Güvenlik Bakanlığı, İş Sağlığı ve Güvenliği Genel Müdürlüğü (ÇSGB İSGGM)'
    );
    const links = [...element.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=18989&MevzuatTur=7&MevzuatTertip=5');
    expect(links).toContain('https://www.resmigazete.gov.tr/eskiler/2019/05/20190501-5.htm');
    expect(links).toContain('https://csgb.gov.tr/');
  });

  it("gives the Tebliğ's limits in the directive's units, with its rule for three samples", async () => {
    const { text, rows } = await create(FoodLimits, 'TR');
    expect(rows()).toHaveLength(3);
    expect(rows()[0]).toEqual(expect.arrayContaining(['0.8 mg/dm²', '0.07 mg/dm²']));
    const paragraph = text('p');
    expect(paragraph).toContain(
      'Set by Türk Gıda Kodeksi Gıda ile Temas Eden Seramik Malzemeler Tebliği (Tebliğ No: 2012/30).'
    );
    expect(paragraph).toContain('At least three samples are tested');
    expect(paragraph).not.toContain("The EU's rules apply here.");
    expect(paragraph).not.toContain('no more than the limit');
  });

  it('lists three shops, and no town or pack size not read on their pages', async () => {
    const { rows } = await create(ShopList, 'TR');
    expect(rows().map((row) => row[0])).toEqual([
      'Pega Seramik' + 'Tuzla (İstanbul)',
      'Tecnodieci Shopping' + 'Bozüyük (Bilecik)',
      'Seramiksir'
    ]);
    expect(rows()[0]![2]).toBe('250 g, 500 g, and 1 kg');
  });
});
