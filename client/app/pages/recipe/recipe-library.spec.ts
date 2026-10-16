import { TestBed } from '@angular/core/testing';
import { PreferencesService } from '../../core/preferences.service';
import { API, httpMock, testProviders, text } from '../../testing/test-providers';
import { LibraryItem, RecipeLibrary } from './recipe-library';
import { RecipeHelp } from './recipe-help';

const item = (name: string): LibraryItem => ({ _id: name.toLowerCase().replace(/\W/g, '-'), name });
const MINE = [item('Custer Spar (my analysis)'), item('Soda spar, batch from 2024')];
const STANDARD = [item('Custer Feldspar'), item('Minspar 200'), item('Silica'), item('Whiting')];

describe('RecipeLibrary', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  const create = async (mine: LibraryItem[] = MINE, inRecipe = new Set<string>()) => {
    const fixture = TestBed.createComponent(RecipeLibrary);
    fixture.componentRef.setInput('heading', 'Add materials');
    fixture.componentRef.setInput('noun', 'materials');
    fixture.componentRef.setInput('mine', mine);
    fixture.componentRef.setInput('standard', STANDARD);
    fixture.componentRef.setInput('inRecipe', inRecipe);
    const picked: LibraryItem[] = [];
    fixture.componentInstance.pick.subscribe((i) => picked.push(i));
    await fixture.whenStable();
    const names = () =>
      [...fixture.nativeElement.querySelectorAll('.library-item > span:first-child')].map((s: Element) =>
        s.textContent?.trim()
      );
    const button = (label: string) =>
      [...fixture.nativeElement.querySelectorAll('button')].find((b: Element) =>
        (b.getAttribute('aria-label') ?? b.textContent ?? '').trim().startsWith(label)
      ) as HTMLButtonElement;
    const filter = async (value: string) => {
      const input = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { fixture, picked, names, button, filter };
  };

  it('keeps my list and the standard list apart, showing mine first', async () => {
    const { fixture, names, button } = await create();
    expect(names()).toEqual(['Custer Spar (my analysis)', 'Soda spar, batch from 2024']);
    expect(button('My materials').getAttribute('aria-pressed')).toBe('true');
    expect(text(fixture, '.library-tabs')).toContain('Standard (4)');

    button('Standard').click();
    await fixture.whenStable();
    expect(names()).toEqual(['Custer Feldspar', 'Minspar 200', 'Silica', 'Whiting']);
  });

  it('starts on the standard list when I have none of my own, with a link to add some', async () => {
    const { fixture, names, button } = await create([]);
    expect(names()).toEqual(['Custer Feldspar', 'Minspar 200', 'Silica', 'Whiting']);
    button('My materials').click();
    await fixture.whenStable();
    expect(text(fixture, '.library-empty')).toContain('None yet. Add your own on the Materials page.');
    expect(fixture.nativeElement.querySelector('.library-empty a').getAttribute('href')).toBe('/material');
  });

  it('filters by every word typed, in any order', async () => {
    const { fixture, names, button, filter } = await create();
    button('Standard').click();
    await filter('spar');
    expect(names()).toEqual(['Custer Feldspar', 'Minspar 200']);
    await filter('200 min');
    expect(names()).toEqual(['Minspar 200']);
    await filter('zinc');
    expect(text(fixture, '.library-empty')).toBe('Nothing matches "zinc".');
  });

  it('adds with one click, then shows the whole list again', async () => {
    const { fixture, picked, button, filter, names } = await create();
    await filter('custer');
    expect(names().length).toBe(1);
    button('Add Custer Spar').click();
    await fixture.whenStable();
    expect(picked.map((i) => i.name)).toEqual(['Custer Spar (my analysis)']);
    expect((fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement).value).toBe('');
    expect(names().length).toBe(2);
  });

  it('marks what is already in the recipe instead of adding it again', async () => {
    const { fixture, button } = await create(MINE, new Set([MINE[0]._id!]));
    expect(text(fixture, '.in-recipe')).toContain('Custer Spar (my analysis)');
    expect(text(fixture, '.in-recipe')).toContain('In recipe');
    expect(button('Add Custer Spar')).toBeUndefined();
    expect(button('Add Soda spar')).toBeDefined();
  });
});

describe('RecipeLibrary with the standard library', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });

  it('matches other names, marks what is no longer current, and narrows the standard list by region', async () => {
    const fixture = TestBed.createComponent(RecipeLibrary);
    fixture.componentRef.setInput('heading', 'Add materials');
    fixture.componentRef.setInput('noun', 'materials');
    fixture.componentRef.setInput('mine', []);
    fixture.componentRef.setInput('standard', [
      { _id: 'w', name: 'Whiting' },
      { _id: 'c', name: 'Custer Spar', region: ['US'], status: 'discontinued', statusSince: '2023' },
      { _id: 'z', name: 'Zircon', aliases: ['Zircopax', 'Superpax'] },
      { _id: 'g', name: 'Grolleg China Clay', region: ['UK'] }
    ]);
    await fixture.whenStable();
    const names = () =>
      [...fixture.nativeElement.querySelectorAll('.library-item')].map((item: Element) =>
        item.firstElementChild?.firstChild?.textContent?.trim()
      );
    // Alphabetical.
    expect(names()).toEqual(['Custer Spar', 'Grolleg China Clay', 'Whiting', 'Zircon']);
    expect(text(fixture, '.library-status')).toBe('Discontinued 2023');
    // A screen reader hears the status too.
    expect(
      [...fixture.nativeElement.querySelectorAll('.library-item')].map((b: Element) => b.getAttribute('aria-label'))
    ).toEqual(['Add Custer Spar, Discontinued 2023', 'Add Grolleg China Clay', 'Add Whiting', 'Add Zircon']);

    const filter = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
    filter.value = 'zircopax';
    filter.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(names()).toEqual(['Zircon']);
    filter.value = '';
    filter.dispatchEvent(new Event('input'));

    const region = fixture.nativeElement.querySelector('.library-region') as HTMLSelectElement;
    region.value = 'UK';
    region.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(names()).toEqual(['Grolleg China Clay', 'Whiting', 'Zircon']);
    expect(localStorage.getItem('region')).toBe('UK');
  });
});

describe('RecipeHelp', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async (empty: boolean | null) => {
    const fixture = TestBed.createComponent(RecipeHelp);
    fixture.componentRef.setInput('empty', empty);
    await fixture.whenStable();
    const click = async (label: string) => {
      const button = [...fixture.nativeElement.querySelectorAll('button')].find(
        (b: Element) => b.textContent?.trim() === label
      ) as HTMLButtonElement;
      button.click();
      await fixture.whenStable();
    };
    return { fixture, click };
  };
  const saved = (value: string) =>
    httpMock()
      .expectOne((req) => req.method === 'PUT' && req.url === API + '/preferences')
      .flush({ recipeHelp: value });

  it('opens by itself only for an account with no recipes yet; otherwise it is one line', async () => {
    const empty = await create(true);
    expect(text(empty.fixture, 'h2')).toBe('How to use the recipe calculator');
    // Not known yet, or with recipes: folded to one line.
    for (const state of [null, false]) {
      const folded = await create(state);
      expect(folded.fixture.nativeElement.querySelector('.recipe-help')).toBeNull();
      expect(text(folded.fixture, '.help-reopen button')).toBe('How the recipe calculator works');
      expect(folded.fixture.nativeElement.querySelector('.help-reopen button').getAttribute('aria-expanded')).toBe(
        'false'
      );
    }
  });

  it('stays as chosen, saved with the account, and brings the focus to what replaced the button', async () => {
    const first = await create(true);
    await first.click('Hide these instructions');
    saved('hidden');
    expect(first.fixture.nativeElement.querySelector('.recipe-help')).toBeNull();
    expect(document.activeElement?.textContent?.trim()).toBe('How the recipe calculator works');
    expect(TestBed.inject(PreferencesService).recipeHelp()).toBe('hidden');

    // Hidden even for an empty account, once chosen; opened, it stays open with recipes too.
    const later = await create(false);
    await later.click('How the recipe calculator works');
    saved('shown');
    expect(text(later.fixture, 'h2')).toBe('How to use the recipe calculator');
    expect(document.activeElement?.id).toBe('recipe-help-heading');
    expect((await create(false)).fixture.nativeElement.querySelector('.recipe-help')).not.toBeNull();
  });
});
