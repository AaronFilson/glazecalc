import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, SIGN_IN_PROVIDERS } from '../../core/auth.service';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { ProvidersSection } from '../password/providers-section';
import { AuthPage } from './auth-page';
import { PASSKEYS } from './passkeys';

const noPasskeys = {
  supported: vi.fn(() => false),
  autofillSupported: vi.fn(async () => false),
  authenticate: vi.fn(),
  register: vi.fn(),
  cancel: vi.fn()
};

const route = (mode: 'signin' | 'signup', query: Record<string, string> = {}) => ({
  data: of({ mode }),
  snapshot: { queryParamMap: convertToParamMap(query) }
});

// Signing in with Google, GitHub or Microsoft (docs/adr/0015-provider-sign-in.md,
// 0023): the buttons, finishing what the provider sent back, and the account
// page's section.
describe('signing in with a provider', () => {
  const create = async (
    mode: 'signin' | 'signup',
    query: Record<string, string> = {},
    providers: string[] = ['google', 'github']
  ) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: route(mode, query) },
        { provide: PASSKEYS, useValue: noPasskeys },
        { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve(providers) }
      ]
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AuthPage);
    await settle(fixture);
    return { fixture, navigate, page: fixture.componentInstance as unknown as Record<string, any> };
  };

  afterEach(() => httpMock().verify());

  it('offers each provider that is on, as a link that keeps the language and the keep-me-signed-in box', async () => {
    const { fixture, page } = await create('signin');
    const links = [...fixture.nativeElement.querySelectorAll('.provider-buttons a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Continue with Google', 'Continue with GitHub']);
    expect(links[0]!.getAttribute('href')).toBe(API + '/auth/google/start?next=%2F');
    page['keep'].set(true);
    await settle(fixture);
    expect(links[1]!.getAttribute('href')).toBe(API + '/auth/github/start?next=%2F&keep=1');
  });

  it('shows Microsoft\'s own button: its four squares and "Sign in with Microsoft"', async () => {
    const { fixture } = await create('signup', {}, ['google', 'github', 'microsoft']);
    const link = fixture.nativeElement.querySelector('a[data-provider="microsoft"]') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Sign in with Microsoft');
    expect(link.classList).toContain('provider-microsoft');
    expect(link.classList).not.toContain('btn-outline-secondary');
    expect(link.getAttribute('href')).toBe(API + '/auth/microsoft/start?next=%2F');
    const squares = [...link.querySelectorAll('svg rect')].map((rect) => rect.getAttribute('fill'));
    expect(squares).toEqual(['#f25022', '#00a4ef', '#7fba00', '#ffb900']);
  });

  it('notes a new account from Microsoft as unconfirmed, as after signing up', async () => {
    await create('signin', { provider: 'microsoft' }, ['microsoft']);
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({
        code: 'signed-in',
        msg: 'Success in signin',
        email: 'potter@example.com',
        kept: 0,
        next: '/home',
        unverified: true
      });
    await settle();
    expect(TestBed.inject(AuthService).unverified()).toBe(true);
  });

  it('finishes a sign-in the provider sent back, and goes on to the page it was for', async () => {
    const { navigate } = await create('signin', { provider: 'google' });
    const req = httpMock().expectOne(API + '/auth/finish');
    expect(req.request.method).toBe('POST');
    req.flush({ code: 'signed-in', msg: 'Success in signin', email: 'potter@example.com', kept: 0, next: '/recipe' });
    await settle();
    expect(TestBed.inject(AuthService).email()).toBe('potter@example.com');
    expect(navigate).toHaveBeenCalledWith('/recipe');
  });

  it('asks for the second step after the provider when the account has two-step sign-in', async () => {
    const { fixture, page } = await create('signin', { provider: 'github' });
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({
        code: 'second-step',
        msg: 'This account uses two-step sign-in.',
        methods: { totp: true, passkey: false, recovery: true },
        pending: 'pending-token',
        expiresAt: '2999-01-01T00:00:00Z',
        email: 'potter@example.com',
        next: '/home'
      });
    await settle(fixture);
    expect(page['secondStep']()?.pending).toBe('pending-token');
    expect(text(fixture, 'p.muted')).toContain('potter@example.com');
    expect(TestBed.inject(AuthService).email()).toBe(null);
  });

  it('asks to sign in to the account with the email, then links the provider to it', async () => {
    const { fixture, page, navigate } = await create('signin', { provider: 'google' });
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush(
        {
          code: 'provider-sign-in-to-link',
          msg: 'A Glazecalc account already uses the email from Google.',
          params: { provider: 'google' },
          provider: 'google'
        },
        { status: 409, statusText: 'Conflict' }
      );
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('already uses the email from Google');

    page['email'].set('potter@example.com');
    page['password'].set('password123');
    const submitting = page['submit']();
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'potter@example.com' });
    await settle();
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({ code: 'provider-linked', msg: 'Google is linked.', params: { provider: 'google' }, provider: 'google' });
    await submitting;
    expect(navigate).toHaveBeenCalledWith('/account');
    expect(TestBed.inject(AuthService).providerNotice()).toBe('Google is linked.');
  });

  it('says what went wrong when the provider sign-in did not work', async () => {
    const { fixture } = await create('signin', { provider: 'google' });
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush(
        { code: 'provider-email-unverified', msg: 'No verified email.', params: { provider: 'google' } },
        { status: 400, statusText: 'Bad Request' }
      );
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('No verified email.');
  });

  it('goes to the account page, saying so, when the provider sends the browser back from linking', async () => {
    const { navigate } = await create('signin', { provider: 'google' });
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({ code: 'provider-linked', msg: 'Google is linked.', params: { provider: 'google' }, provider: 'google' });
    await settle();
    expect(navigate).toHaveBeenCalledWith('/account');
    expect(TestBed.inject(AuthService).providerNotice()).toBe('Google is linked.');
  });

  it('says on the account page when linking failed after signing in to the account with the email', async () => {
    const { fixture, navigate } = await create('signin', { provider: 'google' });
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush(
        {
          code: 'provider-sign-in-to-link',
          msg: 'A Glazecalc account already uses the email from Google.',
          params: { provider: 'google' },
          provider: 'google'
        },
        { status: 409, statusText: 'Conflict' }
      );
    await settle(fixture);
    for (const [id, value] of [
      ['email', 'potter@example.com'],
      ['password', 'password123']
    ]) {
      const field = fixture.nativeElement.querySelector('#' + id) as HTMLInputElement;
      field.value = value;
      field.dispatchEvent(new Event('input'));
    }
    await settle(fixture);
    (fixture.nativeElement.querySelector('form button[type="submit"]') as HTMLButtonElement).click();
    await settle(fixture);
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'potter@example.com' });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(navigate).toHaveBeenCalledWith('/account');
    expect(TestBed.inject(AuthService).providerNotice()).toBe('Could not link it. Please try again.');
  });
});

describe('the account page section for Google and GitHub', () => {
  const create = async () => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: route('signin') },
        { provide: PASSKEYS, useValue: noPasskeys },
        { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve(['google', 'github']) }
      ]
    });
    const fixture = TestBed.createComponent(ProvidersSection);
    await settle(fixture);
    return fixture;
  };

  afterEach(() => httpMock().verify());

  it('lists the providers, and unlinks one after the password', async () => {
    const fixture = await create();
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: false,
      linked: [{ provider: 'github', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    const rows = [...fixture.nativeElement.querySelectorAll('.provider-list li')] as HTMLElement[];
    expect(rows.map((row) => row.querySelector('.provider-name')?.textContent?.trim())).toEqual(['Google', 'GitHub']);
    expect(rows[0]!.textContent).toContain('Not linked');
    expect(rows[1]!.textContent).toContain('Linked on');

    (fixture.nativeElement.querySelector('[data-unlink="github"]') as HTMLButtonElement).click();
    await settle(fixture);
    const password = fixture.nativeElement.querySelector('#provider-confirm-password') as HTMLInputElement;
    password.value = 'password123';
    password.dispatchEvent(new Event('input'));
    await settle(fixture);
    (fixture.nativeElement.querySelector('.identity-confirm button[type="submit"]') as HTMLButtonElement).click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/auth/github');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ password: 'password123' });
    req.flush({ code: 'provider-unlinked', msg: 'GitHub is unlinked.', params: { provider: 'github' } });
    await settle(fixture);
    answer('/auth/methods', { enabled: ['google', 'github'], passwordless: false, linked: [] });
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('GitHub is unlinked.');
  });

  it('offers a passwordless account the email to set a password, and never unlinks its only provider', async () => {
    const fixture = await create();
    TestBed.inject(AuthService).email.set('potter@example.com');
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: true,
      linked: [{ provider: 'google', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[data-unlink]')).toBe(null);
    expect(fixture.nativeElement.querySelector('[data-link="github"]')).not.toBe(null);
    (fixture.nativeElement.querySelector('.passwordless button') as HTMLButtonElement).click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/password/forgot');
    expect(req.request.body).toEqual({ email: 'potter@example.com' });
    req.flush({ code: 'reset-sent', msg: 'Sent.', params: { minutes: 30 } });
    await settle(fixture);
  });

  it('confirms with a fresh provider sign-in in place of the password, once', async () => {
    const fixture = await create();
    const auth = TestBed.inject(AuthService);
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: true,
      linked: [
        { provider: 'google', linkedAt: '2026-10-01T10:00:00Z' },
        { provider: 'github', linkedAt: '2026-10-02T10:00:00Z' }
      ]
    });
    await settle(fixture);
    (fixture.nativeElement.querySelector('[data-unlink="github"]') as HTMLButtonElement).click();
    await settle(fixture);
    const confirm = fixture.nativeElement.querySelector('.identity-confirm') as HTMLElement;
    expect(confirm.querySelector('input[type="password"]')).toBe(null);
    const again = [...confirm.querySelectorAll('[data-reauth]')].map((b) => b.getAttribute('data-reauth'));
    expect(again).toEqual(['google', 'github']);
    // Not yet signed in again: nothing is sent.
    (confirm.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle(fixture);
    expect(confirm.textContent).toContain('Please sign in again first');

    auth.holdReauth({ grant: 'fresh-grant', provider: 'google', expiresAt: Date.now() + 60000 });
    await settle(fixture);
    expect(confirm.textContent).toContain('You signed in again with Google.');
    (confirm.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/auth/github');
    expect(req.request.body).toEqual({ reauth: 'fresh-grant' });
    req.flush({ code: 'provider-unlinked', msg: 'GitHub is unlinked.', params: { provider: 'github' } });
    await settle(fixture);
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: true,
      linked: [{ provider: 'google', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    expect(auth.reauth()).toBe(null);
  });

  it('holds the grant a fresh sign-in brings back, and says so', async () => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: route('signin', { provider: 'google' }) },
        { provide: PASSKEYS, useValue: noPasskeys },
        { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve(['google', 'github']) }
      ]
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ProvidersSection);
    await settle(fixture);
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({
        code: 'provider-reauthed',
        msg: 'You signed in again with Google.',
        params: { provider: 'google' },
        provider: 'google',
        reauth: 'fresh-grant',
        expiresAt: new Date(Date.now() + 300000).toISOString()
      });
    await settle(fixture);
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: true,
      linked: [{ provider: 'google', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    expect(TestBed.inject(AuthService).reauth()?.grant).toBe('fresh-grant');
    expect(fixture.nativeElement.textContent).toContain('You signed in again with Google.');
  });

  it('links a provider after the password, sending the browser to it; Cancel links nothing', async () => {
    const fixture = await create();
    answer('/auth/methods', { enabled: ['google', 'github'], passwordless: false, linked: [] });
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[data-link="google"]')!.click();
    await settle(fixture);
    // The row's own button steps aside while its confirmation is open.
    expect(root.querySelector('[data-link="google"]')).toBeNull();
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancel')!.click();
    await settle(fixture);
    expect(root.querySelector('.identity-confirm')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-link="google"]')!.click();
    await settle(fixture);
    const password = root.querySelector('#provider-confirm-password') as HTMLInputElement;
    password.value = 'password123';
    password.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(root.querySelector('.identity-confirm button[type="submit"]')!.textContent?.trim()).toBe('Link Google');
    root.querySelector<HTMLButtonElement>('.identity-confirm button[type="submit"]')!.click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/auth/google/link');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ password: 'password123', next: location.pathname });
    // The provider's address; one on this page stands in for it, as jsdom goes only to those.
    req.flush({ location: location.pathname + '#linking-google' });
    await settle(fixture);
    expect(location.hash).toBe('#linking-google');
    history.replaceState(null, '', location.pathname);
  });

  it('asks to confirm the email first, and offers no link or unlink until then', async () => {
    const fixture = await create();
    TestBed.inject(AuthService).unverified.set(true);
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: false,
      linked: [{ provider: 'github', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    expect(text(fixture, '.providers-section')).toContain(
      'Confirm your email first, with the link we sent you, to link Google, GitHub or Microsoft.'
    );
    expect(fixture.nativeElement.querySelector('[data-link], [data-unlink]')).toBe(null);
  });

  it('says what the sign-in page brought back from the provider, once', async () => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: route('signin') },
        { provide: PASSKEYS, useValue: noPasskeys },
        { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve(['google', 'github']) }
      ]
    });
    const auth = TestBed.inject(AuthService);
    auth.providerNotice.set('Google is linked.');
    const fixture = TestBed.createComponent(ProvidersSection);
    await settle(fixture);
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: false,
      linked: [{ provider: 'google', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    expect(text(fixture, '.providers-section .server-msg')).toContain('Google is linked.');
    expect(auth.providerNotice()).toBe(null);
  });

  it("shows nothing when the account's providers cannot be read", async () => {
    const fixture = await create();
    httpMock()
      .expectOne(API + '/auth/methods')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.providers-section')).toBe(null);
  });

  it('says when linking could not be finished after the provider sent the browser back', async () => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        { provide: ActivatedRoute, useValue: route('signin', { provider: 'google' }) },
        { provide: PASSKEYS, useValue: noPasskeys },
        { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve(['google', 'github']) }
      ]
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ProvidersSection);
    await settle(fixture);
    httpMock()
      .expectOne(API + '/auth/finish')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    answer('/auth/methods', { enabled: ['google', 'github'], passwordless: false, linked: [] });
    await settle(fixture);
    expect(text(fixture, '.providers-section .errors-section')).toContain('Could not link it. Please try again.');
  });

  it('sends the link to set a password once at a time, and says when it could not', async () => {
    const fixture = await create();
    TestBed.inject(AuthService).email.set('potter@example.com');
    answer('/auth/methods', {
      enabled: ['google', 'github'],
      passwordless: true,
      linked: [{ provider: 'google', linkedAt: '2026-10-01T10:00:00Z' }]
    });
    await settle(fixture);
    const send = fixture.nativeElement.querySelector('.passwordless button') as HTMLButtonElement;
    send.click();
    send.click();
    httpMock()
      .expectOne(API + '/password/forgot')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.providers-section .errors-section')).toContain('Could not send the link. Please try again.');
  });
});
