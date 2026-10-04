import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { ApiResourceFactory } from './api-resource.service';
import { AuthService } from './auth.service';
import { errorMessage } from './error-message';

describe('authTokenInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const send = (url: string) => {
    void firstValueFrom(TestBed.inject(HttpClient).get(url));
    return httpMock().expectOne(url);
  };

  it('adds the token header to API requests when signed in', () => {
    localStorage.setItem('token', 'tok');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: testProviders() });
    const req = send(API + '/recipe/getAll');
    expect(req.request.headers.get('token')).toBe('tok');
    req.flush([]);
  });

  it('never sends the token to other hosts', () => {
    localStorage.setItem('token', 'tok');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: testProviders() });
    const req = send('https://example.com/data');
    expect(req.request.headers.has('token')).toBe(false);
    req.flush({});
  });

  it('sends no token header when signed out', () => {
    expect(TestBed.inject(AuthService).token()).toBeNull();
    const req = send(API + '/recipe/getAll');
    expect(req.request.headers.has('token')).toBe(false);
    req.flush([]);
  });
});

describe('ApiResource', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  it('calls the collection routes the server defines', async () => {
    const notes = TestBed.inject(ApiResourceFactory).for<{ _id?: string; content: string }>('notes');

    const all = notes.getAll();
    httpMock().expectOne({ method: 'GET', url: API + '/notes/getAll' }).flush([{ content: 'a' }]);
    expect(await all).toEqual([{ content: 'a' }]);

    const standard = notes.getStandard();
    httpMock().expectOne({ method: 'GET', url: API + '/notes/getStandard' }).flush([]);
    await standard;

    const created = notes.create({ content: 'b' });
    const post = httpMock().expectOne({ method: 'POST', url: API + '/notes/create' });
    expect(post.request.body).toEqual({ content: 'b' });
    post.flush({ _id: '1', content: 'b' });
    expect((await created)._id).toBe('1');

    const removed = notes.remove({ _id: '1', content: 'b' });
    httpMock().expectOne({ method: 'DELETE', url: API + '/notes/delete/1' }).flush({});
    await removed;
  });
});

describe('errorMessage', () => {
  it('uses the server message when there is one', () => {
    const err = new HttpErrorResponse({ status: 400, error: { msg: 'Missing required information' } });
    expect(errorMessage(err, 'fallback')).toBe('Missing required information');
  });

  it('falls back for other failures', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }), 'fallback')).toBe('fallback');
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });
});
