import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';
import { LocaleService } from './core/locale.service';
import { formatDate } from './shared/format';
import { errorMessage } from './core/error-message';
import { RichText } from './i18n/rich-text';
import { OFFERED_LANGUAGES, OPEN_PAGE, PAGE_LANGUAGE, languageName, pathIn } from './i18n/language';
import { ownLanguagePage } from './i18n/own-language';
import { TranslationNotice } from './i18n/translation-notice';
import { PreferencesService } from './core/preferences.service';

/** The pages in the main menu once signed in, in the order a potter uses them. */
const APP_PAGES = [
  { path: '/recipe', label: marker('nav.recipes') },
  { path: '/material', label: marker('nav.materials') },
  { path: '/additive', label: marker('nav.additives') },
  { path: '/firing', label: marker('nav.firingLogs') },
  { path: '/notes', label: marker('nav.notes') },
  { path: '/advice', label: marker('nav.advice') },
  { path: '/guides', label: marker('nav.guides') }
];

@Component({
  selector: 'gc-root',
  imports: [RichText, RouterLink, RouterLinkActive, RouterOutlet, TranslationNotice, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <!-- For keyboard and screen reader users: past the menu, straight to the page. Hidden until focused. -->
    <a class="skip-link" href="#main" (click)="skipToContent($event, main)">{{ t('nav.skip') }}</a>
    <header class="app-header">
      <nav class="app-nav" [attr.aria-label]="t('nav.main')">
        <a class="brand" [routerLink]="auth.hasSession() ? '/home' : '/'">
          <img src="/images/logo.webp" alt="" width="30" height="30" />
          Glazecalc
        </a>
        <!-- On a phone the menu is folded away; returning visitors sign in without opening it. -->
        @if (!auth.hasSession()) {
          <a routerLink="/signin" class="nav-quick-signin">{{ t('nav.signIn') }}</a>
        }
        <button
          type="button"
          class="btn btn-light btn-sm nav-toggle"
          aria-controls="main-menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="menuOpen.set(!menuOpen())"
        >
          {{ t('nav.menu') }}
        </button>
        <div id="main-menu" class="nav-menu" [class.open]="menuOpen()">
          @if (auth.hasSession()) {
            <ul class="nav-links">
              @for (page of pages; track page.path) {
                <li>
                  <a [routerLink]="page.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{
                    t(page.label)
                  }}</a>
                </li>
              }
            </ul>
            <div class="nav-account">
              <a routerLink="/account" class="account-email" translate="no" [title]="t('nav.accountTitle')">{{
                auth.displayName() ?? t('nav.account')
              }}</a>
              <!-- A trial has no password to come back with; the trial bar offers its way out. -->
              @if (!auth.trial()) {
                <button type="button" class="btn btn-light btn-sm" (click)="logout()">{{ t('nav.signOut') }}</button>
              }
            </div>
          } @else {
            <ul class="nav-links">
              <li>
                <a routerLink="/guides" routerLinkActive="active" ariaCurrentWhenActive="page">{{ t('nav.guides') }}</a>
              </li>
              <li>
                <a routerLink="/advice" routerLinkActive="active" ariaCurrentWhenActive="page">{{ t('nav.advice') }}</a>
              </li>
              <li>
                <a routerLink="/about" routerLinkActive="active" ariaCurrentWhenActive="page">{{ t('nav.about') }}</a>
              </li>
            </ul>
            <div class="nav-account">
              <a routerLink="/signin">{{ t('nav.signIn') }}</a>
              <a routerLink="/signup" class="btn btn-primary btn-sm">{{ t('nav.createAccount') }}</a>
            </div>
          }
        </div>
      </nav>
      @if (auth.trial(); as trial) {
        <section class="trial-bar" [attr.aria-label]="t('trial.label')">
          <div class="trial-bar-inner">
            @if (!confirmingDiscard()) {
              <p>
                <gc-rich
                  [text]="
                    t('trial.trying', {
                      name: trial.name,
                      date: formatDate(trial.expiresAt, { weekday: 'long', month: 'long', day: 'numeric' })
                    })
                  "
                />
              </p>
              <div class="trial-actions">
                <a routerLink="/signup" class="btn btn-primary btn-sm">{{ t('trial.keep') }}</a>
                <button type="button" class="btn btn-light btn-sm" (click)="confirmingDiscard.set(true)">
                  {{ t('trial.discard') }}
                </button>
              </div>
            } @else {
              <p>{{ t('trial.confirm') }}</p>
              <div class="trial-actions">
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  [disabled]="discarding()"
                  (click)="discard()"
                >
                  {{ t('trial.discardIt') }}
                </button>
                <button type="button" class="btn btn-light btn-sm" (click)="confirmingDiscard.set(false)">
                  {{ t('trial.keepTrying') }}
                </button>
              </div>
            }
            @if (discardError()) {
              <p class="trial-error" role="alert">{{ discardError() }}</p>
            }
          </div>
        </section>
      }
    </header>

    <main #main id="main" class="app-main" tabindex="-1">
      <gc-translation-notice />
      <router-outlet />
    </main>

    <!-- Shown once the first page is in place, so it does not paint at the bottom of the window and then jump. -->
    @if (ready()) {
      <footer class="app-footer">
        <nav [attr.aria-label]="t('footer.site')">
          <a routerLink="/about">{{ t('footer.about') }}</a>
          <a routerLink="/guides">{{ t('footer.guides') }}</a>
          <a routerLink="/advice">{{ t('footer.advice') }}</a>
          <a routerLink="/privacy">{{ t('footer.privacy') }}</a>
          <a href="https://github.com/AaronFilson/glazecalc">{{ t('footer.source') }}</a>
          <a href="https://github.com/AaronFilson/glazecalc/issues">{{ t('footer.problem') }}</a>
          <a href="https://updraftpotterystudio.com/">{{ t('footer.pottery') }}</a>
        </nav>
        @if (languages.length > 1) {
          <nav class="footer-languages" [attr.aria-label]="t('footer.languages')">
            @for (code of languages; track code) {
              <a
                [href]="pageIn(code)"
                [attr.lang]="code"
                translate="no"
                [attr.aria-current]="code === pageLanguage ? 'true' : null"
                (click)="chooseLanguage(code)"
                >{{ languageName(code) }}</a
              >
            }
          </nav>
        }
        <p>{{ t('footer.copyright') }}</p>
      </footer>
    }
  </ng-container>`
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  // Numbers and dates follow Settings from the first page on.
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);

  protected readonly pages = APP_PAGES;
  private readonly preferences = inject(PreferencesService);
  private readonly openPage = inject(OPEN_PAGE);
  protected readonly pageLanguage = inject(PAGE_LANGUAGE);
  /** The languages offered, for the footer's links: none while there is only English. */
  protected readonly languages = inject(OFFERED_LANGUAGES);
  protected readonly languageName = languageName;
  protected readonly formatDate = formatDate;
  protected readonly menuOpen = signal(false);
  protected readonly ready = signal(false);
  protected readonly confirmingDiscard = signal(false);
  protected readonly discarding = signal(false);
  protected readonly discardError = signal('');

  constructor() {
    // Once the account's language is known (from another device, say), an English page opens in it.
    effect(() => {
      const own = ownLanguagePage(this.preferences.language());
      if (own && this.pageLanguage === 'en') this.openPage(own);
    });
    // After each navigation the phone menu closes, and once the first page is
    // in place the footer can appear below it.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.ready.set(true);
      });
  }

  /** This page in another language. */
  protected pageIn(code: string): string {
    return pathIn(code, location.pathname, location.search + location.hash);
  }

  /** A language chosen from the footer is remembered, so English pages open in it from now on. */
  protected chooseLanguage(code: string): void {
    if (this.auth.hasSession()) void this.preferences.set('language', code).catch(() => undefined);
    else this.preferences.remember('language', code);
  }

  ngOnInit(): void {
    void this.auth.whenChecked();
  }

  /**
   * Moves focus to the page's content. Followed as a link, #main would resolve
   * against <base href="/"> to /#main and reload the app at the start page.
   */
  protected skipToContent(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
  }

  protected logout(): void {
    void this.auth.signOut();
    void this.router.navigateByUrl('/signin');
  }

  protected async discard(): Promise<void> {
    if (this.discarding()) return;
    this.discarding.set(true);
    this.discardError.set('');
    try {
      await this.auth.discardTrial();
      this.confirmingDiscard.set(false);
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.discardError.set(errorMessage(err, translate('trial.discardFailed')));
    } finally {
      this.discarding.set(false);
    }
  }
}
