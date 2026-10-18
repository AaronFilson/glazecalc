import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StructuredData, article, homeData, jsonForScript, pageAddress, webApplication } from './structured-data';

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

  it('describes the app and a guide', () => {
    const address = pageAddress('de', '/de/guides/firing');
    expect(address).toBe('https://glazecalcapp.com/de/guides/firing');
    expect(webApplication('d', 'en', 'https://glazecalcapp.com/')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Glazecalc',
      description: 'd',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
      inLanguage: 'en',
      url: 'https://glazecalcapp.com/'
    });
    expect(article('h', 'd', 'de', address)).not.toHaveProperty('dateModified');
    expect(article('h', 'd', 'de', address, '2026-10-01')).toMatchObject({
      '@type': 'Article',
      headline: 'h',
      inLanguage: 'de',
      dateModified: '2026-10-01'
    });
  });
});
