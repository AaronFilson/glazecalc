import { Component, OnInit, afterNextRender, computed, inject, Injector, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import {
  ConnectionRow,
  ConnectionsService,
  type ConfirmChanges,
  type ActivityLine,
  type ChangeCounts,
  type MovedEntry
} from '../../core/connections.service';
import { errorMessage } from '../../core/error-message';
import { DatePipe } from '../../shared/format-pipes';
import { Notices, NoticesList } from '../../shared/notices';
import { PageHeader } from '../../shared/page-header';

/** The name of each kind of record, as the Trash shows it (the notebook messages). */
const KINDS: Record<string, string> = {
  recipes: marker('notebook.trash.kinds.recipes'),
  materials: marker('notebook.trash.kinds.materials'),
  additives: marker('notebook.trash.kinds.additives'),
  notes: marker('notebook.trash.kinds.notes'),
  firing: marker('notebook.trash.kinds.firing'),
  advice: marker('notebook.trash.kinds.advice')
};
const OTHER_KIND = marker('notebook.trash.kinds.other');

/** The words for each thing a connection does to a record, and for its count. */
const ACTIONS: Record<keyof ChangeCounts, { line: string; count: string }> = {
  create: { line: marker('account.apps.action.create'), count: marker('account.apps.count.create') },
  change: { line: marker('account.apps.action.change'), count: marker('account.apps.count.change') },
  trash: { line: marker('account.apps.action.trash'), count: marker('account.apps.count.trash') },
  restore: { line: marker('account.apps.action.restore'), count: marker('account.apps.count.restore') },
  undo: { line: marker('account.apps.action.undo'), count: marker('account.apps.count.undo') }
};
/** The choices of when changes wait for approval, with their words. */
const CONFIRM_CHOICES: ReadonlyArray<{ choice: ConfirmChanges; label: string; hint: string }> = [
  { choice: 'off', label: marker('account.apps.confirm.off'), hint: marker('account.apps.confirm.offHint') },
  {
    choice: 'removals',
    label: marker('account.apps.confirm.removals'),
    hint: marker('account.apps.confirm.removalsHint')
  },
  { choice: 'all', label: marker('account.apps.confirm.all'), hint: marker('account.apps.confirm.allHint') }
];
const ACTION_ORDER = ['create', 'change', 'trash', 'restore', 'undo'] as const;

/** What one expanded row shows: its activity and the Trash it filled. */
interface Detail {
  loading: boolean;
  failed: boolean;
  activity: ActivityLine[];
  next: string | null;
  moved: MovedEntry[];
  /** Older activity being fetched. */
  more: boolean;
}

/**
 * Connected apps (docs/integrations-plan.md, items 3 and 27): every personal
 * access token and OAuth connection of the account, with what it may do, when
 * it was made and last used, and, opened out, what it did in the last 90 days
 * and the Trash it filled, which can be put back one by one or all at once.
 * Each can be revoked, or all of them, after a confirming click. Making a token
 * stays on the account page.
 */
@Component({
  selector: 'gc-connections-page',
  imports: [DatePipe, NoticesList, PageHeader, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('account.apps.title')" [lead]="t('account.apps.lead')" />

    <gc-notices [notices]="notices" />

    <section class="panel" aria-labelledby="confirm-heading">
      <h2 class="h3" id="confirm-heading">{{ t('account.apps.confirm.heading') }}</h2>
      <p>{{ t('account.apps.confirm.intro') }}</p>
      @if (service.confirmChanges(); as current) {
        <fieldset class="confirm-choices" [attr.aria-busy]="savingConfirm() || null">
          <legend class="visually-hidden">{{ t('account.apps.confirm.heading') }}</legend>
          @for (option of CONFIRM_CHOICES; track option.choice) {
            @let choice = option.choice;
            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                name="confirm-changes"
                [id]="'confirm-' + choice"
                [value]="choice"
                [checked]="current === choice"
                [attr.aria-describedby]="'confirm-' + choice + '-hint'"
                (change)="chooseConfirm(choice)"
              />
              <label class="form-check-label" [for]="'confirm-' + choice">{{ t(option.label) }}</label>
              <div class="form-text" [id]="'confirm-' + choice + '-hint'">{{ t(option.hint) }}</div>
            </div>
          }
        </fieldset>
        <p class="small muted">{{ t('account.apps.confirm.how') }}</p>
      }
    </section>

    <section class="panel" aria-labelledby="apps-heading">
      <h2 class="h3" id="apps-heading" tabindex="-1">{{ t('account.apps.listHeading') }}</h2>
      <p>
        <a routerLink="/account" fragment="tokens-heading">{{ t('account.apps.makeToken') }}</a>
        ·
        <a routerLink="/assistants">{{ t('account.tokens.howTo') }}</a>
      </p>
      @if (loadFailed()) {
        <p class="muted">{{ t('account.apps.loadFailed') }}</p>
      } @else if (service.list(); as list) {
        @if (list.length) {
          <ul class="connection-list" [attr.aria-label]="t('account.apps.listLabel')">
            @for (row of list; track row.id) {
              <li class="connection-row" [class.ended]="!row.working">
                <div class="connection-head">
                  <div class="connection-name">
                    <h3 class="h5">{{ row.name }}</h3>
                    <p class="small muted">
                      {{ row.kind === 'oauth' ? t('account.apps.kindOauth') : t('account.apps.kindToken') }}
                      @if (row.hint) {
                        · {{ t('account.tokens.hint', { hint: row.hint }) }}
                      }
                      · {{ row.access === 'write' ? t('account.tokens.readWrite') : t('account.tokens.readOnly') }}
                    </p>
                    @if (row.clientHost || row.redirectHost) {
                      <p class="small muted">
                        @if (row.clientHost) {
                          {{ t('account.apps.clientHost', { host: row.clientHost }) }}
                        }
                        @if (row.redirectHost) {
                          {{ row.clientHost ? '·' : '' }}
                          {{ t('account.apps.redirectHost', { host: row.redirectHost }) }}
                        }
                      </p>
                    }
                    <p class="small muted">
                      {{ t('account.tokens.created', { date: (row.createdAt | gcDate: 'medium') }) }} ·
                      @if (row.lastUsedAt) {
                        {{ t('account.tokens.lastUsed', { date: (row.lastUsedAt | gcDate: 'medium') }) }}
                      } @else {
                        {{ t('account.tokens.neverUsed') }}
                      }
                      ·
                      @if (row.revokedAt) {
                        {{ t('account.tokens.revokedOn', { date: (row.revokedAt | gcDate: 'medium') }) }}
                      } @else if (row.working) {
                        {{ t('account.tokens.expires', { date: (row.expiresAt | gcDate: 'medium') }) }}
                      } @else {
                        {{ t('account.tokens.expiredOn', { date: (row.expiresAt | gcDate: 'medium') }) }}
                      }
                    </p>
                    @if (row.noConfirm) {
                      <p class="small muted">{{ t('account.apps.confirm.exempt') }}</p>
                    }
                    <p class="small counts">
                      @if (counted(row.changes).length) {
                        {{ t('account.apps.last90') }}
                        @for (kind of counted(row.changes); track kind; let last = $last) {
                          {{ t(ACTIONS[kind].count, { count: row.changes[kind] }) }}{{ last ? '.' : ',' }}
                        }
                      } @else {
                        {{ t('account.apps.nothingDone') }}
                      }
                    </p>
                  </div>
                  <div class="connection-actions">
                    <button
                      type="button"
                      class="btn btn-light border btn-sm toggle-details"
                      [attr.aria-expanded]="isOpen(row.id)"
                      [attr.aria-controls]="'details-' + row.id"
                      [attr.aria-label]="
                        isOpen(row.id)
                          ? t('account.apps.hideNamed', { name: row.name })
                          : t('account.apps.showNamed', { name: row.name })
                      "
                      (click)="toggle(row)"
                    >
                      {{ isOpen(row.id) ? t('account.apps.hide') : t('account.apps.show') }}
                    </button>
                    @if (row.working) {
                      @if (asking() === row.id) {
                        <span
                          class="confirm"
                          role="group"
                          [attr.aria-label]="t('account.apps.revokeQuestion', { name: row.name })"
                        >
                          <span>{{ t('account.apps.revokeQuestion', { name: row.name }) }}</span>
                          <button
                            type="button"
                            class="btn btn-outline-danger btn-sm"
                            [attr.aria-disabled]="busy() || null"
                            (click)="revoke(row)"
                          >
                            {{ t('account.apps.revokeYes') }}
                          </button>
                          <button type="button" class="btn btn-light border btn-sm" (click)="asking.set(null)">
                            {{ t('remove.cancel') }}
                          </button>
                        </span>
                      } @else {
                        <button
                          type="button"
                          class="btn btn-outline-secondary btn-sm revoke-one"
                          [attr.aria-label]="t('account.tokens.revokeNamed', { name: row.name })"
                          (click)="ask(row.id)"
                        >
                          {{ t('account.tokens.revoke') }}
                        </button>
                      }
                    }
                  </div>
                </div>

                @if (detail(row.id); as d) {
                  <div class="connection-details" [id]="'details-' + row.id">
                    @if (d.failed) {
                      <p class="muted">{{ t('account.apps.detailFailed') }}</p>
                    } @else if (d.loading) {
                      <p class="muted">{{ t('account.apps.loading') }}</p>
                    } @else {
                      <h4 class="h6">{{ t('account.apps.movedHeading') }}</h4>
                      @if (d.moved.length) {
                        <ul class="moved-list">
                          @for (entry of d.moved; track entry._id) {
                            <li>
                              <span class="moved-what">
                                <strong>{{ entry.title || t('notebook.trash.untitled') }}</strong>
                                <span class="small muted">
                                  {{ t(kindOf(entry.fromCollection)) }} ·
                                  {{ t('notebook.trash.goesOn', { date: (entry.expiresAt | gcDate) }) }}
                                </span>
                              </span>
                              <button
                                type="button"
                                class="btn btn-outline-primary btn-sm"
                                [attr.aria-label]="
                                  t('notebook.trash.putBackName', { name: entry.title || t('notebook.trash.untitled') })
                                "
                                [attr.aria-disabled]="busy() || null"
                                (click)="putBack(row, entry)"
                              >
                                {{ t('notebook.trash.putBack') }}
                              </button>
                            </li>
                          }
                        </ul>
                        <button
                          type="button"
                          class="btn btn-outline-primary btn-sm put-all-back"
                          [attr.aria-disabled]="busy() || null"
                          (click)="putAllBack(row)"
                        >
                          {{ t('account.apps.putAllBack') }}
                        </button>
                      } @else {
                        <p class="muted">{{ t('account.apps.movedNone') }}</p>
                      }

                      <h4 class="h6 activity-heading">{{ t('account.apps.activityHeading') }}</h4>
                      @if (d.activity.length) {
                        <ul class="activity-list">
                          @for (line of d.activity; track line.id) {
                            <li>
                              <span class="small muted">{{ line.at | gcDate: 'medium' }}</span>
                              {{ t(ACTIONS[line.action].line) }}
                              <strong>{{ line.title || t('notebook.trash.untitled') }}</strong>
                              <span class="small muted">({{ t(kindOf(line.fromCollection)) }})</span>
                            </li>
                          }
                        </ul>
                        @if (d.next) {
                          <button
                            type="button"
                            class="btn btn-light border btn-sm older"
                            [attr.aria-disabled]="d.more || null"
                            (click)="older(row)"
                          >
                            {{ t('account.apps.older') }}
                          </button>
                        }
                      } @else {
                        <p class="muted">{{ t('account.apps.activityNone') }}</p>
                      }
                    }
                  </div>
                }
              </li>
            }
          </ul>

          @if (workingCount() > 0) {
            <div class="revoke-all-row">
              @if (asking() === 'all') {
                <span class="confirm" role="group" aria-labelledby="revoke-all-question">
                  <span id="revoke-all-question">{{
                    t('account.apps.revokeAllQuestion', { count: workingCount() })
                  }}</span>
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm revoke-all-yes"
                    [attr.aria-disabled]="busy() || null"
                    (click)="revokeAll()"
                  >
                    {{ t('account.apps.revokeYes') }}
                  </button>
                  <button type="button" class="btn btn-light border btn-sm" (click)="asking.set(null)">
                    {{ t('remove.cancel') }}
                  </button>
                </span>
              } @else {
                <button type="button" class="btn btn-outline-danger revoke-all" (click)="ask('all')">
                  {{ t('account.apps.revokeAll') }}
                </button>
              }
            </div>
          }
        } @else {
          <p class="muted apps-none">{{ t('account.apps.none') }}</p>
        }
      }
    </section>
  </ng-container>`,
  styles: `
    .connection-list,
    .moved-list,
    .activity-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .connection-row {
      padding: 0.75rem 0;
    }
    .connection-row + .connection-row {
      border-top: 1px solid var(--gc-border);
    }
    .connection-row.ended .connection-name {
      opacity: 0.75;
    }
    .connection-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.5rem 1rem;
    }
    .connection-name {
      min-width: 0;
      flex: 1 1 18rem;
      overflow-wrap: anywhere;
    }
    .connection-name h3,
    .connection-name p {
      margin: 0;
    }
    .connection-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .connection-details {
      margin-top: 0.75rem;
      padding-left: 0.75rem;
      border-left: 3px solid var(--gc-border);
    }
    .moved-list > li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem 1rem;
      padding: 0.35rem 0;
    }
    .moved-what {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .activity-list > li {
      padding: 0.2rem 0;
      overflow-wrap: anywhere;
    }
    .activity-heading {
      margin-top: 1rem;
    }
    .revoke-all-row {
      margin-top: 1rem;
    }
    .confirm-choices .form-check + .form-check {
      margin-top: 0.5rem;
    }
    .confirm {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0.5rem;
      padding: 0.35rem 0.6rem;
      background: var(--gc-danger-bg);
      border-radius: var(--gc-radius);
      color: var(--gc-danger-text);
    }
  `
})
export class ConnectionsPage implements OnInit {
  protected readonly service = inject(ConnectionsService);
  private readonly injector = inject(Injector);

  protected readonly ACTIONS = ACTIONS;
  protected readonly CONFIRM_CHOICES = CONFIRM_CHOICES;
  protected readonly savingConfirm = signal(false);
  protected readonly notices = new Notices();
  protected readonly loadFailed = signal(false);
  protected readonly busy = signal(false);
  /** The connection (its id), or 'all', whose Revoke is waiting for its confirming click. */
  protected readonly asking = signal<string | null>(null);
  private readonly open = signal<ReadonlyMap<string, Detail>>(new Map());
  protected readonly workingCount = computed(() => this.service.list()?.filter((row) => row.working).length ?? 0);

  async ngOnInit(): Promise<void> {
    try {
      await this.service.load();
    } catch {
      this.loadFailed.set(true);
    }
  }

  /** Saves when changes wait for approval; on failure the choice shown goes back to the one saved. */
  protected async chooseConfirm(choice: ConfirmChanges): Promise<void> {
    const before = this.service.confirmChanges();
    if (choice === before || this.savingConfirm()) return;
    this.savingConfirm.set(true);
    try {
      this.notices.success(await this.service.setConfirmChanges(choice), 'confirm');
    } catch (err) {
      // The radio clicked is checked in the page; the one saved is checked again.
      const saved = document.querySelector<HTMLInputElement>('#confirm-' + before);
      if (saved) saved.checked = true;
      this.notices.error(errorMessage(err, translate('account.apps.confirm.saveFailed')));
    } finally {
      this.savingConfirm.set(false);
    }
  }

  protected kindOf(collection: string): string {
    return KINDS[collection] ?? OTHER_KIND;
  }

  /** The actions this connection took in the last 90 days, in the order they are said. */
  protected counted(changes: ChangeCounts): Array<keyof ChangeCounts> {
    return ACTION_ORDER.filter((kind) => changes[kind] > 0);
  }

  protected isOpen(id: string): boolean {
    return this.open().has(id);
  }

  protected detail(id: string): Detail | undefined {
    return this.open().get(id);
  }

  private setDetail(id: string, change: Partial<Detail> | null): void {
    this.open.update((all) => {
      const next = new Map(all);
      if (change === null) next.delete(id);
      else next.set(id, { ...(all.get(id) ?? EMPTY), ...change });
      return next;
    });
  }

  protected async toggle(row: ConnectionRow): Promise<void> {
    if (this.isOpen(row.id)) return this.setDetail(row.id, null);
    this.setDetail(row.id, { loading: true });
    await this.fill(row.id);
  }

  /** Reads a connection's first page of activity and its Trash. */
  private async fill(id: string): Promise<void> {
    try {
      const [page, moved] = await Promise.all([this.service.activity(id), this.service.moved(id)]);
      this.setDetail(id, { loading: false, failed: false, activity: page.activity, next: page.next, moved });
    } catch {
      this.setDetail(id, { loading: false, failed: true });
    }
  }

  protected async older(row: ConnectionRow): Promise<void> {
    const d = this.detail(row.id);
    if (!d?.next || d.more) return;
    this.setDetail(row.id, { more: true });
    try {
      const page = await this.service.activity(row.id, d.next);
      this.setDetail(row.id, { activity: [...d.activity, ...page.activity], next: page.next, more: false });
    } catch (err) {
      this.setDetail(row.id, { more: false });
      this.notices.error(errorMessage(err, translate('account.apps.detailFailed')));
    }
  }

  protected ask(what: string): void {
    this.asking.set(what);
    afterNextRender(() => document.querySelector<HTMLElement>('.confirm button.btn-outline-danger')?.focus(), {
      injector: this.injector
    });
  }

  protected async revoke(row: ConnectionRow): Promise<void> {
    await this.run(async () => {
      this.notices.success(await this.service.revoke(row.id), 'apps');
      this.asking.set(null);
    }, 'account.apps.revokeFailed');
  }

  protected async revokeAll(): Promise<void> {
    await this.run(async () => {
      this.notices.success(await this.service.revokeAll(), 'apps');
      this.asking.set(null);
    }, 'account.apps.revokeFailed');
  }

  protected async putBack(row: ConnectionRow, entry: MovedEntry): Promise<void> {
    await this.run(async () => {
      try {
        await this.service.putBack(entry._id);
        this.notices.success(
          translate('notebook.trash.restored', { name: entry.title || translate('notebook.trash.untitled') }),
          'apps'
        );
      } catch (err) {
        // Already back, or its place is taken: reading the list again shows what is left.
        const status = (err as { status?: number }).status;
        if (status !== 404 && status !== 409) throw err;
        this.notices.success(
          translate('notebook.trash.restoredAlready', { name: entry.title || translate('notebook.trash.untitled') }),
          'apps'
        );
      }
      await this.refresh(row.id);
    }, 'account.apps.restoreFailed');
  }

  protected async putAllBack(row: ConnectionRow): Promise<void> {
    await this.run(async () => {
      this.notices.success(await this.service.putAllBack(row.id), 'apps');
      await this.refresh(row.id);
    }, 'account.apps.restoreFailed');
  }

  /** Reads the list again, and the open row's activity and Trash. */
  private async refresh(id: string): Promise<void> {
    await this.service.load().catch(() => undefined);
    if (this.isOpen(id)) await this.fill(id);
  }

  private async run(action: () => Promise<void>, failed: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await action();
    } catch (err) {
      this.notices.error(errorMessage(err, translate(failed)));
    } finally {
      this.busy.set(false);
    }
  }
}

const EMPTY: Detail = { loading: false, failed: false, activity: [], next: null, moved: [], more: false };
