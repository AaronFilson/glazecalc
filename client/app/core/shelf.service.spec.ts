import { TestBed } from '@angular/core/testing';
import { API, httpMock, testProviders } from '../testing/test-providers';
import { AuthService } from './auth.service';
import { ShelfService } from './shelf.service';

describe('ShelfService', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  it('fetches the materials on hand once per sign-in, and saves the list in place of the old', async () => {
    const shelf = TestBed.inject(ShelfService);
    expect(shelf.keys()).toBeNull();
    const loading = shelf.load();
    expect(shelf.load()).toBe(loading);
    httpMock()
      .expectOne(API + '/shelf')
      .flush({ shelf: ['name:Whiting'] });
    await loading;
    expect(shelf.keys()).toEqual(['name:Whiting']);
    await shelf.load();
    httpMock().expectNone(API + '/shelf');

    const saving = shelf.save(['name:Whiting', 'name:Silica']);
    // Shown at once, before the server answers.
    expect(shelf.keys()).toEqual(['name:Whiting', 'name:Silica']);
    const put = httpMock().expectOne(API + '/shelf');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ shelf: ['name:Whiting', 'name:Silica'] });
    put.flush({ shelf: ['name:Whiting', 'name:Silica'] });
    expect(await saving).toBe(true);

    // Someone else signs in: fetched again.
    TestBed.inject(AuthService).sessionVersion.update((version) => version + 1);
    const again = shelf.load();
    expect(shelf.keys()).toBeNull();
    httpMock()
      .expectOne(API + '/shelf')
      .flush({ shelf: [] });
    await again;
    expect(shelf.keys()).toEqual([]);
  });

  it("says when the list cannot be fetched or saved, with the server's reason", async () => {
    const shelf = TestBed.inject(ShelfService);
    const loading = shelf.load();
    httpMock()
      .expectOne(API + '/shelf')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await loading;
    // No list rather than an empty one, which a change would save over the potter's own.
    expect(shelf.keys()).toBeNull();
    expect(shelf.problem()).toBe('Your materials on hand could not be fetched. Please try again.');
    // Asked again, it is fetched again.
    const again = shelf.load();
    httpMock()
      .expectOne(API + '/shelf')
      .flush({ shelf: ['x'] });
    await again;
    expect([shelf.keys(), shelf.problem()]).toEqual([['x'], '']);
    const saving = shelf.save(['x']);
    httpMock()
      .expectOne(API + '/shelf')
      .flush({ msg: 'The shelf is a list of up to 500 materials.' }, { status: 400, statusText: 'Bad Request' });
    expect(await saving).toBe(false);
    expect(shelf.problem()).toBe('The shelf is a list of up to 500 materials.');
  });
});
