import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { UpdateService } from './update.service';

describe('UpdateService', () => {
  let versions: Subject<VersionEvent>;
  let unrecoverable: Subject<unknown>;
  let worker: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    unrecoverable: Subject<unknown>;
    activateUpdate: ReturnType<typeof vi.fn>;
    checkForUpdate: ReturnType<typeof vi.fn>;
  };
  let reload: ReturnType<typeof vi.fn>;
  let listeners: Record<string, () => void>;
  let visibility: string;

  const start = (enabled = true) => {
    worker.isEnabled = enabled;
    return TestBed.inject(UpdateService);
  };
  const ready = () =>
    versions.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } });

  beforeEach(() => {
    sessionStorage.clear();
    versions = new Subject();
    unrecoverable = new Subject();
    worker = {
      isEnabled: true,
      versionUpdates: versions,
      unrecoverable,
      activateUpdate: vi.fn().mockResolvedValue(true),
      checkForUpdate: vi.fn().mockResolvedValue(false)
    };
    reload = vi.fn();
    listeners = {};
    visibility = 'visible';
    const document = {
      location: { reload },
      addEventListener: (name: string, listener: () => void) => (listeners[name] = listener),
      get visibilityState() {
        return visibility;
      }
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: worker },
        { provide: DOCUMENT, useValue: document }
      ]
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('offers the new version once it is ready, and not before', () => {
    const updates = start();
    expect(updates.offered()).toBe(false);
    versions.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    expect(updates.offered()).toBe(false);
    ready();
    expect(updates.offered()).toBe(true);
  });

  it('stops offering it when it is dismissed, and says nothing more in the tab', () => {
    const updates = start();
    ready();
    updates.dismiss();
    expect(updates.offered()).toBe(false);
    ready();
    expect(updates.offered()).toBe(false);
    expect(worker.activateUpdate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('waits while a recipe has changes not saved, and offers it when they are', () => {
    const updates = start();
    ready();
    updates.holdWhile(true);
    expect(updates.offered()).toBe(false);
    updates.holdWhile(false);
    expect(updates.offered()).toBe(true);
  });

  it('runs the new version, then loads the page again', async () => {
    const updates = start();
    ready();
    await updates.reload();
    expect(worker.activateUpdate).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('loads the page again when the worker cannot go on, at most once a minute', () => {
    start();
    unrecoverable.next({ reason: 'cache gone' });
    expect(reload).toHaveBeenCalledTimes(1);
    unrecoverable.next({ reason: 'cache gone' });
    expect(reload).toHaveBeenCalledTimes(1);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
    unrecoverable.next({ reason: 'cache gone' });
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('looks for a new version when the tab is shown again, once an hour at most', () => {
    start();
    visibility = 'hidden';
    listeners['visibilitychange']!();
    expect(worker.checkForUpdate).not.toHaveBeenCalled();
    visibility = 'visible';
    listeners['visibilitychange']!();
    listeners['visibilitychange']!();
    expect(worker.checkForUpdate).toHaveBeenCalledTimes(1);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61 * 60_000);
    listeners['visibilitychange']!();
    expect(worker.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('does nothing where there is no service worker', () => {
    const updates = start(false);
    ready();
    unrecoverable.next({});
    expect(updates.offered()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(listeners['visibilitychange']).toBeUndefined();
  });
});
