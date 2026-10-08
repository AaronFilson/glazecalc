import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from '../app';
import { AuthService } from '../core/auth.service';
import { answer, API, fieldProblem, httpMock, settle, testProviders, text } from '../testing/test-providers';
import { AboutPage } from './about/about-page';
import { AdditivePage } from './additive/additive-page';
import { AdvicePage } from './advice/advice-page';
import { HomePage } from './home/home-page';
import { LandingPage } from './landing/landing-page';
import { NotFoundPage } from './not-found/not-found-page';
import { PrivacyPage } from './privacy/privacy-page';
import { NotesPage } from './notes/notes-page';
import { TrashPage } from './trash/trash-page';

beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: testProviders() });
});
afterEach(() => httpMock().verify());

const create = async <T>(component: Type<T>) => {
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return { fixture, page: fixture.componentInstance as unknown as Record<string, any> };
};

describe('static pages', () => {
  it('renders home, trash and not found', async () => {
    const home = (await create(HomePage)).fixture;
    expect(text(home, 'h1')).toBe('Your studio notebook');
    const links = [...home.nativeElement.querySelectorAll('.home-card')].map((a: HTMLAnchorElement) =>
      a.getAttribute('href')
    );
    expect(links).toEqual(['/recipe', '/material', '/additive', '/firing', '/notes', '/advice', '/guides']);
    expect(text((await create(TrashPage)).fixture)).toContain('trash functionality is coming soon');
    expect(text((await create(NotFoundPage)).fixture)).toContain('Page not found');
  });

  it('shows the about and privacy pages with one h1 each', async () => {
    for (const page of [AboutPage, PrivacyPage]) {
      const { fixture } = await create(page);
      expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    }
  });
});

describe('LandingPage', () => {
  it('shows the example recipe with its unity formula, worked out in the browser', async () => {
    const { fixture } = await create(LandingPage);
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    const rows = [...fixture.nativeElement.querySelectorAll('.example-recipe tbody tr')].map((tr: Element) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim())
    );
    expect(rows).toEqual([
      ['Potash Feldspar', '40'],
      ['Silica', '30'],
      ['Whiting', '20'],
      ['Kaolin', '10']
    ]);
    const umf = text(fixture, '.unity-result');
    // Leach 4321, checked by hand in the server chemistry tests.
    expect(umf).toContain('K₂O : 0.264');
    expect(umf).toContain('CaO : 0.736');
    expect(umf).toContain('Al₂O₃ : 0.407');
    expect(umf).toContain('SiO₂ : 3.710');
    expect(umf).toContain('Ratio of Silica to Alumina : 9.11');
    // "Try it now" (a button that starts a trial), then sign-up.
    const cta = [...fixture.nativeElement.querySelectorAll('.hero-actions > *')].map(
      (el: HTMLElement) => el.getAttribute('href') ?? el.textContent?.trim()
    );
    expect(cta).toEqual(['Try it now', '/signup']);
  });
});

describe('AdditivePage', () => {
  it('saves a stain with no oxide analysis, leaving out the oxide fields', async () => {
    const { fixture, page } = await create(AdditivePage);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', []);
    await settle(fixture);
    const box = fixture.nativeElement.querySelector('#additive-no-chemistry') as HTMLInputElement;
    box.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#additive-oxide')).toBeNull();
    expect(fixture.nativeElement.querySelector('#additive-loi')).toBeNull();
    page['form'].name.set('Mason 6600');
    const saving = page['save']();
    const req = httpMock().expectOne(API + '/additives/create');
    expect(req.request.body).toEqual({ name: 'Mason 6600', noChemistry: true, fields: [] });
    req.flush({ ...req.request.body, _id: 'm1' });
    await saving;
    expect(page['form'].noChemistry()).toBe(false);
  });

  it('saves an additive as fired oxides, with its weights worked out', async () => {
    const { fixture, page } = await create(AdditivePage);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', [
      { _id: 's', name: 'Tin oxide', notes: ['Opacifier'], fields: [{ name: 'SnO2', amount: '1' }] }
    ]);
    await settle(fixture);
    expect(text(fixture, 'table')).toContain('Tin oxide');

    const form = page['form'];
    form.addOxide();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'additive-oxide')).toBe('Choose an oxide, then Add the oxide to the list.');
    // Black cobalt oxide, Co3O4: CoO with a 6.64% LOI.
    form.name.set('My Stain');
    form.loi.set('6.64');
    for (const oxide of ['CoO', 'NiO']) {
      form.selectedOxide.set(oxide);
      form.addOxide();
    }
    form.formula()[0].amount = '1';
    form.removeOxide(1);

    const saving = page['save']();
    const req = httpMock().expectOne(API + '/additives/create');
    expect(req.request.body).toEqual(
      expect.objectContaining({
        name: 'My Stain',
        percentmole: 'molecular',
        loi: 6.64,
        equivalent: 80.26,
        formulaweight: 74.93,
        fields: [{ name: 'CoO', amount: '1', amountUnity: 1 }]
      })
    );
    req.flush({ ...req.request.body, _id: 'a1' });
    await saving;
    expect(page['myAdditives']().map((a: { name: string }) => a.name)).toEqual(['My Stain']);
    expect(form.name()).toBe('');

    const removing = page['removal'].remove(page['myAdditives']()[0]);
    httpMock()
      .expectOne(API + '/additives/delete/a1')
      .flush({}, { status: 500, statusText: 'Error' });
    expect(await removing).toBe(false);
    // Shown in the record's Remove question.
    expect(page['removal'].problemFor(page['myAdditives']()[0])).toBe('It could not be removed. Please try again.');
    expect(page['myAdditives']().length).toBe(1);
  });
});

describe('AdvicePage', () => {
  it('shows the general advice to visitors, with no form and no request for their own', async () => {
    const { fixture } = await create(AdvicePage);
    answer('/advice/getStandard', [{ _id: 's', title: 'Sieve', content: 'Use 80 mesh', tags: ['mixing'] }]);
    httpMock().expectNone(API + '/advice/getAll');
    await settle(fixture);
    expect(text(fixture, '.general-advice')).toContain('Use 80 mesh');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(text(fixture)).toContain('Create a free account or sign in to keep advice of your own.');
  });

  it('lists, adds and removes advice', async () => {
    localStorage.setItem('session', 'account');
    const { fixture, page } = await create(AdvicePage);
    answer('/advice/getAll', []);
    answer('/advice/getStandard', [{ _id: 's', title: 'Sieve', content: 'Use 80 mesh', tags: ['mixing', 'tools'] }]);
    await settle(fixture);
    expect(text(fixture, '.general-advice')).toContain('Tags: mixing, tools');

    await page['save']();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'advice-title')).toBe('Give the advice a title.');
    expect(fieldProblem(fixture, 'advice-content')).toBe('Write the advice.');

    page['title'].set('Wax');
    page['content'].set('Wax the foot');
    const saving = page['save']();
    const req = httpMock().expectOne(API + '/advice/create');
    expect(req.request.body).toEqual({ title: 'Wax', content: 'Wax the foot', tags: 'none' });
    req.flush({ ...req.request.body, _id: 'a1', tags: ['none'] });
    await saving;
    await fixture.whenStable();
    expect(text(fixture, '.my-advice')).toContain('Wax the foot');

    const removing = page['removal'].remove(page['myAdvice']()[0]);
    httpMock()
      .expectOne(API + '/advice/delete/a1')
      .flush({});
    await removing;
    expect(page['myAdvice']()).toEqual([]);
  });
});

describe('NotesPage', () => {
  it('saves notes as general notes', async () => {
    const { fixture, page } = await create(NotesPage);
    answer('/notes/getAll', [
      { _id: 'n0', title: 'Old', content: 'kept', relatedCollection: 'Notes', relatedId: 'general notes' }
    ]);
    await settle(fixture);
    expect(text(fixture, '.my-notes')).toContain('kept');

    page['title'].set('Kiln');
    page['content'].set('Element 3 is weak');
    const saving = page['save']();
    const req = httpMock().expectOne(API + '/notes/create');
    expect(req.request.body).toEqual({
      title: 'Kiln',
      content: 'Element 3 is weak',
      relatedCollection: 'Notes',
      relatedId: 'general notes'
    });
    req.flush({ msg: 'Missing required information' }, { status: 400, statusText: 'Bad Request' });
    await saving;
    expect(page['notices'].errors()).toEqual(['Missing required information']);
    expect(page['title']()).toBe('Kiln');
  });
});

describe('App', () => {
  const navLinks = (fixture: { nativeElement: HTMLElement }) =>
    [...fixture.nativeElement.querySelectorAll('.nav-links a')].map((a) => a.textContent?.trim());

  it('shows the app menu and account to a signed-in user, and signs out to the sign-in page', async () => {
    localStorage.setItem('session', 'account');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: testProviders() });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { fixture } = await create(App);
    httpMock()
      .expectOne(API + '/verify')
      .flush({ msg: 'User verified', id: 'u1', email: 'a@b.com' });
    await settle(fixture);
    expect(navLinks(fixture)).toEqual([
      'Recipes',
      'Materials',
      'Additives',
      'Firing logs',
      'Notes',
      'Advice',
      'Guides'
    ]);
    expect(text(fixture, '.account-email')).toBe('a@b.com');

    (fixture.nativeElement.querySelector('.nav-account button') as HTMLButtonElement).click();
    httpMock()
      .expectOne({ method: 'POST', url: API + '/signout' })
      .flush({ msg: 'Signed out' });
    await fixture.whenStable();
    expect(TestBed.inject(AuthService).hasSession()).toBe(false);
    expect(navLinks(fixture)).toEqual(['Guides', 'Advice', 'About']);
    expect(navigate).toHaveBeenCalledWith('/signin');
  });

  it('opens and closes the phone menu', async () => {
    const { fixture, page } = await create(App);
    const toggle = fixture.nativeElement.querySelector('.nav-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#main-menu').classList).toContain('open');
    page['menuOpen'].set(false);
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('has a skip link, one main landmark, and the footer once the first page is in place', async () => {
    const { fixture } = await create(App);
    expect(fixture.nativeElement.querySelector('a.skip-link').getAttribute('href')).toBe('#main');
    expect(fixture.nativeElement.querySelectorAll('main#main').length).toBe(1);
    // Not before: it would paint at the bottom of the window and then jump down.
    expect(fixture.nativeElement.querySelector('footer')).toBeNull();
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    expect(text(fixture, 'footer')).toContain('Privacy');
  });

  it('skips to the content by moving focus, without following the link (which would reload the app)', async () => {
    const { fixture } = await create(App);
    const link = fixture.nativeElement.querySelector('a.skip-link') as HTMLAnchorElement;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('main#main'));
  });
});
