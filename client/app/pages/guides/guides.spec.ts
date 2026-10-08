import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FiringGuide } from './firing-guide';
import { GlazingBasicsGuide } from './glazing-basics';
import { GUIDES, GuidesPage } from './guides-page';
import { HomeSafetyGuide } from './home-safety';
import { MakingAGlazeGuide } from './making-a-glaze';
import { SafeMixingGuide } from './safe-mixing';

const PAGES: Array<[string, Type<unknown>]> = [
  ['Glazing from first principles', GlazingBasicsGuide],
  ['How to make a glaze', MakingAGlazeGuide],
  ['Safe mixing and ventilation', SafeMixingGuide],
  ["Don't poison your family", HomeSafetyGuide],
  ['Firing a basic kiln', FiringGuide]
];

describe('guides', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  const render = async (page: Type<unknown>) => {
    const fixture = TestBed.createComponent(page);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('lists the five guides, each linked to its page', async () => {
    const page = await render(GuidesPage);
    const cards = [...page.querySelectorAll('.guide-card')];
    expect(cards.map((a) => a.getAttribute('href'))).toEqual(GUIDES.map((guide) => guide.path));
    expect(cards.map((a) => a.querySelector('h2')?.textContent?.trim())).toEqual(PAGES.map(([title]) => title));
  });

  for (const [title, component] of PAGES) {
    it(`"${title}": one title, a contents link to every section, and labelled tables`, async () => {
      const page = await render(component);
      expect([...page.querySelectorAll('h1')].map((h) => h.textContent?.trim())).toEqual([title]);
      const sections = [...page.querySelectorAll('.guide h2')];
      const links = [...page.querySelectorAll<HTMLAnchorElement>('.guide-contents a')];
      expect(links.map((a) => a.getAttribute('href'))).toEqual(sections.map((h) => '#' + h.id));
      expect(links.map((a) => a.textContent?.trim())).toEqual(sections.map((h) => h.textContent?.trim()));
      expect(sections.at(-1)?.id).toBe('sources');
      expect(page.querySelectorAll('.guide-sources a[href^="https://"]').length).toBeGreaterThanOrEqual(8);

      // Ids are unique, and headings go down one level at a time.
      const ids = [...page.querySelectorAll('[id]')].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      const levels = [...page.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));
      levels.forEach((level, i) => i > 0 && expect(level - levels[i - 1]).toBeLessThanOrEqual(1));

      // Every table has a caption, and its scrolling box a name and a place in the tab order.
      for (const table of page.querySelectorAll('table')) {
        expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
        const box = table.closest('.guide-table-scroll');
        expect(box?.getAttribute('aria-label')).toBeTruthy();
        expect(box?.getAttribute('tabindex')).toBe('0');
      }

      // A contents link takes the focus to its section.
      links[1].click();
      expect(document.activeElement).toBe(sections[1]);
    });
  }
});
