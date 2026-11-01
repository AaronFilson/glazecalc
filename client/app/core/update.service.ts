import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

const ONE_MINUTE = 60_000;
const ONE_HOUR = 60 * ONE_MINUTE;
const RELOADED_KEY = 'reloadedForWorker';

/**
 * A new version of the app (docs/adr/0028-service-worker.md). The service worker downloads it in the background
 * and keeps running the old one until the page is left: a tab already open goes on with the code it has, and
 * the next page that opens gets the new version. The banner offers the reload now. Dismissed, nothing more is
 * said in this tab; the next open is on the new version anyway.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  // Not provided where there is no service worker to provide it (provideServiceWorker in app.config.ts).
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly document = inject(DOCUMENT);

  private readonly ready = signal(false);
  private readonly dismissed = signal(false);
  private readonly unsaved = signal(false);
  private checkedAt = 0;

  /** The banner shows: a new version is ready, not dismissed, and a reload would lose nothing. */
  readonly offered = computed(() => this.ready() && !this.dismissed() && !this.unsaved());

  constructor() {
    const updates = this.updates;
    if (!updates?.isEnabled) return;
    updates.versionUpdates.pipe(filter((event) => event.type === 'VERSION_READY')).subscribe(() => {
      this.ready.set(true);
    });
    // The worker cannot go on (its files were cleared, say): the page loads afresh, as reloadIfCodeIsMissing does
    // for a missing file, and at most once a minute so a fault cannot loop.
    updates.unrecoverable.subscribe(() => this.reloadOnce());
    // Looks for a new version when a tab comes back, at most once an hour (the worker looks at each page load).
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState !== 'visible' || Date.now() - this.checkedAt < ONE_HOUR) return;
      this.checkedAt = Date.now();
      updates.checkForUpdate().catch(() => false);
    });
  }

  /** The recipe page says while it has changes a reload would lose: the banner waits for them to be saved. */
  holdWhile(unsaved: boolean): void {
    this.unsaved.set(unsaved);
  }

  /** Runs the new version now: the page loads again. */
  async reload(): Promise<void> {
    try {
      await this.updates?.activateUpdate();
    } finally {
      this.document.location.reload();
    }
  }

  dismiss(): void {
    this.dismissed.set(true);
  }

  private reloadOnce(): void {
    try {
      const last = Number(sessionStorage.getItem(RELOADED_KEY) ?? 0);
      if (Date.now() - last < ONE_MINUTE) return;
      sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
    } catch {
      // Without storage there is no loop guard, so do not reload.
      return;
    }
    this.document.location.reload();
  }
}
