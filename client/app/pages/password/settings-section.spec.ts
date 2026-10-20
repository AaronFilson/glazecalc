import { TestBed } from '@angular/core/testing';
import { choosePicked, pickerField, pickerOptions } from '../../testing/picker';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { OFFERED_LANGUAGES, OPEN_PAGE, PAGE_LANGUAGE } from '../../i18n/language';
import { SettingsSection } from './settings-section';

describe('SettingsSection', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async () => {
    const fixture = TestBed.createComponent(SettingsSection);
    await fixture.whenStable();
    answer('/preferences', { weightUnit: 'lb' });
    await settle(fixture);
    const radio = (unit: string) => fixture.nativeElement.querySelector('#weight-unit-' + unit) as HTMLInputElement;
    return { fixture, radio };
  };

  it("shows the account's choice of weights, and saves a new one", async () => {
    const { fixture, radio } = await create();
    expect(radio('lb').checked).toBe(true);
    expect(text(fixture, 'label[for="weight-unit-lb"]')).toBe('Pounds and ounces (2 lb 12.1 oz)');
    radio('g').click();
    await fixture.whenStable();
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ weightUnit: 'g' });
    req.flush({ weightUnit: 'g' });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe('Saved: batch weights are in grams.');
  });

  it('saves how grams show: to a tenth, or in full', async () => {
    const { fixture } = await create();
    const full = fixture.nativeElement.querySelector('#gram-precision-full') as HTMLInputElement;
    expect((fixture.nativeElement.querySelector('#gram-precision-single') as HTMLInputElement).checked).toBe(true);
    expect(text(fixture, 'label[for="gram-precision-full"]')).toBe('Full precision (4938.23517 g)');
    full.click();
    await fixture.whenStable();
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.body).toEqual({ gramPrecision: 'full' });
    req.flush({ weightUnit: 'lb', gramPrecision: 'full' });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe('Saved: grams show in full, to 5 decimal places.');
    expect(localStorage.getItem('gramPrecision')).toBe('full');
  });

  it('offers light, dark or as the device is set, and palettes named for glazes', async () => {
    const { fixture } = await create();
    const labels = (name: string) =>
      [...fixture.nativeElement.querySelectorAll(`input[name="${name}"]`)].map((input: HTMLInputElement) =>
        fixture.nativeElement.querySelector(`label[for="${input.id}"]`)?.textContent?.replace(/\s+/g, ' ').trim()
      );
    expect(labels('theme')).toEqual(['As this device is set', 'Light', 'Dark']);
    expect(labels('palette')).toEqual([
      'Tenmoku rust',
      'Celadon green',
      'Cobalt blue',
      'Oxblood red',
      'Shino orange',
      'Wood ash olive'
    ]);
    expect((fixture.nativeElement.querySelector('#theme-system') as HTMLInputElement).checked).toBe(true);
    // Each palette shows its light and dark color, hidden from screen readers.
    const swatch = fixture.nativeElement.querySelector('label[for="palette-cobalt"] .swatch') as HTMLElement;
    expect(swatch.getAttribute('aria-hidden')).toBe('true');

    (fixture.nativeElement.querySelector('#palette-cobalt') as HTMLInputElement).click();
    await fixture.whenStable();
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.body).toEqual({ palette: 'cobalt' });
    req.flush({});
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe('Saved: Cobalt blue buttons and links.');
  });

  it('keeps lead off unless its warning is confirmed', async () => {
    const { fixture } = await create();
    const lead = (value: string) => fixture.nativeElement.querySelector('#lead-' + value) as HTMLInputElement;
    // Off unless chosen.
    expect(lead('off').checked).toBe(true);

    // Choosing On asks first, and saves nothing yet.
    lead('on').click();
    await settle(fixture);
    httpMock().expectNone(API + '/preferences');
    expect(document.activeElement?.id).toBe('lead-confirm');
    expect(text(fixture, '#lead-confirm')).toContain('Use lead only as a frit');
    const button = (label: string) =>
      [...fixture.nativeElement.querySelectorAll('.settings-confirm button')].find(
        (b: HTMLButtonElement) => b.textContent?.trim() === label
      ) as HTMLButtonElement;

    // Keep it off: Off again, with the focus on it.
    button('Keep it off').click();
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.settings-confirm')).toBeNull();
    expect(lead('off').checked).toBe(true);
    expect(document.activeElement?.id).toBe('lead-off');

    // Turn lead on: saved.
    lead('on').click();
    await settle(fixture);
    button('Turn lead on').click();
    await fixture.whenStable();
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.body).toEqual({ lead: 'on' });
    req.flush({ weightUnit: 'lb', lead: 'on' });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe('Saved: materials with lead can be added and suggested.');

    // Turning it off needs no question.
    lead('off').click();
    await fixture.whenStable();
    expect(httpMock().expectOne(API + '/preferences').request.body).toEqual({ lead: 'off' });
  });

  it('asks where the potter works, from a list, and saves it', async () => {
    const { fixture } = await create();
    const region = fixture.nativeElement.querySelector('#region') as HTMLInputElement;
    expect(region.id).toBe('region');
    expect(region.value).toBe('Not chosen');
    region.click();
    await fixture.whenStable();
    const options = pickerOptions(fixture.nativeElement);
    expect(options[0]).toBe('Not chosen');
    expect(options).toContain('Germany');
    expect(options).toContain('United States');
    // By continent, each with its heading.
    const headings = [...fixture.nativeElement.querySelectorAll('[role="group"] > [role="presentation"]')].map(
      (h: HTMLElement) => h.textContent?.trim()
    );
    expect(headings).toEqual(['Americas', 'Asia', 'Europe', 'Oceania']);
    await choosePicked(fixture, region, 'Germany');
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.body).toEqual({ region: 'DE' });
    req.flush({ region: 'DE' });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe('Saved: Germany.');
    expect(localStorage.getItem('preferredRegion')).toBe('DE');
    expect(region.value).toBe('Germany');
    // Germany fires by temperature, in °C, until the potter chooses otherwise.
    const checked = (name: string) =>
      (fixture.nativeElement.querySelector('input[name="' + name + '"]:checked') as HTMLInputElement | null)?.value;
    expect([checked('temperature'), checked('cones')]).toEqual(['C', 'temperature']);
  });

  it('offers number and date formats with an example of each, and how amounts are typed', async () => {
    const { fixture } = await create();
    const format = fixture.nativeElement.querySelector('#format') as HTMLSelectElement;
    const options = [...format.options].map((o) => o.textContent?.replace(/\s+/g, ' ').trim());
    expect(options[0]).toMatch(/^As my language and region \(.+\)$/);
    expect(options).toContain('German (Germany) (12.345,6 · 08.10.26)');
    expect(text(fixture, 'label[for="decimal-mark-either"]')).toBe('A comma or a point for decimals (12,5 or 12.5)');
    (fixture.nativeElement.querySelector('#decimal-mark-point') as HTMLInputElement).click();
    await fixture.whenStable();
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.body).toEqual({ decimalMark: 'point' });
    req.flush({ decimalMark: 'point' });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe('Saved: amounts are typed with a point for decimals.');
  });

  it("shows each format's date in the calendar chosen: Gregorian for Thai by default, Buddhist when chosen", async () => {
    const thai = (fixture: { nativeElement: HTMLElement }) =>
      (fixture.nativeElement.querySelector('#format option[value="th-TH"]') as HTMLOptionElement).textContent
        ?.replace(/\s+/g, ' ')
        .trim();
    const { fixture } = await create();
    expect(thai(fixture)).toMatch(/· 8\/10\/26\)$/);
    (fixture.nativeElement.querySelector('#calendar-buddhist') as HTMLInputElement).click();
    await fixture.whenStable();
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.body).toEqual({ calendar: 'buddhist' });
    req.flush({ calendar: 'buddhist' });
    await settle(fixture);
    expect(thai(fixture)).toMatch(/· 8\/10\/69\)$/);
  });

  it('says when the choice could not be saved, and shows the one still in place', async () => {
    const { fixture, radio } = await create();
    radio('g').click();
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/preferences')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe('The setting could not be saved. Please try again.');
    expect(radio('lb').checked).toBe(true);
  });

  it('asks how glaze density is read, following the region until chosen', async () => {
    const fixture = TestBed.createComponent(SettingsSection);
    await fixture.whenStable();
    answer('/preferences', { region: 'IT' });
    await settle(fixture);
    const choice = (value: string) => fixture.nativeElement.querySelector('#density-' + value) as HTMLInputElement;
    // Italy reads density in degrees Baumé.
    expect(choice('baume').checked).toBe(true);
    expect(text(fixture, 'label[for="density-pint"]')).toBe('Pint weight, the ounces in an imperial pint (29 oz)');
    // The example is a message, so each language writes it its own way.
    expect(text(fixture, 'label[for="density-sg"]')).toBe('Specific gravity (SG 1.45)');
    // One pair of brackets each: the example's, not the standard's too.
    expect(text(fixture, 'label[for="cones-sk"]')).toBe('SK cones, JIS R 8101 (SK 4a, SK 8)');
    expect(text(fixture, 'label[for="cones-orton"]')).toBe('Orton cones (cone 04, cone 6)');
    expect(text(fixture, 'label[for="cones-temperature"]')).toContain("Temperature, as a kiln controller's program");
    choice('sg').click();
    await fixture.whenStable();
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.body).toEqual({ density: 'sg' });
    req.flush({ density: 'sg' });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe('Saved: glaze density as specific gravity.');
  });

  it('asks the one currency prices are in, following the region until chosen', async () => {
    const fixture = TestBed.createComponent(SettingsSection);
    await fixture.whenStable();
    answer('/preferences', { region: 'SE' });
    await settle(fixture);
    const select = fixture.nativeElement.querySelector('#currency') as HTMLSelectElement;
    // Sweden prices in kronor; each currency is named in the page's language, with its code.
    expect(select.value).toBe('SEK');
    expect(select.selectedOptions[0]!.textContent?.trim()).toBe('Swedish Krona (SEK)');
    expect([...select.options].map((option) => option.value)).toContain('EUR');
    select.value = 'EUR';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.body).toEqual({ currency: 'EUR' });
    req.flush({ currency: 'EUR' });
    await settle(fixture);
    answer('/prices', { prices: [] });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe('Saved: prices in Euro.');
  });

  it('says that stored prices are not converted when the currency changes and prices exist', async () => {
    const fixture = TestBed.createComponent(SettingsSection);
    await fixture.whenStable();
    answer('/preferences', { region: 'SE', currency: 'SEK' });
    await settle(fixture);
    const select = fixture.nativeElement.querySelector('#currency') as HTMLSelectElement;
    select.value = 'EUR';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/preferences')
      .flush({ currency: 'EUR' });
    await settle(fixture);
    answer('/prices', { prices: [{ key: 'name:Silica', perKg: 2 }] });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe(
      'Saved: prices in Euro. Your stored prices were not converted: they are still the numbers you gave.'
    );
  });

  it('offers English terms and the translation notice only on a translated page, and a language only when there is a choice', async () => {
    TestBed.overrideProvider(OFFERED_LANGUAGES, { useValue: ['en'] });
    const english = await create();
    expect(english.fixture.nativeElement.querySelector('#english-terms-on')).toBeNull();
    expect(english.fixture.nativeElement.querySelector('#notice-hidden')).toBeNull();
    expect(english.fixture.nativeElement.querySelector('#language')).toBeNull();
  });

  describe('on a page in another language', () => {
    const opened: string[] = [];
    beforeEach(() => {
      opened.length = 0;
      TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: 'en-XA' });
      TestBed.overrideProvider(OFFERED_LANGUAGES, { useValue: ['en', 'en-XA'] });
      TestBed.overrideProvider(OPEN_PAGE, { useValue: (address: string) => opened.push(address) });
    });

    it('chooses a language, saves it, and opens this page in it', async () => {
      const { fixture } = await create();
      const field = pickerField(fixture.nativeElement);
      expect(field.id).toBe('language');
      expect(field.value).toBe('Ëñĝļîšĥ (pseudo)');
      field.click();
      await fixture.whenStable();
      // Each in its own name, with the English name beside it; English first, then the groups.
      expect(pickerOptions(fixture.nativeElement)).toEqual(['English', 'Ëñĝļîšĥ (pseudo) Pseudo-English']);
      await choosePicked(fixture, field, 'English');
      const req = httpMock().expectOne(API + '/preferences');
      expect(req.request.body).toEqual({ language: 'en' });
      req.flush({ language: 'en' });
      await settle(fixture);
      expect(opened).toEqual([location.pathname]);
    });

    it('offers the English after key terms, and hiding the translation notice', async () => {
      const { fixture } = await create();
      expect(fixture.nativeElement.querySelector('#english-terms-on')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#notice-hidden')).not.toBeNull();
    });
  });

  it('says a line of the notice stays on every page in a language AI translates less well', async () => {
    TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: 'ga' });
    TestBed.overrideProvider(OFFERED_LANGUAGES, { useValue: ['en', 'ga'] });
    const { fixture } = await create();
    (fixture.nativeElement.querySelector('#notice-hidden') as HTMLInputElement).click();
    await fixture.whenStable();
    const req = httpMock().expectOne(API + '/preferences');
    expect(req.request.body).toEqual({ notice: 'hidden' });
    req.flush({ notice: 'hidden' });
    await settle(fixture);
    expect(text(fixture, '.settings-status')).toBe(
      'Saved: the notice is hidden. A line of it stays at the top of each page.'
    );
  });
});
