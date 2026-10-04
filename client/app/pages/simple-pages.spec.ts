import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from '../app';
import { AuthService } from '../core/auth.service';
import { API, answer, httpMock, settle, testProviders, text } from '../testing/test-providers';
import { AdditivePage } from './additive/additive-page';
import { AdvicePage } from './advice/advice-page';
import { HomePage } from './home/home-page';
import { NotFoundPage } from './not-found/not-found-page';
import { NotesPage } from './notes/notes-page';
import { TrashPage } from './trash/trash-page';

beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: testProviders() });
});
afterEach(() => httpMock().verify());

const create = async <T>(component: Type<T>) => {
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return { fixture, page: fixture.componentInstance as unknown as Record<string, any> };
};

describe('static pages', () => {
  it('renders home, trash and not found', async () => {
    expect(text((await create(HomePage)).fixture)).toContain('welcome to the Glaze Calc App');
    expect(text((await create(TrashPage)).fixture)).toContain('trash functionality is coming soon');
    expect(text((await create(NotFoundPage)).fixture)).toContain('Page Not Found.');
  });
});

describe('AdditivePage', () => {
  it('saves components and elements with amounts', async () => {
    const { fixture, page } = await create(AdditivePage);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', [{ _id: 's', name: 'Tin oxide', notes: ['Opacifier'], fields: [{ name: 'SnO2', amount: '1' }] }]);
    await settle(fixture);
    expect(text(fixture, 'table')).toContain('Tin oxide');

    page['addToFormula']('', 'element');
    expect(page['notices'].errors()).toEqual(['Error: please select an element.']);
    page['name'].set('My Stain');
    page['addToFormula']('CoO', 'component');
    page['addToFormula']('Zr', 'element');
    page['formula']()[0].amount = '1';
    page['removeFromFormula'](1);

    const saving = page['save']();
    const req = httpMock().expectOne(API + '/additives/create');
    expect(req.request.body).toEqual(expect.objectContaining({ name: 'My Stain', fields: [{ name: 'CoO', amount: '1' }] }));
    req.flush({ ...req.request.body, _id: 'a1' });
    await saving;
    expect(page['myAdditives']().map((a: { name: string }) => a.name)).toEqual(['My Stain']);

    const removing = page['remove'](page['myAdditives']()[0]);
    httpMock().expectOne(API + '/additives/delete/a1').flush({ msg: 'no' }, { status: 500, statusText: 'Error' });
    await removing;
    expect(page['notices'].errors()).toContain('Error in deleting the additive from the server.');
  });
});

describe('AdvicePage', () => {
  it('lists, adds and removes advice', async () => {
    const { fixture, page } = await create(AdvicePage);
    answer('/advice/getAll', []);
    answer('/advice/getStandard', [{ _id: 's', title: 'Sieve', content: 'Use 80 mesh', tags: ['mixing', 'tools'] }]);
    await settle(fixture);
    expect(text(fixture, '.general-advice')).toContain('Tags: mixing, tools');

    await page['save']();
    expect(page['notices'].errors()).toEqual(['Error: there was missing information in the form.']);

    page['title'].set('Wax');
    page['content'].set('Wax the foot');
    const saving = page['save']();
    const req = httpMock().expectOne(API + '/advice/create');
    expect(req.request.body).toEqual({ title: 'Wax', content: 'Wax the foot', tags: 'none' });
    req.flush({ ...req.request.body, _id: 'a1', tags: ['none'] });
    await saving;
    await fixture.whenStable();
    expect(text(fixture, '.my-advice')).toContain('Wax the foot');

    const removing = page['remove'](page['myAdvice']()[0]);
    httpMock().expectOne(API + '/advice/delete/a1').flush({});
    await removing;
    expect(page['myAdvice']()).toEqual([]);
  });
});

describe('NotesPage', () => {
  it('saves notes as general notes', async () => {
    const { fixture, page } = await create(NotesPage);
    answer('/notes/getAll', [{ _id: 'n0', title: 'Old', content: 'kept', relatedCollection: 'Notes', relatedId: 'general notes' }]);
    await settle(fixture);
    expect(text(fixture, '.my-notes')).toContain('kept');

    page['title'].set('Kiln');
    page['content'].set('Element 3 is weak');
    const saving = page['save']();
    const req = httpMock().expectOne(API + '/notes/create');
    expect(req.request.body).toEqual({
      title: 'Kiln', content: 'Element 3 is weak', relatedCollection: 'Notes', relatedId: 'general notes'
    });
    req.flush({ msg: 'Missing required information' }, { status: 400, statusText: 'Bad Request' });
    await saving;
    expect(page['notices'].errors()).toEqual(['Missing required information']);
    expect(page['title']()).toBe('Kiln');
  });
});

describe('App', () => {
  it('greets the signed-in user and logs out to the sign in page', async () => {
    localStorage.setItem('token', 'saved');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: testProviders() });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { fixture } = await create(App);
    httpMock().expectOne(API + '/verify').flush({ msg: 'User verified', email: 'a@b.com' });
    await settle(fixture);
    expect(text(fixture, 'header')).toContain('Hello a@b.com');

    (fixture.nativeElement.querySelector('header button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(TestBed.inject(AuthService).token()).toBeNull();
    expect(fixture.nativeElement.querySelector('header')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/signin');
  });
});
