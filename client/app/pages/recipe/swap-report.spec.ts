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
    // A button named by its visible text, described by the item's text (which contains `about`).
    const described = (label: string, about: string) =>
      [...fixture.nativeElement.querySelectorAll('button[aria-describedby]')].find((b: Element) => {
        const description = document.getElementById(b.getAttribute('aria-describedby')!)?.textContent ?? '';
        return (b.textContent ?? '').trim() === label && description.includes(about);
      }) as HTMLButtonElement | undefined;
    return { fixture, reruns, button, described };
  };

  it('says what each material supplies, and what else would help', async () => {
    const { fixture, described } = await create({ run: RUN, report: REPORT, cautions: ['It may craze.'] });
    expect(text(fixture, 'p')).toContain('Its fired oxides come close to the lead-free formula for the firing.');
    expect(text(fixture, '.swap-uses')).toContain('G-200 EU Feldspar 20: most of the potash.');
    expect(text(fixture, '.swap-uses')).toContain('The match is nearly as good without it.');
    expect(text(fixture, '.swap-report')).toContain('Nothing on offer has strontium.');
    expect(text(fixture, '.swap-report')).toContain(
      "A closer match needs 7% Whiting, more than the 5% suggested: this app's own guideline."
    );
    expect(text(fixture, '.swap-cautions')).toBe('It may craze.');
    // The base frit is the app's: it cannot be left out.
    expect(described('Leave it out', 'Ferro Frit 3124')).toBeUndefined();
    expect(described('Leave it out', 'G-200 EU Feldspar')).toBeDefined();
  });

  it('asks to work it out again: leaving one out, adding one, swapping alike ones, lifting a cap', async () => {
    const { reruns, button, described } = await create({ run: RUN, report: REPORT, cautions: [] });
    described('Leave it out', 'G-200 EU Feldspar')!.click();
    // Redart's button is "Add it", next to its name.
    button('Add it')!.click();
    described('Use it instead', 'Minspar 200')!.click();
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

  it('says when the materials could come nearer, and when four new ones at most cost some of the match', async () => {
    const { fixture } = await create({
      run: { ...RUN, kind: 'shelf' },
      report: { ...REPORT, miss: 3, best: 1, countCost: 0.2 },
      cautions: []
    });
    expect(text(fixture, '.swap-report')).toContain(
      "These materials could come nearer to the old recipe's fired oxides: see what would help, below."
    );
    expect(text(fixture, '.swap-report')).toContain('It uses at most four new materials');
  });

  it('gives only what to watch for when there is no report of how it was made', async () => {
    const { fixture } = await create({ run: RUN, report: null, cautions: ['Test it on a tile first.'] });
    expect(fixture.nativeElement.querySelector('.swap-uses')).toBeNull();
    expect(text(fixture, '.swap-report')).not.toContain('come close');
    expect(text(fixture, '.swap-cautions')).toBe('Test it on a tile first.');
  });

  it('adds a material it had left out, and uses one instead of another, each as a must', async () => {
    const { reruns, button, described } = await create({
      run: {
        ...RUN,
        avoid: ['Redart', 'Whiting'],
        tries: [
          { material: material('Redart'), must: false },
          { material: material('Minspar 200'), must: false }
        ]
      },
      report: REPORT,
      cautions: []
    });
    button('Add it')!.click();
    described('Use it instead', 'Minspar 200')!.click();
    // Redart is tried once, as a must, and no longer left out.
    expect(reruns[0].tries?.map((t) => [t.material.name, t.must])).toEqual([
      ['Minspar 200', false],
      ['Redart', true]
    ]);
    expect(reruns[0].avoid).toEqual(['Whiting']);
    // Minspar 200 in place of G-200, which is left out.
    expect(reruns[1].tries?.map((t) => [t.material.name, t.must])).toEqual([
      ['Redart', false],
      ['Minspar 200', true]
    ]);
    expect(reruns[1].avoid).toEqual(['Redart', 'Whiting', 'G-200 EU Feldspar']);
  });

  it('asks for nothing when what it would add is in neither list', async () => {
    const { reruns, button, described } = await create({
      run: RUN,
      report: {
        ...REPORT,
        couldHelp: [{ name: 'Gone clay', helps: 0.2 }],
        alike: [{ used: 'G-200 EU Feldspar', other: 'Gone spar' }]
      },
      cautions: []
    });
    button('Add it')!.click();
    described('Use it instead', 'Gone spar')!.click();
    expect(reruns).toEqual([]);
  });

  it('works it out again with other materials to try, starting from those it was given', async () => {
    const { fixture, reruns, button } = await create({
      run: { ...RUN, avoid: ['Whiting', 'Redart'], tries: [{ material: material('Redart'), must: true }] },
      report: REPORT,
      cautions: []
    });
    const root = fixture.nativeElement as HTMLElement;
    const toggle = button('Try other materials')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(text(fixture, '.try-list')).toContain('Redart');
    // Whiting from the standard list.
    const whiting = [...root.querySelectorAll('.library-item')].find(
      (item) => item.querySelector('bdi')?.textContent?.trim() === 'Whiting'
    ) as HTMLButtonElement;
    whiting.click();
    await fixture.whenStable();
    button('Work it out again')!.click();
    await fixture.whenStable();
    expect(reruns.length).toBe(1);
    expect(reruns[0].tries?.map((t) => [t.material.name, t.must])).toEqual([
      ['Redart', true],
      ['Whiting', false]
    ]);
    // What is tried is no longer left out.
    expect(reruns[0].avoid).toEqual([]);
    expect(root.querySelector('gc-try-materials')).toBeNull();

    // Closed without working it out, nothing is asked.
    toggle.click();
    await fixture.whenStable();
    toggle.click();
    await fixture.whenStable();
    expect(reruns.length).toBe(1);
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
        (b: Element) =>
          (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === label ||
          (b.classList.contains('library-item') && b.querySelector('bdi')?.textContent?.trim() === label)
      ) as HTMLButtonElement;
      found.click();
      await fixture.whenStable();
    };
    await click('Whiting');
    await click('Redart');
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

  it("tries a name once, though the potter's own list has one by the same name as the standard list", async () => {
    const fixture = TestBed.createComponent(TryMaterials);
    fixture.componentRef.setInput('mine', [{ ...material('Whiting'), _id: 'my-whiting' }]);
    fixture.componentRef.setInput('standard', STANDARD);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const add = async (name: string) => {
      const item = [...root.querySelectorAll('button.library-item')].find(
        (b) => b.querySelector('bdi')?.textContent?.trim() === name
      ) as HTMLButtonElement;
      item.click();
      await fixture.whenStable();
    };
    const tab = async (label: RegExp) => {
      ([...root.querySelectorAll('.library-tab')].find((b) => label.test(b.textContent ?? '')) as HTMLElement).click();
      await fixture.whenStable();
    };
    // The potter's own list opens first.
    await add('Whiting');
    await tab(/Standard/);
    await add('Whiting');
    expect(fixture.componentInstance.tries().map((t) => t.material._id)).toEqual(['my-whiting']);
  });

  it('asks for the standard list again when it could not be fetched', async () => {
    const fixture = TestBed.createComponent(TryMaterials);
    fixture.componentRef.setInput('mine', []);
    fixture.componentRef.setInput('standard', []);
    fixture.componentRef.setInput('standardFailed', true);
    await fixture.whenStable();
    const retries = vi.fn();
    fixture.componentInstance.retry.subscribe(retries);
    expect(text(fixture, '.library-empty')).toBe('The list could not be fetched. Try again');
    (fixture.nativeElement.querySelector('.library-empty a, .library-empty button') as HTMLElement).click();
    expect(retries).toHaveBeenCalledOnce();
  });
});
