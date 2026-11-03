/**
 * Settings kept in this browser's localStorage expire after 12 months unused, but only after a notice
 * (docs/eu-data-plan.md item 23). One record, under DATES_KEY, holds when this browser last opened
 * Glazecalc with them, and whether the notice has been shown:
 *
 * - opened within 11 months of that date: the date moves to now, and nothing shows;
 * - opened later, and not yet warned: the notice shows once ("Keep my settings" moves the date to now);
 * - opened again after a notice, and 12 months have passed: the settings are removed.
 *
 * The sign-in note, the trial, the old token, the offline-records switch and the offline-language note are
 * not listed: they end with the session or with their cache (core/auth.service.ts, core/offline-records.ts,
 * core/offline-languages.ts), and must never vanish while in use.
 */

/** The record of dates. */
export const DATES_KEY = 'settingsDates';
/** Raised when the translation notice changes enough that a reader who closed it should see it again. */
export const NOTICE_VERSION = 1;

const DAY = 24 * 60 * 60 * 1000;
/** Twelve months. */
export const EXPIRE_AFTER_MS = 365 * DAY;
/** The notice shows once this close to expiry. */
export const WARN_BEFORE_MS = 30 * DAY;

/** The preferences (core/preferences.service.ts, the region as preferredRegion) and their signed-out copies. */
const PREFERENCE_NAMES = [
  'weightUnit',
  'gramPrecision',
  'theme',
  'palette',
  'lead',
  'region',
  'format',
  'decimalMark',
  'temperature',
  'cones',
  'language',
  'density',
  'englishTerms',
  'notice',
  'recipeHelp',
  'limitSet',
  'currency',
  'calendar',
  'digits'
];

/** Every localStorage name that expires. */
export const EXPIRING_KEYS: readonly string[] = [
  ...PREFERENCE_NAMES.map((name) => (name === 'region' ? 'preferredRegion' : name)),
  ...PREFERENCE_NAMES.map((name) => 'visitor.' + name),
  'region', // shared/library-info.ts
  'includeAdditives', // pages/recipe/recipe-page.ts
  'printMode', // pages/recipe/recipe-print.ts
  'printBatch'
];

interface Dates {
  /** When this browser last opened Glazecalc with these settings, or kept them. */
  used: number;
  /** When the notice was shown, if it has been since. */
  warned?: number;
  /** The translation notice's version when it was closed. */
  notice?: number;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** This browser's localStorage, or undefined on the server or where reading it throws. */
function localStore(): Store | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function read(storage: Store): Dates | null {
  try {
    const value = JSON.parse(storage.getItem(DATES_KEY) ?? 'null') as Partial<Dates> | null;
    return value && typeof value.used === 'number' ? (value as Dates) : null;
  } catch {
    return null;
  }
}

function write(storage: Store, dates: Dates): void {
  try {
    storage.setItem(DATES_KEY, JSON.stringify(dates));
  } catch {
    // Without storage there is nothing kept to expire.
  }
}

function hasSettings(storage: Store): boolean {
  try {
    return EXPIRING_KEYS.some((key) => storage.getItem(key) !== null);
  } catch {
    return false;
  }
}

function remove(storage: Store, keys: readonly string[]): void {
  try {
    for (const key of keys) storage.removeItem(key);
  } catch {
    // Storage unavailable.
  }
}

/** What check() found: whether to show the notice. */
export type ExpiryState = 'none' | 'warn';

/**
 * Run once per page load, before the settings are read. Removes expired settings, or a closed translation
 * notice of an older version, and says whether to show the notice.
 */
export function checkSettingsExpiry(storage: Store | undefined = localStore(), now: number = Date.now()): ExpiryState {
  if (!storage) return 'none';
  const dates = read(storage);
  if (!hasSettings(storage)) {
    remove(storage, [DATES_KEY]);
    return 'none';
  }
  if (!dates) {
    // Kept before the dates were: they count from now.
    write(storage, { used: now, notice: NOTICE_VERSION });
    return 'none';
  }
  if ((dates.notice ?? 1) < NOTICE_VERSION) {
    remove(storage, ['notice', 'visitor.notice']);
    dates.notice = NOTICE_VERSION;
  }
  const age = now - dates.used;
  if (dates.warned !== undefined && age >= EXPIRE_AFTER_MS) {
    remove(storage, [...EXPIRING_KEYS, DATES_KEY]);
    return 'none';
  }
  if (age < EXPIRE_AFTER_MS - WARN_BEFORE_MS) {
    write(storage, { used: now, notice: dates.notice });
    return 'none';
  }
  if (dates.warned === undefined) {
    write(storage, { ...dates, warned: now });
    return 'warn';
  }
  write(storage, dates);
  return 'none';
}

/** "Keep my settings": they count from now again. */
export function keepSettings(storage: Store | undefined = localStore(), now: number = Date.now()): void {
  if (!storage) return;
  write(storage, { used: now, notice: read(storage)?.notice ?? NOTICE_VERSION });
}

/** Notes the translation notice's version when it is closed. */
export function noteNoticeClosed(storage: Store | undefined = localStore(), now: number = Date.now()): void {
  if (!storage) return;
  write(storage, { ...(read(storage) ?? { used: now }), notice: NOTICE_VERSION });
}
