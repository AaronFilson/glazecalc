import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AUTHOR,
  PAGE_MODIFIED,
  PRERENDER_MODIFIED,
  StructuredData,
  article,
  breadcrumbList,
  homeData,
  imageAddress,
  jsonForScript,
  pageAddress,
  referencePage,
  webApplication,
  withoutBrand
} from './structured-data';

// Data for search engines, written into the head as a block of JSON that never runs.

@Component({ imports: [StructuredData], template: '<gc-structured-data [data]="data()" />' })
class Host {
  data = signal<object>({ '@type': 'Thing', name: 'a' });
}

describe('structured data', () => {
  const blocks = (doc: Document) => [...doc.head.querySelectorAll('script[type="application/ld+json"]')];

  afterEach(() => blocks(document).forEach((block) => block.remove()));

  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  }

  it('writes one block of JSON into the head, and updates it', async () => {
    const doc = document;
    const fixture = render();
    expect(blocks(doc).map((b) => JSON.parse(b.textContent!))).toEqual([{ '@type': 'Thing', name: 'a' }]);
    fixture.componentInstance.data.set({ '@type': 'Thing', name: 'b' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(blocks(doc).map((b) => JSON.parse(b.textContent!))).toEqual([{ '@type': 'Thing', name: 'b' }]);
  });

  it('adopts the block the render wrote, rather than adding a second, and removes it with its page', () => {
    const doc = document;
    const written = doc.createElement('script');
    written.type = 'application/ld+json';
    written.setAttribute('data-gc-ld', '');
    written.textContent = '{}';
    doc.head.append(written);
    const fixture = render();
    expect(blocks(doc)).toEqual([written]);
    expect(JSON.parse(written.textContent!)).toEqual({ '@type': 'Thing', name: 'a' });
    fixture.destroy();
    expect(blocks(doc)).toHaveLength(0);
  });

  it('cannot be closed early by the text in it', () => {
    expect(jsonForScript({ name: '</script><b>' })).not.toContain('<');
    expect(JSON.parse(jsonForScript({ name: '</script><b>' }))).toEqual({ name: '</script><b>' });
  });

  it('names the site on its own home page only, beside the app', () => {
    const root = homeData('d', 'en', 'https://glazecalcapp.com/') as { '@context': string; '@graph': object[] };
    expect(root['@context']).toBe('https://schema.org');
    expect(root['@graph']).toEqual([
      { '@type': 'WebSite', name: 'Glazecalc', url: 'https://glazecalcapp.com/' },
      expect.objectContaining({ '@type': 'WebApplication', name: 'Glazecalc', url: 'https://glazecalcapp.com/' })
    ]);
    expect(root['@graph'][1]).not.toHaveProperty('@context');
    // Another language's home page is a subdirectory: the app alone.
    expect(homeData('d', 'de', 'https://glazecalcapp.com/de/')).toEqual(
      webApplication('d', 'de', 'https://glazecalcapp.com/de/')
    );
  });

  it('describes the app and a guide, with their author and language preview image', () => {
    const address = pageAddress('de', '/de/guides/firing');
    expect(address).toBe('https://glazecalcapp.com/de/guides/firing');
    expect(withoutBrand('Famous glazes - Glazecalc')).toBe('Famous glazes');
    expect(withoutBrand('Anleitungen – Glazecalc')).toBe('Anleitungen');
    expect(webApplication('d', 'en', 'https://glazecalcapp.com/')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Glazecalc',
      description: 'd',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
      author: AUTHOR,
      image: imageAddress('en'),
      inLanguage: 'en',
      url: 'https://glazecalcapp.com/'
    });
    expect(article('h', 'd', 'de', address)).not.toHaveProperty('dateModified');
    expect(article('h', 'd', 'de', address, '2026-10-01')).toMatchObject({
      '@type': 'Article',
      headline: 'h',
      author: AUTHOR,
      image: imageAddress('de'),
      inLanguage: 'de',
      dateModified: '2026-10-01'
    });
    // An English-only guide opened on a German page keeps the English preview image, matching og:image.
    expect(article('h', 'd', 'en', 'https://glazecalcapp.com/de/guides/x', null, undefined, 'de')).toMatchObject({
      inLanguage: 'en',
      image: imageAddress('en')
    });
  });

  it('keeps a prerendered dateModified for that page alone during hydration', () => {
    const written = document.createElement('script');
    written.type = 'application/ld+json';
    written.setAttribute('data-gc-ld', '');
    written.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Article', url: 'https://glazecalcapp.com/guides/firing', dateModified: '2026-11-04' }]
    });
    document.head.append(written);
    TestBed.resetTestingModule();
    const modified = TestBed.inject(PAGE_MODIFIED);
    expect(modified('https://glazecalcapp.com/guides/firing')).toBe('2026-11-04');
    expect(modified('https://glazecalcapp.com/guides/safe-mixing')).toBeNull();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PRERENDER_MODIFIED, useValue: () => '2026-11-10' }] });
    expect(TestBed.inject(PAGE_MODIFIED)('https://glazecalcapp.com/guides/safe-mixing')).toBe('2026-11-10');
  });

  it('puts a guide trail beside the Article, in one graph', () => {
    const address = 'https://glazecalcapp.com/de/guides/x';
    const data = article('h', 'd', 'de', address, null, [
      { name: 'Glazecalc', path: '/' },
      { name: 'Anleitungen', path: '/guides' },
      { name: 'h', path: '/guides/x' }
    ]) as { '@graph': Record<string, unknown>[] };
    const [page, trail] = data['@graph'];
    expect(page).toMatchObject({ '@type': 'Article', breadcrumb: { '@id': address + '#breadcrumb' } });
    expect(trail).toMatchObject({ '@type': 'BreadcrumbList', '@id': address + '#breadcrumb' });
    expect(
      (trail!['itemListElement'] as { position: number; name: string; item: string }[]).map((c) => [c.name, c.item])
    ).toEqual([
      ['Glazecalc', 'https://glazecalcapp.com/de/'],
      ['Anleitungen', 'https://glazecalcapp.com/de/guides'],
      ['h', 'https://glazecalcapp.com/de/guides/x']
    ]);
  });

  it('writes the same trail the page shows, whichever page builds it', () => {
    const crumbs = [
      { name: 'Glazecalc', path: '/' },
      { name: 'Materials', path: '/materials' }
    ];
    const list = breadcrumbList('id', crumbs, 'en') as { itemListElement: { name: string; item: string }[] };
    expect(list.itemListElement.map((c) => c.name)).toEqual(crumbs.map((c) => c.name));
    const page = referencePage('n', 'd', '/materials', crumbs, 'CollectionPage', 'en') as {
      '@graph': Record<string, unknown>[];
    };
    expect(page['@graph'][1]).toEqual(breadcrumbList('https://glazecalcapp.com/materials#breadcrumb', crumbs, 'en'));
    const about = referencePage('About', 'd', '/about', crumbs, 'AboutPage', 'en', { author: AUTHOR }) as {
      '@graph': Record<string, unknown>[];
    };
    expect(about['@graph'][0]).toMatchObject({ '@type': 'AboutPage', author: AUTHOR });
  });
});
