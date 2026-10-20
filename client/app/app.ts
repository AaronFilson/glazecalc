import {
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { first } from 'rxjs';
import {
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { AuthService } from './core/auth.service';
import { LocaleService } from './core/locale.service';
import { formatDate } from './shared/format';
import { errorMessage } from './core/error-message';
import { RichText } from './i18n/rich-text';
import { OFFERED_LANGUAGES, OPEN_PAGE, PAGE_LANGUAGE, languageName, pathIn } from './i18n/language';
import { LanguageLinks } from './i18n/language-links';
import { ownLanguagePage } from './i18n/own-language';
import { TranslationNotice } from './i18n/translation-notice';
import { PreferencesService } from './core/preferences.service';
import { FIRST_RENDER } from './core/first-render';

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
  // Escape closes the phone menu, as the Menu button does.
  host: { '(keydown.escape)': 'closeMenu()' },
  imports: [
    LanguageLinks,
    NgTemplateOutlet,
    RichText,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslationNotice,
    TranslocoDirective
  ],
  template: `<ng-container *transloco="let t">
    <!-- For keyboard and screen reader users: past the menu, straight to the page. Hidden until focused. -->
    <a class="skip-link" href="#main" (click)="skipToContent($event, main)">{{ t('nav.skip') }}</a>
    <header class="app-header">
      <nav class="app-nav" [attr.aria-label]="t('nav.main')">
        <a class="brand" [routerLink]="auth.shownSession() ? '/home' : '/'">
          <img src="/images/logo.webp" alt="" width="30" height="30" />
          Glazecalc
        </a>
        <!-- On a phone the menu is folded away; returning visitors sign in without opening it. -->
        @if (!auth.shownSession()) {
          @if (!auth.secondStepPending()) {
            <a routerLink="/signin" class="nav-quick-signin">{{ t('nav.signIn') }}</a>
          }
        } @else {
          <!-- And a signed-in reader sees that they are, and has their account a tap away. -->
          <a
            routerLink="/account"
            class="nav-quick-account"
            [attr.aria-label]="auth.shownTrial() ? t('nav.trialAccount') : t('nav.account')"
          >
            <ng-container [ngTemplateOutlet]="initial" />
          </a>
        }
        <button
          #toggle
          type="button"
          class="btn btn-light btn-sm nav-toggle"
          aria-controls="main-menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="menuOpen.set(!menuOpen())"
        >
          {{ t('nav.menu') }}
        </button>
        <div #menu id="main-menu" class="nav-menu" [class.open]="menuOpen()">
          @if (auth.shownSession()) {
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
              <!-- Says what it is, "Account" (or "Trial account"), with the email under it in small text:
                   an email alone reads as who is signed in, not as the way to the settings. -->
              <a
                routerLink="/account"
                class="account-link"
                routerLinkActive="active"
                ariaCurrentWhenActive="page"
                [title]="t('nav.accountTitle')"
              >
                <ng-container [ngTemplateOutlet]="initial" />
                <span class="account-text">
                  <span class="account-label">{{ auth.shownTrial() ? t('nav.trialAccount') : t('nav.account') }}</span>
                  @if (auth.shownTrial() ? null : auth.shownName(); as email) {
                    <span class="account-email" translate="no">{{ email }}</span>
                  }
                </span>
              </a>
              <!-- What was removed waits here for 30 days. -->
              <a routerLink="/trash" class="trash-link" routerLinkActive="active" ariaCurrentWhenActive="page">{{
                t('nav.trash')
              }}</a>
              <!-- A trial has no password to come back with; the trial bar offers its way out. -->
              @if (!auth.shownTrial()) {
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
            <!-- Not while a sign-in waits for its second step: they would start it again. -->
            @if (!auth.secondStepPending()) {
              <div class="nav-account">
                <a routerLink="/signin">{{ t('nav.signIn') }}</a>
                <a routerLink="/signup" class="btn btn-primary btn-sm">{{ t('nav.createAccount') }}</a>
              </div>
            }
          }
        </div>
      </nav>
      @if (auth.shownTrial(); as trial) {
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

    <!-- The account's round initial, or a person for a trial, which has no email. -->
    <ng-template #initial>
      <span class="account-initial" aria-hidden="true">
        @if (initialLetter(); as letter) {
          {{ letter }}
        } @else {
          <svg viewBox="0 0 16 16" width="16" height="16" focusable="false">
            <circle cx="8" cy="5.5" r="3" fill="currentColor" />
            <path d="M2.5 14.5a5.5 5.5 0 0 1 11 0z" fill="currentColor" />
          </svg>
        }
      </span>
    </ng-template>

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
          <a routerLink="/terms">{{ t('footer.terms') }}</a>
          <a routerLink="/assistants">{{ t('footer.assistants') }}</a>
          <a href="https://github.com/AaronFilson/glazecalc">{{ t('footer.source') }}</a>
          <a href="https://github.com/AaronFilson/glazecalc/issues">{{ t('footer.problem') }}</a>
          <a href="https://updraftpotterystudio.com/">{{ t('footer.pottery') }}</a>
        </nav>
        <!-- One line, "Language: English", that opens the others: they are many, on every page. -->
        @if (languages.length > 1) {
          <details class="footer-language">
            <summary>
              {{ t('footer.language') }}
              <span [attr.lang]="pageLanguage" translate="no">{{ languageName(pageLanguage) }}</span>
            </summary>
            <nav class="footer-languages" [attr.aria-label]="t('footer.languages')">
              <gc-language-links
                [languages]="languages"
                [href]="pageInFn"
                [current]="pageLanguage"
                [ariaCurrent]="'true'"
                (picked)="chooseLanguage($event.event, $event.code)"
              />
            </nav>
          </details>
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
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected readonly pages = APP_PAGES;
  /** The first letter of the account's email, for its round initial; none for a trial. */
  protected readonly initialLetter = computed(() =>
    this.auth.shownTrial() ? null : (this.auth.shownName()?.charAt(0).toLocaleUpperCase() ?? null)
  );
  private readonly preferences = inject(PreferencesService);
  private readonly openPage = inject(OPEN_PAGE);
  protected readonly pageLanguage = inject(PAGE_LANGUAGE);
  /** The languages offered, for the footer's links: none while there is only English. */
  protected readonly languages = inject(OFFERED_LANGUAGES);
  protected readonly languageName = languageName;
  protected readonly formatDate = formatDate;
  protected readonly menuOpen = signal(false);

  private readonly toggle = viewChild.required<ElementRef<HTMLElement>>('toggle');
  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');

  /** Closes the phone menu; the focus goes back to its button if it was in the menu, so it is not lost. */
  protected closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (this.menu().nativeElement.contains(this.document.activeElement)) this.toggle().nativeElement.focus();
  }
  protected readonly ready = signal(false);
  protected readonly confirmingDiscard = signal(false);
  protected readonly discarding = signal(false);
  protected readonly discardError = signal('');
  /** A language chosen in the footer is being saved; its page opens once it is. */
  private choosing = false;

  constructor() {
    // The page is drawn as the prerender was until the first page is in place and drawn, and from then on
    // follows this browser (core/first-render.ts). Not sooner: the first page may arrive after the menu.
    const firstRender = inject(FIRST_RENDER);
    this.router.events
      .pipe(
        first(
          (event) =>
            event instanceof NavigationEnd ||
            event instanceof NavigationError ||
            (event instanceof NavigationCancel && event.code !== NavigationCancellationCode.Redirect)
        ),
        takeUntilDestroyed()
      )
      .subscribe(() =>
        afterNextRender(
          () => {
            firstRender.set(false);
            // Tells the browser tests the prerendered page has been adopted and the app is running.
            this.document.documentElement.setAttribute('data-app-ready', '');
          },
          { injector: this.injector }
        )
      );
    // index.html marks the page for a stored session so the landing page does not flash; once there is none
    // (the server did not confirm it, or the reader signed out), the page is drawn as for anyone.
    const root = this.document.documentElement;
    effect(() => {
      if (!this.auth.hasSession()) root.removeAttribute('data-session');
    });
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
        const section = fragment ? this.document.getElementById(fragment) : null;
        // The router scrolls to a section itself. At once, as a page loads, not smoothly.
        if (!section && !backOrForward) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        const heading = section ?? [...main.querySelectorAll('h1')].find((h1) => !h1.closest('[hidden]')) ?? main;
        if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      },
      { injector: this.injector }
    );
  }

  /** Where the links to this page in another language go. */
  protected readonly pageInFn = (code: string): string => this.pageIn(code);

  /** This page in another language. */
  protected pageIn(code: string): string {
    const { pathname, search, hash } = this.document.location;
    return pathIn(code, pathname, search + hash);
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
