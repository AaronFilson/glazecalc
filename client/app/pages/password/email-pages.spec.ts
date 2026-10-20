import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  answer,
  API,
  fieldProblem,
  httpMock,
  NO_TOKENS,
  settle,
  testProviders,
  text
} from '../../testing/test-providers';
import { AccountPage } from './account-page';
import { ConfirmEmailPage } from './confirm-email-page';

type Page = Record<string, any>;

describe('AccountPage email and sessions', () => {
  const create = async (unverified = false) => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({ providers: testProviders() });
    TestBed.inject(AuthService).unverified.set(unverified);
    const fixture = TestBed.createComponent(AccountPage);
    await fixture.whenStable();
    answer('/preferences', { weightUnit: 'g' });
    answer('/share/recipes', []);
    answer('/mfa', { on: false, emailConfirmed: !unverified, totp: null, passkeys: [], codesLeft: 0 });
    answer('/tokens', NO_TOKENS);
    await settle(fixture);
    return { fixture, page: fixture.componentInstance as unknown as Page };
  };
  afterEach(() => httpMock().verify());

  it('asks for a link to the new address with the password, and says the email has not changed yet', async () => {
    const { fixture, page } = await create();
    page['newEmail'].set('new@b.com');
    page['emailPassword'].set('my-password');
    const sending = page['changeEmail']();
    const req = httpMock().expectOne(API + '/email/change');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'new@b.com', password: 'my-password' });
    req.flush({ msg: 'We have sent a link to the new address.' });
    await sending;
    await fixture.whenStable();
    expect(text(fixture, '.server-msg')).toContain('We have sent a link');
    expect(page['newEmail']()).toBe('');
    expect(page['emailPassword']()).toBe('');
  });

  it('marks the field the server names, and keeps the sign-in', async () => {
    const { fixture, page } = await create();
    page['newEmail'].set('taken@b.com');
    page['emailPassword'].set('my-password');
    const sending = page['changeEmail']();
    httpMock()
      .expectOne(API + '/email/change')
      .flush({ msg: 'That email is already in use', field: 'email' }, { status: 400, statusText: 'Bad Request' });
    await sending;
    await settle(fixture);
    expect(fieldProblem(fixture, 'new-email')).toBe('That email is already in use');
    expect(TestBed.inject(AuthService).hasSession()).toBe(true);
  });

  it('will not send an address that is not one', async () => {
    const { fixture, page } = await create();
    page['newEmail'].set('nope');
    page['emailPassword'].set('my-password');
    await fixture.whenStable();
    await page['changeEmail']();
    httpMock().expectNone(API + '/email/change');
  });

  it('offers to send the confirmation link again only while the email is unconfirmed', async () => {
    const { fixture, page } = await create(true);
    expect(text(fixture, '.unverified-email h2')).toBe('Confirm your email');
    const sending = page['resend']();
    const req = httpMock().expectOne(API + '/email/resend');
    expect(req.request.method).toBe('POST');
    req.flush({ msg: 'We have sent a new link to your email.' });
    await sending;
    await fixture.whenStable();
    expect(text(fixture, '.server-msg')).toContain('We have sent a new link');
  });

  it('shows no such offer once the email is confirmed', async () => {
    const { fixture } = await create(false);
    expect(fixture.nativeElement.querySelector('.unverified-email')).toBeNull();
  });

  it('signs out everywhere and goes to the sign-in page', async () => {
    const { page } = await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const signingOut = page['signOutEverywhere']();
    const req = httpMock().expectOne(API + '/signout-everywhere');
    expect(req.request.method).toBe('POST');
    req.flush({ msg: 'You have been signed out on every device.' });
    await signingOut;
    expect(TestBed.inject(AuthService).hasSession()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/signin');
  });

  it('stays signed in, with the reason, when signing out everywhere fails', async () => {
    const { fixture, page } = await create();
    const signingOut = page['signOutEverywhere']();
    httpMock()
      .expectOne(API + '/signout-everywhere')
      .flush({ msg: 'Server Error' }, { status: 500, statusText: 'Server Error' });
    await signingOut;
    await fixture.whenStable();
    expect(text(fixture, '.errors-section')).toContain('Server Error');
    expect(TestBed.inject(AuthService).hasSession()).toBe(true);
  });
});

describe('ConfirmEmailPage', () => {
  const create = async (token: string | null, session = false) => {
    localStorage.clear();
    if (session) localStorage.setItem('session', 'account');
    const replaceState = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: { snapshot: { fragment: token ? 'token=' + token : null } } },
        { provide: Location, useValue: { replaceState } }
      ]
    });
    const fixture = TestBed.createComponent(ConfirmEmailPage);
    await fixture.whenStable();
    return { fixture, page: fixture.componentInstance as unknown as Page, replaceState };
  };
  afterEach(() => httpMock().verify());

  it('takes the token out of the address bar and spends it only when asked', async () => {
    const { fixture, page, replaceState } = await create('tok123');
    expect(replaceState).toHaveBeenCalledWith('/confirm-email');
    httpMock().expectNone(API + '/email/confirm');
    const confirming = page['confirm']();
    const req = httpMock().expectOne(API + '/email/confirm');
    expect(req.request.body).toEqual({ token: 'tok123' });
    req.flush({
      code: 'email-changed',
      msg: 'Your email has been changed. Please sign in again with the new address.'
    });
    await confirming;
    await fixture.whenStable();
    expect(text(fixture, '.done-text')).toContain('Your email has been changed.');
    expect(fixture.nativeElement.querySelector('a[href="/signin"]')).not.toBeNull();
  });

  it('ends this browser session when the email changed, since every device is signed out', async () => {
    const { page } = await create('tok123', true);
    const auth = TestBed.inject(AuthService);
    expect(auth.hasSession()).toBe(true);
    const confirming = page['confirm']();
    httpMock()
      .expectOne(API + '/email/confirm')
      .flush({ code: 'email-changed', msg: 'Your email has been changed.' });
    await confirming;
    expect(auth.hasSession()).toBe(false);
  });

  it('shows an expired link', async () => {
    const { fixture, page } = await create('old');
    const confirming = page['confirm']();
    httpMock()
      .expectOne(API + '/email/confirm')
      .flush(
        { msg: 'This link is not valid or has expired. Please ask for a new one.' },
        { status: 400, statusText: 'Bad Request' }
      );
    await confirming;
    await fixture.whenStable();
    expect(text(fixture, '.errors-section')).toContain('not valid or has expired');
    expect(page['done']()).toBeNull();
  });

  it('explains a link without a token', async () => {
    const { fixture, replaceState } = await create(null);
    expect(replaceState).not.toHaveBeenCalled();
    expect(text(fixture, '.help-text')).toContain('this one is incomplete');
  });

  describe('going on to the page the sign-up was for (&next=)', () => {
    const CONNECT = '/connect/aB3_dE5-gH7iJ9kL1mN';
    const open = async (next: string, session: boolean) => {
      localStorage.clear();
      if (session) localStorage.setItem('session', 'account');
      const replaceState = vi.fn();
      TestBed.configureTestingModule({
        providers: [
          ...testProviders(),
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { fragment: 'token=tok123&next=' + encodeURIComponent(next) } }
          },
          { provide: Location, useValue: { replaceState } }
        ]
      });
      const fixture = TestBed.createComponent(ConfirmEmailPage);
      await fixture.whenStable();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      const page = fixture.componentInstance as unknown as Page;
      const confirming = page['confirm']();
      const req = httpMock().expectOne(API + '/email/confirm');
      expect(req.request.body).toEqual({ token: 'tok123' });
      req.flush({ code: 'email-verified', msg: 'Your email is confirmed.' });
      if (session) {
        await settle();
        answer('/verify', { msg: 'User verified', id: 'u1', email: 'a@b.com' });
      }
      await confirming;
      await settle(fixture);
      return { fixture, navigate, replaceState };
    };
    const signInLink = (fixture: { nativeElement: HTMLElement }) =>
      fixture.nativeElement.querySelector('.done-text + p a')?.getAttribute('href');

    it('goes there once confirmed, signed in, with the token and the page out of the address bar', async () => {
      const { navigate, replaceState } = await open(CONNECT, true);
      expect(replaceState).toHaveBeenCalledWith('/confirm-email');
      expect(navigate).toHaveBeenCalledWith(CONNECT);
    });

    it('goes there through the sign-in page when not signed in on this browser', async () => {
      const { fixture, navigate } = await open(CONNECT, false);
      expect(navigate).not.toHaveBeenCalled();
      expect(signInLink(fixture)).toBe('/signin?next=' + encodeURIComponent(CONNECT));
    });

    for (const bad of [
      '//evil.example/x',
      '/\\evil.example',
      'https://evil.example/',
      'javascript:alert(1)',
      '/signin'
    ]) {
      it(`goes nowhere else for ${bad}`, async () => {
        const signedIn = await open(bad, true);
        expect(signedIn.navigate).not.toHaveBeenCalled();
        TestBed.resetTestingModule();
        const signedOut = await open(bad, false);
        expect(signInLink(signedOut.fixture)).toBe('/signin');
      });
    }
  });
});
