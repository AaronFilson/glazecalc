import { TestBed } from '@angular/core/testing';
import { PreferencesService } from '../../core/preferences.service';
import { testProviders } from '../../testing/test-providers';
import { PoisonLines } from './poison-lines';

describe('PoisonLines', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });

  const create = async (region: string) => {
    TestBed.inject(PreferencesService).region.set(region);
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
});
