import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';
import { FIRST_RENDER } from './first-render';

// The sign-in is an httpOnly cookie the server sets; the service keeps only a
// note that there is a session ('session' in localStorage), never a token.
describe('AuthService', () => {
  let auth: AuthService;

  const setup = () => {
    TestBed.configureTestingModule({ providers: testProviders() });
    auth = TestBed.inject(AuthService);
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => httpMock().verify());

  it('signs up, and notes the session and email', async () => {
    setup();
    const done = auth.signUp('a@b.com', 'password123');
    const req = httpMock().expectOne(API + '/signup');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'password123' });
    req.flush({ email: 'a@b.com' });
    await done;

    expect(auth.hasSession()).toBe(true);
    expect(auth.email()).toBe('a@b.com');
    expect(auth.signedIn()).toBe(true);
    expect(localStorage.getItem('session')).toBe('account');
    expect(localStorage.length).toBe(1);
    // Home welcomes the new account (pages/home).
    expect(auth.welcome()).toBe(true);
  });

  it('signs in with HTTP basic credentials, and says how much a trial brought', async () => {
    setup();
    const done = auth.signIn('a@b.com', 'pass:word');
    const req = httpMock().expectOne(API + '/signin');
    expect(req.request.headers.get('Authorization')).toBe('Basic ' + btoa('a@b.com:pass:word'));
    req.flush({ msg: 'Success in signin', email: 'a@b.com', kept: 3 });
    expect(await done).toEqual({ done: true, kept: 3 });
    expect(auth.email()).toBe('a@b.com');
  });

  it('asks to keep the sign-in only when the box is ticked, and in a header, never in the address', async () => {
    setup();
    for (const keep of [false, true]) {
      const done = auth.signIn('a@b.com', 'password123', keep);
      const req = httpMock().expectOne(API + '/signin');
      expect(req.request.headers.get('X-Keep-Signed-In')).toBe(keep ? '1' : null);
      expect(req.request.urlWithParams).toBe(API + '/signin');
      req.flush({ msg: 'Success in signin', email: 'a@b.com', kept: 0 });
      await done;
    }
    const signUp = auth.signUp('c@d.com', 'password123', true);
    const req = httpMock().expectOne(API + '/signup');
    expect(req.request.headers.get('X-Keep-Signed-In')).toBe('1');
    req.flush({ email: 'c@d.com' });
    await signUp;
  });

  it('signs in no further than the password when the account has two-step sign-in, and keeps no token', async () => {
    setup();
    const done = auth.signIn('a@b.com', 'password123', true);
    const secondStep = {
      code: 'second-step',
      msg: 'This account uses two-step sign-in.',
      methods: { totp: true, passkey: false, recovery: true },
      pending: 'pending-token',
      expiresAt: '2026-10-14T12:05:00Z'
    };
    httpMock()
      .expectOne(API + '/signin')
      .flush(secondStep);
    expect(await done).toEqual({ done: false, secondStep });
    expect(auth.hasSession()).toBe(false);
    expect(auth.email()).toBeNull();
    // The pending token lives in the page's memory only.
    const stored = [localStorage, sessionStorage].flatMap((storage) =>
      Object.keys(storage).map((key) => storage.getItem(key))
    );
    expect(stored.some((value) => value?.includes('pending-token'))).toBe(false);

    // The second step sends the token and one factor; the keep-me-signed-in choice is already on the server.
    const finishing = auth.finishSignIn('pending-token', { code: '123456' });
    const req = httpMock().expectOne(API + '/signin/second-step');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pending: 'pending-token', code: '123456' });
    expect(req.request.headers.has('X-Keep-Signed-In')).toBe(false);
    req.flush({ code: 'signed-in', msg: 'Signed in.', email: 'a@b.com', kept: 1 });
    expect(await finishing).toBe(1);
    expect(auth.email()).toBe('a@b.com');
    expect(localStorage.getItem('session')).toBe('account');
  });

  it('signs in with a passkey alone, asking to keep the sign-in in a header', async () => {
    setup();
    const asking = auth.passkeySignInOptions();
    const options = httpMock().expectOne(API + '/signin/passkey/options');
    expect(options.request.method).toBe('POST');
    options.flush({ options: { challenge: 'abc' } });
    expect(await asking).toEqual({ challenge: 'abc' });

    const response = { id: 'cred' } as never;
    const done = auth.signInWithPasskey(response, true);
    const req = httpMock().expectOne(API + '/signin/passkey');
    expect(req.request.body).toEqual({ response });
    expect(req.request.headers.get('X-Keep-Signed-In')).toBe('1');
    req.flush({ code: 'signed-in', msg: 'Signed in.', email: 'a@b.com', kept: 0 });
    expect(await done).toBe(0);
    expect(auth.email()).toBe('a@b.com');
  });

  it('sends each change to two-step sign-in with its proof, and passes on new recovery codes', async () => {
    setup();
    const removing = auth.removePasskey('pk/1', { password: 'pw', code: '123456' });
    const remove = httpMock().expectOne(API + '/mfa/passkeys/pk%2F1');
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.body).toEqual({ password: 'pw', code: '123456' });
    remove.flush({ code: 'passkey-removed', msg: 'The passkey was removed.' });
    expect(await removing).toEqual({ message: 'The passkey was removed.' });

    const making = auth.newRecoveryCodes({ password: 'pw', recoveryCode: 'abcde-12345' });
    const make = httpMock().expectOne(API + '/mfa/recovery-codes');
    expect(make.request.method).toBe('POST');
    make.flush({ code: 'recovery-codes-made', msg: 'New recovery codes are ready.', recoveryCodes: ['a', 'b'] });
    expect(await making).toEqual({ message: 'New recovery codes are ready.', recoveryCodes: ['a', 'b'] });

    const renaming = auth.renamePasskey('pk1', 'Laptop');
    const rename = httpMock().expectOne(API + '/mfa/passkeys/pk1');
    expect(rename.request.method).toBe('PATCH');
    expect(rename.request.body).toEqual({ name: 'Laptop' });
    rename.flush({ code: 'passkey-renamed', msg: 'The passkey was renamed.' });
    await renaming;
  });

  it('does not note a session when sign in fails', async () => {
    setup();
    const done = auth.signIn('a@b.com', 'wrong');
    httpMock()
      .expectOne(API + '/signin')
      .flush({ msg: 'incorrect password' }, { status: 401, statusText: 'Unauthorized' });
    await expect(done).rejects.toBeTruthy();
    expect(auth.hasSession()).toBe(false);
    expect(auth.signedIn()).toBe(false);
  });

  it('asks the server who is signed in, and loads the email', async () => {
    localStorage.setItem('session', 'account');
    setup();
    const done = auth.refresh();
    const req = httpMock().expectOne(API + '/verify');
    // The browser sends the cookie; the app adds nothing.
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ msg: 'User verified', id: 'u1', email: 'a@b.com' });
    await done;
    expect(auth.email()).toBe('a@b.com');
  });

  it('ends the session when the server rejects it, or the cookie is gone', async () => {
    localStorage.setItem('session', 'account');
    setup();
    const rejected = auth.refresh();
    httpMock()
      .expectOne(API + '/verify')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await rejected;
    expect(auth.hasSession()).toBe(false);
    expect(localStorage.getItem('session')).toBeNull();

    TestBed.resetTestingModule();
    localStorage.setItem('session', 'account');
    setup();
    const gone = auth.refresh();
    httpMock()
      .expectOne(API + '/verify')
      .flush({ msg: 'No token yet, so there is no email to find. Goodbye.' });
    await gone;
    expect(auth.hasSession()).toBe(false);
  });

  it('keeps the session when the server is down or failing', async () => {
    localStorage.setItem('session', 'account');
    setup();
    const down = auth.refresh();
    httpMock()
      .expectOne(API + '/verify')
      .error(new ProgressEvent('error'));
    await down;
    const failing = auth.refresh();
    httpMock()
      .expectOne(API + '/verify')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await failing;
    expect(auth.hasSession()).toBe(true);
    expect(auth.email()).toBeNull();
  });

  it('sends non-Latin-1 credentials as UTF-8', async () => {
    setup();
    const done = auth.signIn('a@b.com', 'pässwörd€');
    const req = httpMock().expectOne(API + '/signin');
    const encoded = req.request.headers.get('Authorization')!.slice('Basic '.length);
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe('a@b.com:pässwörd€');
    req.flush({ email: 'a@b.com', kept: 0 });
    await done;
  });

  it('skips asking when there is no session, and drops a token from before version 0.3', async () => {
    localStorage.setItem('token', 'old-token');
    setup();
    await auth.refresh();
    httpMock().expectNone(API + '/verify');
    expect(auth.hasSession()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('signs out here at once, and asks the server to clear the cookie', async () => {
    localStorage.setItem('session', 'account');
    setup();
    auth.email.set('a@b.com');
    const done = auth.signOut();
    expect(auth.hasSession()).toBe(false);
    expect(auth.email()).toBeNull();
    expect(localStorage.getItem('session')).toBeNull();
    httpMock()
      .expectOne({ method: 'POST', url: API + '/signout' })
      .error(new ProgressEvent('error'));
    // A failed request still leaves the browser signed out.
    await done;
    expect(auth.hasSession()).toBe(false);
  });
});

// The prerendered page is drawn for a visitor (core/first-render.ts); the service still knows the
// session at once, so guards and requests are not held up.
describe('AuthService during the first render', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('session', 'trial');
    localStorage.setItem('trial', JSON.stringify({ name: 'rusty humble jugs', expiresAt: '2999-01-01T00:00:00Z' }));
    TestBed.configureTestingModule({ providers: testProviders() });
  });

  it('draws no session, no trial and no name, though it holds them', () => {
    const state = signal(true);
    TestBed.overrideProvider(FIRST_RENDER, { useValue: state });
    const auth = TestBed.inject(AuthService);
    expect(auth.hasSession()).toBe(true);
    expect(auth.trial()?.name).toBe('rusty humble jugs');
    expect([auth.shownSession(), auth.shownTrial(), auth.shownName()]).toEqual([false, null, null]);
  });

  it('draws them once the first render is over', () => {
    const state = signal(true);
    TestBed.overrideProvider(FIRST_RENDER, { useValue: state });
    const auth = TestBed.inject(AuthService);
    state.set(false);
    expect([auth.shownSession(), auth.shownTrial()?.name, auth.shownName()]).toEqual([
      true,
      'rusty humble jugs',
      'rusty humble jugs'
    ]);
  });
});
