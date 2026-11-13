import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Material } from '../../core/models';
import { EXPIRING_KEYS } from '../../core/settings-expiry';
import { answer, httpMock, settle, testProviders } from '../../testing/test-providers';
import { focusShown } from './focus';
import { LAYOUT_KEY, layoutFromParam, storeLayout, storedLayout } from './recipe-layout';
import { RecipePage } from './recipe-page';

type Page = Record<string, any>;

const WHITING: Material = {
  _id: 'w',
  name: 'Whiting',
  percentmole: 'molecular',
  loi: 43.97,
  fields: [{ name: 'CaO', amount: 1 }]
};
const SILICA: Material = {
  _id: 's',
  name: 'Silica',
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: 'SiO2', amount: 1 }]
};

describe('recipe layout choice', () => {
  beforeEach(() => localStorage.clear());

  it('reads ?layout= as a, b, today or a layout name, and nothing else', () => {
    expect(layoutFromParam('a')).toBe('workbench');
    expect(layoutFromParam('B')).toBe('guided');
    expect(layoutFromParam('today')).toBe('standard');
    expect(layoutFromParam('workbench')).toBe('workbench');
    expect(layoutFromParam('c')).toBeNull();
    expect(layoutFromParam(null)).toBeNull();
  });

  it('keeps the choice on this browser, the standard form until one is made, and lets it expire with the others', () => {
    expect(storedLayout()).toBe('standard');
    storeLayout('guided');
    expect(localStorage.getItem(LAYOUT_KEY)).toBe('guided');
    expect(storedLayout()).toBe('guided');
    localStorage.setItem(LAYOUT_KEY, 'nonsense');
    expect(storedLayout()).toBe('standard');
    expect(EXPIRING_KEYS).toContain(LAYOUT_KEY);
  });

  it('works without storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    };
    expect(storedLayout(broken)).toBe('standard');
    expect(() => storeLayout('workbench', broken)).not.toThrow();
  });

  it('works where the browser will not even hand over its storage', () => {
    const own = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      }
    });
    try {
      expect(storedLayout()).toBe('standard');
      expect(() => storeLayout('guided')).not.toThrow();
    } finally {
      if (own) Object.defineProperty(globalThis, 'localStorage', own);
      else delete (globalThis as { localStorage?: Storage }).localStorage;
    }
    expect(localStorage.getItem(LAYOUT_KEY)).toBeNull();
  });
});

describe('RecipePage layouts', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    answer('/materials/getStandard', [WHITING, SILICA]);
    answer('/materials/getAll', []);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', []);
    answer('/recipe/getAll', []);
    await settle(fixture);
    const page = fixture.componentInstance as unknown as Page;
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, page, element };
  };

  const fill = (page: Page) => {
    page['edit'].addMaterial(WHITING);
    page['edit'].setAmount(0, '20');
    page['edit'].addMaterial(SILICA);
    page['edit'].setAmount(1, '30');
  };

  it('shows the standard form by default, with the switch on it', async () => {
    const { element } = await create();
    expect((element.querySelector('#layout-standard') as HTMLInputElement).checked).toBe(true);
    expect(element.querySelector('.layout-choice legend')?.textContent).toContain('Form layout');
    expect(element.querySelector('.layout-workbench')).toBeNull();
    expect(element.querySelector('.layout-guided')).toBeNull();
    for (const selector of ['#recipe-name', '.unity-panel', '.library', '.recipe-status', '.recipe-save']) {
      expect(element.querySelectorAll(selector).length, selector).toBeGreaterThan(0);
    }
  });

  it('draws the workbench: Save in the header, formula and limits beside, folds for fixes and details', async () => {
    const { fixture, page, element } = await create();
    (element.querySelector('#layout-workbench') as HTMLInputElement).click();
    fill(page);
    await settle(fixture);
    expect(localStorage.getItem('recipeLayout')).toBe('workbench');
    const bench = element.querySelector('.layout-workbench') as HTMLElement;
    expect(bench).not.toBeNull();
    expect(bench.querySelector('.editor-top .btn-primary')?.textContent?.trim()).toBe('Save');
    expect(bench.querySelector('.workbench-side .unity-panel')).not.toBeNull();
    expect(bench.querySelector('.workbench-side .recipe-numbers')).not.toBeNull();
    expect(bench.querySelector('.workbench-peek')?.textContent).toContain('CaO 1.000');
    expect(bench.querySelector('#fix-fold summary')?.textContent).toContain('Fix and swap (0)');
    const details = bench.querySelector('#details-fold') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details.querySelector('#recipe-notes')).not.toBeNull();
    // The title stays out of the fold, and is the heading.
    expect(details.querySelector('#recipe-name')).toBeNull();
    expect(element.querySelectorAll('#recipe-name').length).toBe(1);
    expect(element.querySelectorAll('.recipe-status').length).toBe(1);
  });

  it('opens the details fold when the focus is sent into it', async () => {
    const { fixture, page, element } = await create();
    page['chooseLayout']('workbench');
    await settle(fixture);
    focusShown('recipe-notes');
    expect((element.querySelector('#details-fold') as HTMLDetailsElement).open).toBe(true);
    expect(document.activeElement?.id).toBe('recipe-notes');
  });

  it('draws guided steps, one at a time, the additives under the materials in Amounts', async () => {
    const { fixture, page, element } = await create();
    page['chooseLayout']('guided');
    fill(page);
    await settle(fixture);
    const panes = [...element.querySelectorAll('.guided-pane')] as HTMLElement[];
    expect(panes.length).toBe(4);
    expect(panes.map((pane) => pane.hidden)).toEqual([false, true, true, true]);
    expect(element.querySelector('[aria-current="step"]')?.textContent).toContain('Recipe');
    // Amounts: the materials, then the additives below them; the formula is not there while typing.
    const amounts = panes[1];
    expect(amounts.querySelector('.recipe-materials')).not.toBeNull();
    const additives = amounts.querySelector('#additives-heading') as HTMLElement;
    expect(amounts.querySelector('#materials-heading')!.compareDocumentPosition(additives)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(amounts.querySelector('.unity-panel')).toBeNull();
    expect(panes[2].querySelector('.unity-panel')).not.toBeNull();
    expect(panes[3].querySelector('.recipe-status')).not.toBeNull();

    (element.querySelector('#guided-next') as HTMLButtonElement).click();
    await settle(fixture);
    expect(panes.map((pane) => pane.hidden)).toEqual([true, false, true, true]);
    expect(document.activeElement?.id).toBe('guided-step-1');
  });

  it('keeps the workbench folds as they were left, and its peek bar goes to the formula', async () => {
    const { fixture, page, element } = await create();
    (element.querySelector('#layout-workbench') as HTMLInputElement).click();
    fill(page);
    await settle(fixture);
    for (const id of ['fix-fold', 'details-fold']) {
      const fold = element.querySelector('#' + id) as HTMLDetailsElement;
      fold.open = true;
      fold.dispatchEvent(new Event('toggle'));
    }
    await settle(fixture);
    // Drawn again, by way of another layout, they are still open.
    (element.querySelector('#layout-standard') as HTMLInputElement).click();
    await settle(fixture);
    (element.querySelector('#layout-workbench') as HTMLInputElement).click();
    await settle(fixture);
    expect((element.querySelector('#fix-fold') as HTMLDetailsElement).open).toBe(true);
    expect((element.querySelector('#details-fold') as HTMLDetailsElement).open).toBe(true);

    // jsdom does not scroll: the scroll is recorded instead.
    const scrolled = vi.fn();
    const own = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    Element.prototype.scrollIntoView = scrolled;
    try {
      (element.querySelector('.workbench-peek button') as HTMLButtonElement).click();
      expect(scrolled).toHaveBeenCalledWith({ block: 'start' });
      expect(scrolled.mock.contexts[0]).toBe(element.querySelector('#unity-heading'));
      expect(document.activeElement?.id).toBe('unity-heading');
    } finally {
      if (own) Object.defineProperty(Element.prototype, 'scrollIntoView', own);
      else delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('goes to a guided step by its tab, and a step back by Back', async () => {
    const { fixture, page, element } = await create();
    (element.querySelector('#layout-guided') as HTMLInputElement).click();
    fill(page);
    await settle(fixture);
    const panes = [...element.querySelectorAll('.guided-pane')] as HTMLElement[];
    (element.querySelector('#guided-tab-2') as HTMLButtonElement).click();
    await settle(fixture);
    expect(panes.map((pane) => pane.hidden)).toEqual([true, true, false, true]);
    expect(element.querySelector('#guided-tab-2')?.getAttribute('aria-current')).toBe('step');
    expect(document.activeElement?.id).toBe('guided-step-2');
    (element.querySelector('#guided-back') as HTMLButtonElement).click();
    await settle(fixture);
    expect(panes.map((pane) => pane.hidden)).toEqual([true, false, true, true]);
    expect(document.activeElement?.id).toBe('guided-step-1');
  });

  it('shows the step a field is in when the focus is sent there, as a missing title on Save', async () => {
    const { fixture, page, element } = await create();
    page['chooseLayout']('guided');
    fill(page);
    page['goToStep'](3);
    await settle(fixture);
    page['save']();
    await settle(fixture);
    expect(page['guidedStep']()).toBe(0);
    expect((element.querySelector('.guided-pane[data-step="0"]') as HTMLElement).hidden).toBe(false);
    expect(document.activeElement?.id).toBe('recipe-name');
  });

  describe('?layout=', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideLocationMocks(), provideRouter([{ path: 'recipe', component: RecipePage }])]
      });
    });

    it('chooses the layout for the visit without keeping it', async () => {
      const harness = await RouterTestingHarness.create();
      const page = (await harness.navigateByUrl('/recipe?layout=b', RecipePage)) as unknown as Page;
      answer('/materials/getStandard', []);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', []);
      await settle(harness.fixture);
      expect(page['layout']()).toBe('guided');
      expect(harness.routeNativeElement?.querySelector('.layout-guided')).not.toBeNull();
      expect(localStorage.getItem('recipeLayout')).toBeNull();
    });
  });
});
