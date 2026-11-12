import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IDBFactory } from 'fake-indexeddb';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base';
import { SIGN_IN_PROVIDERS } from '../../core/auth.service';
import { FIRST_RENDER } from '../../core/first-render';
import { OfflineAskDialog } from '../../core/offline-ask';
import { OfflineRecords, RECORDS_FLAG, RECORD_KEYS } from '../../core/offline-records';
import { offlineRecordsInterceptor } from '../../core/offline-records.interceptor';
import { Outbox } from '../../core/outbox';
import { sessionExpiredInterceptor } from '../../core/session-expired.interceptor';
import { provideEnglish } from '../../testing/i18n';
import { API, httpMock, settle, text, waitFor } from '../../testing/test-providers';
import { OfflineRecordsSection } from './offline-records-section';

const DAY = 24 * 60 * 60 * 1000;

function setUp(session: 'account' | 'trial' = 'account'): void {
  localStorage.setItem('session', session);
  if (session === 'trial')
    localStorage.setItem('trial', JSON.stringify({ name: 'Blue Heron', expiresAt: '2099-01-01T00:00:00Z' }));
  TestBed.configureTestingModule({
    providers: [
      ...provideEnglish(),
      provideHttpClient(withInterceptors([sessionExpiredInterceptor, offlineRecordsInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE, useValue: API },
      { provide: FIRST_RENDER, useFactory: () => signal(false) },
      { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve([]) }
    ]
  });
}

/** The section on the account page, and the app shell's dialog that asks the questions about the copy. */
async function create() {
  // The dialog first: each new fixture takes the one before it out of the page, and a checkbox out of the page
  // fires no change event when it is clicked.
  const dialog = TestBed.createComponent(OfflineAskDialog);
  const fixture = TestBed.createComponent(OfflineRecordsSection);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    dialog,
    root,
    box: () => root.querySelector<HTMLInputElement>('#offline-records'),
    keep: () => root.querySelector<HTMLSelectElement>('#offline-keep'),
    clear: () => root.querySelector<HTMLButtonElement>('.offline-clear')
  };
}

/** Waits for a request to the address and answers it. */
async function answerNext(address: string, body: unknown): Promise<void> {
  let req!: TestRequest;
  await waitFor(() => {
    req = httpMock().expectOne(address);
  });
  req.flush(body as object);
}

/** Ticks the switch, and answers /verify and the fetch of every record and setting that follow. */
async function turnOn(made: Awaited<ReturnType<typeof create>>): Promise<void> {
  made.box()!.click();
  await answerNext(API + '/verify', {
    id: 'u1',
    email: 'a@b.c',
    sessionEndsAt: new Date(Date.now() + 7 * DAY).toISOString()
  });
  const records = TestBed.inject(OfflineRecords);
  for (const key of RECORD_KEYS) await answerNext(records.addressOf(key), key === 'prices' ? { prices: [] } : []);
  await waitFor(async () => {
    await settle(made.fixture);
    expect(made.keep()?.disabled).toBe(false);
  });
}

/** The question the dialog shows, once it is there. */
async function question(dialog: ComponentFixture<OfflineAskDialog>): Promise<string> {
  await waitFor(async () => {
    await settle(dialog);
    expect(dialog.nativeElement.querySelector('[role="alertdialog"]')).not.toBeNull();
  });
  return text(dialog, '[role="alertdialog"]');
}

async function answer(dialog: ComponentFixture<OfflineAskDialog>, choice: string): Promise<void> {
  (dialog.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-choice="${choice}"]`)!.click();
  await settle(dialog);
}

/** A change saved while the browser is offline: it waits in the outbox, to be sent later. */
async function changeOffline(): Promise<void> {
  const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  await firstValueFrom(TestBed.inject(HttpClient).put(API + '/notes/change/n1', { content: 'Wax resist' }));
  offline.mockRestore();
  await waitFor(() => expect(TestBed.inject(Outbox).count()).toBe(1));
}

describe('OfflineRecordsSection', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
  });
  afterEach(async () => {
    // Lets the last test's writes and deletes finish on its own database before the next one starts.
    await new Promise((resolve) => setTimeout(resolve, 50));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('offers the switch, off at first, with what it means, and nothing else until it is on', async () => {
    setUp();
    const { fixture, box, keep, clear } = await create();
    expect(box()!.checked).toBe(false);
    expect(text(fixture, 'label[for="offline-records"]')).toBe(
      'Keep my records on this device so they open without internet'
    );
    expect(box()!.getAttribute('aria-describedby')).toBe('offline-records-hint');
    expect(text(fixture, '#offline-records-hint')).toContain('Only on a device you alone use.');
    expect(keep()).toBeNull();
    expect(clear()).toBeNull();
    expect(text(fixture, '[role="alert"]')).toBe('');
  });

  it('offers nothing during a trial, or where the browser has no IndexedDB', async () => {
    setUp('trial');
    expect((await create()).root.querySelector('section')).toBeNull();

    TestBed.resetTestingModule();
    localStorage.clear();
    vi.stubGlobal('indexedDB', undefined);
    setUp();
    expect((await create()).root.querySelector('section')).toBeNull();
  });

  it('turned on, waits while the copy is fetched, then offers how long to keep it and a way to clear it', async () => {
    setUp();
    const made = await create();
    made.box()!.click();
    await settle(made.fixture);
    // The switch waits for the copy.
    expect(made.box()!.disabled).toBe(true);
    await answerNext(API + '/verify', { id: 'u1', email: 'a@b.c' });
    const records = TestBed.inject(OfflineRecords);
    for (const key of RECORD_KEYS) await answerNext(records.addressOf(key), key === 'prices' ? { prices: [] } : []);
    await waitFor(async () => {
      await settle(made.fixture);
      expect(made.box()!.disabled).toBe(false);
    });
    expect(made.box()!.checked).toBe(true);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect(text(made.fixture, 'label[for="offline-keep"]')).toBe('Remove offline data if Glazecalc is not opened for');
    expect([...made.keep()!.options].map((option) => option.textContent?.trim())).toEqual([
      'Never (keep it until I delete it)',
      '1 week',
      '1 month',
      '3 months',
      '1 year'
    ]);
    // Kept until the person deletes it, unless they choose otherwise.
    expect(made.keep()!.selectedOptions[0]!.textContent?.trim()).toBe('Never (keep it until I delete it)');
    expect(text(made.fixture, '#offline-keep-hint')).toContain('never in the background');
    expect(made.clear()!.textContent?.trim()).toBe('Clear offline data');
    // Not an iPhone or iPad: no word about Safari.
    expect(made.root.querySelector('.offline-ios-notice')).toBeNull();
  });

  it('keeps the time chosen, and shows it the next time the page opens', async () => {
    setUp();
    const made = await create();
    await turnOn(made);
    const keep = made.keep()!;
    keep.value = '7';
    keep.dispatchEvent(new Event('change'));
    await waitFor(() => expect(TestBed.inject(OfflineRecords).keepDays()).toBe(7));
    await settle(made.fixture);
    expect(made.keep()!.disabled).toBe(false);

    // The site opens again on this browser.
    TestBed.resetTestingModule();
    setUp();
    const again = await create();
    await waitFor(async () => {
      await settle(again.fixture);
      expect(again.keep()?.selectedOptions[0]?.textContent?.trim()).toBe('1 week');
    });
    expect(again.box()!.checked).toBe(true);

    // And back to keeping it until it is deleted.
    again.keep()!.value = '';
    again.keep()!.dispatchEvent(new Event('change'));
    await answerNext(API + '/verify', { id: 'u1', email: 'a@b.c' });
    await waitFor(() => expect(TestBed.inject(OfflineRecords).keepDays()).toBeNull());
  });

  it("unticks itself where the browser won't keep a copy, and says why", async () => {
    setUp();
    const made = await create();
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const failing = {} as IDBOpenDBRequest;
      setTimeout(() => failing.onerror?.(new Event('error')));
      return failing;
    });
    made.box()!.click();
    await answerNext(API + '/verify', { id: 'u1', email: 'a@b.c' });
    await waitFor(async () => {
      await settle(made.fixture);
      expect(text(made.fixture, '.offline-records-not-kept')).toBe(
        "This browser won't keep a copy (private browsing or no space)."
      );
    });
    expect(made.box()!.checked).toBe(false);
    expect(made.keep()).toBeNull();
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
  });

  it('on an iPhone, says Safari may remove the copy, until dismissed', async () => {
    setUp();
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    const made = await create();
    await turnOn(made);
    expect(text(made.fixture, '.offline-ios-notice')).toContain('Safari may remove data waiting on this device');
    expect(made.root.querySelector('.offline-ios-notice')!.getAttribute('role')).toBe('status');
    const dismiss = made.root.querySelector<HTMLButtonElement>('.offline-ios-notice button')!;
    expect(dismiss.textContent?.trim()).toBe('Dismiss');
    dismiss.click();
    await settle(made.fixture);
    expect(made.root.querySelector('.offline-ios-notice')).toBeNull();
    // The copy stays on.
    expect(made.box()!.checked).toBe(true);
  });

  it('asks before clearing the offline data: Cancel keeps it, and Clear turns the copy off', async () => {
    setUp();
    const made = await create();
    await turnOn(made);
    made.clear()!.click();
    expect(await question(made.dialog)).toContain('Clear offline data?');
    expect(text(made.dialog, '#ask-body')).toContain('Your records on Glazecalc are not touched.');
    await answer(made.dialog, 'cancel');
    await settle(made.fixture);
    expect(made.box()!.checked).toBe(true);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');

    made.clear()!.click();
    await question(made.dialog);
    await answer(made.dialog, 'delete');
    await waitFor(async () => {
      await settle(made.fixture);
      expect(made.box()!.checked).toBe(false);
    });
    expect(made.keep()).toBeNull();
    expect(made.clear()).toBeNull();
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
  });

  it('asks before turning off with changes not sent yet, and stays on when the person says Cancel', async () => {
    setUp();
    const made = await create();
    await turnOn(made);
    await changeOffline();

    made.box()!.click();
    expect(await question(made.dialog)).toContain('Turn off the offline copy?');
    expect(text(made.dialog, '#ask-body')).toContain('1 change that has not been sent yet will be lost.');
    await answer(made.dialog, 'cancel');
    // The box shows what is so: still on.
    await waitFor(() => expect(made.box()!.checked).toBe(true));
    expect(TestBed.inject(Outbox).count()).toBe(1);

    made.box()!.click();
    await question(made.dialog);
    expect(text(made.dialog, '[data-choice="delete"]')).toBe('Turn off and delete');
    await answer(made.dialog, 'delete');
    await waitFor(async () => {
      await settle(made.fixture);
      expect(made.clear()).toBeNull();
    });
    expect(made.box()!.checked).toBe(false);
    expect(TestBed.inject(Outbox).count()).toBe(0);
  });

  it('follows another tab turning the copy off, and still offers to clear the changes waiting here', async () => {
    setUp();
    const made = await create();
    await turnOn(made);
    await changeOffline();
    window.dispatchEvent(new StorageEvent('storage', { key: RECORDS_FLAG, newValue: null }));
    await settle(made.fixture);
    expect(made.box()!.checked).toBe(false);
    expect(made.keep()).toBeNull();
    expect(made.clear()).not.toBeNull();
    // Another setting changing in another tab changes nothing here.
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }));
    await settle(made.fixture);
    expect(made.clear()).not.toBeNull();
  });
});
