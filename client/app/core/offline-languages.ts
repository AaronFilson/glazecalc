import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { filesFor, languageOfFile } from '../../../lib/offline-files';

/** Cache Storage's name for the files kept: the messages and guides of the reader's language, and English. */
export const FILES_CACHE = 'gc-i18n';
/** In this browser's storage: the language kept last, and when (ms). */
const KEPT_KEY = 'offlineLanguage';
/** A language's files are fetched again when the copy is this old. */
const KEPT_FOR_MS = 24 * 60 * 60 * 1000;

/**
 * The files of the reader's language, and of English, kept on the phone so the pages open without a network
 * (docs/adr/0028-service-worker.md). The service worker keeps the app itself; these change from one language to the
 * next and are many, so the app keeps only the ones it needs: it fetches them once a day in the background, drops
 * any other language's, and reads them (core/offline-files.interceptor.ts) only when the network fails.
 */
@Injectable({ providedIn: 'root' })
export class OfflineLanguages {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private keeping: Promise<void> | null = null;

  /** Whether this is the browser (the prerender keeps nothing). */
  isBrowser(): boolean {
    return this.browser;
  }

  /** Whether the device says it has no network at the moment. */
  isOffline(): boolean {
    return this.browser && navigator.onLine === false;
  }

  private store(): Promise<Cache> | null {
    return this.browser && typeof caches !== 'undefined' ? caches.open(FILES_CACHE) : null;
  }

  /** The languages that have files on this phone: English always, as the app itself speaks it. */
  async saved(): Promise<string[]> {
    const codes = new Set(['en']);
    try {
      const cache = await this.store();
      for (const request of (await cache?.keys()) ?? []) {
        const code = languageOfFile(new URL(request.url).pathname);
        if (code) codes.add(code);
      }
    } catch {
      // Storage is not there to ask: only English is known to be.
    }
    return [...codes];
  }

  /** Whether a page can open in a language now: with a network any can, and without one only a saved one. */
  async canOpen(code: string): Promise<boolean> {
    return !this.isOffline() || (await this.saved()).includes(code);
  }

  /** A file's text from the copy kept, or null. */
  async read(address: string): Promise<string | null> {
    try {
      const reply = await (await this.store())?.match(address);
      return reply ? await reply.text() : null;
    } catch {
      return null;
    }
  }

  /**
   * Fetches the files of a language and of English into the cache and drops every other language's, unless
   * they were fetched in the last day. Without the network or room to keep them it does nothing and tries on the
   * next page load.
   */
  keep(language: string): Promise<void> {
    this.keeping ??= this.fetchAndKeep(language).finally(() => (this.keeping = null));
    return this.keeping;
  }

  private async fetchAndKeep(language: string): Promise<void> {
    const store = this.store();
    if (!store || this.isOffline() || this.keptRecently(language)) return;
    try {
      const cache = await store;
      for (const address of new Set([...filesFor(language), ...filesFor('en')])) {
        const reply = await fetch(address);
        // A file a language does not have yet is a 404: the app reads it as empty, or in English.
        if (reply.ok) await cache.put(address, reply);
      }
      for (const request of await cache.keys()) {
        const code = languageOfFile(new URL(request.url).pathname);
        if (code !== language && code !== 'en') await cache.delete(request);
      }
      localStorage.setItem(KEPT_KEY, JSON.stringify({ language, at: Date.now() }));
      // Asks the browser not to clear the app's files when the phone is short of space; it may say no.
      await navigator.storage?.persist?.();
    } catch {
      // The network went or the phone is full: whatever was kept stays, and the next page load tries again.
    }
  }

  private keptRecently(language: string): boolean {
    try {
      const kept = JSON.parse(localStorage.getItem(KEPT_KEY) ?? 'null') as { language?: string; at?: number } | null;
      return kept?.language === language && Date.now() - (kept.at ?? 0) < KEPT_FOR_MS;
    } catch {
      return false;
    }
  }
}
