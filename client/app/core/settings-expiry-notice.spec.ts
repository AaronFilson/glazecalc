import { TestBed } from '@angular/core/testing';
import { settle, testProviders, text } from '../testing/test-providers';
import { DATES_KEY, EXPIRE_AFTER_MS, NOTICE_VERSION } from './settings-expiry';
import { SettingsExpiryNotice } from './settings-expiry-notice';

describe('SettingsExpiryNotice', () => {
  /** This browser keeps a setting, last used `away` ms ago. */
  const create = async (away: number) => {
    localStorage.clear();
    localStorage.setItem('theme', 'dark');
    localStorage.setItem(DATES_KEY, JSON.stringify({ used: Date.now() - away, notice: NOTICE_VERSION }));
    TestBed.configureTestingModule({ providers: testProviders() });
    const fixture = TestBed.createComponent(SettingsExpiryNotice);
    await settle(fixture);
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('says nothing on a visit within the year', async () => {
    const { root } = await create(24 * 60 * 60 * 1000);
    expect(root.querySelector('.settings-expiry-notice')).toBeNull();
  });

  it('says on a return after nearly a year that the settings here are kept, and Close leaves them', async () => {
    const { fixture, root } = await create(EXPIRE_AFTER_MS);
    expect(text(fixture, '.settings-expiry-notice')).toContain(
      "You haven't used Glazecalc in this browser for nearly a year."
    );
    expect(root.querySelector('.settings-expiry-notice')!.getAttribute('role')).toBe('status');
    (root.querySelector('#settings-notice-close') as HTMLButtonElement).click();
    await settle(fixture);
    expect(root.querySelector('.settings-expiry-notice')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('clears the settings kept here when asked, and loads the page again with the defaults', async () => {
    const { fixture, root } = await create(EXPIRE_AFTER_MS);
    // jsdom cannot load a page again, and says so on the console.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (root.querySelector('#settings-clear') as HTMLButtonElement).click();
    await settle(fixture);
    expect(localStorage.getItem('theme')).toBeNull();
    expect(localStorage.getItem(DATES_KEY)).toBeNull();
    expect(root.querySelector('.settings-expiry-notice')).toBeNull();
  });
});
