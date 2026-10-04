import { TestBed } from '@angular/core/testing';
import { Firing } from '../../core/models';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { FiringPage } from './firing-page';

describe('FiringPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async (stored: Firing[] = []) => {
    const fixture = TestBed.createComponent(FiringPage);
    await fixture.whenStable();
    answer('/firing/getAll', stored);
    await settle(fixture);
    return { fixture, page: fixture.componentInstance as unknown as Record<string, any> };
  };

  it('builds a log table from the chosen fields and typed cells', async () => {
    const { fixture, page } = await create();
    page['selectedField'].set('Time');
    page['addField']();
    page['selectedField'].set('Cone');
    page['addField']();
    page['addRow']();
    await fixture.whenStable();

    const inputs = fixture.nativeElement.querySelectorAll('.firing-table input') as NodeListOf<HTMLInputElement>;
    expect(inputs).toHaveLength(2);
    expect(inputs[1].getAttribute('aria-label')).toBe('Cone row 1');
    inputs[0].value = '1:00';
    inputs[0].dispatchEvent(new Event('input'));
    expect(page['log']().rows).toEqual([['1:00', '']]);

    page['moveField'](1, -1);
    await fixture.whenStable();
    expect(text(fixture, '.firing-table tr')).toContain('ConeTime');
    expect(page['log']().rows).toEqual([['', '1:00']]);
  });

  it('shows what is in each cell after a column moves or is removed', async () => {
    const { fixture, page } = await create();
    const boxes = () => [...fixture.nativeElement.querySelectorAll('.firing-cell')] as HTMLInputElement[];
    page['selectedField'].set('Time');
    page['addField']();
    page['selectedField'].set('Cone');
    page['addField']();
    page['addRow']();
    await fixture.whenStable();
    boxes()[0].value = '1';
    boxes()[0].dispatchEvent(new Event('input'));
    await fixture.whenStable();

    page['moveField'](0, 1);
    await fixture.whenStable();
    expect(boxes().map((b) => b.value)).toEqual(['', '1']);

    page['removeField'](1);
    await fixture.whenStable();
    expect(boxes().map((b) => b.value)).toEqual(['']);
  });

  it('saves the log and resets the form', async () => {
    const { fixture, page } = await create();
    page['title'].set('Bisque');
    page['kiln'].set('Electric');
    page['selectedField'].set('Time');
    page['addField']();
    page['addRow']();
    page['setCell'](0, 0, '1:00');

    const saving = page['save']();
    const req = httpMock().expectOne(API + '/firing/create');
    expect(req.request.body).toEqual(expect.objectContaining({
      title: 'Bisque', kiln: 'Electric', fieldsIncluded: ['Time'], rows: [['1:00']]
    }));
    req.flush({ ...req.request.body, _id: 'f1', date: '2026-10-04' });
    await saving;
    await fixture.whenStable();

    expect(page['log']().fields).toEqual([]);
    expect(page['title']()).toBe('');
    expect(text(fixture, '.stored-firing')).toContain('Title: Bisque, Using kiln: Electric');
    expect(text(fixture, '.stored-firing')).toContain('Sunday, October 4, 2026');
  });

  it('needs a title and a field before saving', async () => {
    const { page } = await create();
    page['title'].set('No fields');
    await page['save']();
    httpMock().expectNone(API + '/firing/create');
    expect(page['notices'].errors()).toEqual(['Error: enter a title and at least one field.']);
  });

  it('removes a stored firing and a row', async () => {
    const stored: Firing = { _id: 'f1', title: 'Old', fieldsIncluded: ['Time'], rows: [['1:00']] };
    const { page } = await create([stored]);
    page['selectedField'].set('Time');
    page['addField']();
    page['addRow']();
    page['removeRow'](0);
    page['removeField'](0);
    expect(page['log']().rows).toEqual([]);

    const removing = page['remove'](stored);
    httpMock().expectOne({ method: 'DELETE', url: API + '/firing/delete/f1' }).flush({});
    await removing;
    expect(page['myFirings']()).toEqual([]);
  });
});
