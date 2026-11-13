import { Component, forwardRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Inline } from './guide-document';
import { GuideInline, GuideRow, InlineContext, normalized } from './guide-inline';

/** A guide as the directives see it: °C or °F, and the links it was asked to follow. */
@Component({
  imports: [GuideInline, GuideRow],
  providers: [{ provide: InlineContext, useExisting: forwardRef(() => Host) }],
  template: `<p [gcInline]="parts()"></p>
    <table>
      <tbody>
        <tr [gcRow]="row()" [numeric]="[false, true]"></tr>
      </tbody>
    </table>`
})
class Host implements InlineContext {
  readonly parts = signal<Inline[]>([]);
  readonly row = signal<Inline[][]>([]);
  readonly scale = signal<'C' | 'F'>('C');
  readonly followed: string[] = [];
  show = (text: string) => text;
  temperature = () => (this.scale() === 'C' ? '1222 °C (2232 °F)' : '2232 °F (1222 °C)');
  density = () => 'SG 1.45';
  englishTerms = () => false;
  linkHref = (href: string) => '/de' + href;
  follow = (event: MouseEvent, href: string) => {
    event.preventDefault();
    this.followed.push(href);
  };
}

const FIRING: Inline[] = [
  { kind: 'text', text: 'Fire to ' },
  {
    kind: 'temperature',
    celsius: { from: 1222, to: null, unit: '°C' },
    fahrenheit: { from: 2232, to: null, unit: '°F' }
  },
  { kind: 'text', text: ', then read ' },
  {
    kind: 'link',
    href: '/guides/firing',
    content: [{ kind: 'strong', content: [{ kind: 'text', text: 'the cones' }] }]
  },
  { kind: 'text', text: '.' }
];

describe('the text of a guide, drawn by its directives', () => {
  const render = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.parts.set(FIRING);
    fixture.componentInstance.row.set([[{ kind: 'text', text: '6' }], FIRING.slice(1, 2)]);
    await fixture.whenStable();
    return { fixture, host: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
  };

  it('draws words, bold, links and temperatures as elements, and a row as its cells', async () => {
    const { element } = await render();
    expect(element.querySelector('p')?.innerHTML).toBe(
      'Fire to <span class="temperature">1222 °C (2232 °F)</span>, then read ' +
        '<a href="/de/guides/firing"><b>the cones</b></a>.'
    );
    expect(element.querySelector('tr')?.innerHTML).toBe(
      '<th scope="row">6</th><td class="num"><span class="temperature">1222 °C (2232 °F)</span></td>'
    );
  });

  it('draws again only what differs, keeping the rest of the paragraph', async () => {
    const { fixture, host, element } = await render();
    const paragraph = element.querySelector('p')!;
    const [first, temperature, , link] = [...paragraph.childNodes];
    host.scale.set('F');
    await fixture.whenStable();
    expect(paragraph.querySelector('.temperature')?.textContent).toBe('2232 °F (1222 °C)');
    // The same nodes: only the temperature's words changed.
    expect(paragraph.childNodes[0]).toBe(first);
    expect(paragraph.childNodes[1]).toBe(temperature);
    expect(paragraph.childNodes[3]).toBe(link);
  });

  it('follows a link of the text in the app', async () => {
    const { host, element } = await render();
    element.querySelector('a')!.click();
    expect(host.followed).toEqual(['/guides/firing']);
  });

  it('draws a line break, and puts a part whose kind changed in place of the old one', async () => {
    const { fixture, host, element } = await render();
    const paragraph = element.querySelector('p')!;
    host.parts.set([
      { kind: 'strong', content: [{ kind: 'text', text: 'Fire' }] },
      { kind: 'break' },
      { kind: 'text', text: 'slowly' }
    ]);
    await fixture.whenStable();
    expect(paragraph.innerHTML).toBe('<b>Fire</b><br>slowly');
    const kept = paragraph.childNodes[1];
    // As many parts, but bold words now plain, and plain words now in italics.
    host.parts.set([
      { kind: 'text', text: 'Fire' },
      { kind: 'break' },
      { kind: 'em', content: [{ kind: 'text', text: 'slowly' }] }
    ]);
    await fixture.whenStable();
    expect(paragraph.innerHTML).toBe('Fire<br><em>slowly</em>');
    expect(paragraph.childNodes[1]).toBe(kept);
  });
});

describe('normalized', () => {
  it('joins words next to each other and drops empty ones, as a browser holds them once parsed', () => {
    expect(normalized(['Fire ', '', 'to ', { tag: 'b', attributes: [], content: ['', 'cone', ' 6'] }, ''])).toEqual([
      'Fire to ',
      { tag: 'b', attributes: [], content: ['cone 6'] }
    ]);
  });
});
