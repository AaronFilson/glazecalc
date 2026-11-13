import {
  DATES_KEY,
  EXPIRE_AFTER_MS,
  EXPIRING_KEYS,
  NOTICE_VERSION,
  WARN_BEFORE_MS,
  checkSettingsExpiry,
  clearSettings,
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

  it('shows the notice once for a return after nearly a year away; the visit itself keeps the settings', () => {
    const storage = memory({ theme: 'dark', [DATES_KEY]: JSON.stringify({ used: START, notice: 1, warned: START }) });
    const back = START + EXPIRE_AFTER_MS - WARN_BEFORE_MS;
    expect(checkSettingsExpiry(storage, back)).toBe('warn');
    // The return counted as use: the next load is a short gap, with no notice, and the old "warned" is gone.
    expect(dates(storage)).toEqual({ used: back, notice: 1 });
    expect(checkSettingsExpiry(storage, back + DAY)).toBe('none');
    expect(storage.getItem('theme')).toBe('dark');
  });

  it('never removes settings on its own, however long the browser was away', () => {
    const storage = memory({
      language: 'fr',
      printMode: 'batch',
      [DATES_KEY]: JSON.stringify({ used: START, notice: 1 })
    });
    const late = START + 5 * EXPIRE_AFTER_MS;
    expect(checkSettingsExpiry(storage, late)).toBe('warn');
    expect(checkSettingsExpiry(storage, late + 2 * EXPIRE_AFTER_MS)).toBe('warn');
    expect(storage.getItem('language')).toBe('fr');
    expect(storage.getItem('printMode')).toBe('batch');
  });

  it('"Clear my settings" removes every expiring setting and the dates, and nothing else', () => {
    const storage = memory({
      theme: 'dark',
      'visitor.language': 'de',
      recipeLayout: 'guided',
      session: 'account',
      offlineRecords: '1',
      [DATES_KEY]: JSON.stringify({ used: START, notice: 1 })
    });
    clearSettings(storage);
    for (const key of EXPIRING_KEYS) expect(storage.getItem(key)).toBeNull();
    expect(storage.getItem(DATES_KEY)).toBeNull();
    // The session note and the offline-records switch are not settings to clear.
    expect(storage.getItem('session')).toBe('account');
    expect(storage.getItem('offlineRecords')).toBe('1');
    expect(() => clearSettings(undefined)).not.toThrow();
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

  it("writes and removes nothing where reading this browser's storage is refused", () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    try {
      expect(checkSettingsExpiry()).toBe('none');
      expect(() => clearSettings()).not.toThrow();
      expect(() => noteNoticeClosed()).not.toThrow();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('treats storage it cannot read as holding no settings', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    expect(checkSettingsExpiry(blocked, START)).toBe('none');
    expect(blocked.setItem).not.toHaveBeenCalled();
  });
});
