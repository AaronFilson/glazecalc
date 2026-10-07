import { HttpClient } from '@angular/common/http';
import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GramPrecision, WeightUnit } from '../shared/weights';
import type { Palette, ThemeMode } from './theme';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';

export interface Preferences {
  weightUnit: WeightUnit;
  gramPrecision: GramPrecision;
  theme: ThemeMode;
  palette: Palette;
}

/** The values each preference may take; the first is the default (as on the server, models/user.ts). */
const CHOICES: { [K in keyof Preferences]: ReadonlyArray<Preferences[K]> } = {
  weightUnit: ['g', 'lb'],
  gramPrecision: ['single', 'full'],
  theme: ['system', 'light', 'dark'],
  palette: ['tenmoku', 'celadon', 'cobalt', 'oxblood', 'shino', 'ash']
};
const NAMES = Object.keys(CHOICES) as Array<keyof Preferences>;

/** The value if the preference may take it, or its default. */
function asChoice<K extends keyof Preferences>(name: K, value: unknown): Preferences[K] {
  const choices = CHOICES[name];
  return choices.includes(value as Preferences[K]) ? (value as Preferences[K]) : choices[0];
}

// This browser's copy is kept under each preference's name.
function readCopy<K extends keyof Preferences>(name: K): Preferences[K] {
  try {
    return asChoice(name, localStorage.getItem(name));
  } catch {
    return CHOICES[name][0];
  }
}

/**
 * The account's choices about how the app shows things, such as weights in
 * grams or in pounds and ounces. They are kept with the account, so they follow
 * it to every device; this browser keeps a copy so a page shows the choice at
 * once, before the server answers.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);
  private readonly auth = inject(AuthService);
  /** The sign-in the choices were fetched for, and the request. */
  private fetched: { session: number; request: Promise<void> } | null = null;
  /** Counts saves of each, so only the latest one's failure puts the old choice back. */
  private readonly saves: Record<keyof Preferences, number> = { weightUnit: 0, gramPrecision: 0, theme: 0, palette: 0 };

  /** Batch weights in grams, or in pounds and ounces. */
  readonly weightUnit = signal<WeightUnit>(readCopy('weightUnit'));
  /** Grams to a tenth, or in full. */
  readonly gramPrecision = signal<GramPrecision>(readCopy('gramPrecision'));
  /** Light or dark, or as the device is set (core/theme.ts applies it). */
  readonly theme = signal<ThemeMode>(readCopy('theme'));
  /** The colors of buttons, links and tabs. */
  readonly palette = signal<Palette>(readCopy('palette'));

  private readonly values: { [K in keyof Preferences]: WritableSignal<Preferences[K]> } = {
    weightUnit: this.weightUnit,
    gramPrecision: this.gramPrecision,
    theme: this.theme,
    palette: this.palette
  };

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
          if (this.saves[name] === savesBefore[name]) this.keep(name, asChoice(name, res[name]));
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
    const save = ++this.saves[name];
    this.keep(name, value);
    try {
      await firstValueFrom(this.http.put(this.apiBase + '/preferences', { [name]: value }));
    } catch (err) {
      if (save === this.saves[name]) this.keep(name, before);
      throw err;
    }
  }

  private keep<K extends keyof Preferences>(name: K, value: Preferences[K]): void {
    this.values[name].set(value);
    try {
      localStorage.setItem(name, value);
    } catch {
      // Without storage, the account's choices are fetched again on each visit.
    }
  }
}
