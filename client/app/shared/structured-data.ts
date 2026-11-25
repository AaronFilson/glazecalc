import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, InjectionToken, Renderer2, effect, inject, input } from '@angular/core';
import { ogImageFile } from '../../../lib/og-images';
import { languagePrefix } from '../../../lib/regions/languages';
import { pathIn } from '../i18n/language';

/** Where the site lives. The prerender has no server to ask, and search wants whole addresses. */
export const SITE = 'https://glazecalcapp.com';

/** Who makes Glazecalc (site.about.who), linked to the About page. */
export const AUTHOR = { '@type': 'Person', name: 'Aaron Filson', url: SITE + '/about' } as const;

/** A page title without its trailing " - Glazecalc" or " – Glazecalc" brand suffix. */
export const withoutBrand = (title: string): string => title.replace(/ [-–] Glazecalc$/, '');

/** The preview image's full address for a language (lib/og-images.js). */
export const imageAddress = (language: string): string => SITE + '/' + ogImageFile(language);

/** The address of the page being drawn, in its language: https://glazecalcapp.com/de/guides. */
export const pageAddress = (language: string, pathname: string): string => SITE + pathIn(language, pathname);

/** Supplied by scripts/prerender.mjs in platformProviders (no providedIn, so PlatformInjector is reached). */
export const PRERENDER_MODIFIED = new InjectionToken<(address: string) => string | null>('PRERENDER_MODIFIED');

/**
 * When the page at `address` last changed what it says (YYYY-MM-DD), for Article.dateModified.
 * The prerender supplies PRERENDER_MODIFIED from lib/page-dates.json; in the browser, the initial block
 * written by the prerender keeps its dateModified during hydration so client-side rendering never strips it,
 * while moving to another page in the app starts fresh unless the guide's front matter gives one.
 */
export const PAGE_MODIFIED = new InjectionToken<(address: string) => string | null>('PAGE_MODIFIED', {
  providedIn: 'root',
  factory: () => {
    const fromPrerender = inject(PRERENDER_MODIFIED, { optional: true });
    if (fromPrerender) return fromPrerender;
    const text = inject(DOCUMENT).head.querySelector('script[data-gc-ld]')?.textContent;
    if (!text) return () => null;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const blocks = Array.isArray(parsed['@graph']) ? (parsed['@graph'] as Record<string, unknown>[]) : [parsed];
      const found = blocks.find((b) => typeof b['dateModified'] === 'string' && typeof b['url'] === 'string');
      if (!found) return () => null;
      const { url, dateModified } = found as { url: string; dateModified: string };
      return (address: string) => (address === url ? dateModified : null);
    } catch {
      return () => null;
    }
  }
});

/** The landing page's WebApplication (https://schema.org/WebApplication). */
export function webApplication(description: string, language: string, address: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Glazecalc',
    description,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    author: AUTHOR,
    image: imageAddress(language),
    inLanguage: language,
    url: address
  };
}

/**
 * The home page's data: its WebApplication, and on the site's own home page
 * (the English one at the root) a WebSite too, in one @graph, which is where
 * Google reads the site's name for its results
 * (https://developers.google.com/search/docs/appearance/site-names). The other
 * languages' home pages are subdirectories, which Google does not read for the
 * name, so they keep the WebApplication alone.
 */
export function homeData(description: string, language: string, address: string): object {
  const app = webApplication(description, language, address);
  if (address !== SITE + '/') return app;
  const { '@context': context, ...rest } = app as Record<string, unknown>;
  return {
    '@context': context,
    '@graph': [{ '@type': 'WebSite', name: 'Glazecalc', url: SITE + '/' }, rest]
  };
}

/**
 * One step of the trail from the home page to a page: its localized name and its path without the language
 * (/materials/silica; / for the home page). The one array of these feeds both the BreadcrumbList that search
 * engines read (breadcrumbList) and the trail the page shows (gc-breadcrumb, shared/breadcrumb.ts).
 */
export interface Crumb {
  name: string;
  path: string;
}

/** The BreadcrumbList (https://schema.org/BreadcrumbList) of a trail, its addresses whole and in the `language`. */
export function breadcrumbList(id: string, crumbs: ReadonlyArray<Crumb>, language: string): object {
  const prefix = languagePrefix(language);
  return {
    '@type': 'BreadcrumbList',
    '@id': id,
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: SITE + prefix + crumb.path
    }))
  };
}

/**
 * A guide's Article (https://schema.org/Article); dateModified comes from the guide's front matter or the
 * build's page-dates (PAGE_MODIFIED). With `crumbs` (the trail to the guide), the Article and its
 * BreadcrumbList are one @graph, as referencePage's are; the trail's addresses are in `crumbLanguage`
 * (the page's, where `language` is the guide's text's).
 */
export function article(
  headline: string,
  description: string,
  language: string,
  address: string,
  modified?: string | null,
  crumbs?: ReadonlyArray<Crumb>,
  crumbLanguage = language
): object {
  const data = {
    '@type': 'Article',
    headline,
    description,
    author: AUTHOR,
    image: imageAddress(language === 'en' ? 'en' : crumbLanguage),
    inLanguage: language,
    url: address,
    ...(modified ? { dateModified: modified } : {})
  };
  if (!crumbs?.length) return { '@context': 'https://schema.org', ...data };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { ...data, breadcrumb: { '@id': address + '#breadcrumb' } },
      breadcrumbList(address + '#breadcrumb', crumbs, crumbLanguage)
    ]
  };
}

/**
 * A public page (a standard material's, the materials list, the cone chart, the guides list, About, Advice,
 * Assistants): a WebPage of the site (https://schema.org/WebPage) and its trail of pages
 * (https://schema.org/BreadcrumbList), which search results show in place of the address. `path` is the
 * page's address without its language, such as /materials/silica. In English, or for a page not translated,
 * that is its one address for search engines (lib/pages.js, englishOnlyIn); in a language the page is
 * translated into, it is named at its own, in that `language`.
 * `crumbs` is the trail from the home page to this page, each { name, path }.
 */
export function referencePage(
  name: string,
  description: string,
  path: string,
  crumbs: ReadonlyArray<Crumb>,
  type: 'WebPage' | 'CollectionPage' | 'AboutPage' = 'WebPage',
  language = 'en',
  extra: Record<string, unknown> = {}
): object {
  const prefix = languagePrefix(language);
  const address = SITE + prefix + path;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': type,
        '@id': address,
        name,
        description,
        inLanguage: language,
        url: address,
        isPartOf: { '@type': 'WebSite', name: 'Glazecalc', url: SITE + prefix + '/' },
        breadcrumb: { '@id': address + '#breadcrumb' },
        ...extra
      },
      breadcrumbList(address + '#breadcrumb', crumbs, language)
    ]
  };
}

/**
 * JSON for inside a script tag: a "<" is written as a Unicode escape, so no text in it can
 * close the tag or open a comment.
 */
export const jsonForScript = (data: object): string => JSON.stringify(data).replace(/</g, '\\u003c');

/**
 * Search engines' data about the page, as <script type="application/ld+json"> in
 * the head. A block of JSON is data, not a script: the browser never runs it, so
 * the Content-Security-Policy needs no change. It is written the same way when
 * the page is rendered at build time and in the browser. The script is made
 * with the Renderer and its text set as plain text, never innerHTML (Angular's
 * sanitizer would drop a script, and bypassing it is what this avoids). The
 * head is not hydrated, so the browser finds the block the render wrote and
 * updates it where it is. A block is removed when its page goes: the router
 * closes the old page before it opens the next, so the next one starts clean.
 */
@Component({ selector: 'gc-structured-data', template: '' })
export class StructuredData {
  readonly data = input.required<object>();

  constructor() {
    const document = inject(DOCUMENT);
    const renderer = inject(Renderer2);
    let script: Element | null = document.head.querySelector('script[data-gc-ld]');
    effect(() => {
      const text = jsonForScript(this.data());
      if (!script) {
        script = renderer.createElement('script') as Element;
        renderer.setAttribute(script, 'type', 'application/ld+json');
        renderer.setAttribute(script, 'data-gc-ld', '');
        renderer.appendChild(document.head, script);
      }
      script.textContent = text;
    });
    inject(DestroyRef).onDestroy(() => script?.remove());
  }
}
