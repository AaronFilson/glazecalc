import { TestBed } from '@angular/core/testing';
import { FiringBlock } from '../../../../lib/cones/firing';
import { Firing, FiringLink } from '../../core/models';
import { OfflineRecords } from '../../core/offline-records';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { RecipeFirings } from './recipe-firings';

// The firing logs a recipe went through, each with what came of it there:
// changed here for a recipe not saved yet, and one at a time on the server for
// a saved one. The cones the logs name can tick the tested cones.

const LOGS: Firing[] = [
  {
    _id: 'f1',
    title: 'Glaze 14',
    date: '2026-10-01',
    fieldsIncluded: ['Cone', 'Atmosphere'],
    rows: [['6', 'reduction']]
  },
  { _id: 'f2', title: 'Glaze 15', fieldsIncluded: ['Cone'], rows: [['5'], ['7']] },
  { _id: 'f3', title: 'Bisque 3', fieldsIncluded: ['Cone'], rows: [['04']] }
];

interface Inputs {
  links?: FiringLink[];
  block?: FiringBlock | null;
  recipeId?: string | null;
}

describe('RecipeFirings', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  /** The part with its inputs, once the account's logs are in (null: their fetch fails). */
  const create = async (inputs: Inputs, logs: Firing[] | null = LOGS) => {
    const fixture = TestBed.createComponent(RecipeFirings);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    const loaded: Firing[][] = [];
    const saved: FiringLink[][] = [];
    fixture.componentInstance.logsLoaded.subscribe((list) => loaded.push(list));
    fixture.componentInstance.saved.subscribe((links) => saved.push(links));
    await fixture.whenStable();
    if (logs) answer('/firing/getAll', logs);
    else
      httpMock()
        .expectOne(API + '/firing/getAll')
        .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    /** A button, by what it says or its label. */
    const button = (label: string) => {
      const found = [...root.querySelectorAll('button')].find(
        (b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === label
      );
      if (!found) throw new Error('no button ' + label);
      return found;
    };
    const click = async (label: string) => {
      button(label).click();
      await settle(fixture);
    };
    const writeResult = async (i: number, value: string) => {
      const input = root.querySelector('#firing-result-' + i) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('change'));
      await settle(fixture);
    };
    return { fixture, root, firings: fixture.componentInstance, loaded, saved, button, click, writeResult };
  };

  it('offers the logs to link, newest first, and links one to a recipe not saved yet at the cone and atmosphere it names', async () => {
    const block: FiringBlock = { scale: 'orton', low: '6', high: '7', atmospheres: ['oxidation', 'reduction'] };
    const { fixture, root, firings, loaded, saved, click } = await create({ block });
    expect(loaded).toEqual([LOGS]);
    const options = () => [...root.querySelectorAll('#firing-link-choice option')].map((o) => o.textContent?.trim());
    expect(options()).toEqual(['Bisque 3', 'Glaze 15', 'Glaze 14 · 2026-10-01']);
    const choice = root.querySelector('#firing-link-choice') as HTMLSelectElement;
    choice.value = 'f1';
    await click('Link');
    // Here, not on the server: the links go with the recipe when it is saved.
    expect(firings.links()).toEqual([{ firing: 'f1', cone: '6', atmosphere: 'reduction' }]);
    expect(saved).toEqual([]);
    expect(text(fixture, '.firings-list')).toMatch(/^Glaze 14 · \w+, October 1, 2026/);
    expect(options()).toEqual(['Bisque 3', 'Glaze 15']);
  });

  it('writes what came of a firing, trimmed, keeping where it was placed, and unlinks one, for a recipe not saved yet', async () => {
    const { firings, writeResult, click } = await create({
      block: { scale: 'orton', low: '6', atmospheres: ['reduction'] },
      links: [{ firing: 'f1', cone: '6', atmosphere: 'reduction', result: 'Matte' }, { firing: 'f2' }]
    });
    await writeResult(0, '  glossy, no crazing  ');
    expect(firings.links()).toEqual([
      { firing: 'f1', result: 'glossy, no crazing', cone: '6', atmosphere: 'reduction' },
      { firing: 'f2' }
    ]);
    // Left blank, the note goes; the place stays.
    await writeResult(0, '');
    expect(firings.links()).toEqual([{ firing: 'f1', cone: '6', atmosphere: 'reduction' }, { firing: 'f2' }]);
    await click('Unlink Glaze 14');
    expect(firings.links()).toEqual([{ firing: 'f2' }]);
  });

  it("changes a saved recipe's links on the server one at a time, and says when one could not be changed", async () => {
    const { fixture, root, firings, saved, writeResult, click } = await create({
      links: [{ firing: 'f1', result: 'glossy' }],
      recipeId: 'r1'
    });
    await click('Unlink Glaze 14');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/recipe/firings/r1/f1' })
      .flush({ firings: [] });
    await settle(fixture);
    // The page keeps the links the server has now: they are saved already.
    expect(saved).toEqual([[]]);
    expect(firings.links()).toEqual([{ firing: 'f1', result: 'glossy' }]);

    await writeResult(0, 'matte');
    httpMock()
      .expectOne({ method: 'PUT', url: API + '/recipe/firings/r1/f1' })
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '[role=alert]')).toBe('The change to the firing log links could not be saved.');

    // The next change starts afresh.
    (root.querySelector('#firing-link-choice') as HTMLSelectElement).value = 'f2';
    await click('Link');
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
    const post = httpMock().expectOne({ method: 'POST', url: API + '/recipe/firings/r1' });
    expect(post.request.body).toEqual({ firing: 'f2' });
    post.flush({ firings: [{ firing: 'f1', result: 'glossy' }, { firing: 'f2' }] });
    await settle(fixture);
    expect(saved.at(-1)).toEqual([{ firing: 'f1', result: 'glossy' }, { firing: 'f2' }]);
  });

  it('keeps out of a recipe the page has moved on from an answer that comes back after', async () => {
    const { fixture, saved, click } = await create({ links: [{ firing: 'f1' }], recipeId: 'r1' });
    await click('Unlink Glaze 14');
    const unlink = httpMock().expectOne({ method: 'DELETE', url: API + '/recipe/firings/r1/f1' });
    fixture.componentRef.setInput('recipeId', 'r2');
    unlink.flush({ firings: [] });
    await settle(fixture);
    expect(saved).toEqual([]);
  });

  it("changes no saved recipe's link while the page shows the copy kept on this device, and says why", async () => {
    TestBed.inject(OfflineRecords).showingCopy.set(new Date('2026-11-01T10:00:00Z'));
    const { fixture, firings, button, click } = await create({ links: [{ firing: 'f1' }], recipeId: 'r1' });
    const unlink = button('Unlink Glaze 14');
    expect(unlink.getAttribute('aria-disabled')).toBe('true');
    expect(unlink.getAttribute('title')).toMatch(/^Glazecalc can't be reached\. Showing the copy saved on this device/);
    await click('Unlink Glaze 14');
    expect(text(fixture, '[role=alert]')).toMatch(/^Glazecalc can't be reached\./);
    expect(firings.links()).toEqual([{ firing: 'f1' }]);
    httpMock().expectNone(() => true);
  });

  it('says when there are no firing logs yet, with a way to record one', async () => {
    const { fixture, root } = await create({}, []);
    expect(text(fixture, '.recipe-firings p')).toBe('No firing logs yet. Record a firing');
    expect(root.querySelector('.recipe-firings p a')?.getAttribute('href')).toBe('/firing');
    expect(root.querySelector('#firing-link-choice')).toBeNull();
  });

  it('says when the firing logs could not be fetched, and shows no links to them', async () => {
    const { fixture, root, loaded } = await create({ links: [{ firing: 'f1' }] }, null);
    expect(text(fixture, '.recipe-firings p')).toBe('Your firing logs could not be fetched.');
    expect(root.querySelector('.firings-list')).toBeNull();
    expect(loaded).toEqual([]);
  });

  it('ticks the tested cones its logs name at once when none are ticked', async () => {
    const { root, firings, click } = await create({
      block: { scale: 'orton', low: '5', high: '7' },
      links: [{ firing: 'f2' }]
    });
    expect(root.querySelector('#firings-fill')?.textContent?.trim()).toBe(
      'Tick the cones these logs name: cone 5, cone 7'
    );
    await click('Tick the cones these logs name: cone 5, cone 7');
    expect(firings.block()).toEqual({ scale: 'orton', low: '5', high: '7', tested: ['5', '7'] });
    // The ticks say just that now: nothing more to offer.
    expect(root.querySelector('#firings-fill')).toBeNull();
  });

  it('asks before replacing the tested cones ticked already, and keeps them if told to', async () => {
    const { fixture, root, firings } = await create({
      block: { scale: 'orton', low: '5', high: '7', tested: ['6'] },
      links: [{ firing: 'f2' }]
    });
    const fill = async () => {
      (root.querySelector('#firings-fill') as HTMLButtonElement).click();
      await settle(fixture);
    };
    await fill();
    expect(text(fixture, '.firings-ask p')).toBe(
      'Tested is ticked at cone 6. Replace that with the cones the logs name, cone 5, cone 7?'
    );
    [...root.querySelectorAll<HTMLButtonElement>('.firings-ask button')]
      .find((b) => b.textContent?.trim() === 'Keep as it is')!
      .click();
    await settle(fixture);
    expect(root.querySelector('.firings-ask')).toBeNull();
    expect(firings.block()?.tested).toEqual(['6']);

    await fill();
    (root.querySelector('#firings-replace') as HTMLButtonElement).click();
    await settle(fixture);
    expect(root.querySelector('.firings-ask')).toBeNull();
    expect(firings.block()).toEqual({ scale: 'orton', low: '5', high: '7', tested: ['5', '7'] });
  });
});
