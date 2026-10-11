import { Location } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { filter } from 'rxjs';
import { languageFor } from '../../../lib/regions/languages';
import { AuthService } from '../core/auth.service';
import { PreferencesService } from '../core/preferences.service';
import { PAGE_LANGUAGE, pathIn } from './language';

const ISSUES = 'https://github.com/AaronFilson/glazecalc/issues/new';

/** Set for this tab when its reader asks for the English, so their language does not take them back to it. */
export const READ_ENGLISH = 'readEnglish';

/** Whether this tab's reader asked for the English. */
export function readsEnglish(storage: Pick<Storage, 'getItem'> = sessionStorage): boolean {
  try {
    return storage.getItem(READ_ENGLISH) === '1';
  } catch {
    return false;
  }
}

/** The page the router shows, its innermost route. */
const innermost = (route: ActivatedRouteSnapshot): ActivatedRouteSnapshot =>
  route.firstChild ? innermost(route.firstChild) : route;

/**
 * At the top of every page in a language other than English (docs/i18n-plan.md):
 * the page was translated by AI, Glazecalc is open source, and here is where to
 * suggest a correction, with the language and page filled in, or read the
 * English. It can be closed (Settings can show it again), except on the safety
 * guides (their routes say safety: true), where a line of it stays. In the
 * languages AI translates less well (plainNotice: Irish, Maltese) it says so
 * plainly, and the line stays on every page.
 */
@Component({
  selector: 'gc-translation-notice',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (shown()) {
      <aside class="translation-notice" [attr.aria-label]="t('notice.label')">
        <p>
          @if (plain) {
            {{ brief() ? t('notice.plainBrief') : t('notice.plain') }}
          } @else {
            {{ brief() ? t('notice.brief') : t('notice.text') }}
          }
          <a [href]="suggestUrl()" target="_blank" rel="noopener">{{ t('notice.suggest') }}</a>
          <a [href]="englishUrl()" (click)="readEnglish()">{{ t('notice.english') }}</a>
          @if (!brief()) {
            <button type="button" class="btn btn-link link-inline" (click)="close()">{{ t('notice.close') }}</button>
          }
        </p>
      </aside>
    }
  </ng-container>`,
  styles: `
    .translation-notice {
      border-inline-start: 3px solid var(--gc-primary);
      background: var(--gc-surface-2);
      padding: 0.5rem 0.75rem;
      margin: 0 0 1rem;
      font-size: 0.95rem;
      p {
        margin: 0;
      }
      a,
      button {
        margin-inline-start: 0.5rem;
      }
    }
  `
})
export class TranslationNotice {
  private readonly language = inject(PAGE_LANGUAGE);
  private readonly preferences = inject(PreferencesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly translated = languageFor(this.language) !== undefined && this.language !== 'en';
  /** AI translates the language less well than most, so the notice says so and a line of it stays. */
  protected readonly plain = !!languageFor(this.language)?.plainNotice;
  /** The page is a safety guide. */
  private readonly safety = signal(false);
  /** A line of the notice stays here once it is closed. */
  private readonly stays = computed(() => this.plain || this.safety());
  private readonly path = signal(location.pathname);
  /** The query and section in the address: ?compare=draft,abc, #cones. */
  private readonly rest = signal(location.search + location.hash);
  protected readonly brief = computed(() => this.stays() && this.preferences.notice() === 'hidden');
  protected readonly shown = computed(
    () => this.translated && (this.stays() || this.preferences.notice() !== 'hidden')
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.safety.set(!!innermost(this.router.routerState.snapshot.root).data['safety']));
    // The address, whenever it changes: another page, its query, or the section a guide's contents went to.
    const stop = inject(Location).onUrlChange(() => {
      this.path.set(location.pathname);
      this.rest.set(location.search + location.hash);
    });
    inject(DestroyRef).onDestroy(stop);
  }

  /** A GitHub issue with the language and page filled in (.github/ISSUE_TEMPLATE/translation.yml). */
  protected readonly suggestUrl = computed(() => {
    const page = this.path();
    const params = new URLSearchParams({
      template: 'translation.yml',
      title: `[Translation] ${this.language}: ${page}`,
      language: this.language,
      page
    });
    return ISSUES + '?' + params.toString();
  });

  /** This page in English, with its query and section. */
  protected readonly englishUrl = computed(() => pathIn('en', this.path(), this.rest()));

  protected readEnglish(): void {
    try {
      sessionStorage.setItem(READ_ENGLISH, '1');
    } catch {
      // Without storage, the reader's language may take them back.
    }
  }

  /** Closes it on this browser, and for the account if signed in. */
  protected close(): void {
    if (this.auth.hasSession()) void this.preferences.set('notice', 'hidden').catch(() => undefined);
    else this.preferences.remember('notice', 'hidden');
  }
}
