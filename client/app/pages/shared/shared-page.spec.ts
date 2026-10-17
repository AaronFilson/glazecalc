import { TestBed } from '@angular/core/testing';
import { TestRequest } from '@angular/common/http/testing';
import { Material } from '../../core/models';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { evaluate } from '../recipe/recipe-analysis';
import { SharedPage, SharedRecipe, secretIn } from './shared-page';

const SECRET = 'c'.repeat(43);
const WHITING: Material = {
  name: 'Whiting',
  percentmole: 'molecular',
  loi: 43.97,
  fields: [{ name: 'CaO', amount: 1 }]
};
const SILICA: Material = { name: 'Silica', percentmole: 'molecular', loi: 0, fields: [{ name: 'SiO2', amount: 1 }] };
const BENTONITE: Material = {
  name: 'Bentonite',
  fields: [{ name: 'SiO2', amount: 60 }],
  percentmole: 'percent',
  loi: 8
};
const SHARED: SharedRecipe = {
  title: 'Class clear',
  date: '2026-10-06',
  includeAdditives: true,
  materials: [
    { ...WHITING, amount: '20' },
    { ...SILICA, amount: '30' }
  ],
  // Borrows bentonite's chemistry by name, which the server sends with the recipe.
  additives: [{ name: 'Gum', amount: '1', unit: 'percent', fields: [], chemistryOf: 'Bentonite' }],
  notes: ['Fire to cone 6.'],
  borrowed: [BENTONITE]
};

describe('secretIn', () => {
  it('reads the secret after #', () => {
    expect(secretIn('#' + SECRET)).toBe(SECRET);
    expect(secretIn('')).toBe('');
  });
});

describe('SharedPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => {
    httpMock().verify();
    history.replaceState(null, '', location.pathname);
  });

  const open = async (hash: string, reply?: (req: TestRequest) => void) => {
    history.replaceState(null, '', location.pathname + hash);
    const fixture = TestBed.createComponent(SharedPage);
    await fixture.whenStable();
    if (reply) reply(httpMock().expectOne(API + '/shared/recipe'));
    await settle(fixture);
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it('opens the recipe by the secret, sent in a header and never in the address', async () => {
    let header: string | null = null;
    const { fixture, root } = await open('#' + SECRET, (req) => {
      header = req.request.headers.get('X-Share-Secret');
      expect(req.request.urlWithParams).not.toContain(SECRET);
      req.flush(SHARED);
    });
    expect(header).toBe(SECRET);
    expect(text(fixture, 'h1')).toBe('Class clear');
    expect(text(fixture, '.shared-table tbody')).toContain('Whiting');
    expect(text(fixture, '.shared-notes')).toContain('Fire to cone 6.');
    // The same unity formula as the owner's page, borrowed chemistry and all.
    const page = evaluate(SHARED.materials, SHARED.additives, {
      includeAdditives: true,
      chemistryOf: (name) => (name === 'Bentonite' ? BENTONITE : undefined)
    }).analysis!;
    expect(text(fixture, '.shared-chemistry')).toContain('SiO₂ : ' + page.uList['SiO2'].toFixed(3));
    expect(root.querySelector('gc-worked-calculation')).toBeNull();
  });

  it('shows the working, as the recipe page does', async () => {
    const { fixture, root } = await open('#' + SECRET, (req) => req.flush(SHARED));
    (root.querySelector('#shared-view-worked') as HTMLButtonElement).click();
    await settle(fixture);
    expect(root.querySelector('#shared-view-worked')?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('gc-worked-calculation #worked-heading')?.getAttribute('aria-level')).toBe('2');
    expect(text(fixture, 'gc-worked-calculation')).toContain('Gum');
  });

  it('says a recipe is not shared, for a link that opens nothing or has no secret', async () => {
    const gone = await open('#' + SECRET, (req) =>
      req.flush({ code: 'not-shared', msg: 'Not shared' }, { status: 404, statusText: 'Not Found' })
    );
    expect(text(gone.fixture, 'h1')).toBe('This recipe is not shared');
    const bare = await open('');
    expect(text(bare.fixture, 'h1')).toBe('This recipe is not shared');
  });

  it('offers to try again when the server cannot answer', async () => {
    const { fixture } = await open('#' + SECRET, (req) =>
      req.flush(
        { code: 'too-many-shared-views', msg: 'Too many shared recipes.' },
        { status: 429, statusText: 'Too Many Requests' }
      )
    );
    expect(text(fixture, '.shared-problem')).toBe('Too many shared recipes.');
    expect(text(fixture)).toContain('Try again');
  });
});
