import { TestBed } from '@angular/core/testing';
import { Material } from '../../core/models';
import { answer, API, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { MaterialPage } from './material-page';

describe('MaterialPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async (mine: Material[] = []) => {
    const fixture = TestBed.createComponent(MaterialPage);
    await fixture.whenStable();
    answer('/materials/getAll', mine);
    answer('/materials/getStandard', [
      {
        _id: 's1',
        name: 'Whiting',
        percentmole: 'molecular',
        loi: 43.97,
        equivalent: 100.08,
        formulaweight: 56.08,
        notes: ['Calcium carbonate'],
        rawformula: 'CaCO₃',
        fields: [{ name: 'CaO', amount: '1' }]
      }
    ]);
    await settle(fixture);
    const page = fixture.componentInstance as unknown as Record<string, any>;
    return { fixture, page };
  };

  const enterTalc = (page: Record<string, any>) => {
    page['form'].name.set('My Talc');
    page['form'].loi.set('4.75');
    for (const [oxide, amount] of [
      ['MgO', '3'],
      ['SiO2', '4']
    ]) {
      page['form'].selectedOxide.set(oxide);
      page['form'].addOxide();
      const lines = page['form'].formula();
      lines[lines.length - 1].amount = amount;
    }
  };

  it('lists the standard materials', async () => {
    const { fixture } = await create();
    const cells = [...fixture.nativeElement.querySelectorAll('table tbody tr:first-child td')].map((td: Element) =>
      td.textContent?.trim()
    );
    expect(cells).toEqual(['Whiting', '100.08', '56.08', 'Calcium carbonate', 'CaO : 1', 'CaCO₃']);
  });

  it('shows formulas typed with plain numbers with subscripts', async () => {
    const boneAsh: Material = {
      _id: 'm1',
      name: 'My Bone Ash',
      percentmole: 'molecular',
      loi: 0,
      rawformula: 'Ca3(PO4)2',
      fields: [
        { name: 'CaO', amount: '3' },
        { name: 'P2O5', amount: '1' }
      ]
    };
    const { fixture, page } = await create([boneAsh]);
    const row = [...fixture.nativeElement.querySelectorAll('tr')].find((tr: Element) =>
      tr.textContent?.includes('My Bone Ash')
    ) as HTMLElement;
    expect(row.textContent).toContain('CaO : 3; P₂O₅ : 1');
    expect(row.textContent).toContain('Ca₃(PO₄)₂');

    // And the oxides chosen for a new material.
    page['form'].selectedOxide.set('Al2O3');
    page['form'].addOxide();
    await fixture.whenStable();
    expect(text(fixture, 'form li b')).toBe('Al₂O₃');
  });

  it('saves a molecular formula with weights worked out from its LOI', async () => {
    const { fixture, page } = await create();
    enterTalc(page);
    const saving = page['save']();
    const req = httpMock().expectOne(API + '/materials/create');
    const body = req.request.body as Material;
    expect(body.equivalent).toBe(126.42);
    expect(body.formulaweight).toBe(120.41);
    expect(body.loi).toBe(4.75);
    expect(body.fields).toEqual([
      { name: 'MgO', amount: '3', amountUnity: 1 },
      { name: 'SiO2', amount: '4', amountUnity: 1.3333 }
    ]);
    req.flush({ ...body, _id: 'm1' });
    await saving;
    await fixture.whenStable();

    expect(page['notices'].messages()).toEqual(['Success. Material added to database.']);
    expect(page['form'].name()).toBe('');
    expect(page['form'].formula()).toEqual([]);
    expect(text(fixture, '#my-materials-heading')).toBe('My materials:');
  });

  it('works out the LOI from the molecular weight when no LOI is given', async () => {
    const { page } = await create();
    enterTalc(page);
    page['form'].loi.set('');
    page['form'].molecularweight.set('379.27');
    void page['save']();
    const req = httpMock().expectOne(API + '/materials/create');
    expect(req.request.body.loi).toBeCloseTo(4.75, 2);
    req.flush({});
  });

  it('refuses an LOI of 100 percent without calling the server', async () => {
    const { fixture, page } = await create();
    enterTalc(page);
    page['form'].loi.set('100');
    await page['save']();
    await fixture.whenStable();
    httpMock().expectNone(API + '/materials/create');
    expect(fieldProblem(fixture, 'LOI')).toBe('Enter the LOI as a percent from 0 to under 100, such as 12.5.');
    expect(document.activeElement?.id).toBe('LOI');
  });

  it('needs a name and an oxide, each with an amount', async () => {
    const { fixture, page } = await create();
    page['form'].addOxide();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'firedoxide')).toBe('Choose an oxide, then Add the oxide to the list.');
    await page['save']();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'material-name')).toBe('Give the material a name.');
    expect(fieldProblem(fixture, 'firedoxide')).toBe(
      'Add at least one oxide: choose it, then Add the oxide to the list.'
    );
    expect(document.activeElement?.id).toBe('material-name');

    page['form'].name.set('Mine');
    page['form'].selectedOxide.set('CaO');
    page['form'].addOxide();
    page['form'].formula()[0].amount = 'one';
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'firedoxide')).toBe('');
    await page['save']();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'oxide-amount-0')).toBe('Enter the amount as a number, such as 0.5.');
    httpMock().expectNone(API + '/materials/create');
    expect(page['notices'].errors()).toEqual([]);
  });

  it('warns when a percent analysis does not total about 100', async () => {
    const { page } = await create();
    page['form'].name.set('Short spar');
    page['form'].percentmole.set('percent');
    page['form'].loi.set('0');
    page['form'].selectedOxide.set('K2O');
    page['form'].addOxide();
    page['form'].formula()[0].amount = '50';
    void page['save']();
    httpMock()
      .expectOne(API + '/materials/create')
      .flush({});
    expect(page['notices'].errors()[0]).toContain('Warning: Analysis of Short spar totals 50.00%');
  });

  it('removes an oxide line and a saved material', async () => {
    const mine: Material = {
      _id: 'm1',
      name: 'Mine',
      percentmole: 'molecular',
      loi: 0,
      fields: [{ name: 'CaO', amount: 1 }]
    };
    const { fixture, page } = await create([mine]);
    page['form'].selectedOxide.set('CaO');
    page['form'].addOxide();
    page['form'].removeOxide(0);
    expect(page['form'].formula()).toEqual([]);

    const removing = page['removal'].remove(mine);
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/materials/delete/m1' })
      .flush({});
    await removing;
    await fixture.whenStable();
    expect(page['myMaterials']()).toEqual([]);
    expect(page['notices'].messages()).toEqual(['Removed "' + mine.name + '".']);
  });
});
