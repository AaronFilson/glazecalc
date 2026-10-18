import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base';
import { errorMessage } from '../../core/error-message';
import { DatePipe } from '../../shared/format-pipes';

/** A recipe the account shares, as GET /api/share/recipes lists it (server/routes/share_routes.ts). */
export interface SharedRecipe {
  recipeId: string;
  title: string;
  createdAt: string;
  includeNotes: boolean;
}

/**
 * "Shared recipes" on the account page: every recipe the account shares by
 * link (docs/adr/0020-share-links.md), with Stop sharing for each. The list
 * never has a link: a link is shown once, when it is made, and only its
 * fingerprint is kept. A trial cannot share, so it does not show this.
 */
@Component({
  selector: 'gc-shared-recipes',
  imports: [DatePipe, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="auth-text" aria-labelledby="shared-heading">
      <h2 id="shared-heading" tabindex="-1">{{ t('account.shared.heading') }}</h2>
      <p>{{ t('account.shared.text') }}</p>
      @if (problem()) {
        <p class="text-danger" role="alert">{{ problem() }}</p>
      }
      @if (said()) {
        <p class="shared-said" role="status">{{ said() }}</p>
      }
      @if (list().length) {
        <ul class="shared-list">
          @for (row of list(); track row.recipeId) {
            <li>
              <div class="shared-what">
                <a [routerLink]="['/recipe']" [queryParams]="{ open: row.recipeId }">{{
                  row.title || t('account.shared.untitled')
                }}</a>
                <span class="small muted">
                  {{ t('account.shared.since', { date: (row.createdAt | gcDate) }) }} ·
                  {{ row.includeNotes ? t('account.shared.notesShown') : t('account.shared.notesHidden') }}
                </span>
              </div>
              <button
                type="button"
                class="btn btn-light border btn-sm"
                [attr.aria-label]="t('account.shared.stopName', { name: row.title || t('account.shared.untitled') })"
                [attr.aria-disabled]="pending().has(row.recipeId) || null"
                (click)="stop(row)"
              >
                {{ t('account.shared.stop') }}
              </button>
            </li>
          }
        </ul>
      } @else if (loaded()) {
        <p class="muted shared-none">{{ t('account.shared.none') }}</p>
      }
    </section>
  </ng-container>`,
  styles: `
    .shared-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .shared-list > li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      padding: 0.6rem 0;
    }
    .shared-list > li + li {
      border-top: 1px solid var(--gc-border);
    }
    .shared-what {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow-wrap: anywhere;
    }
  `
})
export class SharedRecipes implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE) + '/share';

  protected readonly list = signal<SharedRecipe[]>([]);
  protected readonly loaded = signal(false);
  protected readonly pending = signal<ReadonlySet<string>>(new Set());
  protected readonly problem = signal('');
  protected readonly said = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.list.set(await firstValueFrom(this.http.get<SharedRecipe[]>(this.base + '/recipes')));
    } catch (err) {
      this.problem.set(errorMessage(err, translate('account.shared.fetchFailed')));
    } finally {
      this.loaded.set(true);
    }
  }

  protected async stop(row: SharedRecipe): Promise<void> {
    if (this.pending().has(row.recipeId)) return;
    this.pending.update((ids) => new Set(ids).add(row.recipeId));
    this.problem.set('');
    try {
      await firstValueFrom(this.http.delete(this.base + '/recipe/' + row.recipeId));
      this.list.update((rows) => rows.filter((other) => other.recipeId !== row.recipeId));
      this.said.set(translate('account.shared.stopped', { name: row.title || translate('account.shared.untitled') }));
    } catch (err) {
      this.problem.set(errorMessage(err, translate('account.shared.stopFailed')));
    } finally {
      this.pending.update((ids) => {
        const next = new Set(ids);
        next.delete(row.recipeId);
        return next;
      });
    }
  }
}
