import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, PLATFORM_ID, Renderer2, effect, inject, input, untracked } from '@angular/core';
import { Inline } from './guide-document';

/** What the inline text of a guide needs from the guide it is in (guide-view.ts). */
export abstract class InlineContext {
  /** Text as the page shows it. */
  abstract show(text: string): string;
  abstract temperature(part: Extract<Inline, { kind: 'temperature' }>): string;
  abstract density(part: Extract<Inline, { kind: 'density' }>): string;
  /** Whether the English goes after key terms. */
  abstract englishTerms(): boolean;
  /** The address a link of the guide's Markdown opens, as its href. */
  abstract linkHref(href: string): string;
  /** A click on a link of the guide's Markdown: in the app, on the page, or left to the browser. */
  abstract follow(event: MouseEvent, href: string): void;
}

/** A part of the text as drawn: words, or an element with its attributes and what is in it. */
export type Drawn = string | { tag: string; attributes: Array<[string, string]>; content: Drawn[]; link?: string };

// Node.ELEMENT_NODE and Node.TEXT_NODE, which the render's DOM does not define as globals.
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/**
 * What is in an element of a guide, drawn as elements and text nodes rather than by a template: a template
 * made an embedded view for every run of words and every table cell (some 10,000 in a long guide), which
 * the browser had to hydrate one by one and the prerendered page had to describe in its hydration data.
 * The element it is on is the template's; what is in it is the directive's. In the browser a prerendered
 * element is adopted as it is, and only the parts that differ are drawn again (a temperature in °F, say).
 */
@Directive()
abstract class DrawnContent {
  private readonly context = inject(InlineContext);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly listeners: Array<() => void> = [];

  constructor() {
    effect((onCleanup) => {
      const drawn = normalized(this.drawn());
      untracked(() => {
        this.update(this.host, drawn);
        if (this.browser) this.listen(drawn);
      });
      onCleanup(() => this.stopListening());
    });
  }

  /** What the host holds. */
  protected abstract drawn(): Drawn[];

  /** Inline text: words, bold, links, temperatures. */
  protected inline(parts: Inline[]): Drawn[] {
    const out: Drawn[] = [];
    for (const part of parts) {
      switch (part.kind) {
        case 'text':
          out.push(this.context.show(part.text));
          break;
        case 'temperature':
          out.push({ tag: 'span', attributes: [['class', 'temperature']], content: [this.context.temperature(part)] });
          break;
        case 'density':
          out.push({ tag: 'span', attributes: [['class', 'density']], content: [this.context.density(part)] });
          break;
        case 'english':
          if (this.context.englishTerms()) {
            out.push({
              tag: 'span',
              attributes: [
                ['class', 'english-term'],
                ['lang', 'en']
              ],
              content: [` (${part.text})`]
            });
          }
          break;
        case 'strong':
          out.push({ tag: 'b', attributes: [], content: this.inline(part.content) });
          break;
        case 'em':
          out.push({ tag: 'em', attributes: [], content: this.inline(part.content) });
          break;
        case 'code':
          out.push({ tag: 'code', attributes: [], content: [part.text] });
          break;
        case 'link':
          out.push({
            tag: 'a',
            attributes: [['href', this.context.linkHref(part.href)]],
            content: this.inline(part.content),
            link: part.href
          });
          break;
        case 'break':
          out.push({ tag: 'br', attributes: [], content: [] });
          break;
      }
    }
    return out;
  }

  /**
   * Makes a parent hold these parts, keeping each node that already is what would be drawn (all of a
   * prerendered page) and the elements that only differ inside.
   */
  private update(parent: Element, drawn: Drawn[]): void {
    const nodes = parent.childNodes;
    if (nodes.length !== drawn.length) {
      while (parent.firstChild) this.renderer.removeChild(parent, parent.firstChild);
      for (const part of drawn) this.renderer.appendChild(parent, this.create(part));
      return;
    }
    drawn.forEach((part, i) => {
      const node = nodes[i]!;
      if (typeof part === 'string') {
        if (node.nodeType === TEXT_NODE) {
          if (node.nodeValue !== part) this.renderer.setValue(node, part);
          return;
        }
      } else if (sameElement(node, part)) {
        this.update(node as Element, part.content);
        return;
      }
      this.renderer.insertBefore(parent, this.create(part), node);
      this.renderer.removeChild(parent, node);
    });
  }

  private create(part: Drawn): Node {
    if (typeof part === 'string') return this.renderer.createText(part);
    const element = this.renderer.createElement(part.tag) as HTMLElement;
    for (const [name, value] of part.attributes) this.renderer.setAttribute(element, name, value);
    for (const inner of part.content) this.renderer.appendChild(element, this.create(inner));
    return element;
  }

  /** The links, in the order they are drawn, are the host's <a> elements in document order. */
  private listen(drawn: Drawn[]): void {
    const links: string[] = [];
    const collect = (parts: Drawn[]): void => {
      for (const part of parts) {
        if (typeof part === 'string') continue;
        if (part.link !== undefined) links.push(part.link);
        collect(part.content);
      }
    };
    collect(drawn);
    if (!links.length) return;
    const anchors = this.host.querySelectorAll('a');
    links.forEach((href, i) => {
      const anchor = anchors[i];
      if (anchor) {
        this.listeners.push(
          this.renderer.listen(anchor, 'click', (event: MouseEvent) => this.context.follow(event, href))
        );
      }
    });
  }

  private stopListening(): void {
    for (const stop of this.listeners.splice(0)) stop();
  }
}

/** The inline text of a paragraph, heading, list item or cell of a guide. */
@Directive({ selector: '[gcInline]' })
export class GuideInline extends DrawnContent {
  readonly parts = input.required<Inline[]>({ alias: 'gcInline' });

  protected drawn(): Drawn[] {
    return this.inline(this.parts());
  }
}

/** A row of a guide's table: its cells, the first naming the row (or every one, in the header). */
@Directive({ selector: '[gcRow]' })
export class GuideRow extends DrawnContent {
  readonly cells = input.required<Inline[][]>({ alias: 'gcRow' });
  /** Which columns hold numbers, set to the right. */
  readonly numeric = input.required<boolean[]>();
  readonly header = input(false);

  protected drawn(): Drawn[] {
    const numeric = this.numeric();
    return this.cells().map((cell, i) => {
      const heading = this.header() || i === 0;
      const attributes: Array<[string, string]> = heading ? [['scope', this.header() ? 'col' : 'row']] : [];
      if (numeric[i]) attributes.push(['class', 'num']);
      return { tag: heading ? 'th' : 'td', attributes, content: this.inline(cell) };
    });
  }
}

/**
 * The parts as a browser holds them once parsed: words next to each other are one text node, and empty
 * words are none.
 */
export function normalized(parts: Drawn[]): Drawn[] {
  const out: Drawn[] = [];
  for (const part of parts) {
    if (typeof part === 'string') {
      if (!part) continue;
      const last = out.length - 1;
      if (typeof out[last] === 'string') out[last] += part;
      else out.push(part);
    } else {
      out.push({ ...part, content: normalized(part.content) });
    }
  }
  return out;
}

/** The attributes the parts are drawn with. Others on an element (put there by an extension, say) are left. */
const DRAWN_ATTRIBUTES = ['class', 'href', 'lang', 'scope'];

/** Whether a node is the element of a part, with the same attributes (what is in it aside). */
function sameElement(node: Node, part: Exclude<Drawn, string>): boolean {
  if (node.nodeType !== ELEMENT_NODE) return false;
  const element = node as Element;
  const value = (name: string) => part.attributes.find(([drawn]) => drawn === name)?.[1] ?? null;
  return (
    element.tagName.toLowerCase() === part.tag &&
    DRAWN_ATTRIBUTES.every((name) => element.getAttribute(name) === value(name))
  );
}
