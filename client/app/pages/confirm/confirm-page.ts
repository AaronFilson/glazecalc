import { NgTemplateOutlet } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, afterNextRender, computed, inject, Injector, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/error-message';
import { said, type Said } from '../../core/tokens.service';
import { forwardArrow } from '../../shared/bidi';
import { DatePipe } from '../../shared/format-pipes';
import { PageHeader } from '../../shared/page-header';

/** One field a change sets: as it is now (absent for a new record) and as it would be. */
export interface FieldChange {
  field: string;
  before?: string;
  after: string;
}

/** A change as its page shows it (server/routes/pending_change_routes.ts viewOf). */
export interface ChangeView {
  id: string;
  status: string;
  /** What the change is, in the server's own words: a message code and its values. */
  summary: Said;
  removal: boolean;
  createdAt: string;
  expiresAt: string;
  /** Each field it sets, as it is now and would be. */
  changes: FieldChange[];
  /** For a removal: what the record was called before this app changed it, and how long ago it did. */
  history: { titleBefore?: string; minutesAgo: number } | null;
}

/** A change waiting for approval, as GET /api/pending-changes/:id shows it to the account. */
export interface PendingChangeView extends ChangeView {
  /** The token's name, or the name the connected app gave itself. */
  client: string;
  via: 'pat' | 'oauth';
  /** An app that registered itself: its name is only what it says about itself. */
  selfDescribed: boolean;
  tokenId: string;
  /** Once decided, what came of it. */
  result?: Said;
  /** Every other change waiting from the same app or token. */
  others: ChangeView[];
}

/** What came of the person's answer. */
interface Answer {
  text: string;
  /** Why an approved change was not made, in the server's words. */
  reason?: string;
  made: boolean;
}

/** Text longer than this is cut short on the page, with a button to show all of it. */
export const SHORT_TEXT = 300;

/**
 * Approve a change (docs/adr/0025-confirm-before-changes.md): the page an
 * assistant, app or script links to when the account asks to confirm changes.
 * It shows what the change is in the server's own words, each field it sets
 * as it is now and would be, what the app did to the record lately, and who
 * asked; and makes it only when the person, signed in as the account,
 * presses Approve. "Approve all" and "Decline all" name every change they
 * cover, and send exactly those. Nothing is focused or pressed for them: the
 * page's heading takes the focus, never the Approve button, so a key pressed
 * by habit approves nothing. The page is private: its address names the
 * change, so no Referer carries it.
 */
@Component({
  selector: 'gc-confirm-page',
  imports: [DatePipe, NgTemplateOutlet, PageHeader, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('account.confirm.title')" [lead]="t('account.confirm.lead')" />

    <ng-template #details let-c>
      @if (c.history; as h) {
        <p class="history">
          @if (h.titleBefore !== undefined) {
            {{ t('account.confirm.titleBefore', { title: h.titleBefore || t('account.confirm.untitled') }) }}
          }
          {{ t('account.confirm.changedAgo', { minutes: h.minutesAgo }) }}
        </p>
      }
      @if (c.changes.length) {
        <dl class="changes">
          @for (f of c.changes; track f.field) {
            <div class="field-change">
              <dt>{{ f.field }}</dt>
              @if (f.before !== undefined) {
                <dd class="before">
                  <span class="visually-hidden">{{ t('account.confirm.now') }}</span>
                  <bdi class="value" [class.empty]="!f.before">{{ shown(c.id, f.field, 'before', f.before) }}</bdi>
                  @if (isLong(f.before)) {
                    <button
                      type="button"
                      class="btn btn-link btn-sm show-all"
                      (click)="toggle(c.id, f.field, 'before')"
                    >
                      {{
                        isOpen(c.id, f.field, 'before') ? t('account.confirm.showLess') : t('account.confirm.showAll')
                      }}
                    </button>
                  }
                </dd>
              }
              <dd class="after">
                @if (f.before !== undefined) {
                  <span aria-hidden="true">{{ arrow() }} </span>
                }
                <span class="visually-hidden">{{ t('account.confirm.after') }}</span>
                <bdi class="value" [class.empty]="!f.after">{{ shown(c.id, f.field, 'after', f.after) }}</bdi>
                @if (isLong(f.after)) {
                  <button type="button" class="btn btn-link btn-sm show-all" (click)="toggle(c.id, f.field, 'after')">
                    {{ isOpen(c.id, f.field, 'after') ? t('account.confirm.showLess') : t('account.confirm.showAll') }}
                  </button>
                }
              </dd>
            </div>
          }
        </dl>
      }
    </ng-template>

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
        @case ('decided') {
          @if (change(); as c) {
            <h2 class="h4 summary">{{ summaryOf(c) }}</h2>
            <p class="decided">{{ t('account.confirm.decided') }} {{ c.result ? resultOf(c.result) : '' }}</p>
          }
          <a routerLink="/account/apps">{{ t('account.confirm.apps') }}</a>
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
              {{ t('account.confirm.from', { name: c.client }) }}
              @if (c.selfDescribed) {
                <span class="badge-self">{{ t('account.confirm.selfDescribed') }}</span>
              }
              ({{ c.via === 'oauth' ? t('account.confirm.fromConnectedApp') : t('account.confirm.fromToken') }})
            </p>
            @if (c.selfDescribed) {
              <p class="small muted self-note">{{ t('account.confirm.selfDescribedNote') }}</p>
            }
            <p class="small muted">
              {{
                t('account.confirm.asked', {
                  date: (c.createdAt | gcDate: 'moment'),
                  time: (c.expiresAt | gcDate: 'time')
                })
              }}
            </p>
            <ng-container *ngTemplateOutlet="details; context: { $implicit: c }" />
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
            @if (c.others.length) {
              <section class="others" aria-labelledby="others-heading">
                <h2 class="h5" id="others-heading">
                  {{ t('account.confirm.othersHeading', { count: c.others.length, name: c.client }) }}
                </h2>
                <ol class="others-list">
                  @for (o of c.others; track o.id) {
                    <li class="other">
                      <p class="other-summary">{{ summaryOf(o) }}</p>
                      <ng-container *ngTemplateOutlet="details; context: { $implicit: o }" />
                    </li>
                  }
                </ol>
                <div class="actions">
                  <button
                    type="button"
                    class="btn btn-outline-primary approve-all"
                    [attr.aria-disabled]="busy() || null"
                    (click)="allFromApp(c, 'approve')"
                  >
                    {{ t('account.confirm.approveAllShown', { count: c.others.length + 1, name: c.client }) }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-secondary decline-all"
                    [attr.aria-disabled]="busy() || null"
                    (click)="allFromApp(c, 'decline')"
                  >
                    {{ t('account.confirm.declineAll', { count: c.others.length + 1, name: c.client }) }}
                  </button>
                </div>
              </section>
            }
          }
        }
      }
    </section>
  </ng-container>`,
  styles: `
    .summary,
    .from,
    .other-summary {
      overflow-wrap: anywhere;
    }
    .removal {
      padding: 0.5rem 0.75rem;
      background: var(--gc-danger-bg);
      border-radius: var(--gc-radius);
      color: var(--gc-danger-text);
    }
    .history {
      font-weight: 600;
    }
    .changes {
      margin: 0 0 1rem;
    }
    .field-change {
      padding: 0.4rem 0;
      border-top: 1px solid var(--gc-border);
    }
    .field-change dt {
      font-weight: 600;
    }
    .field-change dd {
      margin: 0;
    }
    .value {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .value.empty::before {
      content: '—';
    }
    .before .value {
      color: var(--gc-muted);
    }
    .show-all {
      padding: 0 0.25rem;
      vertical-align: baseline;
    }
    .badge-self {
      display: inline-block;
      vertical-align: middle;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.05rem 0.45rem;
      border-radius: 999px;
      border: 1px solid var(--gc-border);
      background: var(--gc-surface-2);
      color: var(--gc-text);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .others {
      margin-top: 1.5rem;
    }
    .others-list {
      padding-inline-start: 1.25rem;
    }
    .other-summary {
      margin-bottom: 0.25rem;
    }
  `
})
export class ConfirmPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  /** Between what a field is now and what it would be: pointing the way the page reads. */
  protected readonly arrow = computed(forwardArrow);

  protected readonly state = signal<'loading' | 'signed-out' | 'missing' | 'failed' | 'shown' | 'decided' | 'answered'>(
    'loading'
  );
  protected readonly change = signal<PendingChangeView | null>(null);
  protected readonly answer = signal<Answer | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The long values shown whole. */
  private readonly open = signal<ReadonlySet<string>>(new Set());

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
      this.change.set(change);
      if (change.status !== 'pending') {
        // Decided already (here, in another tab, or by revoking the app): what came of it.
        this.state.set('decided');
        return;
      }
      this.state.set('shown');
      // The heading, never the Approve button, takes the focus.
      afterNextRender(() => document.querySelector<HTMLElement>('#change-summary')?.focus(), {
        injector: this.injector
      });
    } catch (err) {
      this.state.set(err instanceof HttpErrorResponse && err.status === 404 ? 'missing' : 'failed');
    }
  }

  protected summaryOf(change: ChangeView): string {
    return said(change.summary);
  }

  protected resultOf(result: Said): string {
    return said(result);
  }

  protected isLong(text: string | undefined): boolean {
    return (text ?? '').length > SHORT_TEXT;
  }

  protected isOpen(id: string, field: string, side: 'before' | 'after'): boolean {
    return this.open().has(id + '\n' + field + '\n' + side);
  }

  /** A value as the page shows it: cut short with "…" unless shown whole. */
  protected shown(id: string, field: string, side: 'before' | 'after', text: string | undefined): string {
    const value = text ?? '';
    return this.isLong(value) && !this.isOpen(id, field, side) ? value.slice(0, SHORT_TEXT) + '…' : value;
  }

  protected toggle(id: string, field: string, side: 'before' | 'after'): void {
    const key = id + '\n' + field + '\n' + side;
    const next = new Set(this.open());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.open.set(next);
  }

  protected async decide(how: 'approve' | 'decline'): Promise<void> {
    await this.send(async () => {
      const res = await firstValueFrom(
        this.http.post<Said & { status: string; reason?: string }>(this.url + '/' + how, {})
      );
      this.answer.set({ text: said(res), made: res.status === 'done', ...(res.reason && { reason: res.reason }) });
    });
  }

  /** Approves or declines this change and every other the page shows from the same app: exactly those, by id. */
  protected async allFromApp(change: PendingChangeView, how: 'approve' | 'decline'): Promise<void> {
    await this.send(async () => {
      const ids = [change.id, ...change.others.map((other) => other.id)];
      const res = await firstValueFrom(
        this.http.post<Said & { made?: number }>(
          this.apiBase + '/pending-changes/' + how + '-all?tokenId=' + encodeURIComponent(change.tokenId),
          { ids }
        )
      );
      this.answer.set({ text: said(res), made: how === 'approve' && (res.made ?? 0) > 0 });
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
