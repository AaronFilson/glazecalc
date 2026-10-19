import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';
import { PreferencesService } from '../../core/preferences.service';
import { API, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { AuthPage } from './auth-page';
import { PASSKEYS, Passkeys } from './passkeys';

type FakePasskeys = { [K in keyof Passkeys]: ReturnType<typeof vi.fn> };

const PASSKEY_RESPONSE = { id: 'cred', rawId: 'cred', type: 'public-key' } as never;

function fakePasskeys(autofill = false): FakePasskeys {
  return {
    supported: vi.fn(() => true),
    autofillSupported: vi.fn(async () => autofill),
    authenticate: vi.fn(async () => PASSKEY_RESPONSE),
    register: vi.fn(),
    cancel: vi.fn()
  };
}

const SECOND_STEP = {
  code: 'second-step',
  msg: 'This account uses two-step sign-in.',
  methods: { totp: true, passkey: false, recovery: true },
  pending: 'pending-token',
  expiresAt: '2999-01-01T00:00:00Z'
};

describe('AuthPage', () => {
  const create = async (mode: 'signin' | 'signup') => {
    TestBed.configureTestingModule({
      providers: [...testProviders(), { provide: ActivatedRoute, useValue: { data: of({ mode }) } }]
    });
    localStorage.clear();
    const fixture = TestBed.createComponent(AuthPage);
    await fixture.whenStable();
    const page = fixture.componentInstance as unknown as Record<string, any>;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return { fixture, page, navigate };
  };

  afterEach(() => httpMock().verify());

  it('signs in and goes home', async () => {
    const { page, navigate } = await create('signin');
    page['email'].set('a@b.com');
    page['password'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'a@b.com' });
    await submitting;
    expect(TestBed.inject(AuthService).email()).toBe('a@b.com');
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('has the keep-me-signed-in box unticked, and sends its choice', async () => {
    const { fixture, page } = await create('signin');
    const box = fixture.nativeElement.querySelector('#keep') as HTMLInputElement;
    expect(box.checked).toBe(false);
    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['keep'].set(true);
    const submitting = page['submit']();
    const req = httpMock().expectOne(API + '/signin');
    expect(req.request.headers.get('X-Keep-Signed-In')).toBe('1');
    req.flush({ email: 'a@b.com' });
    await submitting;
  });

  it('says when the session ended before a recipe was saved, until the next sign-in', async () => {
    const { fixture, page } = await create('signin');
    const auth = TestBed.inject(AuthService);
    auth.lostRecipe.set('My celadon');
    await fixture.whenStable();
    expect(text(fixture, 'p.errors-section')).toBe(
      'You were signed out before your changes to "My celadon" were saved, so they were lost.'
    );
    page['email'].set('a@b.com');
    page['password'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'a@b.com' });
    await submitting;
    await fixture.whenStable();
    expect(auth.lostRecipe()).toBeNull();
    expect(fixture.nativeElement.querySelector('p.errors-section')).toBeNull();
  });

  it('shows why sign in failed and stays put', async () => {
    const { fixture, page, navigate } = await create('signin');
    page['email'].set('a@b.com');
    page['password'].set('nope');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin')
      .flush({ msg: 'incorrect password' }, { status: 401, statusText: 'Unauthorized' });
    await submitting;
    await fixture.whenStable();
    expect(text(fixture, '.errors-section')).toContain('incorrect password');
    expect(navigate).not.toHaveBeenCalled();
    expect(page['busy']()).toBe(false);
  });

  it('shows the confirmation box and creates accounts in sign up mode', async () => {
    const { fixture, page, navigate } = await create('signup');
    expect(fixture.nativeElement.querySelector('#confirmation')).not.toBeNull();
    expect(text(fixture, 'button[type=submit]')).toBe('Create account');

    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signup')
      .flush({ email: 'a@b.com' });
    await submitting;
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('says in a line on the sign up form what is kept and where, with a link to the privacy notice', async () => {
    const { fixture } = await create('signup');
    expect(text(fixture, '.privacy-note')).toContain('stored with Amazon Web Services in the US');
    expect(fixture.nativeElement.querySelector('.privacy-note a').getAttribute('href')).toBe('/privacy');
  });

  it('says on the sign up form that making an account agrees to the terms, with a link to them', async () => {
    const { fixture } = await create('signup');
    const link = fixture.nativeElement.querySelector('.terms-note a') as HTMLAnchorElement;
    expect(text(fixture, '.terms-note')).toContain('By creating an account, you agree to the');
    expect(link.getAttribute('href')).toBe('/terms');
    expect(link.textContent).toBe('Terms of use');
  });

  it('tells everyone outside the US, before the account is made, where accounts are kept and whose choice it is', async () => {
    const { fixture } = await create('signup');
    const preferences = TestBed.inject(PreferencesService);
    preferences.remember('region', 'TR');
    await fixture.whenStable();
    expect(text(fixture, 'form .data-notice')).toContain('accounts are kept on servers in the United States');
    expect(text(fixture, 'form .data-notice')).toContain('the project accepts no responsibility for it');
    expect(fixture.nativeElement.querySelector('.data-notice a').getAttribute('href')).toBe('/privacy#your-choice');
    preferences.remember('region', 'US');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.data-notice')).toBeNull();
  });

  it('shows the notice when no region is chosen and the browser names none', async () => {
    // The browser's region is read when the page first asks for one.
    const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en']);
    const { fixture } = await create('signup');
    expect(TestBed.inject(PreferencesService).region()).toBe('');
    expect(TestBed.inject(LocaleService).region()).toBe('');
    expect(fixture.nativeElement.querySelector('.data-notice')).not.toBeNull();
    languages.mockRestore();
  });

  it('will not submit a sign up whose passwords differ, and marks the field', async () => {
    const { fixture, page } = await create('signup');
    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password124');
    await fixture.whenStable();
    // The button stays usable; pressing it says what is wrong.
    expect((fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
    await page['submit']();
    await fixture.whenStable();
    httpMock().expectNone(API + '/signup');
    expect(fieldProblem(fixture, 'confirmation')).toBe('The two passwords do not match.');
    expect(fieldProblem(fixture, 'email')).toBe('');
    expect(document.activeElement?.id).toBe('confirmation');
  });

  it('marks every field with a problem, and the first takes the focus', async () => {
    const { fixture, page } = await create('signup');
    page['email'].set('not-an-email');
    page['password'].set('short');
    await page['submit']();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'email')).toBe('Enter an email address like name@example.com.');
    expect(fieldProblem(fixture, 'password')).toBe('Use at least 8 characters.');
    // The hint would say the same again, so it steps aside while the problem shows.
    expect(text(fixture, 'form')).not.toContain('At least 8 characters.');
    expect(fieldProblem(fixture, 'confirmation')).toBe('Enter the password again.');
    expect(document.activeElement?.id).toBe('email');
    // Fixed, the mark goes as it is typed.
    const email = fixture.nativeElement.querySelector('#email') as HTMLInputElement;
    email.value = 'a@b.com';
    email.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'email')).toBe('');
  });

  it("puts the server's answer about a field on that field", async () => {
    const { fixture, page } = await create('signup');
    page['email'].set('taken@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signup')
      .flush(
        { msg: 'An account with that email already exists.', field: 'email' },
        { status: 400, statusText: 'Bad Request' }
      );
    await submitting;
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'email')).toBe('An account with that email already exists.');
    expect(page['notices'].errors()).toEqual([]);
  });

  it('shows a fallback message when the server is unreachable', async () => {
    const { page } = await create('signup');
    page['email'].set('a@b.com');
    page['password'].set('password123');
    page['confirmation'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signup')
      .error(new ProgressEvent('error'));
    await submitting;
    expect(page['notices'].errors()).toEqual(['Error: could not create the account.']);
  });
});

describe('AuthPage hidden fields', () => {
  it('has no confirmation box in sign in mode', async () => {
    TestBed.configureTestingModule({
      providers: [...testProviders(), { provide: ActivatedRoute, useValue: { data: of({ mode: 'signin' }) } }]
    });
    const fixture = TestBed.createComponent(AuthPage);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('#confirmation')).toBeNull();
    expect(text(fixture, 'button[type=submit]')).toBe('Sign in');
    expect(fixture.nativeElement.querySelector('.privacy-note')).toBeNull();
    expect(fixture.nativeElement.querySelector('.terms-note')).toBeNull();
    expect(fixture.nativeElement.querySelector('.data-notice')).toBeNull();
  });
});

describe('AuthPage two-step sign-in', () => {
  const create = async (mode: 'signin' | 'signup', passkeys?: FakePasskeys) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: { data: of({ mode }) } },
        ...(passkeys ? [{ provide: PASSKEYS, useValue: passkeys }] : [])
      ]
    });
    const fixture = TestBed.createComponent(AuthPage);
    await settle(fixture);
    const page = fixture.componentInstance as unknown as Record<string, any>;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return { fixture, page, navigate };
  };
  const button = (fixture: { nativeElement: HTMLElement }, label: string) =>
    [...fixture.nativeElement.querySelectorAll('button')].find((one) => one.textContent?.trim() === label) as
      HTMLButtonElement | undefined;
  const signInWithPassword = async (fixture: { whenStable(): Promise<unknown> }, page: Record<string, any>) => {
    page['email'].set('a@b.com');
    page['password'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin')
      .flush(SECOND_STEP);
    await submitting;
    await settle(fixture as never);
  };

  afterEach(() => httpMock().verify());

  it('asks for the second step after the password, holding the token in memory only', async () => {
    const { fixture, page, navigate } = await create('signin');
    await signInWithPassword(fixture, page);
    expect(navigate).not.toHaveBeenCalled();
    expect(text(fixture, 'h1')).toBe('Two-step sign-in');
    expect(text(fixture, '.muted')).toBe('Your password is right. One more step to sign in as a@b.com.');
    expect(fixture.nativeElement.querySelector('#password')).toBeNull();
    expect(page['password']()).toBe('');
    expect(document.activeElement?.id).toBe('second-code');
    const stored = [localStorage, sessionStorage].flatMap((storage) =>
      Object.keys(storage).map((key) => storage.getItem(key))
    );
    expect(stored.some((value) => value?.includes('pending-token'))).toBe(false);
    // The menu does not offer to sign in again meanwhile (app.ts).
    expect(TestBed.inject(AuthService).secondStepPending()).toBe(true);

    const code = fixture.nativeElement.querySelector('#second-code') as HTMLInputElement;
    code.value = '123456';
    code.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    button(fixture, 'Finish signing in')!.click();
    await settle(fixture);
    httpMock()
      .expectOne(API + '/signin/second-step')
      .flush({ code: 'signed-in', msg: 'Signed in.', email: 'a@b.com', kept: 0 });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('goes back to the password with the email filled in, saying why, when the second step runs out', async () => {
    const { fixture, page } = await create('signin');
    await signInWithPassword(fixture, page);
    page['startOver']('Signing in took too long. Please enter your password again.');
    await settle(fixture);
    expect(text(fixture, 'h1')).toBe('Sign in');
    expect(TestBed.inject(AuthService).secondStepPending()).toBe(false);
    expect((fixture.nativeElement.querySelector('#email') as HTMLInputElement).value).toBe('a@b.com');
    expect(text(fixture, '.errors-section')).toContain('Signing in took too long.');
    expect(document.activeElement?.id).toBe('password');
  });

  it('offers no passkey sign-in where the browser has no passkeys', async () => {
    const { fixture } = await create('signin');
    expect(button(fixture, 'Sign in with a passkey')).toBeUndefined();
  });

  it('signs in with a passkey alone, keeping the sign-in if ticked', async () => {
    const passkeys = fakePasskeys();
    const { fixture, page, navigate } = await create('signin', passkeys);
    page['keep'].set(true);
    button(fixture, 'Sign in with a passkey')!.click();
    await settle(fixture);
    httpMock()
      .expectOne(API + '/signin/passkey/options')
      .flush({ options: { challenge: 'abc' } });
    await settle(fixture);
    expect(passkeys.authenticate).toHaveBeenCalledWith({ challenge: 'abc' });
    const req = httpMock().expectOne(API + '/signin/passkey');
    expect(req.request.body).toEqual({ response: PASSKEY_RESPONSE });
    expect(req.request.headers.get('X-Keep-Signed-In')).toBe('1');
    req.flush({ code: 'signed-in', msg: 'Signed in.', email: 'a@b.com', kept: 0 });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('says why a passkey did not sign in, such as one that belongs to no account', async () => {
    const { fixture, navigate } = await create('signin', fakePasskeys());
    button(fixture, 'Sign in with a passkey')!.click();
    await settle(fixture);
    httpMock()
      .expectOne(API + '/signin/passkey/options')
      .flush({ options: { challenge: 'abc' } });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/signin/passkey')
      .flush(
        { code: 'passkey-unknown', msg: 'This passkey does not belong to any Glazecalc account.' },
        { status: 401, statusText: 'Unauthorized' }
      );
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('This passkey does not belong to any Glazecalc account.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('offers saved passkeys in the email field where the browser can, and stops on leaving', async () => {
    const passkeys = fakePasskeys(true);
    let pick: (value: unknown) => void = () => {};
    passkeys.authenticate.mockImplementationOnce(() => new Promise((resolve) => (pick = resolve)));
    const { fixture, navigate } = await create('signin', passkeys);
    expect(fixture.nativeElement.querySelector('#email').getAttribute('autocomplete')).toBe('username webauthn');
    httpMock()
      .expectOne(API + '/signin/passkey/options')
      .flush({ options: { challenge: 'auto' } });
    await settle(fixture);
    expect(passkeys.authenticate).toHaveBeenCalledWith({ challenge: 'auto' }, true);
    pick(PASSKEY_RESPONSE);
    await settle(fixture);
    httpMock()
      .expectOne(API + '/signin/passkey')
      .flush({ code: 'signed-in', msg: 'Signed in.', email: 'a@b.com', kept: 0 });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith('/home');
    fixture.destroy();
    expect(passkeys.cancel).toHaveBeenCalled();
  });

  it('does not let the autofill request close the prompt of "Sign in with a passkey", and starts it again after', async () => {
    const passkeys = fakePasskeys(true);
    passkeys.authenticate
      .mockRejectedValueOnce(Object.assign(new Error('closed'), { name: 'NotAllowedError' }))
      .mockImplementationOnce(() => new Promise(() => {}));
    const { fixture } = await create('signin', passkeys);
    // The button is clicked while the autofill request still waits for its options (a slow connection).
    button(fixture, 'Sign in with a passkey')!.click();
    await settle(fixture);
    const [autofill, modal] = httpMock().match(API + '/signin/passkey/options');
    autofill!.flush({ options: { challenge: 'auto' } });
    await settle(fixture);
    expect(passkeys.authenticate).not.toHaveBeenCalled();
    modal!.flush({ options: { challenge: 'abc' } });
    await settle(fixture);
    expect(passkeys.authenticate).toHaveBeenCalledTimes(1);
    expect(passkeys.authenticate).toHaveBeenCalledWith({ challenge: 'abc' });
    expect(text(fixture, '.errors-section')).toContain('The passkey was not used');
    // The prompt was closed: the autofill request starts again.
    httpMock()
      .expectOne(API + '/signin/passkey/options')
      .flush({ options: { challenge: 'auto2' } });
    await settle(fixture);
    expect(passkeys.authenticate).toHaveBeenLastCalledWith({ challenge: 'auto2' }, true);
  });

  it('holds the password form while a passkey picked from the suggestions is sent', async () => {
    const passkeys = fakePasskeys(true);
    passkeys.authenticate.mockResolvedValueOnce(PASSKEY_RESPONSE).mockImplementationOnce(() => new Promise(() => {}));
    const { fixture, page, navigate } = await create('signin', passkeys);
    httpMock()
      .expectOne(API + '/signin/passkey/options')
      .flush({ options: { challenge: 'auto' } });
    await settle(fixture);
    const sending = httpMock().expectOne(API + '/signin/passkey');
    expect(page['busy']()).toBe(true);
    page['email'].set('a@b.com');
    page['password'].set('password123');
    await page['submit']();
    httpMock().expectNone(API + '/signin');
    sending.flush(
      { code: 'passkey-unknown', msg: 'This passkey does not belong to any Glazecalc account.' },
      { status: 401, statusText: 'Unauthorized' }
    );
    await settle(fixture);
    expect(page['busy']()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(text(fixture, '.errors-section')).toContain('This passkey does not belong to any Glazecalc account.');
    // And the suggestions are offered again.
    httpMock()
      .expectOne(API + '/signin/passkey/options')
      .flush({ options: { challenge: 'auto2' } });
    await settle(fixture);
    expect(passkeys.authenticate).toHaveBeenLastCalledWith({ challenge: 'auto2' }, true);
  });

  it('offers the suggestions again after a wrong password', async () => {
    const passkeys = fakePasskeys(true);
    passkeys.authenticate.mockImplementation(() => new Promise(() => {}));
    const { fixture, page } = await create('signin', passkeys);
    page['email'].set('a@b.com');
    page['password'].set('wrong-password');
    // The password goes off before the autofill request has its options: it waits.
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin/passkey/options')
      .flush({ options: { challenge: 'auto' } });
    await settle(fixture);
    expect(passkeys.authenticate).not.toHaveBeenCalled();
    httpMock()
      .expectOne(API + '/signin')
      .flush({ code: 'signin-failed', msg: 'Wrong email or password.' }, { status: 401, statusText: 'Unauthorized' });
    await submitting;
    await settle(fixture);
    httpMock()
      .expectOne(API + '/signin/passkey/options')
      .flush({ options: { challenge: 'auto2' } });
    await settle(fixture);
    expect(passkeys.authenticate).toHaveBeenCalledTimes(1);
    expect(passkeys.authenticate).toHaveBeenCalledWith({ challenge: 'auto2' }, true);
  });

  it('keeps the sign-up form as it was: no passkey sign-in, a plain username field', async () => {
    const passkeys = fakePasskeys(true);
    const { fixture } = await create('signup', passkeys);
    expect(button(fixture, 'Sign in with a passkey')).toBeUndefined();
    expect(fixture.nativeElement.querySelector('#email').getAttribute('autocomplete')).toBe('username');
    expect(passkeys.autofillSupported).not.toHaveBeenCalled();
  });
});
