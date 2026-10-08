import { TestBed } from '@angular/core/testing';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
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
});
