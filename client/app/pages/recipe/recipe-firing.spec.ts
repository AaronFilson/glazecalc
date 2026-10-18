import { TestBed } from '@angular/core/testing';
import { FiringBlock } from '../../../../lib/cones/firing';
import { httpMock, testProviders, text } from '../../testing/test-providers';
import { firingLine, firingWords } from './firing-text';
import { RecipeFiring } from './recipe-firing';

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

  it('offers Orton cones in true order, half cones and the rare ones last, and keeps a single cone as tested', async () => {
    const { root, choose, firing } = await create();
    const groups = [...root.querySelectorAll('#firing-low optgroup')].map((g) => g.getAttribute('label'));
    expect(groups).toEqual(['Cones 022 to 13', 'Half cones', 'Cones 14 to 42 (rare in pottery)']);
    const options = [...root.querySelectorAll('#firing-low option')].map((o) => o.textContent?.trim());
    expect(options.indexOf('06')).toBeLessThan(options.indexOf('6'));
    expect(options).toContain('5½');
    await choose('firing-low', '6');
    expect(firing.block()).toEqual({ scale: 'orton', low: '6', tested: ['6'] });
  });

  it('separates the claimed range from the cones tested, and shows the tested cone first', async () => {
    const { fixture, root, choose, tick, firing } = await create();
    await choose('firing-low', '6');
    await tick('firing-range');
    await choose('firing-high', '10');
    const ticks = [...root.querySelectorAll('.firing-ticks label')].map((l) => l.textContent?.trim());
    expect(ticks).toEqual(['cone 6', 'cone 7', 'cone 8', 'cone 9', 'cone 10']);
    // Cone 6, tested as a single cone, stays ticked in the range.
    expect(firing.block()).toEqual({ scale: 'orton', low: '6', high: '10', tested: ['6'] });
    await tick('firing-tested-6');
    expect(firing.block()).toEqual({ scale: 'orton', low: '6', high: '10' });
    expect(text(fixture, '.firing-claimed')).toBe('Range cone 6–10; no cone ticked as tested');
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

  it('links to the guide on what a cone means', async () => {
    const { root } = await create();
    const link = root.querySelector('.firing-top a') as HTMLAnchorElement;
    expect([link.textContent?.trim(), link.getAttribute('href')]).toEqual(['What does cone mean?', '/guides/firing']);
  });
});

describe('firing in words', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  it("keeps the author's scale first and converts approximately, by Kyoto's measured SK, not JIS", () => {
    const orton = { cones: 'orton' as const, temperature: 'F' as const };
    const sk: FiringBlock = { scale: 'sk', low: '10', tested: ['10'], atmospheres: ['reduction'] };
    const words = firingWords(sk, orton)!;
    expect(words.tested).toBe('Tested at SK 10');
    expect(words.atmospheres).toBe('reduction');
    expect(words.conversion).toMatch(/2250\s°F/);
    expect(words.conversion).toContain("measured at 100 °C an hour by Kyoto's municipal institute");
    expect(words.conversion).toContain('≈ cone 7');
    expect(words.conversion).not.toContain('cone 10');
    // An SK cone Kyoto did not measure gets no temperature and no Orton cone: the JIS figures are never shown.
    expect(firingWords({ scale: 'sk', low: '9' }, orton)!.conversion).toBe('');
    expect(firingWords({ scale: 'sk', low: '7' }, orton)!.conversion).toBe('');
    // A range is converted only when both ends are measured, and then in order.
    expect(firingWords({ scale: 'sk', low: '8', high: '9' }, orton)!.conversion).toBe('');
    const measured = firingWords({ scale: 'sk', low: '8', high: '10' }, { cones: 'orton', temperature: 'C' })!;
    expect(measured.conversion).toMatch(/1198\s°C–1232\s°C/);
    expect(firingLine({ scale: 'orton', low: '5.5' }, orton)).toBe('Tested at cone 5½');
    expect(firingWords(null, orton)).toBeNull();
  });
});
