import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';
import { errorMessage } from './core/error-message';

/** The pages in the main menu once signed in, in the order a potter uses them. */
const APP_PAGES = [
  { path: '/recipe', label: 'Recipes' },
  { path: '/material', label: 'Materials' },
  { path: '/additive', label: 'Additives' },
  { path: '/firing', label: 'Firing logs' },
  { path: '/notes', label: 'Notes' },
  { path: '/advice', label: 'Advice' },
  { path: '/guides', label: 'Guides' }
];

@Component({
  selector: 'gc-root',
  imports: [DatePipe, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <!-- For keyboard and screen reader users: past the menu, straight to the page. Hidden until focused. -->
    <a class="skip-link" href="#main" (click)="skipToContent($event, main)">Skip to content</a>
    <header class="app-header">
      <nav class="app-nav" aria-label="Main">
        <a class="brand" [routerLink]="auth.hasSession() ? '/home' : '/'">
          <img src="/images/logo.webp" alt="" width="30" height="30" />
          Glazecalc
        </a>
        <!-- On a phone the menu is folded away; returning visitors sign in without opening it. -->
        @if (!auth.hasSession()) {
          <a routerLink="/signin" class="nav-quick-signin">Sign in</a>
        }
        <button
          type="button"
          class="btn btn-light btn-sm nav-toggle"
          aria-controls="main-menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="menuOpen.set(!menuOpen())"
        >
          Menu
        </button>
        <div id="main-menu" class="nav-menu" [class.open]="menuOpen()">
          @if (auth.hasSession()) {
            <ul class="nav-links">
              @for (page of pages; track page.path) {
                <li>
                  <a [routerLink]="page.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{
                    page.label
                  }}</a>
                </li>
              }
            </ul>
            <div class="nav-account">
              <a routerLink="/account" class="account-email" title="Your account and settings">{{
                auth.displayName() ?? 'Account'
              }}</a>
              <!-- A trial has no password to come back with; the trial bar offers its way out. -->
              @if (!auth.trial()) {
                <button type="button" class="btn btn-light btn-sm" (click)="logout()">Sign out</button>
              }
            </div>
          } @else {
            <ul class="nav-links">
              <li><a routerLink="/guides" routerLinkActive="active" ariaCurrentWhenActive="page">Guides</a></li>
              <li><a routerLink="/advice" routerLinkActive="active" ariaCurrentWhenActive="page">Advice</a></li>
              <li><a routerLink="/about" routerLinkActive="active" ariaCurrentWhenActive="page">About</a></li>
            </ul>
            <div class="nav-account">
              <a routerLink="/signin">Sign in</a>
              <a routerLink="/signup" class="btn btn-primary btn-sm">Create a free account</a>
            </div>
          }
        </div>
      </nav>
      @if (auth.trial(); as trial) {
        <section class="trial-bar" aria-label="Your trial">
          <div class="trial-bar-inner">
            @if (!confirmingDiscard()) {
              <p>
                You're trying Glazecalc as <strong>{{ trial.name }}</strong
                >. Your work is kept until {{ trial.expiresAt | date: 'EEEE, MMMM d' }}.
              </p>
              <div class="trial-actions">
                <a routerLink="/signup" class="btn btn-primary btn-sm">Create an account to keep it</a>
                <button type="button" class="btn btn-light btn-sm" (click)="confirmingDiscard.set(true)">
                  Discard trial
                </button>
              </div>
            } @else {
              <p>Discard everything you made in this trial? This cannot be undone.</p>
              <div class="trial-actions">
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  [disabled]="discarding()"
                  (click)="discard()"
                >
                  Discard it
                </button>
                <button type="button" class="btn btn-light btn-sm" (click)="confirmingDiscard.set(false)">
                  Keep trying
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
      <router-outlet />
    </main>

    <!-- Shown once the first page is in place, so it does not paint at the bottom of the window and then jump. -->
    @if (ready()) {
      <footer class="app-footer">
        <nav aria-label="Site">
          <a routerLink="/about">About</a>
          <a routerLink="/guides">Guides</a>
          <a routerLink="/advice">Glaze advice</a>
          <a routerLink="/privacy">Privacy</a>
          <a href="https://github.com/AaronFilson/glazecalc">Source code</a>
          <a href="https://github.com/AaronFilson/glazecalc/issues">Report a problem</a>
          <a href="https://updraftpotterystudio.com/">Handmade pottery: Updraft Pottery Studio</a>
        </nav>
        <p>© 2017–2026 Aaron Filson / Candling Development Studio · Free and open source (MIT License)</p>
      </footer>
    }
  `
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly pages = APP_PAGES;
  protected readonly menuOpen = signal(false);
  protected readonly ready = signal(false);
  protected readonly confirmingDiscard = signal(false);
  protected readonly discarding = signal(false);
  protected readonly discardError = signal('');

  constructor() {
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
      this.discardError.set(errorMessage(err, 'Could not discard the trial. Please try again.'));
    } finally {
      this.discarding.set(false);
    }
  }
}
