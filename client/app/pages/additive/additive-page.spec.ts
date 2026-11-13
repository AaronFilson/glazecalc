import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Additive } from '../../core/models';
import { API, answer, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { AdditivePage } from './additive-page';

// The additives page as a potter fills it in: every field typed, the oxides added and taken off the list,
// the form sent, and an additive of their own removed and put back. (simple-pages.spec.ts has the record
// that is saved, field by field.)

describe('AdditivePage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async (mine: Additive[] = []) => {
    const fixture = TestBed.createComponent(AdditivePage);
    await fixture.whenStable();
    answer('/additives/getAll', mine);
    answer('/additives/getStandard', []);
    await settle(fixture);
    return page(fixture);
  };

  const page = (fixture: ComponentFixture<AdditivePage>) => {
    const root = fixture.nativeElement as HTMLElement;
    const type = async (id: string, value: string) => {
      const field = root.querySelector('#' + id) as HTMLInputElement | HTMLTextAreaElement;
      field.value = value;
      field.dispatchEvent(new Event('input'));
      field.dispatchEvent(new Event('blur'));
      await settle(fixture);
    };
    const choose = async (id: string, value: string) => {
      const select = root.querySelector('#' + id) as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await settle(fixture);
    };
    const press = async (label: string) => {
      const button = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
      button!.click();
      await settle(fixture);
    };
    const save = async () => {
      (root.querySelector('form button[type="submit"]') as HTMLButtonElement).click();
      await settle(fixture);
    };
    const oxides = () => [...root.querySelectorAll('.oxide-lines li b')].map((b) => b.textContent);
    return { fixture, root, type, choose, press, save, oxides };
  };

  it('saves an additive typed in as a potter fills in the form', async () => {
    const { fixture, root, type, choose, press, save, oxides } = await create();
    await type('additive-name', 'Black cobalt');
    await type('formula', 'Co3O4');
    await type('related-to', 'cobalt carbonate');
    await type('notes', 'Strong blue.\nUse sparingly.');
    await type('additive-loi', '6.64');
    await type('additive-molecularweight', '80.26');
    (root.querySelector('#additive-percent') as HTMLInputElement).click();
    await settle(fixture);
    (root.querySelector('#additive-mole') as HTMLInputElement).click();
    await settle(fixture);
    for (const oxide of ['CoO', 'NiO']) {
      await choose('additive-oxide', oxide);
      await press('Add the oxide to the list');
    }
    expect(oxides()).toEqual(['CoO', 'NiO']);
    await type('part-amount-0', '1');
    (root.querySelector('button[aria-label="Remove NiO from the formula"]') as HTMLButtonElement).click();
    await settle(fixture);
    expect(oxides()).toEqual(['CoO']);

    await save();
    const req = httpMock().expectOne(API + '/additives/create');
    expect(req.request.body).toEqual({
      name: 'Black cobalt',
      rawformula: 'Co3O4',
      relatedTo: 'cobalt carbonate',
      notes: 'Strong blue.\nUse sparingly.',
      percentmole: 'molecular',
      loi: 6.64,
      molecularweight: 80.26,
      equivalent: 80.26,
      formulaweight: 74.93,
      fields: [{ name: 'CoO', amount: '1', amountUnity: 1 }]
    });
    req.flush({ ...req.request.body, _id: 'a1' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('Success. Additive added to database.');
    expect(text(fixture, '.mine-table-scroll tbody')).toContain('Black cobalt');
    // The form is ready for the next.
    expect((root.querySelector('#additive-name') as HTMLInputElement).value).toBe('');
    expect(oxides()).toEqual([]);
  });

  it('sends nothing without a name, and says why a save failed, keeping what was typed', async () => {
    const { fixture, root, type, save } = await create();
    await save();
    httpMock().expectNone(API + '/additives/create');
    expect(fieldProblem(fixture, 'additive-name')).not.toBe('');

    await type('additive-name', 'Mason 6600');
    (root.querySelector('#additive-no-chemistry') as HTMLInputElement).click();
    await settle(fixture);
    await save();
    httpMock()
      .expectOne(API + '/additives/create')
      .flush({ msg: 'An additive of that name is already saved.' }, { status: 409, statusText: 'Conflict' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('An additive of that name is already saved.');
    expect((root.querySelector('#additive-name') as HTMLInputElement).value).toBe('Mason 6600');
  });

  it('moves one of my additives to the Trash once Remove is confirmed, and Undo puts it back', async () => {
    const stain: Additive = { _id: 'a1', name: 'Mason 6600', noChemistry: true, fields: [] };
    const { fixture, root, press } = await create([stain]);
    const listed = () => [...root.querySelectorAll('.mine-table-scroll tbody bdi')].map((bdi) => bdi.textContent);
    expect(listed()).toEqual(['Mason 6600']);
    (root.querySelector('button[aria-label="Remove Mason 6600"]') as HTMLButtonElement).click();
    await settle(fixture);
    await press('Yes, remove');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/additives/delete/a1' })
      .flush({ trashId: 't1' });
    await settle(fixture);
    expect(listed()).toEqual([]);
    expect(text(fixture, '.server-msg')).toContain('Moved "Mason 6600" to the Trash.');

    await press('Undo');
    httpMock()
      .expectOne({ method: 'POST', url: API + '/trash/restore/t1' })
      .flush({ record: stain });
    await settle(fixture);
    expect(listed()).toEqual(['Mason 6600']);
    expect(text(fixture, '.server-msg')).toContain('Put "Mason 6600" back.');
    await press('Dismiss');
    expect(root.querySelector('.server-msg')).toBeNull();
  });

  it('says when the lists could not be fetched, and fetches the standard list again when asked', async () => {
    const fixture = TestBed.createComponent(AdditivePage);
    await fixture.whenStable();
    const failed = { status: 500, statusText: 'Server Error' };
    httpMock()
      .expectOne(API + '/additives/getAll')
      .flush(null, failed);
    httpMock()
      .expectOne(API + '/additives/getStandard')
      .flush(null, failed);
    await settle(fixture);
    const { press } = page(fixture);
    expect(text(fixture, '.errors-section')).toContain('There was an error in getting the additives information.');
    expect(text(fixture, '.errors-section')).toContain(
      'There was an error in getting the standard additives information.'
    );

    // Failing again is not said twice.
    await press('Try again');
    httpMock()
      .expectOne(API + '/additives/getStandard')
      .flush(null, failed);
    await settle(fixture);
    expect(text(fixture, '.errors-section').match(/standard additives/g)).toHaveLength(1);
    await press('Try again');
    answer('/additives/getStandard', [{ _id: 's1', name: 'Tin oxide', fields: [{ name: 'SnO2', amount: '1' }] }]);
    await settle(fixture);
    expect(text(fixture, 'gc-standard-list')).toContain('Tin oxide');
  });
});
