import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, Renderer2, effect, inject, input } from '@angular/core';
import { PAGE_LANGUAGE, pathIn } from '../i18n/language';

/** Where the site lives. The prerender has no server to ask, and search wants whole addresses. */
export const SITE = 'https://glazecalcapp.com';

/** The address of the page being drawn, in its language: https://glazecalcapp.com/de/guides. */
export const pageAddress = (language: string, pathname: string): string => SITE + pathIn(language, pathname);

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
    inLanguage: language,
    url: address
  };
}

/** A guide's Article (https://schema.org/Article); dateModified only where the guide's front matter has one. */
export function article(
  headline: string,
  description: string,
  language: string,
  address: string,
  modified?: string | null
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    inLanguage: language,
    url: address,
    ...(modified ? { dateModified: modified } : {})
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

/** The language and the address of the page, for the data about it. */
export function pageIdentity(): { language: string; address: string } {
  const language = inject(PAGE_LANGUAGE);
  return { language, address: pageAddress(language, inject(DOCUMENT).location.pathname) };
}
