import {
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
                (click)="chooseLanguage($event, code)"
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
  private readonly injector = inject(Injector);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

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
  /** A language chosen in the footer is being saved; its page opens once it is. */
  private choosing = false;

  constructor() {
    // Once the account's language is known (from another device, say), an English page opens in it.
    effect(() => {
      const own = ownLanguagePage(this.preferences.language());
      if (own && this.pageLanguage === 'en' && !this.choosing) this.openPage(own);
    });
    // After each navigation the phone menu closes, and once the first page is
    // in place the footer can appear below it. A move to another page shows it
    // from its start (only the query or the section changing is not a move).
    let trigger: NavigationStart['navigationTrigger'];
    let shown: string | null = null;
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) trigger = event.navigationTrigger;
      if (!(event instanceof NavigationEnd)) return;
      this.menuOpen.set(false);
      this.ready.set(true);
      const path = event.urlAfterRedirects.split(/[?#]/)[0]!;
      if (shown !== null && path !== shown) this.showNewPage(trigger === 'popstate');
      shown = path;
    });
  }

  /**
   * A new page opens at its top, or at the section its address names, with the
   * focus on its heading (or that section's), so a keyboard or screen reader
   * user starts there. Back and forward leave the scroll position to the browser.
   */
  private showNewPage(backOrForward: boolean): void {
    afterNextRender(
      () => {
        const main = this.main().nativeElement;
        const fragment = this.router.parseUrl(this.router.url).fragment;
        const section = fragment ? document.getElementById(fragment) : null;
        // The router scrolls to a section itself. At once, as a page loads, not smoothly.
        if (!section && !backOrForward) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        const heading = section ?? [...main.querySelectorAll('h1')].find((h1) => !h1.closest('[hidden]')) ?? main;
        if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      },
      { injector: this.injector }
    );
  }

  /** This page in another language. */
  protected pageIn(code: string): string {
    return pathIn(code, location.pathname, location.search + location.hash);
  }

  /**
   * A language chosen from the footer is remembered, so English pages open in it from now on.
   * An account's page opens once the account has it, as in Settings: the new page reads the
   * account's language, and an older one would take it back.
   */
  protected async chooseLanguage(event: MouseEvent, code: string): Promise<void> {
    if (!this.auth.hasSession()) return this.preferences.remember('language', code);
    // A new tab or window is the browser's to open.
    const here = event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
    if (here) {
      event.preventDefault();
      this.choosing = true;
    }
    await this.preferences.set('language', code).catch(() => undefined);
    if (here) this.openPage(this.pageIn(code));
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

  /** Signs out once the page has been left: the recipe page asks first about changes not saved. */
  protected async logout(): Promise<void> {
    // 'reload': from the sign-in page itself too, which would otherwise count as not going anywhere.
    if (!(await this.router.navigateByUrl('/signin', { onSameUrlNavigation: 'reload' }))) return;
    await this.auth.signOut();
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
