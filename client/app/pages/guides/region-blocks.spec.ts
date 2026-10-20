import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { regionFor } from '../../../../lib/regions';
import { NOW } from '../../core/clock';
import { PreferencesService } from '../../core/preferences.service';
import { choosePicked, pickerField } from '../../testing/picker';
import { testProviders } from '../../testing/test-providers';
import { FoodLimits } from './food-limits';
import { PoisonLines } from './poison-lines';
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
    await choosePicked(fixture, pickerField(element), regionFor(code)!.name);
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

// The texts of every paragraph, for checking what is said and what is not.
const paragraphsOf = (element: HTMLElement) =>
  [...element.querySelectorAll('p')].map((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim());

describe('South Korea', () => {
  it('gives 119, says no national poison line was found, and links the health ministry', async () => {
    const { element } = await create(PoisonLines, 'KR');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:119', 'tel:119']);
    const text = (element.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('We could not confirm a public poison line here.');
    expect(text).toContain('Medical advice: 119 emergency medical advice (응급의료상담)');
    expect(text).toContain('We found no national public poison line in South Korea');
    expect(element.querySelector('a[href="https://www.mohw.go.kr/"]')?.textContent).toBe('보건복지부');
  });

  it('gives the exposure standard as an indicative limit, and the 1급 and 특급 dust masks', async () => {
    const { element, rows } = await create(SilicaLimit, 'KR');
    expect(rows()).toEqual([['Quartz and cristobalite', '0.05 mg/m³']]);
    const paragraphs = paragraphsOf(element);
    expect(paragraphs[0]).toContain('An indicative limit');
    expect(paragraphs[0]).toContain('제2020-48호');
    expect(paragraphs[0]).toContain('exposure standard (노출기준)');
    expect(paragraphs[0]).not.toContain('It applies from');
    expect(paragraphs[1]).toContain(
      'Dust masks here are sold by class: 1급 for glaze dust, or 특급 for more protection'
    );
    expect(paragraphs[1]).toContain('not certified dust masks for work');
    expect(paragraphs[2]).toContain('고용노동부 (MoEL)');
  });

  it("gives the ceramic limits in the law's units, with no judging rule", async () => {
    const { element, rows } = await create(FoodLimits, 'KR');
    expect(rows()).toEqual([
      ['Pieces that cannot be filled, or less than 2.5 cm deep', '8 µg/cm²', '0.7 µg/cm²'],
      ['Other pieces that can be filled, under 1.1 L', '2 mg/L', '0.5 mg/L'],
      ['Other pieces that can be filled, from 1.1 L to under 3 L', '1 mg/L', '0.25 mg/L'],
      ['Other pieces that can be filled, 3 L or more', '0.5 mg/L', '0.25 mg/L'],
      ['Cooking ware, for heating food', '0.5 mg/L', '0.05 mg/L']
    ]);
    expect(paragraphsOf(element)[0]).not.toContain('ppm');
  });

  it('lists two shops by their own names', async () => {
    const { rows } = await create(ShopList, 'KR');
    expect(rows().map((row) => row[0])).toEqual(['중앙도재', '클레이어']);
    expect(rows()[0]![3]).toContain('Ask the shop whether an item is in stock before buying.');
  });
});

describe('Taiwan', () => {
  it('gives 119 and the poison centre, linked to dial', async () => {
    const { element } = await create(PoisonLines, 'TW');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:119', 'tel:+886228717121']);
    expect(element.textContent).toContain('24 hours, every day, free');
  });

  it('gives the 2027 limit with the day it applies from, and what applies until then', async () => {
    TestBed.overrideProvider(NOW, { useValue: () => new Date(2026, 11, 31, 23, 59) });
    const { element, rows } = await create(SilicaLimit, 'TW');
    expect(rows()).toEqual([['Quartz and cristobalite', '0.1 mg/m³']]);
    const paragraphs = paragraphsOf(element);
    expect(paragraphs[0]).toContain('A binding limit.');
    expect(paragraphs[0]).toContain('It applies from January 1, 2027.');
    expect(paragraphs[0]).toContain('Until 31 December 2026 an earlier table applies');
    expect(paragraphs[1]).toContain('Dust masks here are sold by class: D2 for glaze dust, or D3 for more protection');
    expect(paragraphs[2]).toContain('勞動部職業安全衛生署');
  });

  it('once the 2027 limit is in force, says neither when it applies from nor what applied before', async () => {
    TestBed.overrideProvider(NOW, { useValue: () => new Date(2027, 0, 1, 0, 1) });
    const { element, rows } = await create(SilicaLimit, 'TW');
    expect(rows()).toEqual([['Quartz and cristobalite', '0.1 mg/m³']]);
    const paragraph = paragraphsOf(element)[0];
    expect(paragraph).toContain('A binding limit.');
    expect(paragraph).not.toContain('It applies from');
    expect(paragraph).not.toContain('Until 31 December 2026');
  });

  it('gives the limits in ppm and µg/cm², and says what ppm means', async () => {
    const { element, rows } = await create(FoodLimits, 'TW');
    expect(rows()).toEqual([
      ['Pieces that cannot be filled, or no more than 2.5 cm deep', '17 µg/cm²', '1.7 µg/cm²'],
      ['Pieces more than 2.5 cm deep, up to 1.1 L', '5 ppm', '0.5 ppm'],
      ['Pieces more than 2.5 cm deep, over 1.1 L', '2.5 ppm', '0.25 ppm']
    ]);
    expect(paragraphsOf(element)[0]).toContain('ppm here is milligrams per litre of the test solution (mg/L).');
  });
});

describe('Singapore', () => {
  it('gives 995, says no public poison line was confirmed, and links the health ministry', async () => {
    const { element } = await create(PoisonLines, 'SG');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:995']);
    expect(element.textContent).toContain('We could not confirm a public poison line here.');
    expect(element.querySelector('a[href="https://www.moh.gov.sg/"]')?.textContent).toBe('Ministry of Health');
  });

  it('gives the binding limits for quartz and cristobalite, and no mask classes', async () => {
    const { element, rows } = await create(SilicaLimit, 'SG');
    expect(rows()).toEqual([
      ['Quartz', '0.1 mg/m³'],
      ['Cristobalite', '0.05 mg/m³']
    ]);
    expect(element.textContent).not.toContain('Dust masks here are sold by class');
  });

  it('gives lead only, with no cadmium column', async () => {
    const { element, rows } = await create(FoodLimits, 'SG');
    expect(rows()[0]).toEqual(['Flatware, no deeper than 25 mm (any one of 6)', '3 µg/mL']);
    expect(rows()).toHaveLength(5);
    expect(element.querySelectorAll('thead th')).toHaveLength(2);
    expect(paragraphsOf(element)[0]).toContain('limits for lead only');
  });
});

describe('Malaysia', () => {
  it('gives 999 and the National Poison Centre with its hours and Telegram', async () => {
    const { element } = await create(PoisonLines, 'MY');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:999', 'tel:+6046536999']);
    const text = (element.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Monday to Friday 8:00 to 22:00');
    expect(element.querySelector('a[href="https://t.me/usm_prn_bot"]')?.textContent).toBe('Telegram');
  });

  it('says how many pieces are judged, and when the rules came into force', async () => {
    const { element, rows } = await create(FoodLimits, 'MY');
    expect(rows()).toEqual([
      ['Flatware (average of 4 pieces)', '0.8 mg/dm²', '0.07 mg/dm²'],
      ['Small hollowware (any one of 4)', '2 mg/L', '0.5 mg/L'],
      ['Large hollowware (any one of 4)', '1 mg/L', '0.25 mg/L'],
      ['Cooking ware (any one of 4)', '0.5 mg/L', '0.05 mg/L']
    ]);
    expect(paragraphsOf(element)[0]).toContain('In force from 1 August 2026.');
  });

  it('says no shop was found, with no empty list of sources', async () => {
    const { element } = await create(ShopList, 'MY');
    expect(element.textContent).toContain('We found no shop selling raw glaze materials in Malaysia.');
    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.region-sources')).toBeNull();
  });
});

describe('China', () => {
  it('gives 120 with the fire and police numbers, and no poison line, since none could be confirmed', async () => {
    const { element } = await create(PoisonLines, 'CN');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:120']);
    const text = (element.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('For a fire, call 119; for the police, 110.');
    expect(text).toContain('We could not confirm a public poison line here.');
    expect(text).not.toContain('83132345');
  });

  it('gives the limit for each band of free silica, as GBZ 2.1 draws them, with no quartz row', async () => {
    const { element, rows } = await create(SilicaLimit, 'CN');
    expect(rows()).toEqual([
      ['Dust with 10% to 50% free silica (SiO₂)', '0.7 mg/m³'],
      ['Dust with more than 50% and up to 80% free silica', '0.3 mg/m³'],
      ['Dust with more than 80% free silica', '0.2 mg/m³']
    ]);
    const paragraphs = paragraphsOf(element);
    expect(paragraphs[0]).toContain('A binding limit.');
    expect(paragraphs[0]).toContain('GBZ 2.1—2019');
    expect(paragraphs[0]).toContain(
      'not only the silica in it. Any dust with 10% free silica or more is held to them.'
    );
    expect(element.textContent).not.toContain('Dust masks here are sold by class');
  });

  it('says the food-contact rules and shops are not yet confirmed', async () => {
    expect((await create(FoodLimits, 'CN')).element.textContent).toContain(
      'We have not yet confirmed the rules in China.'
    );
    expect((await create(ShopList, 'CN')).element.textContent).toContain(
      'We found no shop selling raw glaze materials in China.'
    );
  });
});

describe('Hong Kong', () => {
  it('gives 999 and links the Department of Health, since the poison centre answers only professionals', async () => {
    const { element } = await create(PoisonLines, 'HK');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:999']);
    expect(element.querySelector('a[href="https://www.dh.gov.hk/"]')?.textContent).toBe(
      'Department of Health (衞生署)'
    );
  });

  it("gives the Labour Department's guide values for quartz and cristobalite, with its silicosis page", async () => {
    const { element, rows } = await create(SilicaLimit, 'HK');
    expect(rows()).toEqual([
      ['Quartz', '0.1 mg/m³'],
      ['Cristobalite', '0.05 mg/m³']
    ]);
    const paragraphs = paragraphsOf(element);
    expect(paragraphs[0]).toContain('An indicative limit');
    expect(paragraphs[0]).toContain("Tridymite's limit is the same as cristobalite's.");
    expect(element.querySelector('a[href="https://www.labour.gov.hk/eng/public/oh/silicosis.pdf"]')).not.toBeNull();
  });

  it('says the food-contact rules are not yet confirmed', async () => {
    expect((await create(FoodLimits, 'HK')).element.textContent).toContain(
      'We have not yet confirmed the rules in Hong Kong SAR China.'
    );
  });
});

describe('Indonesia', () => {
  it('gives 119 with the other numbers, and links the health ministry', async () => {
    const { element } = await create(PoisonLines, 'ID');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:119']);
    expect(element.textContent).toContain('118 also reaches an ambulance in some cities');
    expect(element.querySelector('a[href="https://kemkes.go.id/"]')?.textContent).toBe('Kementerian Kesehatan');
    expect(element.textContent).not.toContain('1500533');
  });

  it("gives the NAB for quartz and cristobalite, written with Indonesia's decimal comma", async () => {
    const { rows } = await create(SilicaLimit, 'ID');
    expect(rows()).toEqual([['Quartz and cristobalite', '0,025 mg/m³']]);
  });

  it('gives the 2026 limits, and says the third of three tests is what counts', async () => {
    const { element, rows } = await create(FoodLimits, 'ID');
    expect(rows()).toEqual([
      ['Pieces no more than 25 mm deep inside', '0,8 mg/dm²', '0,07 mg/dm²'],
      ['Pieces more than 25 mm deep inside, under 1100 mL', '0,5 mg/L', '0,25 mg/L'],
      ['Pieces more than 25 mm deep inside, 1100 mL or more', '0,5 mg/L', '0,25 mg/L']
    ]);
    expect(paragraphsOf(element)[0]).toContain('the third result is held to the limit');
    expect(paragraphsOf(element)[0]).not.toContain('In force from');
  });
});

describe('Thailand', () => {
  it('gives 1669, and the Ramathibodi Poison Center around the clock with its LINE', async () => {
    const { element } = await create(PoisonLines, 'TH');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:1669', 'tel:1367']);
    const text = (element.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('24 hours, every day');
    expect(text).toContain('For other emergencies, call 191; for a fire, 199.');
    expect(element.querySelector('a[href="https://page.line.me/749ilrut?openQrModal=true"]')?.textContent).toBe(
      'LINE (@rpc1367)'
    );
  });

  it("gives the department's limit for quartz and cristobalite", async () => {
    const { element, rows } = await create(SilicaLimit, 'TH');
    expect(rows()).toEqual([['Quartz and cristobalite', '0.025 mg/m³']]);
    expect(paragraphsOf(element)[0]).toContain('A binding limit.');
  });

  it("gives Notification No. 92's limits, all in mg/L, and says so", async () => {
    const { element, rows } = await create(FoodLimits, 'TH');
    expect(rows()).toEqual([
      ['Pieces no more than 25 mm deep', '7 mg/L', '0.7 mg/L'],
      ['Pieces more than 25 mm deep, under 1.1 L', '5 mg/L', '0.5 mg/L'],
      ['Pieces more than 25 mm deep, 1.1 L or more', '2.5 mg/L', '0.25 mg/L'],
      ['Containers for the food of babies up to 12 months old', '2.5 mg/L', '0.25 mg/L'],
      ['Cooking ware, made to stand the heat of cooking', '5 mg/L', '0.5 mg/L']
    ]);
    expect(paragraphsOf(element)[0]).toContain("the shallow pieces' too");
  });
});

describe('Philippines', () => {
  it('gives 911 and the poison centre, around the clock and free', async () => {
    const { element } = await create(PoisonLines, 'PH');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:911', 'tel:+63285241078']);
    expect(element.textContent).toContain('24 hours, every day, free');
  });

  it('says the silica limit is not yet confirmed', async () => {
    expect((await create(SilicaLimit, 'PH')).element.textContent).toContain(
      'We have not yet confirmed the limit in Philippines.'
    );
  });
});

describe('Vietnam', () => {
  it('gives 115, with 113 and 114, and says plainly that official pages give no roles', async () => {
    const { element, rows } = await create(PoisonLines, 'VN');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:115']);
    expect(rows()[0]![2]).toContain('For the police, call 113; for a fire, 114.');
    expect(element.querySelector('.reported')?.textContent).toContain(
      'Official government pages list 113, 114 and 115'
    );
    expect(element.textContent).toContain('We could not confirm a public poison line here.');
  });

  it("gives QCVN 02:2019/BYT's limit for free silica in respirable dust", async () => {
    const { element, rows } = await create(SilicaLimit, 'VN');
    expect(rows()[0]![1]).toContain('0.1');
    expect(element.textContent).toContain('QCVN 02:2019/BYT');
    expect(element.textContent).toContain('0.3 mg/m³');
  });

  it("gives QCVN 12-4:2015/BYT's six kinds of piece", async () => {
    const { element, rows } = await create(FoodLimits, 'VN');
    expect(rows().map((row) => row[0])).toEqual([
      'Shallow pieces, for holding or cooking food',
      'Deep pieces for holding food, under 1100 mL',
      'Deep pieces for holding food, from 1100 mL to under 3000 mL',
      'Deep pieces for holding food, 3000 mL or more',
      'Deep pieces for cooking',
      'Cups and small bowls'
    ]);
    expect(element.textContent).toContain('TCVN 7146-1:2002');
  });

  it('lists no shop, and says so', async () => {
    const { element } = await create(ShopList, 'VN');
    expect(element.textContent).toContain('We found no shop selling raw glaze materials in Vietnam.');
    expect(element.querySelector('table')).toBeNull();
  });
});
