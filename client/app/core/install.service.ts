import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

/** What Chrome on Android offers before it shows its own install prompt (not yet in TypeScript's DOM types). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

/**
 * Putting Glazecalc on the home screen (Chrome and Edge on Android and the desktop). The browser says when the app
 * can be installed; the app keeps what it offers and shows "Install app" in the menu until it is used, a quiet
 * button and never a popup. Not in the installed app itself. Safari has no such event: nothing is shown there.
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly offer = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installed = signal(false);

  /** The menu shows "Install app": the browser has offered it, and this is not the installed app. */
  readonly available = computed(() => this.offer() !== null && !this.installed());

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    this.installed.set(this.isInstalledApp());
    window.addEventListener('beforeinstallprompt', (event) => {
      // Keeps it for the menu, instead of the browser's own bar.
      event.preventDefault();
      this.offer.set(event as BeforeInstallPromptEvent);
    });
    window.addEventListener('appinstalled', () => this.offer.set(null));
  }

  /** Asks the browser to show its install question. The offer is used up whatever the answer. */
  async install(): Promise<void> {
    const offer = this.offer();
    if (!offer) return;
    this.offer.set(null);
    try {
      await offer.prompt();
    } catch {
      // The browser would not show it; nothing is offered until it offers again.
    }
  }

  private isInstalledApp(): boolean {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }
}
