import { Location } from '@angular/common';
import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import type { MockInstance } from 'vitest';
import { App } from '../app';
import { AuthService } from '../core/auth.service';
import { OFFERED_LANGUAGES } from '../i18n/language';
import {
  answer,
  API,
  fieldProblem,
  httpMock,
  settle,
  skippedHeadings,
  testProviders,
  text
} from '../testing/test-providers';
import { AboutPage } from './about/about-page';
import { AdditivePage } from './additive/additive-page';
import { AdvicePage } from './advice/advice-page';
import { HomePage } from './home/home-page';
import { LandingPage } from './landing/landing-page';
import { NotFoundPage } from './not-found/not-found-page';
import { PRIVACY_ADDRESS, PrivacyPage, STORED } from './privacy/privacy-page';
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
    expect(links).toEqual([
      '/recipe#saved-recipes',
      '/import',
      '/blends',
      '/material',
      '/additive',
      '/firing',
      '/notes',
      '/advice',
      '/guides',
      '/account'
    ]);
    expect(home.nativeElement.querySelector('.home-welcome')).toBeNull();
    const trash = await create(TrashPage);
    httpMock()
      .expectOne(API + '/trash/getAll')
      .flush([]);
    await settle(trash.fixture);
    expect(text(trash.fixture)).toContain('The Trash is empty.');
    expect(text((await create(NotFoundPage)).fixture)).toContain('Page not found');
  });

  it('welcomes a new account once, with its first step and the emailed link to open', async () => {
    const auth = TestBed.inject(AuthService);
    auth.welcome.set(true);
    auth.email.set('new@example.com');
    auth.unverified.set(true);
    const first = (await create(HomePage)).fixture;
    expect(text(first, '.home-welcome h2')).toBe('Welcome to Glazecalc');
    expect(first.nativeElement.querySelector('.home-welcome a.btn').getAttribute('href')).toBe('/recipe');
    expect(text(first, '.home-confirm')).toContain('we sent a link to new@example.com');
    expect(first.nativeElement.querySelector('.home-confirm a').getAttribute('href')).toBe('/account');
    first.destroy();

    // The next visit: only the email, until it is confirmed.
    const next = (await create(HomePage)).fixture;
    expect(text(next, '.home-welcome h2')).toBe('Confirm your email');
    // The heading says it, so the line under it does not again.
    expect(text(next, '.home-confirm')).toMatch(/^We sent a link to new@example.com\./);
    expect(next.nativeElement.querySelector('.home-welcome a.btn')).toBeNull();
    next.destroy();
    auth.unverified.set(false);
    expect((await create(HomePage)).fixture.nativeElement.querySelector('.home-welcome')).toBeNull();
  });

  it('shows the about and privacy pages with one h1 each', async () => {
    for (const page of [AboutPage, PrivacyPage] as Type<unknown>[]) {
      const { fixture } = await create(page);
      expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    }
  });

  it('lists the offered languages on the about page, each in its own name and linked to the about page in it', async () => {
    TestBed.overrideProvider(OFFERED_LANGUAGES, { useValue: ['en', 'de', 'fr'] });
    const { fixture } = await create(AboutPage);
    const nav = fixture.nativeElement.querySelector('nav[aria-labelledby="about-languages-heading"]') as HTMLElement;
    expect(nav).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#about-languages-heading')).not.toBeNull();
    const links = [...nav.querySelectorAll('li a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/about', '/de/about', '/fr/about']);
    expect(links.map((a) => a.getAttribute('lang'))).toEqual(['en', 'de', 'fr']);
    expect(links.map((a) => a.textContent)).toEqual(['English', 'Deutsch', 'Français']);
  });

  it('leaves the language list off the about page while only English is offered', async () => {
    TestBed.overrideProvider(OFFERED_LANGUAGES, { useValue: ['en'] });
    const { fixture } = await create(AboutPage);
    expect(fixture.nativeElement.querySelector('#about-languages-heading')).toBeNull();
  });

  it('gives the private contact, and lists the cookie and every storage key with what it is for and how long it stays', async () => {
    const { fixture } = await create(PrivacyPage);
    const mail = [...fixture.nativeElement.querySelectorAll('a')].filter(
      (a: HTMLAnchorElement) => a.getAttribute('href') === 'mailto:' + PRIVACY_ADDRESS
    );
    expect(mail.length).toBeGreaterThan(0);
    const rows = [...fixture.nativeElement.querySelectorAll('#storage tbody tr')] as HTMLElement[];
    expect(rows.length).toBe(STORED.length);
    const names = rows.flatMap((row) => [...row.querySelectorAll('th code')].map((code) => code.textContent));
    expect(names).toEqual(
      expect.arrayContaining(['__Host-glazecalc_session', 'glazecalc_session', 'session', 'trial', 'preferredRegion'])
    );
    expect(names).toEqual(expect.arrayContaining(['visitor.language', 'region', 'printBatch', 'reloadedFor']));
    expect(names.length).toBe(29);
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '');
      expect(cells.length).toBe(2);
      expect(cells.every((cell) => cell.length > 0 && !cell.startsWith('site.'))).toBe(true);
    }
    expect(text(fixture, '#storage')).toContain('there is no cookie banner');
  });

  it('says, for everyone, where accounts are kept, that anyone can run their own copy, and whose choice it is', async () => {
    const { fixture } = await create(PrivacyPage);
    const choice = text(fixture, '#your-choice');
    expect(choice).toContain('Where your account is kept, and your choice');
    expect(choice).toContain('kept on servers in the United States');
    expect(choice).toContain('is your own decision');
    expect(choice).toContain('provided as is, without warranty');
    expect(fixture.nativeElement.querySelector('#your-choice a').getAttribute('href')).toBe(
      'https://github.com/AaronFilson/glazecalc'
    );
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
    // New, mine and the standard ones are each a part of the page under its title.
    await fixture.whenStable();
    expect(skippedHeadings(fixture)).toEqual([]);

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
  it('says when there are no notes yet, once they have been asked for', async () => {
    const { fixture } = await create(NotesPage);
    expect(fixture.nativeElement.querySelector('.notes-empty')).toBeNull();
    answer('/notes/getAll', []);
    await settle(fixture);
    expect(text(fixture, '.notes-empty')).toBe('None yet. Saved notes appear here.');
    expect(text(fixture, 'label[for=title]')).toBe('Title');
    expect(text(fixture, 'label[for=content]')).toBe('Note');
  });

  it('saves notes as general notes', async () => {
    const { fixture, page } = await create(NotesPage);
    answer('/notes/getAll', [
      { _id: 'n0', title: 'Old', content: '1. Sieve\n2. Wax', relatedCollection: 'Notes', relatedId: 'general notes' }
    ]);
    await settle(fixture);
    // Shown with its line breaks (.keep-lines in styles.scss).
    expect(fixture.nativeElement.querySelector('.my-notes .keep-lines').textContent).toBe('1. Sieve\n2. Wax');
    expect(skippedHeadings(fixture)).toEqual([]);

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
    // "Account", with the email in small text and its first letter in a circle.
    expect(text(fixture, '.account-link .account-label')).toBe('Account');
    expect(text(fixture, '.account-email')).toBe('a@b.com');
    expect(text(fixture, '.nav-account .account-initial')).toBe('A');
    expect(fixture.nativeElement.querySelector('.account-link').getAttribute('href')).toBe('/account');

    // A page with changes not saved can keep the visitor (core/leave.guard.ts): then nothing happens.
    navigate.mockResolvedValueOnce(false);
    const signOut = () => (fixture.nativeElement.querySelector('.nav-account button') as HTMLButtonElement).click();
    signOut();
    await settle(fixture);
    httpMock().expectNone(API + '/signout');
    expect(TestBed.inject(AuthService).hasSession()).toBe(true);

    // The page is left first, then the session ends.
    signOut();
    await settle(fixture);
    httpMock()
      .expectOne({ method: 'POST', url: API + '/signout' })
      .flush({ msg: 'Signed out' });
    await fixture.whenStable();
    expect(TestBed.inject(AuthService).hasSession()).toBe(false);
    expect(navLinks(fixture)).toEqual(['Guides', 'Advice', 'About']);
    expect(navigate).toHaveBeenCalledWith('/signin', { onSameUrlNavigation: 'reload' });
    expect(fixture.nativeElement.querySelector('.nav-account a[href="/signin"]')).not.toBeNull();

    // Halfway through signing in, the menu does not offer to start again.
    TestBed.inject(AuthService).secondStepPending.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.nav-account')).toBeNull();
    expect(fixture.nativeElement.querySelector('.nav-quick-signin')).toBeNull();
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

  describe('moving to another page', () => {
    @Component({ template: '<h1>First</h1>' })
    class First {}
    @Component({ template: '<h1>Second</h1><p>Text</p><h2 id="part" tabindex="-1">Part</h2>' })
    class Second {}

    const open = async (url: string) => {
      await TestBed.inject(Router).navigateByUrl(url);
      await settle(fixture);
    };
    let fixture: ComponentFixture<App>;
    let scrollTo: MockInstance<typeof window.scrollTo>;
    beforeEach(async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ...testProviders(),
          provideRouter([
            { path: 'first', component: First },
            { path: 'second', component: Second }
          ])
        ]
      });
      scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      // Back and forward, as the app's start sets them up.
      TestBed.inject(Router).setUpLocationChangeListener();
      ({ fixture } = await create(App));
      await open('/first');
    });
    afterEach(() => scrollTo.mockRestore());
    const focused = () => document.activeElement?.textContent;

    it('opens it at its top, with the focus on its heading, as a page loads', async () => {
      // Not the first page, which the browser opens.
      expect(scrollTo).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(document.body);
      await open('/second');
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
      expect(focused()).toBe('Second');
      expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    });

    it('opens it at the section its address names, with the focus there', async () => {
      await open('/second#part');
      // The router scrolls to the section (app.config.ts).
      expect(scrollTo).not.toHaveBeenCalled();
      expect(focused()).toBe('Part');
    });

    it('leaves the scroll position to the browser on back and forward', async () => {
      await open('/second');
      scrollTo.mockClear();
      const router = TestBed.inject(Router);
      const back = firstValueFrom(router.events.pipe(filter((event) => event instanceof NavigationEnd)));
      TestBed.inject(Location).back();
      expect((await back).url).toBe('/first');
      await settle(fixture);
      expect(focused()).toBe('First');
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('leaves the page as it is when only its query changes (the recipe’s print view places the focus itself)', async () => {
      await open('/first?print=draft');
      expect(scrollTo).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(document.body);
    });
  });
});
