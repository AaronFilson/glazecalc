import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, afterNextRender, inject, Injector, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { said, type Said } from '../../core/tokens.service';
import { DatePipe } from '../../shared/format-pipes';
import { PageHeader } from '../../shared/page-header';

/** A change waiting for approval, as GET /api/pending-changes/:id shows it to the account (server/routes/pending_change_routes.ts). */
export interface PendingChangeView {
  id: string;
  status: string;
  /** What the change is, in the server's own words: a message code and its values. */
  summary: Said;
  removal: boolean;
  /** The token's name, or the name the connected app gave itself. */
  client: string;
  via: 'pat' | 'oauth';
  tokenId: string;
  createdAt: string;
  expiresAt: string;
  /** Other changes waiting from the same app or token. */
  othersWaiting: number;
}

/** What came of the person's answer. */
interface Answer {
  text: string;
  /** Why an approved change was not made, in the server's words. */
  reason?: string;
  made: boolean;
}

/**
 * Approve a change (docs/adr/0025-confirm-before-changes.md): the page an
 * assistant, app or script links to when the account asks to confirm changes.
 * It shows what the change is in the server's own words and who asked, and
 * makes it only when the person, signed in as the account, presses Approve.
 * Nothing is focused or pressed for them: the page's heading takes the focus,
 * never the Approve button, so a key pressed by habit approves nothing. The
 * page is private: its address names the change, so no Referer carries it.
 */
@Component({
  selector: 'gc-confirm-page',
  imports: [DatePipe, PageHeader, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('account.confirm.title')" [lead]="t('account.confirm.lead')" />

    <section class="panel" aria-live="polite">
      @switch (state()) {
        @case ('loading') {
          <p class="muted">{{ t('account.apps.loading') }}</p>
        }
        @case ('signed-out') {
          <p class="signed-out">{{ t('account.confirm.signIn') }}</p>
          <a class="btn btn-primary" routerLink="/signin">{{ t('account.confirm.signInLink') }}</a>
        }
        @case ('missing') {
          <p class="missing">{{ t('account.confirm.notFound') }}</p>
          <a routerLink="/account/apps">{{ t('account.confirm.apps') }}</a>
        }
        @case ('failed') {
          <p class="muted">{{ t('account.confirm.loadFailed') }}</p>
        }
        @case ('answered') {
          @if (answer(); as a) {
            <p class="answer" [class.made]="a.made">{{ a.text }}</p>
            @if (a.reason) {
              <p class="small muted reason">{{ a.reason }}</p>
            }
          }
          <a routerLink="/account/apps">{{ t('account.confirm.apps') }}</a>
        }
        @default {
          @if (change(); as c) {
            <h2 class="h4 summary" id="change-summary" tabindex="-1">{{ summaryOf(c) }}</h2>
            <p class="from">
              {{
                t('account.confirm.from', {
                  name: c.client
                })
              }}
              ({{ c.via === 'oauth' ? t('account.confirm.fromApp') : t('account.confirm.fromToken') }})
            </p>
            <p class="small muted">
              {{
                t('account.confirm.asked', {
                  date: (c.createdAt | gcDate: 'moment'),
                  time: (c.expiresAt | gcDate: 'time')
                })
              }}
            </p>
            @if (c.removal) {
              <p class="removal">{{ t('account.confirm.removal') }}</p>
            }
            <p>{{ t('account.confirm.check') }}</p>
            @if (error()) {
              <p class="text-danger error" role="alert">{{ error() }}</p>
            }
            <div class="actions">
              <button
                type="button"
                class="btn btn-primary approve"
                aria-describedby="change-summary"
                [attr.aria-disabled]="busy() || null"
                (click)="decide('approve')"
              >
                {{ t('account.confirm.approve') }}
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary decline"
                [attr.aria-disabled]="busy() || null"
                (click)="decide('decline')"
              >
                {{ t('account.confirm.decline') }}
              </button>
            </div>
            @if (c.othersWaiting > 0) {
              <p class="approve-all-row">
                <button
                  type="button"
                  class="btn btn-link approve-all"
                  [attr.aria-disabled]="busy() || null"
                  (click)="approveAll(c)"
                >
                  {{ t('account.confirm.approveAll', { count: c.othersWaiting, name: c.client }) }}
                </button>
              </p>
            }
          }
        }
      }
    </section>
  </ng-container>`,
  styles: `
    .summary {
      overflow-wrap: anywhere;
    }
    .from {
      overflow-wrap: anywhere;
    }
    .removal {
      padding: 0.5rem 0.75rem;
      background: var(--gc-danger-bg);
      border-radius: var(--gc-radius);
      color: var(--gc-danger-text);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .approve-all-row {
      margin-top: 1rem;
    }
    .approve-all {
      padding-left: 0;
      text-align: left;
    }
  `
})
export class ConfirmPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);

  protected readonly state = signal<'loading' | 'signed-out' | 'missing' | 'failed' | 'shown' | 'answered'>('loading');
  protected readonly change = signal<PendingChangeView | null>(null);
  protected readonly answer = signal<Answer | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private get url(): string {
    return this.apiBase + '/pending-changes/' + encodeURIComponent(this.route.snapshot.paramMap.get('id') ?? '');
  }

  async ngOnInit(): Promise<void> {
    await this.auth.whenChecked();
    if (!this.auth.hasSession()) {
      this.state.set('signed-out');
      return;
    }
    try {
      const change = await firstValueFrom(this.http.get<PendingChangeView>(this.url));
      if (change.status !== 'pending') {
        this.state.set('missing');
        return;
      }
      this.change.set(change);
      this.state.set('shown');
      // The heading, never the Approve button, takes the focus.
      afterNextRender(() => document.querySelector<HTMLElement>('#change-summary')?.focus(), {
        injector: this.injector
      });
    } catch (err) {
      this.state.set(err instanceof HttpErrorResponse && err.status === 404 ? 'missing' : 'failed');
    }
  }

  protected summaryOf(change: PendingChangeView): string {
    return said(change.summary);
  }

  protected async decide(how: 'approve' | 'decline'): Promise<void> {
    await this.send(async () => {
      const res = await firstValueFrom(
        this.http.post<Said & { status: string; reason?: string }>(this.url + '/' + how, {})
      );
      this.answer.set({ text: said(res), made: res.status === 'done', ...(res.reason && { reason: res.reason }) });
    });
  }

  protected async approveAll(change: PendingChangeView): Promise<void> {
    await this.send(async () => {
      // This one first, then the others from the same app.
      const own = await firstValueFrom(
        this.http.post<Said & { status: string; reason?: string }>(this.url + '/approve', {})
      );
      const rest = await firstValueFrom(
        this.http.post<Said & { made: number }>(
          this.apiBase + '/pending-changes/approve-all?tokenId=' + encodeURIComponent(change.tokenId),
          {}
        )
      );
      this.answer.set({
        text: said(own) + ' ' + said(rest),
        made: own.status === 'done',
        ...(own.reason && { reason: own.reason })
      });
    });
  }

  private async send(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
      this.state.set('answered');
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) this.state.set('missing');
      else this.error.set(errorMessage(err, translate('account.confirm.failed')));
    } finally {
      this.busy.set(false);
    }
  }
}
