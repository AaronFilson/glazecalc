import { TestBed } from '@angular/core/testing';
import { TranslocoService, translate } from '@jsverse/transloco';
import { FiringBlock } from '../../../../lib/cones/firing';
import { httpMock, testProviders, text } from '../../testing/test-providers';
import { firingLine, firingWords } from './firing-text';
import { RecipeFiring } from './recipe-firing';
import { RecipeLimits } from './recipe-limits';

// The recipe's firing block: the scale, a cone or a claimed range, the cones
// tested, atmosphere and process, and the food-surface note.

describe('RecipeFiring', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async (block: FiringBlock | null = null) => {
    const fixture = TestBed.createComponent(RecipeFiring);
    fixture.componentRef.setInput('block', block);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const choose = async (id: string, value: string) => {
      const select = root.querySelector('#' + id) as HTMLSelectElement | HTMLInputElement;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const tick = async (id: string) => {
      (root.querySelector('#' + id) as HTMLInputElement).click();
      await fixture.whenStable();
    };
    return { fixture, root, choose, tick, firing: fixture.componentInstance };
  };

  it('offers Orton cones in true order, half cones and the rare ones last, and a single cone is not tested until ticked', async () => {
    const { fixture, root, choose, tick, firing } = await create();
    const groups = [...root.querySelectorAll('#firing-low optgroup')].map((g) => g.getAttribute('label'));
    expect(groups).toEqual(['Cones 022 to 13', 'Half cones', 'Cones 14 to 42 (rare in pottery)']);
    const options = [...root.querySelectorAll('#firing-low option')].map((o) => o.textContent?.trim());
    expect(options.indexOf('06')).toBeLessThan(options.indexOf('6'));
    expect(options).toContain('5½');
    await choose('firing-low', '6');
    // A cone just chosen is stated, not tested: the checkbox is off.
    expect(firing.block()).toEqual({ scale: 'orton', low: '6' });
    const box = root.querySelector('#firing-tested-6') as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(root.querySelector('label[for=firing-tested-6]')?.textContent?.trim()).toBe(
      "I've test-fired this at cone 6"
    );
    expect(text(fixture, '.firing-claimed')).toBe('Stated cone 6; not ticked as tested');
    expect(root.querySelector('.firing-tested')).toBeNull();
    await tick('firing-tested-6');
    expect(firing.block()).toEqual({ scale: 'orton', low: '6', tested: ['6'] });
    expect(text(fixture, '.firing-tested')).toBe('Tested at cone 6');
    // Changing the cone drops the tick: the new cone is not one it was fired to.
    await choose('firing-low', '7');
    expect(firing.block()).toEqual({ scale: 'orton', low: '7' });
  });

  it('separates the claimed range from the cones tested, and shows the tested cone first', async () => {
    const { fixture, root, choose, tick, firing } = await create();
    await choose('firing-low', '6');
    await tick('firing-range');
    await choose('firing-high', '10');
    const ticks = [...root.querySelectorAll('.firing-ticks label')].map((l) => l.textContent?.trim());
    expect(ticks).toEqual(['cone 6', 'cone 7', 'cone 8', 'cone 9', 'cone 10']);
    // Nothing is ticked until the potter ticks it.
    expect(firing.block()).toEqual({ scale: 'orton', low: '6', high: '10' });
    expect(text(fixture, '.firing-claimed')).toBe('Range cone 6–10; no cone ticked as tested');
    await tick('firing-tested-6');
    expect(firing.block()).toEqual({ scale: 'orton', low: '6', high: '10', tested: ['6'] });
    await tick('firing-tested-6');
    expect(firing.block()).toEqual({ scale: 'orton', low: '6', high: '10' });
    await tick('firing-tested-10');
    expect(firing.block()?.tested).toEqual(['10']);
    expect(text(fixture, '.firing-tested')).toBe('Tested at cone 10');
    expect(text(fixture, '.firing-claimed')).toBe('claimed range cone 6–10');
    expect(text(fixture, '.firing-approx')).toContain('approximate');
    expect(text(fixture, '.firing-approx')).toMatch(/2232\s°F–2381\s°F/);
    // A high end below the low one is turned round.
    await choose('firing-high', '04');
    expect(firing.block()).toMatchObject({ low: '04', high: '6' });
  });

  it('keeps atmospheres and processes as lists, and a temperature firing in °C with its rate and hold', async () => {
    const { fixture, choose, tick, firing } = await create();
    await tick('firing-atmosphere-oxidation');
    await tick('firing-atmosphere-reduction');
    await tick('firing-process-wood');
    expect(firing.block()).toEqual({
      scale: 'orton',
      atmospheres: ['oxidation', 'reduction'],
      processes: ['wood']
    });
    await choose('firing-scale', 'temperature');
    // A new scale keeps the atmosphere but not the cone: nothing is converted.
    expect(firing.block()).toEqual({
      scale: 'temperature',
      atmospheres: ['oxidation', 'reduction'],
      processes: ['wood']
    });
    // Typed in the reader's scale (°F in the US, as the tests run), kept in °C.
    expect(text(fixture, 'label[for=firing-low]')).toBe('Peak temperature (°F)');
    await choose('firing-low', '2264');
    await choose('firing-rate', '108');
    await choose('firing-hold', '15');
    expect(firing.block()).toMatchObject({ scale: 'temperature', low: '1240', rate: 60, hold: 15 });
    // A rate typed in °F comes back as typed: kept in °C to a tenth.
    await choose('firing-rate', '100');
    expect(firing.block()?.rate).toBe(55.6);
    expect((fixture.nativeElement.querySelector('#firing-rate') as HTMLInputElement).value).toBe('100');
    await choose('firing-low', '99999');
    expect(text(fixture, '.firing-problem')).toMatch(/Give a temperature from 932\s°F to 2912\s°F\./);
    expect(firing.block()?.low).toBe('1240');
  });

  it('says food safety depends on the tested cone for a liner, and to test a range at its low end', async () => {
    const { fixture, tick } = await create({ scale: 'orton', low: '5', high: '7' });
    expect(fixture.nativeElement.querySelector('.firing-liner')).toBeNull();
    await tick('food-surface');
    expect(fixture.componentInstance.foodSurface()).toBe(true);
    const note = text(fixture, '.firing-liner');
    expect(note).toContain('Food safety depends on firing this glaze to the cone it was tested at');
    expect(note).toContain('test it at the low end of the range');
    expect(note).toContain('No cone is marked as tested yet.');
  });

  it('takes a range of temperatures typed in the reader’s scale, and an end left blank takes it off', async () => {
    const { fixture, root, choose, tick, firing } = await create();
    await choose('firing-scale', 'temperature');
    await tick('firing-range');
    expect(text(fixture, 'label[for=firing-low]')).toBe('From (°F)');
    expect(text(fixture, 'label[for=firing-high]')).toBe('To (°F)');
    await choose('firing-low', '2192');
    await choose('firing-high', '2264');
    expect(firing.block()).toEqual({ scale: 'temperature', low: '1200', high: '1240' });
    expect((root.querySelector('#firing-high') as HTMLInputElement).value).toBe('2264');
    expect(text(fixture, '.firing-claimed')).toMatch(/^Range 2192\s°F to 2264\s°F; no cone ticked as tested$/);
    const ticks = [...root.querySelectorAll('.firing-ticks label')].map((l) => l.textContent?.replace(/\s+/g, ' '));
    expect(ticks).toEqual(['2192 °F', '2264 °F']);
    // Blank, the top goes; blank at the bottom, the whole firing goes with it.
    await choose('firing-high', '');
    expect(firing.block()).toEqual({ scale: 'temperature', low: '1200' });
    await choose('firing-high', '2264');
    await choose('firing-low', '');
    expect(firing.block()).toBeNull();
  });

  it('turns a range back into one cone, dropping its top and the cones ticked', async () => {
    const { tick, firing } = await create({ scale: 'orton', low: '6', high: '10', tested: ['6', '8'] });
    await tick('firing-range');
    expect(firing.block()).toEqual({ scale: 'orton', low: '6' });
  });

  it('keeps a schedule note, a witness cone and an atmosphere ticked off again', async () => {
    const { choose, tick, firing } = await create({ scale: 'orton', low: '6' });
    await choose('firing-schedule', 'Slow cool from 1900 °F');
    await tick('firing-witness');
    await tick('firing-atmosphere-oxidation');
    expect(firing.block()).toEqual({
      scale: 'orton',
      low: '6',
      atmospheres: ['oxidation'],
      schedule: 'Slow cool from 1900 °F',
      witness: true
    });
    await tick('firing-atmosphere-oxidation');
    await tick('firing-witness');
    expect(firing.block()).toEqual({ scale: 'orton', low: '6', schedule: 'Slow cool from 1900 °F' });
  });

  it('says why a rate or a hold is not kept, and takes either off when left blank', async () => {
    const { fixture, choose, firing } = await create({ scale: 'temperature', low: '1240', rate: 60, hold: 15 });
    await choose('firing-rate', '0');
    expect(text(fixture, '.firing-problem')).toBe('Give the rate as a whole number of degrees an hour.');
    await choose('firing-hold', '2000');
    expect(text(fixture, '.firing-problem')).toBe('Give the hold in whole minutes, up to a day.');
    expect(firing.block()).toMatchObject({ rate: 60, hold: 15 });
    await choose('firing-rate', '');
    await choose('firing-hold', ' ');
    expect(fixture.nativeElement.querySelector('.firing-problem')).toBeNull();
    expect(firing.block()).toEqual({ scale: 'temperature', low: '1240' });
  });

  it('links to the guide on what a cone means', async () => {
    const { root } = await create();
    const link = root.querySelector('.firing-top a') as HTMLAnchorElement;
    expect([link.textContent?.trim(), link.getAttribute('href')]).toEqual(['What does cone mean?', '/guides/firing']);
  });
});

describe('firing in words', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  it("keeps the author's scale first and converts approximately, by Kyoto's measured SK and same-kiln Orton, not JIS", () => {
    const orton = { cones: 'orton' as const, temperature: 'F' as const };
    const sk: FiringBlock = { scale: 'sk', low: '10', tested: ['10'], atmospheres: ['reduction'] };
    const words = firingWords(sk, orton)!;
    expect(words.tested).toBe('Tested at SK 10');
    expect(words.atmospheres).toBe('reduction');
    expect(words.conversion).toMatch(/2250\s°F/);
    expect(words.conversion).toContain("measured at 100 °C an hour by Kyoto's municipal institute");
    expect(words.conversion).toContain('≈ cone 7');
    expect(words.conversion).not.toContain('cone 10');
    // An SK cone other than 8 and 10 gets no temperature (the JIS figures are never shown), only the Orton cone
    // beside it in Kyoto's same-kiln table.
    expect(firingWords({ scale: 'sk', low: '9' }, orton)!.conversion).toMatch(/^≈ cone 6 \(measured at 100 °C an hour/);
    expect(firingWords({ scale: 'sk', low: '7' }, orton)!.conversion).toMatch(/^≈ cone 4 \(/);
    expect(firingWords({ scale: 'sk', low: '12' }, orton)!.conversion).toMatch(/^≈ cone 10 \(/);
    // No Orton cone for an SK cone of no equivalent there.
    expect(firingWords({ scale: 'sk', low: '6a' }, orton)!.conversion).toBe('');
    // A range is converted only when both ends have a figure, and then in order.
    expect(firingWords({ scale: 'sk', low: '8', high: '9' }, orton)!.conversion).toMatch(/^≈ cone 5–6 \(/);
    expect(firingWords({ scale: 'sk', low: '8', high: '16' }, orton)!.conversion).toBe('');
    const measured = firingWords({ scale: 'sk', low: '8', high: '10' }, { cones: 'orton', temperature: 'C' })!;
    expect(measured.conversion).toMatch(/1198\s°C–1232\s°C/);
    expect(firingLine({ scale: 'orton', low: '5.5', tested: ['5.5'] }, orton)).toBe('Tested at cone 5½');
    // A stated cone not ticked is not "tested".
    expect(firingLine({ scale: 'orton', low: '5.5' }, orton)).toBe('Stated cone 5½; not ticked as tested');
    expect(firingWords(null, orton)).toBeNull();
  });

  it('gives the schedule in the order it is fired: the rate, the hold, the note, then a witness cone', () => {
    const words = firingWords(
      { scale: 'temperature', low: '1240', rate: 60, hold: 15, schedule: 'Slow cool', witness: true },
      { cones: 'orton', temperature: 'F' }
    )!;
    expect(words.schedule).toBe(
      '108 °F an hour over the last hour; held 15 min; Slow cool; checked with a witness cone'
    );
    expect(
      firingLine({ scale: 'temperature', low: '1220', high: '1240' }, { cones: 'orton', temperature: 'C' })
    ).toMatch(/^Range 1220\s°C to 1240\s°C; no cone ticked as tested$/);
  });

  it("converts Orton cones to cone 15 by Orton's older chart at 150 °C an hour, and says so; none from 16 up", () => {
    const celsius = { cones: 'orton' as const, temperature: 'C' as const };
    const fourteen = firingWords({ scale: 'orton', low: '14' }, celsius)!;
    expect(fourteen.conversion).toMatch(
      /^≈ 1366\s°C \(Orton's older chart for large cones at 150 °C an hour; approximate\)$/
    );
    expect(firingWords({ scale: 'orton', low: '15' }, celsius)!.conversion).toMatch(/1431\s°C/);
    expect(firingWords({ scale: 'orton', low: '13', high: '15' }, celsius)!.conversion).toMatch(/1346\s°C–1431\s°C/);
    // No figure for cone 16, so no half of a range either.
    expect(firingWords({ scale: 'orton', low: '16' }, celsius)!.conversion).toBe('');
    expect(firingWords({ scale: 'orton', low: '14', high: '16' }, celsius)!.conversion).toBe('');
    // Shown as written: 14½.
    expect(firingLine({ scale: 'orton', low: '14.5', tested: ['14.5'] }, celsius)).toBe('Tested at cone 14½');
    // An SK reader is told the nearest SK cone only within Kyoto's table: none for cone 14.
    expect(firingWords({ scale: 'orton', low: '14' }, { cones: 'sk', temperature: 'C' })!.conversion).not.toContain(
      'SK'
    );
  });

  it('says a half cone is halfway between its neighbours on the older chart, and 05½ is Orton’s own 2016 figure', () => {
    const celsius = { cones: 'orton' as const, temperature: 'C' as const };
    expect(firingWords({ scale: 'orton', low: '5.5' }, celsius)!.conversion).toMatch(
      /^≈ 1209\s°C \(a half cone halfway between its neighbours on Orton's older chart for large cones at 150 °C an hour; approximate\)$/
    );
    // The older chart has no half cones: 05½ is Orton's 2016 chart's, for large cones at 150 °C an hour.
    expect(firingWords({ scale: 'orton', low: '05.5' }, celsius)!.conversion).toMatch(
      /^≈ 1023\s°C \(Orton's 2016 chart for large cones at 150 °C an hour; approximate\)$/
    );
    // A range across a half cone and a whole one names both.
    expect(firingWords({ scale: 'orton', low: '5.5', high: '6' }, celsius)!.conversion).toMatch(
      /^≈ 1209\s°C–1222\s°C \(a half cone halfway between its neighbours on Orton's older chart for large cones at 150 °C an hour, Orton's older chart for large cones at 150 °C an hour; approximate\)$/
    );
  });
});

describe('RecipeLimits band names', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => TestBed.inject(TranslocoService).setActiveLang('en'));

  it("names the firing block's bands again when the language changes", async () => {
    const fixture = TestBed.createComponent(RecipeLimits);
    fixture.componentRef.setInput('unity', { SiO2: 3, Al2O3: 0.3, CaO: 1 });
    fixture.componentRef.setInput('firedAt', { scale: 'orton', low: '6', high: '10' });
    await fixture.whenStable();
    const names = () => (fixture.componentInstance as unknown as { blockBandNames: () => string }).blockBandNames();
    expect(names()).toContain('Mid fire');
    const transloco = TestBed.inject(TranslocoService);
    transloco.setTranslation(
      { 'recipe.limits.bands.mid': 'Mittelbrand', 'recipe.limits.bands.high': 'Hochbrand' },
      'de',
      { merge: false }
    );
    transloco.setActiveLang('de');
    await fixture.whenStable();
    expect(names()).toContain('Mittelbrand');
  });
});

describe('the recipe help on limits', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  it("says the band comes from the recipe's Firing, a range across bands shows both, and the band picker overrides", () => {
    TestBed.inject(TranslocoService);
    const help = translate('recipe.help.numbers.limits');
    expect(help).toContain('gives: its cone, or its range');
    expect(help).toContain("shows both bands' checks side by side");
    expect(help).toContain("which overrides the recipe's firing");
  });
});
