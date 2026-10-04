import { TestBed } from '@angular/core/testing';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;

  const setup = () => {
    TestBed.configureTestingModule({ providers: testProviders() });
    auth = TestBed.inject(AuthService);
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => httpMock().verify());

  it('stores the token and email after signing up', async () => {
    setup();
    const done = auth.signUp('a@b.com', 'password123');
    const req = httpMock().expectOne(API + '/signup');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'password123' });
    req.flush({ token: 'tok', email: 'a@b.com' });
    await done;

    expect(auth.token()).toBe('tok');
    expect(auth.email()).toBe('a@b.com');
    expect(auth.signedIn()).toBe(true);
    expect(localStorage.getItem('token')).toBe('tok');
  });

  it('signs in with HTTP basic credentials', async () => {
    setup();
    const done = auth.signIn('a@b.com', 'pass:word');
    const req = httpMock().expectOne(API + '/signin');
    expect(req.request.headers.get('Authorization')).toBe('Basic ' + btoa('a@b.com:pass:word'));
    req.flush({ token: 'tok', email: 'a@b.com' });
    await done;
    expect(auth.email()).toBe('a@b.com');
  });

  it('does not keep a token when sign in fails', async () => {
    setup();
    const done = auth.signIn('a@b.com', 'wrong');
    httpMock().expectOne(API + '/signin').flush({ msg: 'incorrect password' }, { status: 401, statusText: 'Unauthorized' });
    await expect(done).rejects.toBeTruthy();
    expect(auth.token()).toBeNull();
    expect(auth.signedIn()).toBe(false);
  });

  it('verifies a stored token and loads the email', async () => {
    localStorage.setItem('token', 'saved');
    setup();
    const done = auth.refresh();
    const req = httpMock().expectOne(API + '/verify');
    expect(req.request.headers.get('token')).toBe('saved');
    req.flush({ msg: 'User verified', email: 'a@b.com' });
    await done;
    expect(auth.email()).toBe('a@b.com');
  });

  it('signs out when the stored token is rejected', async () => {
    localStorage.setItem('token', 'expired');
    setup();
    const done = auth.refresh();
    httpMock().expectOne(API + '/verify').flush({}, { status: 401, statusText: 'Unauthorized' });
    await done;
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('keeps the token when the server is down or failing', async () => {
    localStorage.setItem('token', 'saved');
    setup();
    const down = auth.refresh();
    httpMock().expectOne(API + '/verify').error(new ProgressEvent('error'));
    await down;
    const failing = auth.refresh();
    httpMock().expectOne(API + '/verify').flush({}, { status: 500, statusText: 'Server Error' });
    await failing;
    expect(auth.token()).toBe('saved');
    expect(auth.email()).toBeNull();
  });

  it('sends non-Latin-1 credentials as UTF-8', async () => {
    setup();
    const done = auth.signIn('a@b.com', 'pässwörd€');
    const req = httpMock().expectOne(API + '/signin');
    const encoded = req.request.headers.get('Authorization')!.slice('Basic '.length);
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe('a@b.com:pässwörd€');
    req.flush({ token: 'tok', email: 'a@b.com' });
    await done;
  });

  it('skips verifying when there is no token, including the old "null" value', async () => {
    localStorage.setItem('token', 'null');
    setup();
    await auth.refresh();
    httpMock().expectNone(API + '/verify');
    expect(auth.token()).toBeNull();
    expect(auth.email()).toBeNull();
  });

  it('clears the token and email on sign out', async () => {
    localStorage.setItem('token', 'saved');
    setup();
    auth.email.set('a@b.com');
    auth.signOut();
    expect(auth.token()).toBeNull();
    expect(auth.email()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
