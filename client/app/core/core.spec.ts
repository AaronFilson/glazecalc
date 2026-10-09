import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { ApiResourceFactory } from './api-resource.service';
import { AuthService } from './auth.service';
import { TranslocoService } from '@jsverse/transloco';
import { calculateUMF } from '../../../lib/chemistry';
import type { ChemistryError } from '../../../lib/chemistry';
import { chemistryText, useCodedMessages } from '../i18n/coded';
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
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  it('uses the server message when there is one', () => {
    const err = new HttpErrorResponse({ status: 400, error: { msg: 'Missing required information' } });
    expect(errorMessage(err, 'fallback')).toBe('Missing required information');
  });

  it("shows a message in the reader's language by its code, with its values, once there is one", () => {
    const err = new HttpErrorResponse({
      status: 403,
      error: {
        code: 'trial-limit',
        msg: 'A trial can keep up to 25 recipes. Create a free account to save more.',
        params: { limit: 25, label: 'recipes' }
      }
    });
    expect(errorMessage(err, 'fallback')).toBe(
      'A trial can keep up to 25 recipes. Create a free account to save more.'
    );
    const transloco = inGerman({ 'server.trial-limit': 'Eine Probe hält bis zu {limit} Rezepte.' });
    try {
      expect(errorMessage(err, 'fallback')).toBe('Eine Probe hält bis zu 25 Rezepte.');
      // A message not translated yet shows the server's English.
      const other = new HttpErrorResponse({
        status: 400,
        error: { code: 'email-required', msg: 'Please enter an email' }
      });
      expect(errorMessage(other, 'fallback')).toBe('Please enter an email');
    } finally {
      useCodedMessages(null);
      transloco.setActiveLang('en');
    }
  });

  it("shows the chemistry's problems and warnings in the reader's language, with numbers as Settings write them", () => {
    let problem: ChemistryError | undefined;
    try {
      calculateUMF({ Silica: 10 });
    } catch (error) {
      problem = error as ChemistryError;
    }
    expect(chemistryText(problem!)).toBe('Recipe contains no flux oxides, so the UMF is undefined');
    const short = { name: 'Short spar', analysis: { SiO2: 40, Al2O3: 10 }, loi: 0 };
    const [warning] = calculateUMF([
      { material: short, amount: 10 },
      { material: 'Whiting', amount: 5 }
    ]).warningCodes;
    expect(chemistryText(warning!)).toBe('Analysis of Short spar totals 50.00% including LOI; expected about 100%.');
    const transloco = inGerman({
      'chemistry.no-flux': 'Das Rezept enthält keine Flussmittel.',
      'chemistry.analysis-total': 'Die Analyse von {material} ergibt {total} % mit Glühverlust.'
    });
    try {
      expect(chemistryText(problem!)).toBe('Das Rezept enthält keine Flussmittel.');
      expect(chemistryText(warning!)).toBe('Die Analyse von Short spar ergibt 50.00 % mit Glühverlust.');
    } finally {
      useCodedMessages(null);
      transloco.setActiveLang('en');
    }
  });

  /** The page in German, with these translations of coded messages. */
  function inGerman(messages: Record<string, string>): TranslocoService {
    const transloco = TestBed.inject(TranslocoService);
    transloco.setTranslation(messages, 'de');
    transloco.setActiveLang('de');
    useCodedMessages(transloco);
    return transloco;
  }

  it('falls back for other failures', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }), 'fallback')).toBe(
      'fallback'
    );
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });
});
