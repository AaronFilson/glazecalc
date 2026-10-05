import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';

const unauthorized = { status: 401, statusText: 'Unauthorized' };

// A token the server stops accepting (expired, or the password changed on
// another device) ends the session; a newer sign-in is never undone.
describe('rejected sign-ins', () => {
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  const setup = (token: string | null) => {
    localStorage.clear();
    if (token) localStorage.setItem('token', token);
    TestBed.configureTestingModule({ providers: testProviders() });
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  };
  const get = (path: string) => firstValueFrom(TestBed.inject(HttpClient).get(API + path)).catch((err) => err);

  afterEach(() => httpMock().verify());

  it('signs out and goes to sign in when an API call is rejected', async () => {
    setup('stale');
    auth.email.set('a@b.com');
    const result = get('/recipe/getAll');
    httpMock().expectOne(API + '/recipe/getAll').flush({ msg: 'could not authenticate user' }, unauthorized);
    expect((await result).status).toBe(401);
    expect(auth.token()).toBeNull();
    expect(auth.email()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/signin');
  });

  it('keeps a sign-in made while the rejected request was out', async () => {
    setup('stale');
    const result = get('/recipe/getAll');
    // The user signs in before the stale request's answer arrives.
    const signingIn = auth.signIn('a@b.com', 'password123');
    httpMock().expectOne(API + '/signin').flush({ token: 'fresh', email: 'a@b.com' });
    await signingIn;
    httpMock().expectOne(API + '/recipe/getAll').flush({}, unauthorized);
    await result;
    expect(auth.token()).toBe('fresh');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves a wrong password on the sign-in page to the page', async () => {
    setup('stale');
    const signingIn = auth.signIn('a@b.com', 'wrong').catch((err) => err);
    httpMock().expectOne(API + '/signin').flush({ msg: 'Email or password is incorrect.' }, unauthorized);
    expect((await signingIn).status).toBe(401);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not leave public pages when the stored token is old', async () => {
    setup('stale');
    const refreshing = auth.refresh();
    httpMock().expectOne(API + '/verify').flush({}, unauthorized);
    await refreshing;
    expect(auth.token()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores a late /verify answer once someone has signed in', async () => {
    setup('stale');
    const refreshing = auth.refresh();
    const signingIn = auth.signIn('b@c.com', 'password123');
    httpMock().expectOne(API + '/signin').flush({ token: 'fresh', email: 'b@c.com' });
    await signingIn;
    httpMock().expectOne(API + '/verify').flush({}, unauthorized);
    await refreshing;
    expect(auth.token()).toBe('fresh');
    expect(auth.email()).toBe('b@c.com');
  });

  it('does not let a late successful /verify replace the new email', async () => {
    setup('old');
    const refreshing = auth.refresh();
    const signingIn = auth.signIn('b@c.com', 'password123');
    httpMock().expectOne(API + '/signin').flush({ token: 'fresh', email: 'b@c.com' });
    await signingIn;
    httpMock().expectOne(API + '/verify').flush({ email: 'old@c.com' });
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
    httpMock().expectOne({ method: 'POST', url: API + '/password/forgot' }).flush({ msg: 'sent' });
    expect(await asking).toBe('sent');

    const resetting = auth.resetPassword('tok', 'new-password');
    const req = httpMock().expectOne({ method: 'POST', url: API + '/password/reset' });
    expect(req.request.body).toEqual({ token: 'tok', password: 'new-password' });
    req.flush({ msg: 'changed' });
    expect(await resetting).toBe('changed');
    expect(auth.token()).toBeNull();
  });
});
