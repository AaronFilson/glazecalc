import { TestBed } from '@angular/core/testing';
import { API, NO_TOKENS, answer, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';

const LAPTOP = {
  id: 't1',
  name: 'Laptop',
  scopes: ['data:read'],
  hint: 'Ab12',
  createdAt: '2026-10-01T10:00:00Z',
  expiresAt: '2026-10-31T10:00:00Z',
  working: true
};

describe('TokensService', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  it("forgets the account's tokens when its session ends, so the next account on this tab never sees them", async () => {
    const tokens = TestBed.inject(TokensService);
    const loading = tokens.load();
    answer('/tokens', { ...NO_TOKENS, tokens: [LAPTOP] });
    await loading;
    expect(tokens.working()).toHaveLength(1);

    const out = TestBed.inject(AuthService).signOut();
    httpMock()
      .expectOne(API + '/signout')
      .flush({});
    await out;
    expect(tokens.list()).toBeNull();
    expect(tokens.working()).toEqual([]);
  });
});
