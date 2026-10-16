import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';

const unauthorized = { status: 401, statusText: 'Unauthorized' };

// A session the server stops accepting (expired, or the password changed on
// another device) ends; a newer sign-in is never undone.
describe('rejected sign-ins', () => {
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  const setup = (session: boolean) => {
    localStorage.clear();
    if (session) localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({ providers: testProviders() });
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  };
  const get = (path: string) => firstValueFrom(TestBed.inject(HttpClient).get(API + path)).catch((err) => err);

  afterEach(() => httpMock().verify());

  it('signs out and goes to sign in when an API call is rejected', async () => {
    setup(true);
    auth.email.set('a@b.com');
    const result = get('/recipe/getAll');
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush({ msg: 'could not authenticate user' }, unauthorized);
    expect((await result).status).toBe(401);
    expect(auth.hasSession()).toBe(false);
    expect(auth.email()).toBeNull();
    expect(localStorage.getItem('session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/signin', { state: { sessionEnded: true } });
  });

  it('keeps a sign-in made while the rejected request was out', async () => {
    setup(true);
    const result = get('/recipe/getAll');
    // The user signs in before the stale request's answer arrives.
    const signingIn = auth.signIn('a@b.com', 'password123');
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'a@b.com', kept: 0 });
    await signingIn;
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush({}, unauthorized);
    await result;
    expect(auth.hasSession()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves a wrong password on the sign-in page to the page', async () => {
    setup(true);
    const signingIn = auth.signIn('a@b.com', 'wrong').catch((err) => err);
    httpMock()
      .expectOne(API + '/signin')
      .flush({ msg: 'Email or password is incorrect.' }, unauthorized);
    expect((await signingIn).status).toBe(401);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves a wrong second step or passkey to the sign-in page, and a trial on this browser goes on', async () => {
    localStorage.clear();
    localStorage.setItem('session', 'trial');
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    localStorage.setItem('trial', JSON.stringify({ name: 'Trial', expiresAt }));
    TestBed.configureTestingModule({ providers: testProviders() });
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    expect(auth.trial()).not.toBeNull();

    const finishing = auth.finishSignIn('pending-token', { code: '000000' }).catch((err) => err);
    httpMock()
      .expectOne(API + '/signin/second-step')
      .flush({ code: 'code-wrong', msg: 'That code is not right.' }, unauthorized);
    expect((await finishing).status).toBe(401);

    const passkey = auth.signInWithPasskey({} as never).catch((err) => err);
    httpMock()
      .expectOne(API + '/signin/passkey')
      .flush({ code: 'passkey-unknown', msg: 'unknown' }, unauthorized);
    expect((await passkey).status).toBe(401);

    expect(auth.hasSession()).toBe(true);
    expect(auth.trial()).not.toBeNull();
    expect(localStorage.getItem('session')).toBe('trial');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('still ends the session for a 401 from a route that only starts with /signin', async () => {
    setup(true);
    const result = get('/signinx');
    httpMock()
      .expectOne(API + '/signinx')
      .flush({}, unauthorized);
    await result;
    expect(auth.hasSession()).toBe(false);
  });

  it('does not leave public pages when the stored token is old', async () => {
    setup(true);
    const refreshing = auth.refresh();
    httpMock()
      .expectOne(API + '/verify')
      .flush({}, unauthorized);
    await refreshing;
    expect(auth.hasSession()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores a late /verify answer once someone has signed in', async () => {
    setup(true);
    const refreshing = auth.refresh();
    const signingIn = auth.signIn('b@c.com', 'password123');
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'b@c.com', kept: 0 });
    await signingIn;
    httpMock()
      .expectOne(API + '/verify')
      .flush({}, unauthorized);
    await refreshing;
    expect(auth.hasSession()).toBe(true);
    expect(auth.email()).toBe('b@c.com');
  });

  it('does not let a late successful /verify replace the new email', async () => {
    setup(true);
    const refreshing = auth.refresh();
    const signingIn = auth.signIn('b@c.com', 'password123');
    httpMock()
      .expectOne(API + '/signin')
      .flush({ email: 'b@c.com', kept: 0 });
    await signingIn;
    httpMock()
      .expectOne(API + '/verify')
      .flush({ id: 'u0', email: 'old@c.com' });
    await refreshing;
    expect(auth.email()).toBe('b@c.com');
  });
});

describe('password requests', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  it('posts reset requests and new passwords, returning the server message', async () => {
    const auth = TestBed.inject(AuthService);
    const asking = auth.requestReset('a@b.com');
    httpMock()
      .expectOne({ method: 'POST', url: API + '/password/forgot' })
      .flush({ msg: 'sent' });
    expect(await asking).toBe('sent');

    const resetting = auth.resetPassword('tok', 'new-password');
    const req = httpMock().expectOne({ method: 'POST', url: API + '/password/reset' });
    expect(req.request.body).toEqual({ token: 'tok', password: 'new-password' });
    req.flush({ msg: 'changed' });
    expect(await resetting).toBe('changed');
    expect(auth.hasSession()).toBe(false);
  });
});
