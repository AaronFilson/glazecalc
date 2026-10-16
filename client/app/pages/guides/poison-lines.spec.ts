import { TestBed } from '@angular/core/testing';
import { PreferencesService } from '../../core/preferences.service';
import { testProviders } from '../../testing/test-providers';
import { PoisonLines, joinNotes } from './poison-lines';

describe('PoisonLines', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });

  const create = async (region: string) => {
    TestBed.inject(PreferencesService).remember('region', region);
    const fixture = TestBed.createComponent(PoisonLines);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const choose = async (code: string) => {
      const select = element.querySelector('select') as HTMLSelectElement;
      select.value = code;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const calls = () => [...element.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    return { element, choose, calls };
  };

  it("shows who to call in the reader's region, with links that dial and where each was checked", async () => {
    const { element, calls } = await create('US');
    expect(element.querySelector('caption')?.textContent).toContain('Who to call in United States (numbers checked');
    expect(calls()).toEqual(['tel:911', 'tel:+18002221222', 'tel:+18884264435', 'tel:+18557647661']);
    expect(element.querySelector('.region-sources')?.textContent).toContain('poisoncenters.org');
  });

  it("shows another country's on request: regional centres, and where there is no public line", async () => {
    const { element, choose, calls } = await create('US');
    await choose('DE');
    expect(calls()).toContain('tel:112');
    expect(calls().filter((tel) => tel?.endsWith('19240') || tel?.endsWith('730730'))).toHaveLength(7);
    expect(element.textContent).toContain('Baden-Württemberg');
    await choose('NL');
    expect(element.textContent).toContain('We could not confirm a public poison line here.');
    expect(element.textContent).toContain('NVIC takes calls from professionals only');
    // Malta's line, read on the centre's own pages, with its hours.
    await choose('MT');
    expect(calls()).toEqual(['tel:112', 'tel:1774']);
    expect(element.textContent).toContain('08:00 to 20:00, every day');
    // Bulgaria's could not be confirmed: the emergency number, and the health ministry's page.
    await choose('BG');
    expect(calls()).toEqual(['tel:112']);
    const ministry = element.querySelector('a[href="https://www.mh.government.bg/"]');
    expect(ministry?.textContent).toBe('Министерство на здравеопазването');
    expect(ministry?.closest('td')?.textContent).toContain("The health ministry's page:");
  });

  it("gives Japan's 119, the poison centre's two lines for acute cases only, and #8000 for children", async () => {
    const { element, calls } = await create('JP');
    expect(calls()).toEqual(['tel:119', 'tel:+81727272499', 'tel:+81298529999', 'tel:%238000']);
    const text = (element.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Poison advice: Japan Poison Information Center, Osaka (大阪中毒110番)');
    expect(text).toContain('24 hours, every day, free. Only for acute poisoning that has actually happened');
    expect(text).toContain('not for long-term exposure, such as dust at work.');
    expect(text).toContain("Medical advice: Children's medical advice line (子ども医療電話相談)");
    expect(element.querySelector('a[href="tel:%238000"]')?.textContent).toBe('#8000');
    expect(text).toContain('Call your vet.');
  });

  it("gives Türkiye's 112 and UZEM on 114, around the clock, with no claim on cost", async () => {
    const { element, calls } = await create('TR');
    expect(calls()).toEqual(['tel:112', 'tel:114']);
    const text = (element.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('One number for ambulance, fire, police, gendarmerie and coast guard.');
    expect(text).toContain('Poison advice: National Poison Information Centre (Ulusal Zehir Danışma Merkezi, UZEM)');
    expect(text).toContain('24 hours, every day');
    expect(text).not.toContain('free');
  });

  it("closes each note as the page's language does, never twice", () => {
    expect(joinNotes(['Weekdays 9–17', 'Free.', 'Animals too'], 'en')).toBe('Weekdays 9–17. Free. Animals too');
    expect(joinNotes(['平日 9–17 時', '無料'], 'ja')).toBe('平日 9–17 時。無料');
    expect(joinNotes(['24 小時。', '免費'], 'zh-Hant')).toBe('24 小時。免費');
    expect(joinNotes(['24 小时', '免费'], 'zh-Hans')).toBe('24 小时。免费');
    // A note left in English on a Japanese page, or ending in a number: the page's language decides.
    expect(joinNotes(['Weekdays 9–17', '無料'], 'ja')).toBe('Weekdays 9–17。無料');
    expect(joinNotes(['毎日 24', 'Free'], 'en')).toBe('毎日 24. Free');
    expect(joinNotes(['평일 9–17시', '무료'], 'ko')).toBe('평일 9–17시. 무료');
    expect(joinNotes([], 'en')).toBe('');
  });
});
