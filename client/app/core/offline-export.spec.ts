import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideEnglish } from '../testing/i18n';
import { fetchProblem, isOffline } from './error-message';
import { deviceExport } from './offline-export';
import { retryDelay } from './outbox';

describe('the offline copy as a file', () => {
  it('is written in the format of Download my data, with the waiting changes listed', () => {
    const file = deviceExport(
      'u1',
      {
        recipe: [{ _id: 'r1', title: 'Celadon', ownedBy: 'u1', __v: 0, rev: 2 }],
        notes: [{ _id: 'tmp:1', title: 'Made offline' }],
        preferences: { units: 'metric' },
        prices: { prices: [{ key: 'm1', perKg: 3 }], currency: 'EUR' }
      },
      [
        {
          seq: 1,
          userId: 'u1',
          key: 'k',
          area: 'notes',
          op: 'create',
          id: 'tmp:1',
          baseRev: null,
          body: { title: 'Made offline' },
          queuedAt: 0,
          state: 'waiting'
        }
      ],
      new Date('2026-11-08T00:00:00Z')
    );
    expect(file).toMatchObject({
      format: 'glazecalc-export',
      version: 1,
      exportedAt: '2026-11-08T00:00:00.000Z',
      source: 'device',
      account: { id: 'u1' },
      preferences: { units: 'metric' },
      prices: [{ key: 'm1', perKg: 3 }],
      records: {
        recipes: [{ _id: 'r1', title: 'Celadon', rev: 2 }],
        materials: [],
        additives: [],
        firing: [],
        notes: [{ _id: 'tmp:1', title: 'Made offline' }]
      },
      unsent: [{ area: 'notes', op: 'create', id: 'tmp:1', state: 'waiting' }]
    });
    // The server's bookkeeping stays out, as in the server's export.
    expect((file['records'] as { recipes: object[] }).recipes[0]).not.toHaveProperty('ownedBy');
  });
});

describe('pages that need the server, offline', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [...provideEnglish()] }));

  it('say "Not available offline" for a network failure, and the usual error otherwise', () => {
    const network = new HttpErrorResponse({ status: 0 });
    const server = new HttpErrorResponse({ status: 500, error: { msg: 'Broken' } });
    expect(isOffline(network)).toBe(true);
    expect(isOffline(server)).toBe(false);
    TestBed.runInInjectionContext(() => {
      expect(fetchProblem(network, 'Could not load')).toBe(
        'Not available offline. Connect to the internet to see this.'
      );
      expect(fetchProblem(server, 'Could not load')).toBe('Broken');
      expect(fetchProblem(new Error('x'), 'Could not load')).toBe('Could not load');
    });
  });
});

describe('sending waiting changes again', () => {
  it('waits longer after each failure in a row, up to 5 minutes', () => {
    expect([1, 2, 3, 4, 5, 6, 10].map(retryDelay)).toEqual([
      30_000, 60_000, 120_000, 240_000, 300_000, 300_000, 300_000
    ]);
  });
});
