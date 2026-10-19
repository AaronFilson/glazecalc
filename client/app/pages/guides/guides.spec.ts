import { APP_BASE_HREF, Location, PlatformLocation } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { PAGE_LANGUAGE } from '../../i18n/language';
import { httpMock, testProviders } from '../../testing/test-providers';
import { blocks, coneSystemsIn, forConeSystem, readGuide } from './guide-document';
import { GuidePage } from './guide-page';
import { GuideText, guideText } from './guide-text';
import { GUIDES, GuidesPage } from './guides-page';
import en from '../../../public/i18n/en.json';
import guideList from '../../../public/i18n/guides/en.json';
import firing from '../../../public/i18n/guides/firing/en.md';
import glazingBasics from '../../../public/i18n/guides/glazing-basics/en.md';
import homeSafety from '../../../public/i18n/guides/home-safety/en.md';
import course from '../../../public/i18n/guides/learn-with-john-britt/en.md';
import makingAGlaze from '../../../public/i18n/guides/making-a-glaze/en.md';
import safeMixing from '../../../public/i18n/guides/safe-mixing/en.md';

const PAGES: Array<[string, string]> = [
  ['Glazing from first principles', glazingBasics],
  ['How to make a glaze', makingAGlaze],
  ['Safe mixing and ventilation', safeMixing],
  ["Don't poison your family", homeSafety],
  ['Firing a basic kiln', firing]
];

/** What the guides list and the more-guides block call the home safety guide. */
const HOME_SAFETY_LINK = 'Glaze safety at home: children, pets and the kiln';

/** The companion to John Britt's course, in English only. */
const COURSE_TITLE = "Learn with John Britt's free glaze course";

/** The address the guides are opened at. */
const HERE = '/guides/this-guide';

describe('guides', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });

  /** A guide's page, as its route opens it with its Markdown, at HERE. */
  const render = async (text: string, language: string | null = null, extra: unknown[] = []) => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { data: { text: { text, language } satisfies GuideText } } }
    });
    for (const provider of extra as Array<{ provide: unknown; useValue: unknown }>) {
      TestBed.overrideProvider(provider.provide, { useValue: provider.useValue });
    }
    TestBed.inject(Location).replaceState(HERE);
    const fixture = TestBed.createComponent(GuidePage);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };

  it('lists the six guides, each linked to its page', async () => {
    const fixture = TestBed.createComponent(GuidesPage);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const cards = [...page.querySelectorAll('.guide-card')];
    expect(cards.map((a) => a.getAttribute('href'))).toEqual(GUIDES.map((guide) => guide.path));
    // The list's link text carries the search words; the home safety guide's own heading stays friendly.
    expect(cards.map((a) => a.querySelector('h2')?.textContent?.trim())).toEqual([
      ...PAGES.map(([title]) => (title === "Don't poison your family" ? HOME_SAFETY_LINK : title)),
      COURSE_TITLE
    ]);
  });

  it("shows the companion to John Britt's course: credited, linked to his videos, never embedding them", async () => {
    const { page } = await render(course, 'en');
    expect([...page.querySelectorAll('h1')].map((h) => h.textContent?.trim())).toEqual([COURSE_TITLE]);
    expect(page.textContent).toContain('This guide is not translated yet, so it is shown in English.');
    const sections = [...page.querySelectorAll('.guide h2')].map((h) => h.id);
    expect(sections[0]).toBe('about');
    expect(sections.at(-1)).toBe('sources');
    expect(sections.filter((id) => id !== 'about' && id !== 'more' && id !== 'sources')).toHaveSize(12);
    expect(page.querySelector('#about')?.closest('section')?.textContent).toContain('not connected with him');
    // His videos are links to YouTube, opened there; nothing is embedded.
    const videos = [...page.querySelectorAll<HTMLAnchorElement>('.guide a[href^="https://www.youtube.com/watch"]')];
    expect(videos.length).toBe(49);
    expect(page.querySelector('iframe, embed, object, video')).toBeNull();
    // Every unit with lab work sends the reader to the safe mixing guide first.
    for (const id of ['blending', 'test-tiles-and-melt', 'slurry-and-application', 'raw-materials']) {
      const warning = page.querySelector(`#${id}`)?.closest('section')?.querySelector('.guide-warning');
      expect(warning?.querySelector('a')?.getAttribute('href'), id).toContain('/guides/safe-mixing');
    }
  });

  it("keeps the home safety guide's friendly heading but gives search the words in its title and meta", () => {
    expect(readGuide(homeSafety).title).toBe("Don't poison your family");
    expect(en.titles.homeSafety).toBe(`${HOME_SAFETY_LINK} - Glazecalc`);
    expect(guideList.list.homeSafety.title).toBe(HOME_SAFETY_LINK);
  });

  afterEach(() => window.history.pushState({}, '', '/'));

  for (const guide of GUIDES) {
    it(`ends ${guide.path} with a block linking the other guides, by the list, and not itself`, async () => {
      // The page's own address, as the browser has it (the guide view reads it).
      window.history.pushState({}, '', guide.path);
      const { page } = await render(firing);
      const block = page.querySelector('nav.more-guides')!;
      expect(block.querySelector('h2')?.textContent?.trim()).toBe('More guides');
      const others = GUIDES.filter((other) => other.path !== guide.path);
      expect([...block.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(others.map((o) => o.path));
      // Each link has the list's title, and its text follows.
      expect(block.querySelector('li')?.textContent).toContain(': ');
      expect(page.querySelector('.guide nav')).toBeNull();
    });
  }

  it('lists every guide in the block on a page of no guide of the list', async () => {
    const { page } = await render(firing);
    expect([...page.querySelectorAll('.more-guides a')].map((a) => a.getAttribute('href'))).toEqual(
      GUIDES.map((guide) => guide.path)
    );
    expect(page.querySelector('.more-guides a')?.textContent?.trim()).toBe('Glazing from first principles');
  });

  for (const [title, markdown] of PAGES) {
    it(`"${title}": one title, a contents link to every section, and labelled tables`, async () => {
      const { page } = await render(markdown);
      expect([...page.querySelectorAll('h1')].map((h) => h.textContent?.trim())).toEqual([title]);
      const sections = [...page.querySelectorAll('.guide h2')];
      const links = [...page.querySelectorAll<HTMLAnchorElement>('.guide-contents a')];
      expect(links.map((a) => a.getAttribute('href'))).toEqual(sections.map((h) => HERE + '#' + h.id));
      expect(links.map((a) => a.textContent?.trim())).toEqual(sections.map((h) => h.textContent?.trim()));
      expect(sections.at(-1)?.id).toBe('sources');
      expect(page.querySelectorAll('.guide-sources a[href^="https://"]').length).toBeGreaterThanOrEqual(8);

      // Ids are unique, and headings go down one level at a time.
      const ids = [...page.querySelectorAll('[id]')].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      const levels = [...page.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));
      levels.forEach((level, i) => i > 0 && expect(level - levels[i - 1]!).toBeLessThanOrEqual(1));

      // Every table has a caption, and its scrolling box a name and a place in the tab order.
      for (const table of page.querySelectorAll('table')) {
        expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
        const box = table.closest('.guide-table-scroll');
        expect(box?.getAttribute('aria-label')).toBeTruthy();
        expect(box?.getAttribute('tabindex')).toBe('0');
        // A row's first cell names it.
        for (const row of table.querySelectorAll('tbody tr')) expect(row.firstElementChild?.tagName).toBe('TH');
      }

      // A contents link takes the focus to its section, and the address names it.
      links[1]!.click();
      expect(document.activeElement).toBe(sections[1]);
      expect(TestBed.inject(Location).path(true)).toBe(HERE + '#' + sections[1]!.id);
    });
  }

  it('links each section at the guide’s own address, in its language, to copy, share or open in a new tab', async () => {
    const text = '---\ntitle: T\nlead: L\n---\n\n## Eins {#one}\n\nSiehe [zwei](#two).\n\n## Zwei {#two}\n\nText.\n';
    const { page } = await render(text, null, [
      { provide: APP_BASE_HREF, useValue: '/de/' },
      { provide: PAGE_LANGUAGE, useValue: 'de' }
    ]);
    const [, contents] = [...page.querySelectorAll<HTMLAnchorElement>('.guide-contents a')];
    const inText = page.querySelector<HTMLAnchorElement>('.guide p a')!;
    expect([contents!.getAttribute('href'), inText.getAttribute('href')]).toEqual([
      '/de/guides/this-guide#two',
      '/de/guides/this-guide#two'
    ]);
    // Opening it in a new tab is left to the browser.
    let leftToTheBrowser = false;
    inText.addEventListener('click', (event) => {
      leftToTheBrowser = !event.defaultPrevented;
      event.preventDefault();
    });
    inText.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    expect(leftToTheBrowser).toBe(true);
    // Followed here, it moves the focus, and the address names the section.
    inText.click();
    expect(document.activeElement).toBe(page.querySelector('#two'));
    expect(TestBed.inject(PlatformLocation).pathname + TestBed.inject(PlatformLocation).hash).toBe(
      '/de/guides/this-guide#two'
    );
  });

  it('marks the parts of a translation still in English, with a note over each section', async () => {
    const translation = [
      '---',
      'lang: en',
      'title: Firing a basic kiln',
      'lead: Cones and kiln sitters.',
      '---',
      '',
      'Before the first section.',
      '',
      '## Kegel {#cones}',
      '',
      'Kegel messen die Wärmearbeit.',
      '',
      '## The kiln sitter {#kiln-sitter lang=en}',
      '',
      'A sitter turns the kiln off.',
      ''
    ].join('\n');
    const { page } = await render(translation, null, [{ provide: PAGE_LANGUAGE, useValue: 'de' }]);
    expect(page.querySelector('gc-page-header')?.getAttribute('lang')).toBe('en');
    const [cones, sitter] = [...page.querySelectorAll<HTMLElement>('.guide section')];
    expect(cones!.getAttribute('lang')).toBeNull();
    expect(cones!.querySelector('.guide-note')).toBeNull();
    expect(sitter!.getAttribute('lang')).toBe('en');
    expect(sitter!.querySelector('h2')?.id).toBe('kiln-sitter');
    expect(sitter!.querySelector('h2')?.textContent?.trim()).toBe('The kiln sitter');
    // The note is in the page's language (the tests load the English for every language).
    const note = sitter!.querySelector('.guide-note')!;
    expect(note.getAttribute('lang')).toBe('de');
    expect(note.textContent).toContain('shown in English until its translation is brought up to date');
    // Its entry in the contents is marked English too.
    const entries = [...page.querySelectorAll('.guide-contents li')];
    expect(entries.map((li) => li.getAttribute('lang'))).toEqual([null, 'en']);
  });

  it('writes temperatures in the reader’s scale first, numbers as their language writes them', async () => {
    // Settings, as this browser's copy has them (core/preferences.service.ts).
    localStorage.setItem('temperature', 'C');
    const { page } = await render(firing);
    const chart = [...page.querySelectorAll('table')].find((t) =>
      t.querySelector('caption')?.textContent?.includes('Orton self-supporting')
    )!;
    const cone6 = [...chart.querySelectorAll('tr')].find((row) => row.firstElementChild?.textContent?.trim() === '6')!;
    expect(cone6.children[2]?.textContent?.trim()).toBe('1222 °C (2232 °F)');
  });

  it('shows the firing guide for the reader’s way of firing, and the other on request', async () => {
    localStorage.setItem('cones', 'temperature');
    const { fixture, page } = await render(firing);
    const ids = () => [...page.querySelectorAll('.guide h2')].map((h) => h.id);
    expect(ids()).toContain('by-temperature');
    expect(ids()).not.toContain('kiln-sitter');
    expect(page.querySelector('.guide-version')?.textContent).toContain(
      'This guide is shown for firing by temperature'
    );
    (page.querySelector('.guide-version button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(ids()).toEqual(expect.arrayContaining(['cone-pack', 'kiln-sitter', 'reading-cones']));
    expect(ids()).not.toContain('by-temperature');
    // The firing guide has parts for three ways of firing, so the other two are offered.
    const offered = () => [...page.querySelectorAll('.guide-version button')].map((b) => b.textContent?.trim());
    expect(offered()).toEqual(['Show it for firing to SK cones (JIS R 8101)', 'Show it for firing by temperature']);
    expect(page.querySelector('.guide-version')?.textContent).toContain('This guide is shown for firing to cones');
    // The contents follow the version shown.
    expect([...page.querySelectorAll('.guide-contents a')].map((a) => a.getAttribute('href'))).toContain(
      HERE + '#kiln-sitter'
    );
    (page.querySelectorAll('.guide-version button')[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(ids()).toContain('sk-cones');
    expect(ids()).not.toContain('kiln-sitter');
    expect(ids()).not.toContain('by-temperature');
    expect(page.querySelector('.guide-version')?.textContent).toContain('firing to SK cones (JIS R 8101)');
    expect(offered()).toEqual(['Show it for firing to Orton cones', 'Show it for firing by temperature']);
  });

  it('opens the firing guide at its SK cones for those who set SK cones', async () => {
    localStorage.setItem('cones', 'sk');
    const { page } = await render(firing);
    const ids = [...page.querySelectorAll('.guide h2')].map((h) => h.id);
    expect(ids).toContain('sk-cones');
    expect(ids).not.toContain('cone-pack');
    // The SK chart carries the cone, the temperature and what it is.
    const chart = [...page.querySelectorAll('table')].find((t) =>
      t.querySelector('caption')?.textContent?.includes('SK large cones')
    )!;
    expect(chart.querySelectorAll('tbody tr').length).toBe(42);
    expect(chart.textContent).toContain('nominal (JIS)');
  });

  it('says when a guide is not translated yet, and marks its text as English', async () => {
    const { page } = await render(safeMixing, 'en');
    expect(page.querySelector('.guide')?.getAttribute('lang')).toBe('en');
    // Its title, lead and contents too; the note and the contents' heading are in the page's language.
    expect(page.querySelector('gc-page-header')?.getAttribute('lang')).toBe('en');
    const entries = [...page.querySelectorAll('.guide-contents li')];
    expect(entries.length).toBeGreaterThan(3);
    expect(entries.every((li) => li.getAttribute('lang') === 'en')).toBe(true);
    expect(page.querySelector('.guide-contents')?.getAttribute('lang')).toBeNull();
    expect(page.textContent).toContain('This guide is not translated yet, so it is shown in English.');
    // A guide written one way only offers no other.
    expect(page.querySelector('.guide-version')).toBeNull();
  });

  it('shows a guide in a pseudo-locale, accented, from the English', async () => {
    const { page } = await render(safeMixing, null, [{ provide: PAGE_LANGUAGE, useValue: 'en-XA' }]);
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Šåƒé ɱîẋîñĝ åñð ṽéñţîļåţîöñ');
  });

  it('shows a guide in the Japanese pseudo-locale in Japanese characters, with no spaces', async () => {
    const { page } = await render(safeMixing, null, [{ provide: PAGE_LANGUAGE, useValue: 'ja-XC' }]);
    // Safe mixing and ventilation: 2 + 3 + 2 + 6 characters.
    expect(page.querySelector('h1')?.textContent?.trim()).toMatch(/^[\u3040-\u30ff\u4e00-\u9fff]{13}$/);
  });

  it('keeps the links of a guide in the app, on the page and to other sites', async () => {
    const { page } = await render(firing);
    const hrefs = [...page.querySelectorAll('.guide a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/guides/glazing-basics');
    expect(hrefs.some((href) => href?.startsWith('https://'))).toBe(true);
  });

  it('gives a glaze’s density as the reader measures it', async () => {
    localStorage.setItem('density', 'baume');
    const { page } = await render(makingAGlaze);
    const densities = [...page.querySelectorAll('.density')].map((span) => span.textContent?.trim());
    expect(densities).toContain('45 °Bé (SG 1.45)');
    // 145 − 145 ÷ 1.43 is 43.6.
    expect(densities).toContain('44–45 °Bé (SG 1.43–1.45)');
  });

  it('gives it as pint weight, or as specific gravity', async () => {
    localStorage.setItem('density', 'pint');
    const { page } = await render(makingAGlaze);
    expect(page.querySelector('.density')?.textContent?.trim()).toBe('29 oz per imperial pint (SG 1.45)');
  });

  it('shows the English after key terms in a translated guide, for a reader who asks', async () => {
    localStorage.setItem('englishTerms', 'on');
    const text = '---\ntitle: T\nlead: L\n---\n\n## Eins {#one}\n\nDie Fritte{{en: frit}} schmilzt.\n';
    const { page } = await render(text, null, [{ provide: PAGE_LANGUAGE, useValue: 'de' }]);
    expect(page.querySelector('.guide p')?.textContent).toBe('Die Fritte (frit) schmilzt.');
    expect(page.querySelector('.english-term')?.getAttribute('lang')).toBe('en');
  });

  it('shows who to call in the home safety guide', async () => {
    localStorage.setItem('preferredRegion', 'GB');
    const { page } = await render(homeSafety);
    expect(page.querySelector('gc-poison-lines caption')?.textContent).toContain('Who to call in United Kingdom');
  });

  describe('loading a guide', () => {
    const load = async (language: string) => {
      TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: language });
      const route = { data: { guide: 'firing' } } as unknown as ActivatedRouteSnapshot;
      const result = TestBed.runInInjectionContext(() => guideText(route, {} as RouterStateSnapshot));
      return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result as GuideText);
    };

    it("reads the page's language's Markdown, or the English until there is one", async () => {
      const german = load('de');
      httpMock().expectOne('/i18n/guides/firing/de.md').flush('', { status: 404, statusText: 'Not Found' });
      httpMock().expectOne('/i18n/guides/firing/en.md').flush('# English');
      expect(await german).toEqual({ text: '# English', language: 'en' });
    });

    it('reads the English at once for a guide in English only, with the notice', async () => {
      TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: 'de' });
      const route = {
        data: { guide: 'learn-with-john-britt', englishOnly: true }
      } as unknown as ActivatedRouteSnapshot;
      const result = TestBed.runInInjectionContext(() => guideText(route, {} as RouterStateSnapshot));
      const german = isObservable(result) ? firstValueFrom(result) : Promise.resolve(result as GuideText);
      httpMock().expectNone('/i18n/guides/learn-with-john-britt/de.md');
      httpMock().expectOne('/i18n/guides/learn-with-john-britt/en.md').flush('# English');
      expect(await german).toEqual({ text: '# English', language: 'en' });
    });

    it('reads the English for English and the pseudo-locales', async () => {
      const pseudo = load('en-XA');
      httpMock().expectOne('/i18n/guides/firing/en.md').flush('# English');
      expect(await pseudo).toEqual({ text: '# English', language: null });
    });
  });
});

describe('guide Markdown', () => {
  const sample = `---
title: A sample
lead: For the reader.
---

## First {#first}

Some **bold** text, a [link](/recipe#tools), and {{2232 °F; 1222 °C}}.

Table: A caption at {{108 °F/h; 60 °C/h}}
Label: Short

| Cone | Temperature |
| --- | ---: |
| 6 | {{2232 °F; 1222 °C}} |

> [!WARNING]
> Careful.

:::orton

Only with cones.

:::

:::sk

Only with SK cones.

:::

:::temperature

Only by temperature.

:::

## Glossary {#glossary}

Bisque
: The first firing.

Glaze
: Glass on a pot.

::poison-lines

::shops

::silica-limit

::food-limits

::local-equivalents

::not-a-block
`;

  it('reads the front matter, sections and blocks', () => {
    const guide = readGuide(forConeSystem(sample, 'orton'));
    expect(guide.title).toBe('A sample');
    expect(guide.lead).toBe('For the reader.');
    expect(guide.sections.map(({ id, label }) => [id, label])).toEqual([
      ['first', 'First'],
      ['glossary', 'Glossary']
    ]);
    const first = blocks(guide.sections[0]!.blocks, 'first');
    expect(first.map((block) => block.kind)).toEqual(['paragraph', 'table', 'callout', 'paragraph']);
    const table = first[1] as Extract<(typeof first)[number], { kind: 'table' }>;
    expect(table.label).toBe('Short');
    expect(table.numeric).toEqual([false, true]);
    expect(table.caption.map((part) => part.kind)).toEqual(['text', 'temperature']);
    expect(first[2]).toMatchObject({ kind: 'callout', tone: 'warning' });
    const paragraph = first[0] as Extract<(typeof first)[number], { kind: 'paragraph' }>;
    expect(paragraph.content.find((part) => part.kind === 'temperature')).toEqual({
      kind: 'temperature',
      fahrenheit: { from: 2232, to: null, unit: '°F' },
      celsius: { from: 1222, to: null, unit: '°C' }
    });
    const glossary = blocks(guide.sections[1]!.blocks, 'glossary');
    // Each region block on a line of its own; any other ::line is text.
    expect(glossary.map((block) => block.kind)).toEqual([
      'definitions',
      'poison-lines',
      'shops',
      'silica-limit',
      'food-limits',
      'local-equivalents',
      'paragraph'
    ]);
    expect((glossary[0] as Extract<(typeof glossary)[number], { kind: 'definitions' }>).items).toHaveLength(2);
  });

  it('keeps only the parts for the reader’s way of firing', () => {
    expect(forConeSystem(sample, 'orton')).toContain('Only with cones.');
    expect(forConeSystem(sample, 'orton')).not.toContain('Only by temperature.');
    expect(forConeSystem(sample, 'temperature')).toContain('Only by temperature.');
    expect(forConeSystem(sample, 'temperature')).not.toContain(':::');
  });

  it('keeps only the SK parts for those who fire to SK cones, and none of the others', () => {
    const sk = forConeSystem(sample, 'sk');
    expect(sk).toContain('Only with SK cones.');
    expect(sk).not.toContain('Only with cones.');
    expect(sk).not.toContain('Only by temperature.');
    expect(sk).not.toContain(':::');
    expect(forConeSystem(sample, 'orton')).not.toContain('Only with SK cones.');
    expect(forConeSystem(sample, 'temperature')).not.toContain('Only with SK cones.');
    expect(coneSystemsIn(sample)).toEqual(['orton', 'sk', 'temperature']);
  });

  it('gives those who fire to SK cones the temperature parts of a guide with none for SK, never Orton numbers', () => {
    const noSk = sample.replace(/^:::sk\n[\s\S]*?^:::\n/m, '');
    expect(coneSystemsIn(noSk)).toEqual(['orton', 'temperature']);
    const shown = forConeSystem(noSk, 'sk');
    expect(shown).toContain('Only by temperature.');
    expect(shown).not.toContain('Only with cones.');
  });
});
