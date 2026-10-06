import { TestBed } from '@angular/core/testing';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';

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
  });

  it('signs in with HTTP basic credentials, and says how much a trial brought', async () => {
    setup();
    const done = auth.signIn('a@b.com', 'pass:word');
    const req = httpMock().expectOne(API + '/signin');
    expect(req.request.headers.get('Authorization')).toBe('Basic ' + btoa('a@b.com:pass:word'));
    req.flush({ msg: 'Success in signin', email: 'a@b.com', kept: 3 });
    expect(await done).toBe(3);
    expect(auth.email()).toBe('a@b.com');
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
