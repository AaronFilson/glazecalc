import { HttpClient } from '@angular/common/http';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { AuthPage } from './pages/auth/auth-page';
import { HomePage } from './pages/home/home-page';
import { LandingPage } from './pages/landing/landing-page';
import { AccountPage } from './pages/password/account-page';
import { API, answer, httpMock, settle, testProviders, text } from './testing/test-providers';

// Trials ("Try it now"): an account with a generated name and no email or
// password, removed when it expires, that can become a real account.
const DAY = 24 * 60 * 60 * 1000;
const NAME = 'speckled quiet kilns';
const unauthorized = { status: 401, statusText: 'Unauthorized' };

/** A trial in storage, as a reload finds it. */
const storeTrial = (expiresAt = new Date(Date.now() + 3 * DAY)) => {
  localStorage.setItem('session', 'trial');
  localStorage.setItem('trial', JSON.stringify({ name: NAME, expiresAt }));
};

const setup = (providers: unknown[] = []) => {
  TestBed.configureTestingModule({ providers: [...testProviders(), ...(providers as never[])] });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { auth: TestBed.inject(AuthService), navigate };
};

const create = async <T>(component: Type<T>) => {
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return { fixture, page: fixture.componentInstance as unknown as Record<string, any> };
};

beforeEach(() => localStorage.clear());
afterEach(() => httpMock().verify());

describe('AuthService trials', () => {
  it('starts a trial, and notes it with its name and expiry', async () => {
    const { auth } = setup();
    const done = auth.startTrial();
    const req = httpMock().expectOne(API + '/guest');
    expect(req.request.method).toBe('POST');
    req.flush({ guest: true, name: NAME, expiresAt: '2026-10-12T10:00:00.000Z' });
    await done;

    expect(auth.hasSession()).toBe(true);
    expect(localStorage.getItem('session')).toBe('trial');
    expect(auth.email()).toBeNull();
    expect(auth.trial()).toEqual({ name: NAME, expiresAt: new Date('2026-10-12T10:00:00.000Z') });
    expect(auth.displayName()).toBe(NAME);
    expect(JSON.parse(localStorage.getItem('trial')!).name).toBe(NAME);
  });

  it('finds a stored trial on reload, and checks it with the server', async () => {
    storeTrial();
    const { auth } = setup();
    expect(auth.trial()?.name).toBe(NAME);
    const done = auth.refresh();
    httpMock()
      .expectOne(API + '/verify')
      .flush({ msg: 'User verified', id: 'u1', name: NAME, guest: true, expiresAt: '2026-10-12T10:00:00.000Z' });
    await done;
    expect(auth.trial()?.expiresAt).toEqual(new Date('2026-10-12T10:00:00.000Z'));
    expect(auth.email()).toBeNull();
  });

  it('ends a stored trial that ran out while the site was closed', () => {
    storeTrial(new Date(Date.now() - 1000));
    const { auth } = setup();
    expect(auth.hasSession()).toBe(false);
    expect(auth.trial()).toBeNull();
    expect(auth.trialEnded()).toBe(true);
    expect(localStorage.getItem('trial')).toBeNull();
  });

  it('ignores trial details left without a session, or unreadable', () => {
    localStorage.setItem('trial', JSON.stringify({ name: NAME, expiresAt: new Date(Date.now() + DAY) }));
    expect(setup().auth.trial()).toBeNull();
    expect(localStorage.getItem('trial')).toBeNull();

    TestBed.resetTestingModule();
    localStorage.setItem('session', 'trial');
    localStorage.setItem('trial', '{not json');
    expect(setup().auth.trial()).toBeNull();
  });

  it('turns the trial into an account on sign-up', async () => {
    storeTrial();
    const { auth } = setup();
    const done = auth.signUp('a@b.com', 'password123');
    const req = httpMock().expectOne(API + '/guest/claim');
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'password123' });
    req.flush({ email: 'a@b.com' });
    await done;
    expect(auth.hasSession()).toBe(true);
    expect(auth.trial()).toBeNull();
    expect(auth.displayName()).toBe('a@b.com');
    expect(localStorage.getItem('trial')).toBeNull();
  });

  it('leaves the trial behind on sign-in', async () => {
    storeTrial();
    const { auth } = setup();
    const done = auth.signIn('a@b.com', 'password123');
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'a@b.com' });
    await done;
    expect(auth.trial()).toBeNull();
  });

  it('discards the trial on the server, then signs out', async () => {
    storeTrial();
    const { auth } = setup();
    const done = auth.discardTrial();
    httpMock()
      .expectOne(API + '/verify')
      .flush({ msg: 'User verified', id: 'u1', name: NAME, guest: true, expiresAt: '2026-10-12T10:00:00.000Z' });
    await settle();
    const del = httpMock().expectOne(API + '/deleteuser/u1');
    expect(del.request.method).toBe('DELETE');
    del.flush({ msg: 'User deleted' });
    await done;
    expect(auth.hasSession()).toBe(false);
    expect(auth.trial()).toBeNull();
    expect(auth.trialEnded()).toBe(false);
  });

  it('refuses to discard an account that is not a trial', async () => {
    localStorage.setItem('session', 'account');
    const { auth } = setup();
    const done = auth.discardTrial();
    httpMock()
      .expectOne(API + '/verify')
      .flush({ msg: 'User verified', id: 'u1', email: 'a@b.com' });
    await expect(done).rejects.toThrow('Not a trial');
    expect(auth.hasSession()).toBe(true);
  });

  it('ends the trial when the server no longer accepts it', async () => {
    storeTrial();
    const { auth, navigate } = setup();
    const result = firstValueFrom(TestBed.inject(HttpClient).get(API + '/recipe/getAll')).catch((err) => err);
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush({ msg: 'could not authenticate user' }, unauthorized);
    expect((await result).status).toBe(401);
    expect(auth.hasSession()).toBe(false);
    expect(auth.trialEnded()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/');

    // So does a rejected /verify, without leaving the page.
    TestBed.resetTestingModule();
    storeTrial();
    const again = setup();
    const done = again.auth.refresh();
    httpMock()
      .expectOne(API + '/verify')
      .flush({ msg: 'could not authenticate user' }, unauthorized);
    await done;
    expect(again.auth.trialEnded()).toBe(true);
    expect(again.navigate).not.toHaveBeenCalled();
  });
});

describe('the trial bar', () => {
  const trialBar = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.querySelector('.trial-bar');
  const button = (fixture: { nativeElement: HTMLElement }, label: string) =>
    [...fixture.nativeElement.querySelectorAll('.trial-bar button')].find(
      (b) => b.textContent?.trim() === label
    ) as HTMLButtonElement;

  it('names the trial and its end date, with no sign-out button', async () => {
    // Far in the future, so the trial never runs out before the test does (12 October 2099 is a Monday).
    storeTrial(new Date(2099, 9, 12, 12));
    setup();
    const { fixture } = await create(App);
    httpMock().expectOne(API + '/verify');
    expect(text(fixture, '.trial-bar')).toContain(
      "You're trying Glazecalc as " + NAME + '. Your work is kept until Monday, October 12.'
    );
    expect(text(fixture, '.account-email')).toBe(NAME);
    expect(fixture.nativeElement.querySelector('.trial-bar a').getAttribute('href')).toBe('/signup');
    expect(text(fixture, '.nav-account')).not.toContain('Sign out');
  });

  it('asks before discarding, then discards and goes to the start page', async () => {
    storeTrial();
    const { auth, navigate } = setup();
    const { fixture } = await create(App);
    httpMock().expectOne(API + '/verify');
    const discard = vi.spyOn(auth, 'discardTrial').mockResolvedValue();

    button(fixture, 'Discard trial').click();
    await fixture.whenStable();
    expect(text(fixture, '.trial-bar')).toContain('Discard everything you made in this trial?');
    button(fixture, 'Keep trying').click();
    await fixture.whenStable();
    expect(text(fixture, '.trial-bar')).toContain("You're trying Glazecalc");

    button(fixture, 'Discard trial').click();
    await fixture.whenStable();
    button(fixture, 'Discard it').click();
    await settle(fixture);
    expect(discard).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('says so when discarding fails', async () => {
    storeTrial();
    const { auth } = setup();
    const { fixture, page } = await create(App);
    httpMock().expectOne(API + '/verify');
    vi.spyOn(auth, 'discardTrial').mockRejectedValue(new Error('offline'));
    await page['discard']();
    await fixture.whenStable();
    expect(text(fixture, '.trial-error')).toBe('Could not discard the trial. Please try again.');
  });

  it('is not shown to an account', async () => {
    localStorage.setItem('session', 'account');
    setup();
    const { fixture } = await create(App);
    httpMock()
      .expectOne(API + '/verify')
      .flush({ msg: 'User verified', id: 'u1', email: 'a@b.com' });
    await settle(fixture);
    expect(trialBar(fixture)).toBeNull();
    expect(text(fixture, '.nav-account')).toContain('Sign out');
  });
});

describe('LandingPage trials', () => {
  it('starts a trial from "Try it now" and opens the calculator', async () => {
    const { navigate } = setup();
    const { fixture } = await create(LandingPage);
    const tryIt = fixture.nativeElement.querySelector('.hero-actions button') as HTMLButtonElement;
    expect(tryIt.textContent?.trim()).toBe('Try it now');
    tryIt.click();
    httpMock()
      .expectOne(API + '/guest')
      .flush({ guest: true, name: NAME, expiresAt: '2026-10-12T10:00:00.000Z' });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith('/recipe');
  });

  it('shows why a trial could not start', async () => {
    setup();
    const { fixture, page } = await create(LandingPage);
    const starting = page['tryIt']();
    httpMock()
      .expectOne(API + '/guest')
      .flush({ msg: 'Too many trials from this address.' }, { status: 429, statusText: 'Too Many Requests' });
    await starting;
    await fixture.whenStable();
    expect(text(fixture, '.hero-text .errors-section')).toBe('Too many trials from this address.');
  });

  it('says when a trial has ended', async () => {
    storeTrial(new Date(Date.now() - 1000));
    setup();
    const { fixture } = await create(LandingPage);
    expect(text(fixture, '.hero-text .server-msg')).toContain('Your trial has ended.');
  });
});

describe('pages during a trial', () => {
  const authPage = async (mode: 'signin' | 'signup') => {
    storeTrial();
    const env = setup([{ provide: ActivatedRoute, useValue: { data: of({ mode }) } }]);
    return { ...env, ...(await create(AuthPage)) };
  };

  it('sign-up keeps the work', async () => {
    const { fixture, page, navigate } = await authPage('signup');
    expect(text(fixture, 'h1')).toBe('Keep your work');
    expect(text(fixture, 'p.muted')).toContain('Keep everything you made as ' + NAME);
    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/guest/claim')
      .flush({ email: 'a@b.com' });
    await submitting;
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('sign-in says it brings the trial along', async () => {
    const { fixture } = await authPage('signin');
    expect(text(fixture, 'h1')).toBe('Sign in');
    expect(text(fixture, '.trial-note')).toContain('Signing in brings what you made as ' + NAME + ' into it.');
  });

  it('the account page offers an account instead of password forms', async () => {
    storeTrial();
    setup();
    const { fixture } = await create(AccountPage);
    answer('/preferences', { weightUnit: 'g' });
    expect(text(fixture, 'h1')).toBe('Your trial');
    expect(text(fixture, '.trial-account')).toContain(NAME + ' stays your display name');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    // A trial has settings too.
    expect(text(fixture, '.settings h2')).toBe('Settings');
  });

  it('the home page greets the trial by name', async () => {
    storeTrial();
    setup();
    const { fixture } = await create(HomePage);
    expect(text(fixture, '.page-header')).toContain('Trying Glazecalc as ' + NAME + '.');
  });
});
