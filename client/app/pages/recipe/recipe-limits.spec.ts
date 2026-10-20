import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { FiringBlock } from '../../../../lib/cones/firing';
import { FiringBand } from '../../../../lib/recipe/limits';
import { testProviders } from '../../testing/test-providers';
import { RecipeLimits } from './recipe-limits';

// The line at the top of the limits panel: whether the chemistry fits the
// firing (lib/recipe/cone-fit.js, docs/adr/0022), against the band chosen in
// the panel or the recipe's stated firing.

/** A plain glaze's fluxes, with the boron, silica and alumina a test sets. */
const glaze = (B2O3: number, SiO2: number, Al2O3: number) => ({
  K2O: 0.12,
  Na2O: 0.1,
  CaO: 0.6,
  MgO: 0.18,
  B2O3,
  SiO2,
  Al2O3
});

describe('RecipeLimits cone check', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => TestBed.inject(TranslocoService).setActiveLang('en'));

  const create = async (
    unity: Record<string, number>,
    firedAt: FiringBlock | null,
    firing: FiringBand | '' = '',
    materials: string[] = []
  ) => {
    TestBed.inject(TranslocoService);
    const fixture = TestBed.createComponent(RecipeLimits);
    fixture.componentRef.setInput('unity', unity);
    fixture.componentRef.setInput('firedAt', firedAt);
    fixture.componentRef.setInput('firing', firing);
    fixture.componentRef.setInput('materials', materials);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, line: () => element.querySelector<HTMLElement>('.cone-fit') };
  };

  it('shows the band as text from the recipe’s firing, and the picker once another is asked for', async () => {
    const { fixture, line } = await create(glaze(0.2, 3.4, 0.35), { scale: 'orton', low: '6' });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#limit-firing')).toBeNull();
    expect(root.querySelector('#limit-firing-text')?.textContent).toBe("From the recipe's firing: Mid fire, cone 4–6");
    const before = line()?.textContent;
    expect(before).toBeTruthy();
    (root.querySelector('#limit-firing-choose') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(root.querySelector('label[for=limit-firing]')?.textContent).toBe('Limits for');
    expect(root.querySelector('#limit-firing-text')).toBeNull();
    expect(line()?.textContent).toBe(before);
  });

  it('keeps the picker when there is no firing, and when a band is chosen by hand', async () => {
    const none = await create(glaze(0.2, 3.4, 0.35), null);
    expect(none.fixture.nativeElement.querySelector('#limit-firing')).not.toBeNull();
    expect(none.fixture.nativeElement.querySelector('#limit-firing-text')).toBeNull();
    const chosen = await create(glaze(0.2, 3.4, 0.35), { scale: 'orton', low: '6' }, 'high');
    expect(chosen.fixture.nativeElement.querySelector('#limit-firing')).not.toBeNull();
  });

  it('shows nothing when the recipe has no firing and none is chosen', async () => {
    const { line } = await create(glaze(0.2, 3.4, 0.35), null);
    expect(line()).toBeNull();
  });

  it('puts the line first in the panel, under its heading', async () => {
    const { fixture } = await create(glaze(0.2, 3.4, 0.35), { scale: 'orton', low: '6' });
    const heading = (fixture.nativeElement as HTMLElement).querySelector('#limits-heading')!;
    expect(heading.nextElementSibling?.classList).toContain('cone-fit');
  });

  it('notes a low-fire glaze stated for cone 10, with its sources and that it is a guide', async () => {
    const { line } = await create(glaze(0.52, 2.3, 0.32), { scale: 'orton', low: '10' });
    const note = line()!;
    expect(note.classList).toContain('cone-fit-note');
    expect(note.textContent).toContain("This glaze's chemistry looks more like a low-fire glaze than one for cone 10.");
    expect(note.textContent).toContain('It has more boron (0.52)');
    expect(note.textContent).toContain('it is a guide, not a test');
    const links = [...note.querySelectorAll('a')].map((a) => a.textContent);
    expect(links.length).toBe(2);
    expect(links[0]).toContain('Matt Katz');
    expect(links[1]).toContain('Hesselberth');
    expect(note.textContent).toContain('Sources:');
  });

  it('words cone 6 against cone 10 softest', async () => {
    const { line } = await create(glaze(0.4, 2.8, 0.35), { scale: 'orton', low: '10' });
    expect(line()!.textContent).toContain('leans toward a cooler firing than cone 10, nearer cone 6');
    expect(line()!.textContent).toContain('only roughly');
  });

  it('runs against a band chosen in the panel, over the stated firing', async () => {
    const { line } = await create(glaze(0.52, 2.3, 0.32), { scale: 'orton', low: '04' }, 'high');
    expect(line()!.textContent).toContain('than one for high fire');
  });

  it('says which end of a range across bands it looks closer to, and that a fit is not a pass', async () => {
    const closer = await create(glaze(0.4, 2.8, 0.35), { scale: 'orton', low: '6', high: '10' });
    expect(closer.line()!.textContent).toContain('looks closer to the cone 6 end');
    expect(closer.line()!.classList).not.toContain('cone-fit-note');
    const fits = await create(glaze(0.2, 3.4, 0.35), { scale: 'orton', low: '6' });
    expect(fits.line()!.textContent).toContain('do not point away from cone 6');
    expect(fits.line()!.textContent).toContain('says nothing about whether the glaze is stable or food safe');
    expect(fits.line()!.querySelector('a')).toBeNull();
  });

  it("says when it can't judge: ash from the materials, raku from the firing", async () => {
    const ash = await create(glaze(0.52, 2.3, 0.32), { scale: 'orton', low: '10' }, '', ['Wood Ash', 'Silica']);
    expect(ash.line()!.textContent).toContain('it has ash in it');
    const raku = await create(glaze(0.52, 2.3, 0.32), { scale: 'orton', low: '06', processes: ['raku'] }, 'low');
    expect(raku.line()!.textContent).toContain('it is for a raku firing');
  });

  it('checks a porcelain range to cone 14 at high fire, and says the limits stop before cone 12', async () => {
    const { fixture, line } = await create(glaze(0, 4.5, 0.5), { scale: 'orton', low: '10', high: '14' });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#limit-firing-text')?.textContent).toBe(
      "From the recipe's firing: High fire, cone 9–11 and Very high fire, cone 12 and up"
    );
    const bands = [...root.querySelectorAll<HTMLElement>('.limits-band')];
    expect(bands.map((band) => band.dataset['band'])).toEqual(['high', 'top']);
    expect(bands[0]!.querySelector('table')).not.toBeNull();
    expect(bands[1]!.querySelector('table')).toBeNull();
    expect(bands[1]!.textContent).toContain('has no figures for this firing (Very high fire, cone 12 and up)');
    expect(bands[1]!.querySelector('.limits-top')?.textContent).toContain('stop at cone 10');
    // The cone check does not reach past cone 10.
    expect(line()!.textContent).toContain("can't compare this glaze's chemistry with cone 14");
    expect(line()!.textContent).toContain('cone 06 to cone 10');
  });

  it('offers the top band in the picker, which checks nothing and says why', async () => {
    const { fixture, line } = await create(glaze(0, 4.5, 0.5), null, 'top');
    const root = fixture.nativeElement as HTMLElement;
    const options = [...root.querySelectorAll<HTMLOptionElement>('#limit-firing option')].map((o) => o.value);
    expect(options).toEqual(['', 'low', 'mid', 'high', 'top']);
    expect(root.querySelector('table.limits-table')).toBeNull();
    expect(root.querySelector('.limits-top')).not.toBeNull();
    expect(line()!.textContent).toContain('with very high fire');
  });

  it('says it again in the language chosen', async () => {
    const { fixture, line } = await create(glaze(0.2, 3.4, 0.35), { scale: 'orton', low: '6' });
    const transloco = TestBed.inject(TranslocoService);
    transloco.setTranslation({ 'recipe.coneFit.fits': 'Passt zu Kegel {cone}.' }, 'de', { merge: false });
    transloco.setActiveLang('de');
    await fixture.whenStable();
    expect(line()!.textContent).toContain('Passt zu Kegel 6.');
  });
});
