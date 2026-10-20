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
// The region chosen here is kept in this browser's storage: none is left for the next file's tests.
afterEach(() => localStorage.clear());

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

  it('gives the limit that applies until 2027 and the 2027 limit, each under its dates, with both laws linked', async () => {
    TestBed.overrideProvider(NOW, { useValue: () => new Date(2026, 11, 31, 23, 59) });
    const { element, rows } = await create(SilicaLimit, 'TW');
    expect(rows()).toEqual([
      ['Until December 31, 2026'],
      ['Limit for respirable dust, where Q is the crystalline silica in it, in %', '10 / (Q + 2) mg/m³'],
      ['For dust that is all crystalline silica', '0.098 mg/m³'],
      ['From January 1, 2027'],
      ['Quartz and cristobalite', '0.1 mg/m³']
    ]);
    // The dates head their rows for each period.
    expect([...element.querySelectorAll('th[scope="colgroup"]')].map((th) => th.getAttribute('colspan'))).toEqual([
      '2',
      '2'
    ]);
    const paragraphs = paragraphsOf(element);
    expect(paragraphs[0]).toContain('A binding limit.');
    expect(paragraphs[0]).toContain('It applies from January 1, 2027.');
    expect(paragraphs[0]).toContain(
      'Until then, the limit is set by 勞工作業場所容許暴露標準，附表二（2018年3月14日修正），第一種粉塵.'
    );
    expect(paragraphs[0]).toContain('Until 31 December 2026 the limit is for the whole respirable dust');
    expect(paragraphs[1]).toContain('Dust masks here are sold by class: D2 for glaze dust, or D3 for more protection');
    expect(paragraphs[2]).toContain('勞動部職業安全衛生署');
    const links = [...element.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain(
      'https://law.moj.gov.tw/LawClass/LawGetFile.ashx?FileId=0000387834&lan=C&type=1&date=20250411'
    );
    expect(links).toContain('https://law.moj.gov.tw/LawClass/LawAll.aspx?PCODE=N0060004');
  });

  it('once the 2027 limit is in force, says neither when it applies from nor what applied before', async () => {
    TestBed.overrideProvider(NOW, { useValue: () => new Date(2027, 0, 1, 0, 1) });
    const { element, rows } = await create(SilicaLimit, 'TW');
    expect(rows()).toEqual([['Quartz and cristobalite', '0.1 mg/m³']]);
    const paragraph = paragraphsOf(element)[0];
    expect(paragraph).toContain('A binding limit.');
    expect(paragraph).not.toContain('It applies from');
    expect(paragraph).not.toContain('Until');
    expect(element.textContent).not.toContain('Q + 2');
    expect([...element.querySelectorAll('a')].map((a) => a.getAttribute('href'))).not.toContain(
      'https://law.moj.gov.tw/LawClass/LawGetFile.ashx?FileId=0000387834&lan=C&type=1&date=20250411'
    );
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
  it("gives 120 with the fire and police numbers, and China CDC's poison line, saying its hours are not given", async () => {
    const { element, rows } = await create(PoisonLines, 'CN');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:120', 'tel:+861083132345']);
    const text = (element.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('For a fire, call 119; for the police, 110.');
    expect(rows()[1]![0]).toBe('Poison advice: National poison information hotline, China CDC (全国中毒咨询热线)');
    expect(rows()[1]![1]).toBe('010-83132345');
    expect(rows()[1]![2]).toContain('No official page gives its hours or its cost; in an emergency, call 120.');
    expect(text).not.toContain('We could not confirm a public poison line here.');
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
    expect(paragraphs[1]).toContain(
      'Dust masks here are sold by class: KN95 for glaze dust, or KN100 for more protection'
    );
    expect(paragraphs[1]).toContain('GB 2626-2019');
  });

  it("gives GB 4806.4—2016's six kinds of piece, at most, and says why cooking ware's limits are higher", async () => {
    const { element, rows } = await create(FoodLimits, 'CN');
    expect(rows()).toEqual([
      ['Flat ware, 25 mm deep or less', '0.8 mg/dm²', '0.07 mg/dm²'],
      ['Small hollow ware, under 1.1 L, other than cups', '2 mg/L', '0.3 mg/L'],
      ['Large hollow ware, from 1.1 L to under 3 L', '1 mg/L', '0.25 mg/L'],
      ['Storage jars, 3 L or more', '0.5 mg/L', '0.25 mg/L'],
      ['Cups, for water or drinks', '0.5 mg/L', '0.25 mg/L'],
      ['Cooking ware, for heating food', '3 mg/L', '0.3 mg/L']
    ]);
    const paragraph = paragraphsOf(element)[0];
    expect(paragraph).toContain('Set by GB 4806.4—2016《食品安全国家标准 陶瓷制品》，表1.');
    expect(paragraph).toContain('In force from April 19, 2017.');
    expect(paragraph).toContain('A piece passes if it releases no more than the limit');
    expect(paragraph).toContain('Cooking ware is tested hot, two hours in 4% acetic acid at 98 °C');
    expect(paragraph).toContain('Guangdong provincial regulator');
  });

  it('says no shop was found', async () => {
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

  it('says there is no law with figures for ceramic ware, with no table, and links the Centre for Food Safety', async () => {
    const { element } = await create(FoodLimits, 'HK');
    expect(element.querySelector('table')).toBeNull();
    const paragraph = paragraphsOf(element)[0];
    expect(paragraph).toContain(
      'There is no law in Hong Kong SAR China that sets limits for the lead and cadmium a fired piece may release (checked 19 October 2026).'
    );
    expect(paragraph).toContain(
      'Source: Centre for Food Safety, Guidelines on the Use of Disposable Tray Liners (December 2009).'
    );
    expect(paragraph).toContain('Consumer Goods Safety Ordinance (Cap. 456)');
    expect(paragraph).not.toContain('not yet confirmed');
    expect(
      element.querySelector('a[href="https://www.cfs.gov.hk/english/food_leg/files/Guidelines_Tray_liner.pdf"]')
    ).not.toBeNull();
    expect(element.querySelector('.region-sources')?.textContent).toContain('cfs.gov.hk');
  });

  it('lists Hearty Ceramic, with its town and packs', async () => {
    const { rows } = await create(ShopList, 'HK');
    expect(rows().map((row) => row[0])).toEqual([
      'Hearty Ceramic (Hearty Arts International Limited)' + 'Tai Kok Tsui (Kowloon)'
    ]);
    expect(rows()[0]![2]).toBe('1 kg, 5 kg and 10 kg');
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
    expect(paragraphsOf(element)[0]).toContain('In force from 30 June 2026.');
    expect(paragraphsOf(element)[0]).toContain('Ware already on the market has until 30 June 2027 to comply.');
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

  it('lists two shops by their own names, and a note on prices by the kilogram', async () => {
    const { rows } = await create(ShopList, 'TH');
    expect(rows().map((row) => row[0])).toEqual([
      'Pottery Clay Thailand',
      'Cerawan (เซล่าวัล ซัพพลาย)' + 'Krathum Baen (Samut Sakhon)'
    ]);
    expect(rows()[1]![3]).toContain('Priced by the kilogram.');
  });
});

describe('Philippines', () => {
  it('gives 911 and the poison centre, around the clock and free', async () => {
    const { element } = await create(PoisonLines, 'PH');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:911', 'tel:+63285241078']);
    expect(element.textContent).toContain('24 hours, every day, free');
  });

  it("gives the OSH Standards' formula for quartz, half for cristobalite, and says it was read in an archived copy", async () => {
    const { element, rows } = await create(SilicaLimit, 'PH');
    expect(rows()).toEqual([
      ['Limit for respirable quartz, where Q is the silica (SiO₂) in the dust, in %', '10 / (Q + 2) mg/m³'],
      ['Quartz, for dust that is all quartz', '0.098 mg/m³'],
      ['Cristobalite, for dust that is all cristobalite', '0.049 mg/m³']
    ]);
    const paragraph = paragraphsOf(element)[0];
    expect(paragraph).toContain('A binding limit.');
    expect(paragraph).toContain(
      'Set by Occupational Safety and Health Standards (as amended, 1989), Rule 1070, Table 8a.'
    );
    expect(paragraph).toContain(
      "Read in the Internet Archive's copy of the Department of Labor and Employment's own file"
    );
    expect(element.textContent).not.toContain('not yet confirmed');
  });

  it('lists a shop for raw materials and one for clay and ready-made glazes', async () => {
    const { rows } = await create(ShopList, 'PH');
    expect(rows().map((row) => row[0])).toEqual([
      'Tahanan Pottery' + 'Quezon City',
      'Odangputik Pottery' + 'Quezon City'
    ]);
    expect(rows()[1]![3]).toContain('Ready-made glazes and clay; no raw materials seen.');
  });
});

describe('Vietnam', () => {
  it('gives 115, with 113 and 114 and the merger into 113, and no caution, since their roles are on official pages', async () => {
    const { element, rows } = await create(PoisonLines, 'VN');
    const calls = [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(calls).toEqual(['tel:115']);
    expect(rows()[0]![2]).toContain('For the police, call 113; for a fire or a rescue, 114.');
    expect(rows()[0]![2]).toContain('until then, all three still work');
    expect(element.textContent).not.toContain('Official government pages list');
    expect(element.querySelector('.region-sources')?.textContent).toContain('congan.dienbien.gov.vn');
    expect(element.textContent).toContain('We could not confirm a public poison line here.');
  });

  it("gives QCVN 02:2019/BYT's limit for free silica in respirable dust, and the FFP mask classes", async () => {
    const { element, rows } = await create(SilicaLimit, 'VN');
    expect(rows()[0]![1]).toContain('0.1');
    expect(element.textContent).toContain('QCVN 02:2019/BYT');
    expect(element.textContent).toContain('0.3 mg/m³');
    expect(paragraphsOf(element)[1]).toContain(
      'Dust masks here are sold by class: FFP2 for glaze dust, or FFP3 for more protection'
    );
    expect(paragraphsOf(element)[1]).toContain('TCVN 13409:2021');
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
    // The regulation names its test method but does not make it mandatory.
    expect(element.textContent).toContain('names a test method (TCVN 7146-1:2002');
    expect(element.textContent).toContain('allows others of the same accuracy');
  });

  it('lists no shop, and says so', async () => {
    const { element } = await create(ShopList, 'VN');
    expect(element.textContent).toContain('We found no shop selling raw glaze materials in Vietnam.');
    expect(element.querySelector('table')).toBeNull();
  });
});

/** The tel: links a block shows, in order. */
const callsIn = (element: HTMLElement) =>
  [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));

describe('India', () => {
  it('gives 112, and the poison centre with its Delhi number linked as dialled from anywhere', async () => {
    const { element } = await create(PoisonLines, 'IN');
    expect(callsIn(element)).toEqual(['tel:112', 'tel:1800116117', 'tel:+911126589391']);
    // The other number stays on one line, as one run of digits.
    const other = element.querySelector('a[href="tel:+911126589391"]')!;
    expect(other.textContent).toBe('011\u00a02658\u00a09391');
    expect((other.parentElement?.textContent ?? '').replace(/\s+/g, ' ')).toBe('or 011 2658 9391');
    const text = (element.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('One number for police, fire and ambulance');
    expect(text).toContain('24 hours, every day, toll free');
    expect(text).toContain('It advises the public as well as health workers.');
  });

  it('says no limit is confirmed, that each state sets its own, and links DGOSH, with the IS 9473 classes', async () => {
    const { element } = await create(SilicaLimit, 'IN');
    expect(element.querySelector('table')).toBeNull();
    const paragraphs = paragraphsOf(element);
    expect(paragraphs[0]).toBe('We have not yet confirmed the limit in India.');
    expect(paragraphs[1]).toBe(
      'We found no national limit: under the Occupational Safety, Health and Working Conditions Code, 2020, each state sets the limits for its own factories.'
    );
    expect(paragraphs[2]).toContain('Dust masks here are sold by class: FFP2 for glaze dust, or FFP3');
    expect(paragraphs[2]).toContain('IS 9473:2002');
    expect(element.querySelector('a[href="https://dgfasli.gov.in/en/"]')?.textContent).toBe(
      'Directorate General Occupational Safety and Health (DGOSH)'
    );
    // The Code's text is among the sources, with the date it was read.
    expect(element.querySelector('.region-sources')?.textContent).toContain('prsindia.org');
  });

  it('gives no food-contact rules, since only a voluntary standard was found, and lists two shops', async () => {
    const food = await create(FoodLimits, 'IN');
    expect(food.element.textContent).toContain('We have not yet confirmed the rules in India.');
    expect(food.element.querySelector('table')).toBeNull();
    const shops = await create(ShopList, 'IN');
    expect(shops.rows().map((row) => row[0])).toEqual(['Bhoomi Pottery', 'Clay Station' + 'Bangalore']);
  });
});

describe('Pakistan and Bangladesh', () => {
  it("gives Rescue 1122 with Punjab's police number, no poison line, and the health ministry", async () => {
    const { element, rows } = await create(PoisonLines, 'PK');
    expect(callsIn(element)).toEqual(['tel:1122']);
    expect(rows()[0]![2]).toContain('Each province runs its own Rescue 1122 service');
    expect(rows()[0]![2]).toContain('In Punjab, call 15 for the police.');
    expect(element.textContent).toContain('We could not confirm a public poison line here.');
    expect(element.querySelector('a[href="https://www.nhsrc.gov.pk/"]')).not.toBeNull();
  });

  it("gives 999, and the health directorate's call centre as medical advice, not as a poison line", async () => {
    const { element, rows } = await create(PoisonLines, 'BD');
    expect(callsIn(element)).toEqual(['tel:999', 'tel:16263']);
    expect(rows()[0]![2]).toContain('as the government');
    expect(rows()[1]![0]).toBe('Poison advice');
    expect(rows()[1]![2]).toContain('We could not confirm a public poison line here.');
    expect(rows()[2]![0]).toBe('Medical advice: Health Call Centre (হেলথ কল সেন্টার)');
    expect(rows()[2]![2]).toContain('It is not a poison line');
    expect(element.querySelector('a[href="https://mohfw.gov.bd/"]')?.textContent).toBe(
      'স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়'
    );
  });

  it('say no limit is confirmed; Bangladesh links its inspection department', async () => {
    const pakistan = await create(SilicaLimit, 'PK');
    expect(paragraphsOf(pakistan.element)).toEqual(['We have not yet confirmed the limit in Pakistan.']);
    const bangladesh = await create(SilicaLimit, 'BD');
    expect(paragraphsOf(bangladesh.element)[0]).toBe('We have not yet confirmed the limit in Bangladesh.');
    expect(bangladesh.element.querySelector('a[href="https://dife.gov.bd/"]')?.textContent).toContain('(DIFE)');
  });
});

describe('Egypt and the UAE', () => {
  it('gives 123 for an ambulance with the police and fire numbers, and the health ministry', async () => {
    const { element, rows } = await create(PoisonLines, 'EG');
    expect(callsIn(element)).toEqual(['tel:123']);
    expect(rows()[0]![2]).toBe(
      'Ambulance; the call and the ambulance are free. For the police, call 122; for a fire, 180.'
    );
    expect(element.querySelector('a[href="https://www.mohp.gov.eg/"]')?.textContent).toBe('وزارة الصحة والسكان');
  });

  it("gives 998, no poison line and no ministry, since the federal ministry's site could not be read", async () => {
    const { element } = await create(PoisonLines, 'AE');
    expect(callsIn(element)).toEqual(['tel:998']);
    expect(element.textContent).toContain('We could not confirm a public poison line here.');
    expect(element.textContent).not.toContain("The health ministry's page");
    expect(element.textContent).not.toContain('800');
  });

  it('lists two shops in Abu Dhabi, one with a note that it sells no raw glaze materials', async () => {
    const { rows } = await create(ShopList, 'AE');
    expect(rows().map((row) => row[0])).toEqual([
      'Art Central Pottery' + 'Abu Dhabi',
      'Abu Dhabi Pottery' + 'Abu Dhabi'
    ]);
    expect(rows()[1]![3]).toContain('no raw glaze materials seen');
  });
});

describe('Morocco and Algeria', () => {
  it("gives 141, and the poison centre's 0801 number and its Rabat number, each linked", async () => {
    const { element, rows } = await create(PoisonLines, 'MA');
    expect(callsIn(element)).toEqual(['tel:141', 'tel:0801000180', 'tel:+212537686464']);
    expect(rows()[1]![0]).toContain('Centre Anti Poison et de Pharmacovigilance du Maroc, CAPM');
    expect(rows()[1]![2]).toBe(
      '24 hours, every day. A doctor judges how serious the poisoning is and gives first-aid advice. The call costs the same as a local call; the advice is free.'
    );
  });

  it('gives 14 for civil protection, and no poison line or ministry', async () => {
    const { element, rows } = await create(PoisonLines, 'DZ');
    expect(callsIn(element)).toEqual(['tel:14']);
    expect(rows()[0]![2]).toMatch(/^Civil protection \(Protection civile\); also 1021\./);
    expect(element.textContent).not.toContain("The health ministry's page");
  });

  it("gives the 2019 order's three kinds of piece, and its rule for a piece up to 50% over", async () => {
    const { element, rows } = await create(FoodLimits, 'DZ');
    expect(rows().map((row) => row[0])).toEqual([
      'Pieces that cannot be filled, or no deeper than 25 mm',
      'Other pieces that can be filled',
      'Cooking ware of any size, and packaging and storage vessels over 3 L'
    ]);
    const text = (element.textContent ?? '').replace(/\s+/g, ' ');
    // English as Algeria writes it is English's own date format, as for Taiwan.
    expect(text).toContain('In force from June 6, 2019.');
    expect(text).toContain('at least three more pieces of the same shape, size, decoration and glaze');
    expect(element.querySelector('a[href="https://www.joradp.dz/FTP/JO-FRANCAIS/2019/F2019036.pdf"]')).not.toBeNull();
  });

  it('say no silica limit is confirmed and no shop was found', async () => {
    for (const [code, name] of [
      ['MA', 'Morocco'],
      ['DZ', 'Algeria'],
      ['EG', 'Egypt'],
      ['AE', 'United Arab Emirates']
    ]) {
      const silica = await create(SilicaLimit, code!);
      expect(paragraphsOf(silica.element), code).toEqual([`We have not yet confirmed the limit in ${name}.`]);
    }
    for (const [code, name] of [
      ['MA', 'Morocco'],
      ['DZ', 'Algeria']
    ]) {
      const shops = await create(ShopList, code!);
      expect(shops.element.textContent, code).toContain(`We found no shop selling raw glaze materials in ${name}.`);
    }
  });
});
