import { TestBed } from '@angular/core/testing';
import { FiringBlock } from '../../../../lib/cones/firing';
import { ConeResult } from '../../../../lib/cones/results';
import { Firing, FiringLink } from '../../core/models';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { ConeSummaries, RecipeConeCards, coneCards, placesOf, withSummary } from './recipe-cone-cards';

// The result cards: a card for each cone and atmosphere the recipe was fired
// at, keyed by the atmospheres its firing states, with the potter's summary
// and the firing logs placed there.

const LOGS: Firing[] = [
  { _id: 'f1', title: 'Glaze 14', date: '2026-10-01', fieldsIncluded: ['Cone'], rows: [['6']] },
  { _id: 'f2', title: 'Glaze 15', fieldsIncluded: ['Cone'], rows: [['6']] },
  { _id: 'f3', title: 'Glaze 16', fieldsIncluded: ['Cone'], rows: [['6']] }
];

const keys = (block: FiringBlock | null, links: FiringLink[], results: ConeResult[] = []) =>
  coneCards(block, links, results).map((card) => card.key);

describe('coneCards', () => {
  it('gives each tested cone a card with no atmosphere when none is stated, and a log its cone', () => {
    const block: FiringBlock = { scale: 'orton', low: '5', high: '7', tested: ['5', '7'] };
    expect(keys(block, [{ firing: 'f1', cone: '6', atmosphere: 'reduction' }])).toEqual(['5|', '6|', '7|']);
  });

  it('puts a log or result with no atmosphere at the one atmosphere stated', () => {
    const block: FiringBlock = { scale: 'orton', low: '6', atmospheres: ['reduction'] };
    const cards = coneCards(block, [{ firing: 'f1', cone: '6' }], [{ cone: '6', summary: 'Celadon' }]);
    expect(cards.map((c) => c.key)).toEqual(['6|reduction']);
    expect(cards[0]!.summary).toBe('Celadon');
    expect(cards[0]!.links.length).toBe(1);
  });

  it('with several atmospheres, cards only where there is a summary or a log, in cone and atmosphere order', () => {
    const block: FiringBlock = { scale: 'orton', low: '6', high: '10', atmospheres: ['oxidation', 'reduction'] };
    expect(keys(block, [])).toEqual([]);
    expect(
      keys(
        block,
        [{ firing: 'f1', cone: '10', atmosphere: 'reduction' }, { firing: 'f2', cone: '6' }, { firing: 'f3' }],
        [
          { cone: '6', atmosphere: 'reduction', summary: 'Celadon' },
          { cone: '6', atmosphere: 'oxidation', summary: 'Pale' }
        ]
      )
    ).toEqual(['6|', '6|oxidation', '6|reduction', '10|reduction', 'unplaced']);
  });

  it('keeps a result outside the stated firing and marks it so', () => {
    const block: FiringBlock = { scale: 'orton', low: '6', atmospheres: ['oxidation'] };
    const cards = coneCards(
      block,
      [],
      [
        { cone: '10', atmosphere: 'oxidation', summary: 'Runs' },
        { cone: '6', atmosphere: 'reduction', summary: 'Green' }
      ]
    );
    expect(cards.map((c) => [c.key, c.outside])).toEqual([
      ['6|oxidation', false],
      ['6|reduction', true],
      ['10|oxidation', true]
    ]);
    // No firing stated: nothing is outside.
    expect(coneCards(null, [], [{ cone: '10', summary: 'Runs' }])[0]!.outside).toBe(false);
  });

  it('offers each cone of the range at each atmosphere stated, and sets or takes off a summary in place', () => {
    const places = placesOf({ scale: 'orton', low: '5', high: '6', atmospheres: ['oxidation', 'reduction'] });
    expect(places.map((p) => p.cone + ' ' + p.atmosphere)).toEqual([
      '5 oxidation',
      '5 reduction',
      '6 oxidation',
      '6 reduction'
    ]);
    const results: ConeResult[] = [
      { cone: '5', summary: 'Dry' },
      { cone: '6', summary: 'Glossy' }
    ];
    expect(withSummary(results, { cone: '5' }, '  Satin ')).toEqual([
      { cone: '5', summary: 'Satin' },
      { cone: '6', summary: 'Glossy' }
    ]);
    expect(withSummary(results, { cone: '5' }, '')).toEqual([{ cone: '6', summary: 'Glossy' }]);
    expect(withSummary(results, { cone: '6', atmosphere: 'reduction' }, 'Green')).toEqual([
      ...results,
      { cone: '6', atmosphere: 'reduction', summary: 'Green' }
    ]);
    // Saved with no atmosphere, shown at the one stated since: replaced, not written twice.
    const block: FiringBlock = { scale: 'orton', low: '6', atmospheres: ['reduction'] };
    expect(withSummary(results, { cone: '6', atmosphere: 'reduction' }, 'Green', block)).toEqual([
      { cone: '5', summary: 'Dry' },
      { cone: '6', atmosphere: 'reduction', summary: 'Green' }
    ]);
  });
});

describe('RecipeConeCards', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async (inputs: Record<string, unknown>) => {
    const fixture = TestBed.createComponent(RecipeConeCards);
    fixture.componentRef.setInput('logs', LOGS);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, cards: fixture.componentInstance };
  };

  it('shows one card open with its temperature, band, cautions, summary and logs', async () => {
    const { fixture, root } = await create({
      block: { scale: 'orton', low: '6', tested: ['6'] },
      links: [{ firing: 'f1', cone: '6', result: 'glossy, no crazing' }],
      results: [{ cone: '6', summary: 'Satin white' }],
      // Too little silica for mid fire, by Hesselberth & Roy's set.
      unity: { CaO: 0.7, K2O: 0.3, Al2O3: 0.3, SiO2: 1.5 }
    });
    const details = root.querySelectorAll('details.cone-card');
    expect(details.length).toBe(1);
    expect((details[0] as HTMLDetailsElement).open).toBe(true);
    const summary = text(fixture, '.cone-card summary');
    expect(summary).toContain('cone 6');
    expect(summary).toMatch(/≈ \d{4} °[CF]/);
    expect(summary).toContain('Mid fire');
    expect(summary).toMatch(/\d+ limit cautions?/);
    expect(summary).toContain('1 firing log');
    expect((root.querySelector('.cone-card-summary') as HTMLTextAreaElement).value).toBe('Satin white');
    expect(text(fixture, '.cone-card-logs')).toContain('Glaze 14');
    expect(text(fixture, '.cone-card-logs')).toContain('glossy, no crazing');
  });

  it('collapses the cards when there is more than one, and keeps an Unassigned card for logs not placed', async () => {
    const { fixture, root } = await create({
      block: { scale: 'orton', low: '6', high: '10', tested: ['6', '10'] },
      links: [{ firing: 'f1', cone: '6' }, { firing: 'f2' }]
    });
    const details = [...root.querySelectorAll('details.cone-card')] as HTMLDetailsElement[];
    expect(details.length).toBe(3);
    expect(details.every((d) => !d.open)).toBe(true);
    expect(details[2]!.querySelector('summary')?.textContent).toContain('Not placed at a cone');
    expect(text(fixture, '.cone-cards')).toContain('Glaze 15');
  });

  it("writes the potter's summary into the results, keyed by cone and atmosphere", async () => {
    const { fixture, root, cards } = await create({
      block: { scale: 'orton', low: '6', atmospheres: ['reduction'] }
    });
    const box = root.querySelector('#cone-summary-0') as HTMLTextAreaElement;
    box.value = ' Celadon green ';
    box.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(cards.results()).toEqual([{ cone: '6', atmosphere: 'reduction', summary: 'Celadon green' }]);
  });

  it('places a log on the server for a saved recipe, and here for one not saved yet', async () => {
    const block: FiringBlock = { scale: 'orton', low: '6', atmospheres: ['oxidation', 'reduction'] };
    const saved = await create({ block, links: [{ firing: 'f2' }], recipeId: 'r1' });
    const emitted: FiringLink[][] = [];
    saved.cards.saved.subscribe((links) => emitted.push(links));
    const select = saved.root.querySelector('#cone-place-0-f2') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent?.trim())).toEqual([
      'Not placed',
      'cone 6 · oxidation',
      'cone 6 · reduction'
    ]);
    select.value = '6|reduction';
    select.dispatchEvent(new Event('change'));
    const put = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/firings/r1/f2' });
    expect(put.request.body).toEqual({ cone: '6', atmosphere: 'reduction' });
    put.flush({ firings: [{ firing: 'f2', cone: '6', atmosphere: 'reduction' }] });
    await settle(saved.fixture);
    expect(emitted).toEqual([[{ firing: 'f2', cone: '6', atmosphere: 'reduction' }]]);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: testProviders() });
    const draft = await create({ block, links: [{ firing: 'f2', result: 'ok' }] });
    const choice = draft.root.querySelector('#cone-place-0-f2') as HTMLSelectElement;
    choice.value = '6|oxidation';
    choice.dispatchEvent(new Event('change'));
    await draft.fixture.whenStable();
    expect(draft.cards.links()).toEqual([{ firing: 'f2', result: 'ok', cone: '6', atmosphere: 'oxidation' }]);
  });

  it('adds a card for another cone and atmosphere of the range', async () => {
    const { fixture, root } = await create({
      block: { scale: 'orton', low: '6', high: '7', atmospheres: ['oxidation', 'reduction'] }
    });
    expect(root.querySelectorAll('details.cone-card').length).toBe(0);
    const select = root.querySelector('#cone-card-add') as HTMLSelectElement;
    select.value = '7|reduction';
    (root.querySelector('#cone-card-add-button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text(fixture, '.cone-card summary')).toContain('cone 7 · reduction');
  });

  it('shows the cone-fit line in its slot when one is given', async () => {
    const { fixture } = await create({
      block: { scale: 'orton', low: '6' },
      coneFit: ({ cone }: { cone: string }) => `Fluxes look like cone ${cone}`
    });
    expect(text(fixture, '.cone-card-fit')).toBe('Fluxes look like cone 6');
  });
});

describe('ConeSummaries', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  it('lists the summaries alone, each at its cone and atmosphere, saying when one is outside the firing', async () => {
    const fixture = TestBed.createComponent(ConeSummaries);
    fixture.componentRef.setInput('reader', { cones: 'orton', temperature: 'C' });
    fixture.componentRef.setInput('block', { scale: 'orton', low: '6', atmospheres: ['oxidation'] });
    fixture.componentRef.setInput('results', [
      { cone: '6', summary: 'Satin' },
      { cone: '10', atmosphere: 'reduction', summary: 'Runs' }
    ]);
    await fixture.whenStable();
    const terms = [...fixture.nativeElement.querySelectorAll('dt')].map((dt: Element) => dt.textContent?.trim());
    expect(terms[0]?.replace(/\s+/g, ' ')).toMatch(/^cone 6 · oxidation · ≈ 12\d\d °C$/);
    expect(terms[1]).toContain('outside the stated firing');
    expect(text(fixture, 'dl')).toContain('Satin');
  });
});
