import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { text } from '../../testing/test-providers';
import { LibraryItem, RecipeLibrary } from './recipe-library';
import { RecipeHelp } from './recipe-help';

const item = (name: string): LibraryItem => ({ _id: name.toLowerCase().replace(/\W/g, '-'), name });
const MINE = [item('Custer Spar (my analysis)'), item('Soda spar, batch from 2024')];
const STANDARD = [item('Custer Feldspar'), item('Minspar 200'), item('Silica'), item('Whiting')];

describe('RecipeLibrary', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

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

describe('RecipeHelp', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  const create = async () => {
    const fixture = TestBed.createComponent(RecipeHelp);
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

  it('shows the instructions until hidden, remembers that, and brings them back', async () => {
    const first = await create();
    expect(text(first.fixture, 'h2')).toBe('How to use the recipe calculator');
    await first.click('Hide these instructions');
    expect(first.fixture.nativeElement.querySelector('.recipe-help')).toBeNull();
    expect(localStorage.getItem('recipeHelp')).toBe('hidden');

    // A later visit starts with them hidden.
    const later = await create();
    expect(later.fixture.nativeElement.querySelector('.recipe-help')).toBeNull();
    await later.click('How to use this page');
    expect(text(later.fixture, 'h2')).toBe('How to use the recipe calculator');
    expect(localStorage.getItem('recipeHelp')).toBeNull();
  });
});
