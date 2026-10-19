import { TestBed } from '@angular/core/testing';
import { TestRequest } from '@angular/common/http/testing';
import { TranslocoService } from '@jsverse/transloco';
import { textKey } from '../../../../lib/regions/languages';
import { useCodedMessages } from '../../i18n/coded';
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

  it('shows the results by cone and atmosphere when the owner sends them with the notes', async () => {
    const { fixture, root } = await open('#' + SECRET, (req) =>
      req.flush({
        ...SHARED,
        firedAt: { scale: 'orton', low: '6', atmospheres: ['reduction'] },
        coneResults: [{ cone: '6', atmosphere: 'reduction', summary: 'Celadon green' }]
      })
    );
    expect(text(fixture, '.shared-cone-summaries h2')).toBe('Results by cone');
    expect(text(fixture, '.shared-cone-summaries')).toContain('Celadon green');
    expect(root.querySelector('gc-recipe-cone-cards')).toBeNull();
  });

  it('shows the working, as the recipe page does', async () => {
    const { fixture, root } = await open('#' + SECRET, (req) => req.flush(SHARED));
    (root.querySelector('#shared-view-worked') as HTMLButtonElement).click();
    await settle(fixture);
    expect(root.querySelector('#shared-view-worked')?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('gc-worked-calculation #worked-heading')?.getAttribute('aria-level')).toBe('2');
    expect(text(fixture, 'gc-worked-calculation')).toContain('Gum');
  });

  const SILICA_HAZARD = 'Dust can cause lung disease (silicosis) if breathed in over time.';
  const HAZARDOUS: SharedRecipe = {
    ...SHARED,
    materials: [
      { ...WHITING, amount: '20' },
      { ...SILICA, amount: '30', ownedBy: 'Standard', hazards: SILICA_HAZARD },
      {
        name: 'Lead bisilicate',
        percentmole: 'percent',
        loi: 0,
        fields: [
          { name: 'PbO', amount: 65 },
          { name: 'SiO2', amount: 35 }
        ],
        amount: '10',
        ownedBy: 'Standard',
        hazards: 'Toxic if swallowed or breathed in.'
      }
    ]
  };

  it("shows the recipe's hazards, the lead caution and the safety guides, as the recipe page does", async () => {
    const { fixture, root } = await open('#' + SECRET, (req) => req.flush(HAZARDOUS));
    const hazards = text(fixture, '.shared-hazards');
    expect(hazards).toContain('Silica: ' + SILICA_HAZARD);
    expect(hazards).toContain('Lead bisilicate: Toxic if swallowed or breathed in.');
    // The owner's own records send no hazards: named as giving none, never claimed safe.
    expect(hazards).toContain('No hazards are given for Whiting and Gum');
    expect(root.querySelector('.shared-hazards h2')?.textContent).toContain('Hazards');
    const guides = [...root.querySelectorAll('.shared-hazards a')].map((a) => a.getAttribute('href'));
    expect(guides).toEqual(expect.arrayContaining(['/guides/safe-mixing', '/guides/home-safety']));
    expect(text(fixture, '.shared-lead')).toContain('Contains lead:');
    // In the working too.
    (root.querySelector('#shared-view-worked') as HTMLButtonElement).click();
    await settle(fixture);
    expect(root.querySelector('.shared-hazards')).not.toBeNull();
    expect(root.querySelector('.shared-lead')).not.toBeNull();
  });

  it('gives no lead caution for a recipe without lead', async () => {
    const { root } = await open('#' + SECRET, (req) => req.flush(SHARED));
    expect(root.querySelector('.shared-lead')).toBeNull();
    expect(root.querySelector('.shared-hazards')).not.toBeNull();
  });

  it("shows the library's hazards in the reader's language", async () => {
    const transloco = TestBed.inject(TranslocoService);
    transloco.setTranslation({ ['records.' + textKey(SILICA_HAZARD)]: 'Staub kann Silikose verursachen.' }, 'de', {
      merge: true
    });
    transloco.setActiveLang('de');
    useCodedMessages(transloco);
    try {
      const { fixture } = await open('#' + SECRET, (req) => req.flush(HAZARDOUS));
      expect(text(fixture, '.shared-hazards')).toContain('Staub kann Silikose verursachen.');
      expect(text(fixture, '.shared-hazards')).not.toContain(SILICA_HAZARD);
    } finally {
      useCodedMessages(null);
      transloco.setActiveLang('en');
    }
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
