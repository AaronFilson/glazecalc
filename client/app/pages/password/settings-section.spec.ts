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
