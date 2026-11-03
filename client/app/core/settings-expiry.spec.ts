import {
  DATES_KEY,
  EXPIRE_AFTER_MS,
  EXPIRING_KEYS,
  NOTICE_VERSION,
  WARN_BEFORE_MS,
  checkSettingsExpiry,
  keepSettings,
  noteNoticeClosed
} from './settings-expiry';

/** A Storage in memory. */
function memory(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key)
  };
}

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 0, 1);
const dates = (storage: Storage) => JSON.parse(storage.getItem(DATES_KEY) ?? 'null');

describe('settings expiry', () => {
  it('writes nothing for a browser with no settings, and removes a stray record', () => {
    const empty = memory();
    expect(checkSettingsExpiry(empty, START)).toBe('none');
    expect(empty.getItem(DATES_KEY)).toBeNull();
    const stray = memory({ [DATES_KEY]: JSON.stringify({ used: START }) });
    checkSettingsExpiry(stray, START);
    expect(stray.getItem(DATES_KEY)).toBeNull();
  });

  it('starts the year now for settings kept before the dates were', () => {
    const storage = memory({ theme: 'dark' });
    expect(checkSettingsExpiry(storage, START)).toBe('none');
    expect(dates(storage)).toEqual({ used: START, notice: NOTICE_VERSION });
  });

  it('moves the date on each visit within 11 months, silently', () => {
    const storage = memory({ theme: 'dark', [DATES_KEY]: JSON.stringify({ used: START, notice: 1 }) });
    const later = START + 300 * DAY;
    expect(checkSettingsExpiry(storage, later)).toBe('none');
    expect(dates(storage).used).toBe(later);
    expect(storage.getItem('theme')).toBe('dark');
  });

  it('warns once within 30 days of a year, then removes at the first load after the year', () => {
    const storage = memory({
      theme: 'dark',
      'visitor.language': 'de',
      printMode: 'batch',
      session: 'account',
      offlineRecords: '1',
      [DATES_KEY]: JSON.stringify({ used: START, notice: 1 })
    });
    const warnAt = START + EXPIRE_AFTER_MS - WARN_BEFORE_MS + DAY;
    expect(checkSettingsExpiry(storage, warnAt)).toBe('warn');
    expect(checkSettingsExpiry(storage, warnAt + DAY)).toBe('none');
    expect(storage.getItem('theme')).toBe('dark');
    expect(checkSettingsExpiry(storage, START + EXPIRE_AFTER_MS)).toBe('none');
    for (const key of EXPIRING_KEYS) expect(storage.getItem(key)).toBeNull();
    expect(storage.getItem(DATES_KEY)).toBeNull();
    // The session note and the offline-records switch are never expired.
    expect(storage.getItem('session')).toBe('account');
    expect(storage.getItem('offlineRecords')).toBe('1');
  });

  it('warns first, never removes, on a first visit already past the year', () => {
    const storage = memory({ language: 'fr', [DATES_KEY]: JSON.stringify({ used: START, notice: 1 }) });
    const late = START + 2 * EXPIRE_AFTER_MS;
    expect(checkSettingsExpiry(storage, late)).toBe('warn');
    expect(storage.getItem('language')).toBe('fr');
    expect(checkSettingsExpiry(storage, late + 1000)).toBe('none');
    expect(storage.getItem('language')).toBeNull();
  });

  it('"Keep my settings" starts the year again', () => {
    const storage = memory({ region: 'EU', [DATES_KEY]: JSON.stringify({ used: START, notice: 1 }) });
    const warnAt = START + EXPIRE_AFTER_MS - DAY;
    expect(checkSettingsExpiry(storage, warnAt)).toBe('warn');
    keepSettings(storage, warnAt);
    expect(dates(storage)).toEqual({ used: warnAt, notice: 1 });
    expect(checkSettingsExpiry(storage, START + EXPIRE_AFTER_MS + DAY)).toBe('none');
    expect(storage.getItem('region')).toBe('EU');
  });

  it('notes the translation notice version when it is closed', () => {
    const storage = memory({ notice: 'hidden', [DATES_KEY]: JSON.stringify({ used: START }) });
    noteNoticeClosed(storage, START + DAY);
    expect(dates(storage)).toEqual({ used: START, notice: NOTICE_VERSION });
    // A closed notice of an older version shows again.
    const old = memory({
      notice: 'hidden',
      'visitor.notice': 'hidden',
      theme: 'dark',
      [DATES_KEY]: JSON.stringify({ used: START, notice: NOTICE_VERSION - 1 })
    });
    checkSettingsExpiry(old, START + DAY);
    expect(old.getItem('notice')).toBeNull();
    expect(old.getItem('visitor.notice')).toBeNull();
    expect(old.getItem('theme')).toBe('dark');
    expect(dates(old).notice).toBe(NOTICE_VERSION);
  });

  it('copes with no storage, or a broken record', () => {
    expect(checkSettingsExpiry(undefined, START)).toBe('none');
    const broken = memory({ theme: 'dark', [DATES_KEY]: '{oops' });
    expect(checkSettingsExpiry(broken, START)).toBe('none');
    expect(dates(broken).used).toBe(START);
  });
});
