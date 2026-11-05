import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Additive, Material } from '../../core/models';
import { PAGE_LANGUAGE } from '../../i18n/language';

// Famous glazes (docs/famous-glazes.md): the published glazes, as the build writes them
// (scripts/famous-glazes.mjs, from lib/famous-glazes.js). Kept apart from the chemistry
// (famous-glaze.ts), as the routes read this and every page carries the routes.

/** Text in each language it is written in; English always. */
export type Prose = { en: string } & Record<string, string>;

export interface GlazeLine<R> {
  record: R;
  amount: number;
}

/** A published glaze as its page reads it (lib/famous-glazes.js resolveGlaze). */
export interface FamousGlaze {
  slug: string;
  history?: boolean;
  lead: boolean;
  names: Prose;
  native: { name: string; lang: string };
  origin: Prose;
  period: Prose;
  summary: Prose;
  safety: Prose;
  firing: {
    cone?: string;
    celsius?: number | [number, number];
    atmosphere: string;
    note?: Prose;
    sources?: string[];
  };
  recipe: {
    lines: GlazeLine<Material>[];
    additives: GlazeLine<Additive>[];
    note?: Prose;
    sources?: string[];
  } | null;
  analysis: { oxides: Record<string, number>; note?: Prose; sources?: string[] } | null;
  leadFree: {
    /** Whether it has been test-fired; false shows "calculated, not yet test-fired". */
    tested: boolean;
    note: Prose;
    celsius: number;
    additives: GlazeLine<Additive>[];
    prefer: Material[];
  } | null;
  sources: Array<{ id: string; citation: string; url?: string; isbn?: string; opened?: string }>;
  guides?: string[];
}

/**
 * Where the published glazes are served in a language (scripts/famous-glazes.mjs): their prose in that
 * language and English only; the render reads the built file.
 */
export const famousGlazesUrl = (language: string): string => `/i18n/famous-glazes/${language}.json`;

/** The published glazes in the page's language, read once per app (and once per page the build renders). */
@Injectable({ providedIn: 'root' })
export class FamousGlazes {
  private readonly http = inject(HttpClient);
  private readonly language = inject(PAGE_LANGUAGE);
  private loaded?: Promise<FamousGlaze[]>;

  all(): Promise<FamousGlaze[]> {
    this.loaded ??= firstValueFrom(this.http.get<FamousGlaze[]>(famousGlazesUrl(this.language))).catch(() => {
      this.loaded = undefined;
      return [];
    });
    return this.loaded;
  }

  async bySlug(slug: string | null | undefined): Promise<FamousGlaze | undefined> {
    return slug ? (await this.all()).find((glaze) => glaze.slug === slug) : undefined;
  }
}

/** A glaze's text in a language: its own, or the English, marked as such. */
export function proseIn(text: Prose | undefined, language: string): { text: string; english: boolean } {
  if (!text) return { text: '', english: false };
  const own = text[language];
  return own ? { text: own, english: false } : { text: text.en, english: language !== 'en' };
}

/** The glaze's name in a language: the language's usual name, or the English. */
export const nameIn = (glaze: FamousGlaze, language: string): string => glaze.names[language] || glaze.names.en;

/** The firing's temperature as text: 950–1050 °C. */
export function celsiusText(celsius: number | [number, number] | undefined): string {
  if (celsius === undefined) return '';
  return (Array.isArray(celsius) ? celsius.join('–') : String(celsius)) + ' °C';
}
