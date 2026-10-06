import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { ApiResourceFactory } from './api-resource.service';
import { AuthService } from './auth.service';
import { errorMessage } from './error-message';

describe('sessionExpiredInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const send = (url: string) => {
    void firstValueFrom(TestBed.inject(HttpClient).get(url)).catch(() => undefined);
    return httpMock().expectOne(url);
  };

  it('adds no token to requests: the browser sends the session cookie itself', () => {
    const req = send(API + '/recipe/getAll');
    expect(req.request.headers.keys()).toEqual([]);
    req.flush([]);
  });

  it('leaves a 401 from another host alone', () => {
    send('https://example.com/data').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(TestBed.inject(AuthService).hasSession()).toBe(true);
  });
});

describe('ApiResource', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  it('calls the collection routes the server defines', async () => {
    const notes = TestBed.inject(ApiResourceFactory).for<{ _id?: string; content: string }>('notes');

    const all = notes.getAll();
    httpMock()
      .expectOne({ method: 'GET', url: API + '/notes/getAll' })
      .flush([{ content: 'a' }]);
    expect(await all).toEqual([{ content: 'a' }]);

    const standard = notes.getStandard();
    httpMock()
      .expectOne({ method: 'GET', url: API + '/notes/getStandard' })
      .flush([]);
    await standard;

    const created = notes.create({ content: 'b' });
    const post = httpMock().expectOne({ method: 'POST', url: API + '/notes/create' });
    expect(post.request.body).toEqual({ content: 'b' });
    post.flush({ _id: '1', content: 'b' });
    expect((await created)._id).toBe('1');

    const removed = notes.remove({ _id: '1', content: 'b' });
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/notes/delete/1' })
      .flush({});
    await removed;
  });
});

describe('errorMessage', () => {
  it('uses the server message when there is one', () => {
    const err = new HttpErrorResponse({ status: 400, error: { msg: 'Missing required information' } });
    expect(errorMessage(err, 'fallback')).toBe('Missing required information');
  });

  it('falls back for other failures', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }), 'fallback')).toBe(
      'fallback'
    );
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });
});
