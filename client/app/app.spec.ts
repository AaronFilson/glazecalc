import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { OfflineLanguages } from './core/offline-languages';
import { OfflineRecords } from './core/offline-records';
import { Outbox } from './core/outbox';
import { PreferencesService } from './core/preferences.service';
import { UpdateService } from './core/update.service';
import { OFFERED_LANGUAGES, OPEN_PAGE } from './i18n/language';
import { API, httpMock, settle, testProviders, text } from './testing/test-providers';

// The app's frame around every page: its banners (a new version, the copy kept for offline use, changes
// waiting to be sent), the phone menu, the footer's languages and signing out. The menu's links and the
// trial bar are in pages/simple-pages.spec.ts and trial.spec.ts.

@Component({ selector: 'gc-test-page', template: '<h1>A page</h1>' })
class Page {}

describe('App', () => {
  let versions: Subject<VersionEvent>;
  let opened: string[];

  beforeEach(() => {
    localStorage.clear();
    versions = new Subject();
    opened = [];
  });
  afterEach(() => {
    httpMock().verify();
    vi.restoreAllMocks();
    history.replaceState(null, '', '/');
  });

  const create = async (providers: unknown[] = []) => {
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        provideRouter([{ path: '**', component: Page }]),
        // A service worker with a new version to offer (core/update.service.ts).
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versions,
            unrecoverable: new Subject(),
            activateUpdate: () => Promise.resolve(true),
            checkForUpdate: () => Promise.resolve(false)
          }
        },
        { provide: OPEN_PAGE, useValue: (address: string) => opened.push(address) },
        ...(providers as never[])
      ]
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture;
  };

  /** Signed in as an account the server confirms. */
  const signedIn = async (providers: unknown[] = []) => {
    localStorage.setItem('session', 'account');
    const fixture = await create(providers);
    httpMock()
      .expectOne(API + '/verify')
      .flush({ msg: 'User verified', id: 'u1', email: 'a@b.com' });
    await settle(fixture);
    return fixture;
  };

  const bars = (fixture: ComponentFixture<App>) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.update-bar p')].map((p) =>
      (p.textContent ?? '').replace(/\s+/g, ' ').trim()
    );
  const button = (fixture: ComponentFixture<App>, label: string, within = '') =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll(`${within} button`)].find(
      (b) => b.textContent?.trim() === label
    ) as HTMLButtonElement | undefined;
  const click = async (fixture: ComponentFixture<App>, label: string, within = '') => {
    button(fixture, label, within)!.click();
    await settle(fixture);
  };

  describe('a new version', () => {
    const ready = () =>
      versions.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } });

    it('is offered once it is ready: Reload runs it', async () => {
      const fixture = await create();
      expect(bars(fixture)).toEqual([]);
      ready();
      await fixture.whenStable();
      expect(bars(fixture)).toEqual(['A new version of Glazecalc is ready.']);
      const reload = vi.spyOn(TestBed.inject(UpdateService), 'reload').mockResolvedValue();
      await click(fixture, 'Reload', '.update-bar');
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('is put away with Not now, and not offered again in the tab', async () => {
      const fixture = await create();
      ready();
      await fixture.whenStable();
      await click(fixture, 'Not now', '.update-bar');
      expect(bars(fixture)).toEqual([]);
      ready();
      await fixture.whenStable();
      expect(bars(fixture)).toEqual([]);
    });
  });

  describe('the copy kept on this device', () => {
    const SAVED = new Date(2026, 9, 12, 14, 30);

    it('says when the records shown are the copy, from when, and that changes wait to be sent', async () => {
      const fixture = await signedIn();
      const records = TestBed.inject(OfflineRecords);
      records.showingCopy.set(SAVED);
      TestBed.inject(Outbox).sendable.set(2);
      await fixture.whenStable();
      expect(bars(fixture)).toEqual([
        "Glazecalc can't be reached. Showing the copy saved on this device on Oct 12, 2026, 2:30 PM. " +
          'You can keep working: your changes wait on this device and are sent when Glazecalc can be reached.',
        '2 changes waiting to save'
      ]);

      // A new page's own requests say again whether it shows the copy.
      await TestBed.inject(Router).navigateByUrl('/notes');
      await fixture.whenStable();
      TestBed.inject(Outbox).sendable.set(1);
      await fixture.whenStable();
      expect(bars(fixture)).toEqual(['1 change waiting to save']);
    });

    it('says when the records are not kept here and cannot be fetched', async () => {
      const fixture = await signedIn();
      TestBed.inject(OfflineRecords).notSaved.set(true);
      await fixture.whenStable();
      expect(bars(fixture)).toEqual([
        'Your records are not saved on this device. Connect to the internet to see them. You can turn this on in your account.'
      ]);
    });

    it('offers to reload the page once back online, through the router so a page can keep its changes', async () => {
      const fixture = await signedIn();
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/recipe?id=r1');
      const records = TestBed.inject(OfflineRecords);
      records.showingCopy.set(SAVED);
      records.backOnline.set(true);
      await fixture.whenStable();
      expect(bars(fixture)).toEqual(['You are back online. Reload to see your latest records and save again.']);

      const navigate = vi.spyOn(router, 'navigateByUrl');
      // The page asks about changes not saved, and the person stays: nothing more.
      navigate.mockResolvedValueOnce(false);
      await click(fixture, 'Reload', '.offline-records-back');
      expect(navigate.mock.calls).toEqual([['/about', { skipLocationChange: true }]]);

      navigate.mockClear();
      navigate.mockResolvedValue(true);
      await click(fixture, 'Reload', '.offline-records-back');
      expect(navigate.mock.calls).toEqual([
        ['/about', { skipLocationChange: true }],
        ['/recipe?id=r1', { replaceUrl: true }]
      ]);
    });

    it('shows none of this to a visitor', async () => {
      const fixture = await create();
      const records = TestBed.inject(OfflineRecords);
      records.showingCopy.set(SAVED);
      records.notSaved.set(true);
      TestBed.inject(Outbox).sendable.set(3);
      await fixture.whenStable();
      expect(bars(fixture)).toEqual([]);
    });

    it('says when the copy was removed for not being opened, until dismissed', async () => {
      const fixture = await create();
      TestBed.inject(OfflineRecords).keepRemoved.set(true);
      await fixture.whenStable();
      expect(bars(fixture)).toEqual([
        'Your offline data on this device was removed because Glazecalc was not opened here for the time you chose.'
      ]);
      await click(fixture, 'Dismiss', '.offline-keep-removed');
      expect(bars(fixture)).toEqual([]);
    });

    it('shows what happened to changes sent later, each dismissed on its own', async () => {
      const fixture = await signedIn();
      TestBed.inject(Outbox).notices.set([
        { id: 1, text: 'Your change to Celadon was saved.' },
        { id: 2, text: 'Your note Kiln could not be saved.' }
      ]);
      await fixture.whenStable();
      expect(bars(fixture)).toEqual(['Your change to Celadon was saved.', 'Your note Kiln could not be saved.']);
      button(fixture, 'Dismiss', '.outbox-notice')!.click();
      await fixture.whenStable();
      expect(bars(fixture)).toEqual(['Your note Kiln could not be saved.']);
    });
  });

  it('offers to install the app when the browser does, and asks the browser once', async () => {
    const fixture = await create();
    expect(button(fixture, 'Install app')).toBeUndefined();
    const prompt = vi.fn().mockResolvedValue(undefined);
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt }));
    await fixture.whenStable();
    await click(fixture, 'Install app', '.nav-menu');
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(button(fixture, 'Install app')).toBeUndefined();
  });

  describe('the phone menu', () => {
    const escape = (from: Element) =>
      from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    it('closes on Escape, and the focus goes back to its button from inside it', async () => {
      const fixture = await create();
      const root = fixture.nativeElement as HTMLElement;
      const toggle = root.querySelector('.nav-toggle') as HTMLButtonElement;
      toggle.click();
      await fixture.whenStable();
      const link = root.querySelector('#main-menu a') as HTMLAnchorElement;
      link.focus();
      escape(link);
      await fixture.whenStable();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(toggle);
    });

    it('leaves the focus where it is when it was not in the menu, and Escape does nothing once it is closed', async () => {
      const fixture = await create();
      const root = fixture.nativeElement as HTMLElement;
      const toggle = root.querySelector('.nav-toggle') as HTMLButtonElement;
      const skip = root.querySelector('.skip-link') as HTMLAnchorElement;
      toggle.click();
      await fixture.whenStable();
      skip.focus();
      escape(skip);
      await fixture.whenStable();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(skip);
      escape(skip);
      await fixture.whenStable();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('signing out', () => {
    const signOut = async (fixture: ComponentFixture<App>) => click(fixture, 'Sign out', '.nav-account');

    it('stays signed in when the person cancels the question about the copy on this device', async () => {
      const fixture = await signedIn();
      vi.spyOn(TestBed.inject(OfflineRecords), 'askSignOut').mockResolvedValue('cancel');
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
      await signOut(fixture);
      expect(navigate).not.toHaveBeenCalled();
      httpMock().expectNone(API + '/signout');
      expect(TestBed.inject(AuthService).hasSession()).toBe(true);
    });

    it('deletes the copy and the waiting changes from this device first, when asked to', async () => {
      const fixture = await signedIn();
      const records = TestBed.inject(OfflineRecords);
      vi.spyOn(records, 'askSignOut').mockResolvedValue('delete');
      const clear = vi.spyOn(records, 'clear').mockResolvedValue();
      await signOut(fixture);
      expect(clear).toHaveBeenCalledTimes(1);
      httpMock()
        .expectOne({ method: 'POST', url: API + '/signout' })
        .flush({ msg: 'Signed out' });
      await settle(fixture);
      expect(TestBed.inject(AuthService).hasSession()).toBe(false);
      expect(TestBed.inject(Router).url).toBe('/signin');
    });
  });

  describe('the footer’s languages', () => {
    const footer = async (signIn = false) => {
      // The address the browser shows, which the links in other languages follow.
      history.replaceState(null, '', '/guides');
      const providers = [{ provide: OFFERED_LANGUAGES, useValue: ['en', 'de'] }];
      const fixture = signIn ? await signedIn(providers) : await create(providers);
      await TestBed.inject(Router).navigateByUrl('/guides');
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      const choose = async (code: string) => {
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        root.querySelector(`.footer-languages a[lang="${code}"]`)!.dispatchEvent(click);
        await settle(fixture);
        return click;
      };
      const offline = () => vi.spyOn(TestBed.inject(OfflineLanguages), 'isOffline').mockReturnValue(true);
      return { fixture, choose, offline };
    };

    it('say so offline when a language’s files are not on this device, and open nothing', async () => {
      const { fixture, choose, offline } = await footer();
      offline();
      const click = await choose('de');
      expect(click.defaultPrevented).toBe(true);
      expect(text(fixture, '.footer-language-note')).toBe(
        'This language is not saved on this device. Connect to the internet to use it.'
      );
      expect(opened).toEqual([]);
      expect(localStorage.getItem('language')).toBeNull();
    });

    it('open a language that is on this device offline, and remember it for a visitor', async () => {
      const { fixture, choose, offline } = await footer();
      offline();
      await choose('de');
      opened.length = 0;
      // English is always on the device.
      const click = await choose('en');
      expect(click.defaultPrevented).toBe(true);
      expect(opened).toEqual(['/guides']);
      expect(localStorage.getItem('language')).toBe('en');
      expect(fixture.nativeElement.querySelector('.footer-language-note')).toBeNull();
    });

    it('open the page in the language for an account even when the account could not save it', async () => {
      const { choose } = await footer(true);
      const choosing = choose('de');
      httpMock()
        .expectOne({ method: 'PUT', url: API + '/preferences' })
        .flush({ msg: 'Server error' }, { status: 500, statusText: 'Server Error' });
      await choosing;
      expect(opened).toEqual(['/de/guides']);
    });
  });

  it("opens an English page in the account's language once the account's settings say it", async () => {
    history.replaceState(null, '', '/notes?tag=kiln');
    const fixture = await signedIn();
    expect(opened).toEqual([]);
    // Chosen on another device: the settings arrive from the server once the session is confirmed
    // (core/theme.ts asks for them).
    void TestBed.inject(PreferencesService).load();
    httpMock()
      .expectOne(API + '/preferences')
      .flush({ language: 'de' });
    await settle(fixture);
    expect(opened).toEqual(['/de/notes?tag=kiln']);
  });

  it('discards a trial once, however quickly its button is pressed twice', async () => {
    localStorage.setItem('session', 'trial');
    localStorage.setItem('trial', JSON.stringify({ name: 'quiet kilns', expiresAt: new Date(2099, 0, 1) }));
    const fixture = await create();
    httpMock().expectOne(API + '/verify');
    const discard = vi.spyOn(TestBed.inject(AuthService), 'discardTrial').mockReturnValue(new Promise(() => {}));
    await click(fixture, 'Discard trial', '.trial-bar');
    const discardIt = button(fixture, 'Discard it', '.trial-bar')!;
    discardIt.click();
    discardIt.click();
    await fixture.whenStable();
    expect(discard).toHaveBeenCalledTimes(1);
    expect(discardIt.disabled).toBe(true);
  });
});
