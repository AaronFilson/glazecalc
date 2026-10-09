import { Component, computed, inject, signal } from '@angular/core';
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
 * guides (their routes say safety: true), where a line of it stays.
 */
@Component({
  selector: 'gc-translation-notice',
  imports: [TranslocoDirective],
  template: `<ng-container *transloco="let t">
    @if (shown()) {
      <aside class="translation-notice" [attr.aria-label]="t('notice.label')">
        <p>
          {{ brief() ? t('notice.brief') : t('notice.text') }}
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
  /** The page is a safety guide. */
  private readonly safety = signal(false);
  private readonly path = signal(location.pathname);
  protected readonly brief = computed(() => this.safety() && this.preferences.notice() === 'hidden');
  protected readonly shown = computed(
    () => this.translated && (this.safety() || this.preferences.notice() !== 'hidden')
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.safety.set(!!innermost(this.router.routerState.snapshot.root).data['safety']);
        this.path.set(location.pathname);
      });
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

  protected readonly englishUrl = computed(() => pathIn('en', this.path()));

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
