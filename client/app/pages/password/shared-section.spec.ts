import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { SharedRecipes } from './shared-section';

const ROWS = [
  { recipeId: 'r2', title: 'Celadon', createdAt: '2026-10-16T10:00:00Z', includeNotes: false },
  { recipeId: 'r1', title: 'Satin white', createdAt: '2026-10-01T10:00:00Z', includeNotes: true }
];

describe('SharedRecipes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [...testProviders(), provideRouter([])] }));
  afterEach(() => httpMock().verify());

  const create = async (rows: object[] = ROWS) => {
    const fixture = TestBed.createComponent(SharedRecipes);
    await fixture.whenStable();
    answer('/share/recipes', rows);
    await settle(fixture);
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it('lists each shared recipe: a link to it, since when, whether its notes show, and never a link to share', async () => {
    const { fixture, root } = await create();
    expect(text(fixture, 'h2')).toBe('Shared recipes');
    const rows = [...root.querySelectorAll('li')];
    expect(rows.length).toBe(2);
    const link = rows[0]!.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Celadon');
    expect(link.getAttribute('href')).toBe('/recipe?open=r2');
    expect(rows[0]!.textContent).toContain('Shared since');
    expect(rows[0]!.textContent).toContain('Notes not shown');
    expect(rows[1]!.textContent).toContain('Notes shown');
    expect(root.querySelector('input')).toBeNull();
    expect(root.textContent).not.toContain('/shared#');
  });

  it('stops sharing one recipe, leaving the others', async () => {
    const { fixture, root } = await create();
    (root.querySelector('button[aria-label="Stop sharing Celadon"]') as HTMLButtonElement).click();
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/share/recipe/r2' })
      .flush({ code: 'share-stopped' });
    await settle(fixture);
    expect([...root.querySelectorAll('li')].map((li) => li.querySelector('a')?.textContent?.trim())).toEqual([
      'Satin white'
    ]);
    expect(text(fixture, '[role=status]')).toBe('Celadon is no longer shared. Its link no longer works.');
  });

  it('keeps the row and says so when stopping fails, and says when nothing is shared', async () => {
    const { fixture, root } = await create();
    (root.querySelector('button[aria-label="Stop sharing Celadon"]') as HTMLButtonElement).click();
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/share/recipe/r2' })
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(root.querySelector('[role=alert]')).not.toBeNull();

    const none = await create([]);
    expect(text(none.fixture, '.shared-none')).toBe('You are not sharing any recipe.');
  });
});
