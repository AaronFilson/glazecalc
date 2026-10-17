import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, afterNextRender, inject, Injector, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base';
import { errorMessage } from '../../core/error-message';
import { Busy } from '../../shared/busy';
import { DatePipe } from '../../shared/format-pipes';
import { Notices, NoticesList } from '../../shared/notices';
import { PageHeader } from '../../shared/page-header';
import { RemoveButton } from '../../shared/remove-button';

/** What GET /api/trash/getAll lists (server/routes/trash_routes.ts). */
export interface TrashEntry {
  _id: string;
  /** The kind of record: 'recipes', 'notes'. */
  fromCollection: string;
  recordId: string;
  title?: string;
  trashedAt: string;
  expiresAt: string;
  /** Removed on the website, or with an access token. */
  by?: 'session' | 'pat' | 'oauth';
}

/** The name of each kind of record, as the Trash shows it beside the record's own. */
const KINDS: Record<string, string> = {
  recipes: marker('notebook.trash.kinds.recipes'),
  materials: marker('notebook.trash.kinds.materials'),
  additives: marker('notebook.trash.kinds.additives'),
  notes: marker('notebook.trash.kinds.notes'),
  firing: marker('notebook.trash.kinds.firing'),
  advice: marker('notebook.trash.kinds.advice')
};
const OTHER_KIND = marker('notebook.trash.kinds.other');

/**
 * The Trash: records removed from any list, kept for 30 days. Each can be put
 * back where it was, or deleted for good; Empty the Trash deletes them all.
 */
@Component({
  selector: 'gc-trash-page',
  imports: [DatePipe, NoticesList, PageHeader, RemoveButton, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <gc-page-header [title]="t('notebook.trash.title')" [lead]="t('notebook.trash.lead')" />
    <gc-notices [notices]="notices" />

    <section class="panel" aria-labelledby="trash-heading">
      <h2 class="h3" id="trash-heading" tabindex="-1">{{ t('notebook.trash.listHeading') }}</h2>
      @if (entries().length) {
        <ul class="trash-list">
          @for (entry of entries(); track entry._id) {
            <li>
              <div class="trash-what">
                <h3 class="h5">{{ nameOf(entry) }}</h3>
                <p class="small muted">
                  {{ t(kindOf(entry)) }} · {{ t('notebook.trash.removedOn', { date: (entry.trashedAt | gcDate) }) }} ·
                  {{ t('notebook.trash.goesOn', { date: (entry.expiresAt | gcDate) }) }}
                  @if (entry.by === 'pat' || entry.by === 'oauth') {
                    · {{ t('notebook.trash.byApp') }}
                  }
                </p>
              </div>
              <div class="trash-actions">
                <button
                  type="button"
                  class="btn btn-outline-primary btn-sm"
                  [attr.aria-label]="t('notebook.trash.putBackName', { name: nameOf(entry) })"
                  [attr.aria-disabled]="pending().has(entry._id) || null"
                  (click)="putBack(entry)"
                >
                  {{ t('notebook.trash.putBack') }}
                </button>
                <gc-remove-button
                  forGood
                  [name]="nameOf(entry)"
                  [busy]="pending().has(entry._id)"
                  [problem]="problems().get(entry._id) ?? ''"
                  (confirmed)="deleteForGood(entry)"
                />
              </div>
            </li>
          }
        </ul>

        <div class="trash-empty-all">
          @if (askingEmpty()) {
            <span class="remove-confirm" role="group" aria-labelledby="trash-empty-question">
              <span id="trash-empty-question">{{
                t('notebook.trash.emptyQuestion', { count: entries().length })
              }}</span>
              <button type="button" class="btn btn-outline-danger btn-sm" (click)="emptyTrash()">
                {{ emptying.active() ? t('notebook.trash.emptying') : t('notebook.trash.emptyYes') }}
              </button>
              <button
                id="trash-empty-cancel"
                type="button"
                class="btn btn-light border btn-sm"
                (click)="askingEmpty.set(false)"
              >
                {{ t('remove.cancel') }}
              </button>
            </span>
          } @else {
            <button type="button" class="btn btn-outline-danger" (click)="askEmpty()">
              {{ t('notebook.trash.empty') }}
            </button>
          }
        </div>
      } @else if (loaded()) {
        <p class="muted trash-none">{{ t('notebook.trash.none') }}</p>
      }
    </section>
  </ng-container>`,
  styles: `
    .trash-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .trash-list > li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      padding: 0.75rem 0;
    }
    .trash-list > li + li {
      border-top: 1px solid var(--gc-border);
    }
    .trash-what {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .trash-what h3,
    .trash-what p {
      margin: 0;
    }
    .trash-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .trash-empty-all {
      margin-top: 1rem;
    }
    .remove-confirm {
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
export class TrashPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_BASE) + '/trash';
  private readonly injector = inject(Injector);

  protected readonly notices = new Notices();
  protected readonly entries = signal<TrashEntry[]>([]);
  /** The list has been asked for: until then, "The Trash is empty" would be premature. */
  protected readonly loaded = signal(false);
  /** The entries being put back or deleted. */
  protected readonly pending = signal<ReadonlySet<string>>(new Set());
  /** Why an entry could not be deleted, by _id. */
  protected readonly problems = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly askingEmpty = signal(false);
  protected readonly emptying = new Busy();

  async ngOnInit(): Promise<void> {
    try {
      this.entries.set(await firstValueFrom(this.http.get<TrashEntry[]>(this.url + '/getAll')));
    } catch {
      this.notices.error(translate('notebook.trash.fetchFailed'));
    } finally {
      this.loaded.set(true);
    }
  }

  /** The key of the name of the entry's kind of record. */
  protected kindOf(entry: TrashEntry): string {
    return KINDS[entry.fromCollection] ?? OTHER_KIND;
  }

  protected nameOf(entry: TrashEntry): string {
    return entry.title || translate('notebook.trash.untitled');
  }

  protected async putBack(entry: TrashEntry): Promise<void> {
    if (!this.start(entry)) return;
    const name = this.nameOf(entry);
    try {
      await firstValueFrom(this.http.post(this.url + '/restore/' + entry._id, {}));
      this.drop(entry);
      this.notices.success(translate('notebook.trash.restored', { name }), 'trash');
    } catch (err) {
      // Put back already, in another tab or by an earlier try whose answer was lost.
      if (err instanceof HttpErrorResponse && (err.status === 404 || err.status === 409)) {
        this.drop(entry);
        this.notices.success(translate('notebook.trash.restoredAlready', { name }), 'trash');
      } else {
        this.notices.error(errorMessage(err, translate('notebook.trash.restoreFailed', { name })));
      }
    } finally {
      this.finish(entry);
    }
  }

  protected async deleteForGood(entry: TrashEntry): Promise<void> {
    if (!this.start(entry)) return;
    const name = this.nameOf(entry);
    this.setProblem(entry._id, '');
    try {
      await firstValueFrom(this.http.delete(this.url + '/delete/' + entry._id));
      this.drop(entry);
      this.notices.success(translate('notebook.trash.deleted', { name }), 'trash');
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.drop(entry);
      } else {
        this.setProblem(entry._id, errorMessage(err, translate('remove.failed')));
      }
    } finally {
      this.finish(entry);
    }
  }

  protected askEmpty(): void {
    this.askingEmpty.set(true);
    afterNextRender(() => document.getElementById('trash-empty-cancel')?.focus(), { injector: this.injector });
  }

  protected emptyTrash(): Promise<void> {
    return this.emptying.run(async () => {
      try {
        await firstValueFrom(this.http.delete(this.url + '/empty'));
        this.entries.set([]);
        this.askingEmpty.set(false);
        this.notices.success(translate('notebook.trash.emptied'), 'trash');
        afterNextRender(() => document.getElementById('trash-heading')?.focus(), { injector: this.injector });
      } catch (err) {
        this.notices.error(errorMessage(err, translate('notebook.trash.emptyFailed')));
      }
    });
  }

  /** Marks an entry as on its way; false when it already is. */
  private start(entry: TrashEntry): boolean {
    if (this.pending().has(entry._id)) return false;
    this.pending.update((ids) => new Set(ids).add(entry._id));
    return true;
  }

  private finish(entry: TrashEntry): void {
    this.pending.update((ids) => {
      const next = new Set(ids);
      next.delete(entry._id);
      return next;
    });
  }

  private drop(entry: TrashEntry): void {
    this.entries.update((list) => list.filter((other) => other._id !== entry._id));
  }

  private setProblem(id: string, problem: string): void {
    this.problems.update((problems) => {
      const next = new Map(problems);
      if (problem) next.set(id, problem);
      else next.delete(id);
      return next;
    });
  }
}
