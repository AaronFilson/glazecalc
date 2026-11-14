import { TestBed } from '@angular/core/testing';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';
import { ConnectionsService, type ConnectionRow } from './connections.service';

const CLAUDE: ConnectionRow = {
  id: 'c1',
  kind: 'oauth',
  name: 'Claude',
  access: 'write',
  createdAt: '2026-10-10T10:00:00Z',
  expiresAt: '2027-01-10T10:00:00Z',
  working: true,
  changes: { create: 1, change: 0, trash: 0, restore: 0, undo: 0 }
};

describe('ConnectionsService', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  it("forgets the account's connected apps when its session ends, so the next account on this tab never sees them", async () => {
    const connections = TestBed.inject(ConnectionsService);
    const loading = connections.load();
    httpMock()
      .expectOne(API + '/connections')
      .flush({ connections: [CLAUDE], confirmChanges: 'all' });
    await loading;
    expect(connections.list()).toEqual([CLAUDE]);

    TestBed.inject(AuthService).sessionEnded();
    expect(connections.list()).toBeNull();
    expect(connections.confirmChanges()).toBeNull();
  });
});
