// Types for lib/famous-glazes.js (docs/famous-glazes.md).

/** Text in each language it is written in; English always. */
export type Prose = { en: string } & Record<string, string>;

export interface GlazeSource {
  id: string;
  citation: string;
  url?: string;
  isbn?: string;
  /** YYYY-MM-DD: the day it was actually opened and read. */
  opened?: string;
}

export interface GlazeFiring {
  cone?: string;
  /** A temperature, or a range [from, to], in °C. */
  celsius?: number | [number, number];
  atmosphere?: string;
  note?: Prose;
  sources?: string[];
}

/** A glaze's file, data/famous-glazes/<slug>.json. */
export interface FamousGlaze {
  slug: string;
  published: boolean;
  fixture?: boolean;
  history?: boolean;
  names: Prose;
  native: { name: string; lang: string };
  origin?: Prose;
  period?: Prose;
  summary?: Prose;
  safety?: Prose;
  firing?: GlazeFiring;
  recipe?: {
    lines: Array<{ material: string; amount: number }>;
    additives?: Array<{ material: string; amount: number }>;
    note?: Prose;
    sources?: string[];
  };
  analysis?: { oxides: Record<string, number>; note?: Prose; sources?: string[] };
  leadFree?: {
    tested: boolean;
    note: Prose;
    celsius: number;
    additives?: Array<{ material: string; amount: number }>;
    prefer?: string[];
  };
  sources: GlazeSource[];
  gaps?: string[];
  openQuestions?: string[];
  guides?: string[];
  file?: string;
}

export const ATMOSPHERES: readonly string[];
export const GLAZE_DIR: string;
export const FIXTURE_DIR: string;
export const INDEX_PAGE: string;
export const MIN_SOURCES: number;
export function loadGlazes(dir?: string): FamousGlaze[];
export function glazeProblems(glaze: FamousGlaze): string[];
export function publishProblems(glaze: FamousGlaze): string[];
export function publishedGlazes(glazes?: FamousGlaze[]): FamousGlaze[];
export function famousGlazePages(glazes: ReadonlyArray<{ slug: string }>): string[];
export function glazePath(slug: string): string;
export function glazeTranslatedIn(glaze: FamousGlaze, code: string): boolean;
export function hasLead(glaze: FamousGlaze): boolean;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveGlaze(glaze: FamousGlaze): any;
