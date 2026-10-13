import { HttpClient } from '@angular/common/http';
import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FORMAT_LOCALES, REGION_CODES } from '../../../lib/regions';
import { LIVE_LANGUAGES } from '../../../lib/regions/languages';
import { GramPrecision, WeightUnit } from '../shared/weights';
import type { Palette, ThemeMode } from './theme';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';

export interface Preferences {
  weightUnit: WeightUnit;
  gramPrecision: GramPrecision;
  theme: ThemeMode;
  palette: Palette;
  lead: LeadChoice;
  /** Where the potter works (lib/regions), or '' until chosen. */
  region: string;
  /** Numbers and dates as the language and region write them ('auto'), or a named locale. */
  format: string;
  decimalMark: DecimalMark;
  /** '' follows the region. */
  temperature: '' | TemperatureScale;
  /** '' follows the region. */
  cones: '' | ConeSystem;
  /** The language of the app and of emails: one of those offered (lib/regions/languages.js). */
  language: string;
  /** '' follows the region. */
  density: '' | Density;
  /** The English after key terms in a translated page. */
  englishTerms: 'off' | 'on';
  /** The translation notice, until it is closed. */
  notice: 'shown' | 'hidden';
}

/** Whether materials with lead may be added to recipes and suggested: off unless chosen. */
export type LeadChoice = 'off' | 'on';
/** Which decimal mark typed amounts may use. */
export type DecimalMark = 'either' | 'comma' | 'point';
export type TemperatureScale = 'C' | 'F';
/** Firing to Orton cones, or by temperature alone. */
export type ConeSystem = 'orton' | 'temperature';
/** Glaze density as specific gravity, degrees Baumé, or the ounces in an imperial pint. */
export type Density = 'sg' | 'baume' | 'pint';

/** The values each preference may take; the first is the default (as on the server, models/user.ts). */
const CHOICES: { [K in keyof Preferences]: ReadonlyArray<Preferences[K]> } = {
  weightUnit: ['g', 'lb'],
  gramPrecision: ['single', 'full'],
  theme: ['system', 'light', 'dark'],
  palette: ['tenmoku', 'celadon', 'cobalt', 'oxblood', 'shino', 'ash'],
  lead: ['off', 'on'],
  region: ['', ...REGION_CODES],
  format: ['auto', ...FORMAT_LOCALES],
  decimalMark: ['either', 'comma', 'point'],
  temperature: ['', 'C', 'F'],
  cones: ['', 'orton', 'temperature'],
  language: LIVE_LANGUAGES,
  density: ['', 'sg', 'baume', 'pint'],
  englishTerms: ['off', 'on'],
  notice: ['shown', 'hidden']
};
const NAMES = Object.keys(CHOICES) as Array<keyof Preferences>;

/** The value if the preference may take it, or its default. */
function asChoice<K extends keyof Preferences>(name: K, value: unknown): Preferences[K] {
  const choices = CHOICES[name];
  return choices.includes(value as Preferences[K]) ? (value as Preferences[K]) : choices[0];
}

// A choice is kept on this browser only when it is made here: under the preference's name
// (the region as preferredRegion, since the library's own region filter came first), which the
// next page load reads before the server answers. A choice made with no one signed in is kept
// as well under "visitor." and its name, to come back when the session ends. The account's
// choices fetched at sign-in are held in memory and write nothing.
const copyKey = (name: keyof Preferences): string => (name === 'region' ? 'preferredRegion' : name);
const visitorKey = (name: keyof Preferences): string => 'visitor.' + name;

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Without storage, the account's choices are fetched again on each visit.
  }
}

function readCopy<K extends keyof Preferences>(name: K, key = copyKey(name)): Preferences[K] {
  try {
    return asChoice(name, localStorage.getItem(key));
  } catch {
    return CHOICES[name][0];
  }
}

/**
 * The account's choices about how the app shows things, such as weights in
 * grams or in pounds and ounces. They are kept with the account, so they follow
 * it to every device. They are held in memory; a choice made on this browser is
 * also kept in it, so the next page shows it at once, before the server answers.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);
  private readonly auth = inject(AuthService);
  /** The sign-in the choices were fetched for, and the request. */
  private fetched: { session: number; request: Promise<void> } | null = null;
  /** Counts saves of each, so only the latest one's failure puts the old choice back. */
  private readonly saves: Record<keyof Preferences, number> = {
    weightUnit: 0,
    gramPrecision: 0,
    theme: 0,
    palette: 0,
    lead: 0,
    region: 0,
    format: 0,
    decimalMark: 0,
    temperature: 0,
    cones: 0,
    language: 0,
    density: 0,
    englishTerms: 0,
    notice: 0
  };

  /** Batch weights in grams, or in pounds and ounces. */
  readonly weightUnit = signal<WeightUnit>(readCopy('weightUnit'));
  /** Grams to a tenth, or in full. */
  readonly gramPrecision = signal<GramPrecision>(readCopy('gramPrecision'));
  /** Light or dark, or as the device is set (core/theme.ts applies it). */
  readonly theme = signal<ThemeMode>(readCopy('theme'));
  /** The colors of buttons, links and tabs. */
  readonly palette = signal<Palette>(readCopy('palette'));
  /** Whether materials with lead may be added to recipes and suggested. */
  readonly lead = signal<LeadChoice>(readCopy('lead'));
  /** Where the potter works, or '' until chosen (core/locale.ts turns these into formats). */
  readonly region = signal<string>(readCopy('region'));
  readonly format = signal<string>(readCopy('format'));
  readonly decimalMark = signal<DecimalMark>(readCopy('decimalMark'));
  readonly temperature = signal<'' | TemperatureScale>(readCopy('temperature'));
  readonly cones = signal<'' | ConeSystem>(readCopy('cones'));
  readonly language = signal<string>(readCopy('language'));
  readonly density = signal<'' | Density>(readCopy('density'));
  readonly englishTerms = signal<'off' | 'on'>(readCopy('englishTerms'));
  readonly notice = signal<'shown' | 'hidden'>(readCopy('notice'));

  private readonly values: { [K in keyof Preferences]: WritableSignal<Preferences[K]> } = {
    weightUnit: this.weightUnit,
    gramPrecision: this.gramPrecision,
    theme: this.theme,
    palette: this.palette,
    lead: this.lead,
    region: this.region,
    format: this.format,
    decimalMark: this.decimalMark,
    temperature: this.temperature,
    cones: this.cones,
    language: this.language,
    density: this.density,
    englishTerms: this.englishTerms,
    notice: this.notice
  };

  constructor() {
    // Signed out, or the session ended: the account's choices leave this browser, and the visitor's own come back.
    const forget = () => {
      this.fetched = null;
      for (const name of NAMES) {
        const own = readRaw(visitorKey(name));
        this.apply(name, asChoice(name, own));
        writeRaw(copyKey(name), own);
      }
    };
    this.auth.onSessionEnd(forget);
    // A trial that ran out while the site was closed ended before this could hear of it.
    if (this.auth.trialEnded()) forget();
  }

  /** Fetches the account's choices, once per sign-in. If that fails, the copy on this browser stays. */
  load(): Promise<void> {
    const session = this.auth.sessionVersion();
    if (this.fetched?.session === session) return this.fetched.request;
    // A choice made while this is on its way is newer than the answer.
    const savesBefore = { ...this.saves };
    const request: Promise<void> = firstValueFrom(
      this.http.get<Partial<Record<keyof Preferences, unknown>>>(this.apiBase + '/preferences')
    ).then(
      (res) => {
        if (this.auth.sessionVersion() !== session) return;
        for (const name of NAMES) {
          if (this.saves[name] !== savesBefore[name]) continue;
          const value = asChoice(name, res[name]);
          this.apply(name, value);
          // A copy this browser already holds follows the account, so the next first paint matches.
          const key = copyKey(name);
          if (readRaw(key) !== null && readRaw(key) !== value) writeRaw(key, value);
        }
      },
      () => {
        // Asked again the next time a page needs it.
        if (this.fetched?.request === request) this.fetched = null;
      }
    );
    this.fetched = { session, request };
    return request;
  }

  /** Saves a choice to the account. If that fails, the choice before comes back and the error is thrown. */
  async set<K extends keyof Preferences>(name: K, value: Preferences[K]): Promise<void> {
    const before = this.values[name]();
    const copyBefore = readRaw(copyKey(name));
    const save = ++this.saves[name];
    this.apply(name, value);
    writeRaw(copyKey(name), value);
    try {
      await firstValueFrom(this.http.put(this.apiBase + '/preferences', { [name]: value }));
    } catch (err) {
      if (save === this.saves[name]) {
        this.apply(name, before);
        writeRaw(copyKey(name), copyBefore);
      }
      throw err;
    }
  }

  /** Keeps a choice on this browser only, for a visitor with no account to save it to. */
  remember<K extends keyof Preferences>(name: K, value: Preferences[K]): void {
    this.apply(name, value);
    writeRaw(copyKey(name), value);
    writeRaw(visitorKey(name), value);
  }

  private apply<K extends keyof Preferences>(name: K, value: Preferences[K]): void {
    this.values[name].set(value);
  }
}
