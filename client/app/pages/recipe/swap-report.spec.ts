import { provideRouter } from '@angular/router';
import { provideEnglish } from '../../testing/i18n';
import { TestBed } from '@angular/core/testing';
import { Material } from '../../core/models';
import { text } from '../../testing/test-providers';
import { Report } from './pool';
import { Run, SwapReport, SwapResult } from './swap-report';
import { TryMaterials } from './try-materials';

const material = (name: string): Material => ({ _id: name, name, percentmole: 'molecular', loi: 0, fields: [] });
const STANDARD = [material('G-200 EU Feldspar'), material('Minspar 200'), material('Whiting'), material('Redart')];
const RUN: Run = {
  kind: 'lead',
  bringIn: [],
  tries: [],
  avoid: [],
  uncapped: [],
  cone: '04',
  mode: 'rebuild',
  base: 'Ferro Frit 3124'
};
const REPORT: Report = {
  uses: [
    { name: 'Ferro Frit 3124', amount: '60', supplies: 'all the boron', needed: true, fixed: true },
    { name: 'G-200 EU Feldspar', amount: '20', supplies: 'most of the potash', needed: true, fixed: false },
    { name: 'Whiting', amount: '5', supplies: '30% of the calcium', needed: false, fixed: false }
  ],
  couldHelp: [{ name: 'Redart', helps: 0.2 }],
  alike: [{ used: 'G-200 EU Feldspar', other: 'Minspar 200' }],
  capped: [
    {
      name: 'Whiting',
      most: 5,
      wouldBe: 7.4,
      group: 'raw calcium',
      members: ['Whiting'],
      why: "this app's own guideline"
    }
  ],
  unreachable: ['SrO'],
  countCost: 0,
  miss: 0.4,
  best: 0.3
};

describe('SwapReport', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideEnglish()] }));

  const create = async (result: SwapResult) => {
    const fixture = TestBed.createComponent(SwapReport);
    fixture.componentRef.setInput('result', result);
    fixture.componentRef.setInput('mine', []);
    fixture.componentRef.setInput('standard', STANDARD);
    const reruns: Array<Partial<Run>> = [];
    fixture.componentInstance.rerun.subscribe((change) => reruns.push(change));
    await fixture.whenStable();
    const button = (label: string) =>
      [...fixture.nativeElement.querySelectorAll('button')].find(
        (b: Element) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === label
      ) as HTMLButtonElement | undefined;
    return { fixture, reruns, button };
  };

  it('says what each material supplies, and what else would help', async () => {
    const { fixture, button } = await create({ run: RUN, report: REPORT, cautions: ['It may craze.'] });
    expect(text(fixture, 'p')).toContain('Its fired oxides come close to the lead-free formula for the firing.');
    expect(text(fixture, '.swap-uses')).toContain('G-200 EU Feldspar 20: most of the potash.');
    expect(text(fixture, '.swap-uses')).toContain('The match is nearly as good without it.');
    expect(text(fixture, '.swap-report')).toContain('Nothing on offer has strontium.');
    expect(text(fixture, '.swap-report')).toContain(
      "A closer match needs 7% Whiting, more than the 5% suggested: this app's own guideline."
    );
    expect(text(fixture, '.swap-cautions')).toBe('It may craze.');
    // The base frit is the app's: it cannot be left out.
    expect(button('Leave out Ferro Frit 3124')).toBeUndefined();
    expect(button('Leave out G-200 EU Feldspar')).toBeDefined();
  });

  it('asks to work it out again: leaving one out, adding one, swapping alike ones, lifting a cap', async () => {
    const { reruns, button } = await create({ run: RUN, report: REPORT, cautions: [] });
    button('Leave out G-200 EU Feldspar')!.click();
    button('Add Redart')!.click();
    button('Use Minspar 200 instead of G-200 EU Feldspar')!.click();
    button('Allow more Whiting')!.click();
    expect(reruns[0]).toEqual({ avoid: ['G-200 EU Feldspar'] });
    expect(reruns[1].tries?.map((t) => [t.material.name, t.must])).toEqual([['Redart', true]]);
    expect(reruns[2].avoid).toEqual(['G-200 EU Feldspar']);
    expect(reruns[2].tries?.map((t) => t.material.name)).toEqual(['Minspar 200']);
    expect(reruns[3]).toEqual({ uncapped: ['Whiting'] });
  });

  it('says what was left out, and lets it back', async () => {
    const { fixture, reruns, button } = await create({
      run: { ...RUN, avoid: ['Minspar 200'] },
      report: REPORT,
      cautions: []
    });
    expect(text(fixture, '.swap-report')).toContain('Left out: Minspar 200.');
    button('Allow them again')!.click();
    expect(reruns).toEqual([{ avoid: [] }]);
  });
});

describe('TryMaterials', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideEnglish()] }));

  it('adds materials to try from the library, each perhaps a must, and removes them', async () => {
    const fixture = TestBed.createComponent(TryMaterials);
    fixture.componentRef.setInput('mine', []);
    fixture.componentRef.setInput('standard', STANDARD);
    await fixture.whenStable();
    const click = async (label: string) => {
      const found = [...fixture.nativeElement.querySelectorAll('button')].find(
        (b: Element) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === label
      ) as HTMLButtonElement;
      found.click();
      await fixture.whenStable();
    };
    await click('Add Whiting');
    await click('Add Redart');
    expect(fixture.componentInstance.tries().map((t) => t.material.name)).toEqual(['Whiting', 'Redart']);
    // Marked as added in the list, not offered twice.
    expect(text(fixture, '.library-list')).toContain('Added');
    const must = fixture.nativeElement.querySelector('.try-list input[type=checkbox]') as HTMLInputElement;
    must.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.tries()[0].must).toBe(true);
    await click('Remove Whiting from the materials to try');
    expect(fixture.componentInstance.tries().map((t) => t.material.name)).toEqual(['Redart']);
  });
});
