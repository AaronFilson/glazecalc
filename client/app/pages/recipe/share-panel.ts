import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../core/api-base';
import { errorMessage } from '../../core/error-message';
import { Busy } from '../../shared/busy';
import { DatePipe } from '../../shared/format-pipes';

/** A recipe's link, as GET /api/share/recipe/:id tells it (server/routes/share_routes.ts). */
interface ShareStatus {
  shared: boolean;
  createdAt?: string;
  includeNotes?: boolean;
}

/** The address of a shared recipe: the secret after #, which the browser never sends anywhere. */
export const shareAddress = (secret: string, origin = globalThis.location?.origin ?? ''): string =>
  origin + '/shared#' + secret;

/**
 * Share under a saved recipe's More: a read-only link that anyone can open
 * without an account (docs/adr/0020-share-links.md). The link is shown once,
 * when it is made, since only its fingerprint is kept; a new link replaces
 * it, and Stop sharing ends it. A trial is told it needs an account.
 */
@Component({
  selector: 'gc-share-panel',
  imports: [DatePipe, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="share-panel" [attr.aria-labelledby]="'share-heading-' + recipeId()">
      <h3 class="h6" [id]="'share-heading-' + recipeId()" tabindex="-1">{{ t('recipe.share.heading') }}</h3>
      @if (trial()) {
        <p>{{ t('recipe.share.trial') }}</p>
      } @else if (status(); as status) {
        <p>{{ t('recipe.share.what') }}</p>
        @if (address(); as address) {
          <label class="form-label" [for]="'share-address-' + recipeId()">{{ t('recipe.share.linkLabel') }}</label>
          <div class="input-group share-address">
            <input
              class="form-control"
              readonly
              translate="no"
              [id]="'share-address-' + recipeId()"
              [value]="address"
              [attr.aria-describedby]="'share-once-' + recipeId()"
              (focus)="$any($event.target).select()"
            />
            <button type="button" class="btn btn-primary" (click)="copy(address)">{{ t('recipe.share.copy') }}</button>
          </div>
          <p class="form-text" [id]="'share-once-' + recipeId()">{{ t('recipe.share.once') }}</p>
        } @else if (status.shared) {
          <p>{{ t('recipe.share.sharedSince', { date: (status.createdAt | gcDate) }) }}</p>
          <p class="form-text">{{ t('recipe.share.lost') }}</p>
        }
        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            [id]="'share-notes-' + recipeId()"
            [checked]="includeNotes()"
            [attr.aria-disabled]="busy.active() || null"
            (change)="setIncludeNotes($any($event.target).checked)"
          />
          <label class="form-check-label" [for]="'share-notes-' + recipeId()">{{ t('recipe.share.notes') }}</label>
        </div>
        <div class="share-actions">
          <button
            type="button"
            class="btn btn-light border btn-sm"
            [attr.aria-disabled]="busy.active() || null"
            (click)="make()"
          >
            {{ status.shared ? t('recipe.share.makeNew') : t('recipe.share.make') }}
          </button>
          @if (status.shared) {
            <button
              type="button"
              class="btn btn-outline-danger btn-sm"
              [attr.aria-disabled]="busy.active() || null"
              (click)="stop()"
            >
              {{ t('recipe.share.stop') }}
            </button>
          }
        </div>
        @if (status.shared && !address()) {
          <p class="form-text">{{ t('recipe.share.makeNewNote') }}</p>
        }
      } @else if (!problem()) {
        <p class="muted" role="status">{{ t('recipe.share.loading') }}</p>
      }
      <p class="share-status" role="status">{{ said() }}</p>
      <p class="share-problem" role="alert">{{ problem() }}</p>
    </section>
  </ng-container>`,
  styles: `
    .share-panel {
      border-top: 1px solid var(--gc-border);
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      max-width: 40rem;
    }
    .share-panel p {
      margin: 0 0 0.5rem;
    }
    .share-address {
      max-width: 36rem;
    }
    .share-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.5rem 0;
    }
    .share-problem {
      color: var(--gc-danger-text);
    }
    .share-status:empty,
    .share-problem:empty {
      display: none;
    }
  `
})
export class SharePanel implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);

  readonly recipeId = input.required<string>();
  /** A trial cannot share: it is told to create an account. */
  readonly trial = input(false);

  protected readonly status = signal<ShareStatus | null>(null);
  /** The link, just made: shown until the panel closes, and never again. */
  protected readonly address = signal('');
  protected readonly includeNotes = signal(false);
  protected readonly said = signal('');
  protected readonly problem = signal('');
  protected readonly busy = new Busy();

  private get url(): string {
    return this.apiBase + '/share/recipe/' + this.recipeId();
  }

  ngOnInit(): void {
    if (this.trial()) return;
    void this.busy.run(async () => {
      try {
        const status = await firstValueFrom(this.http.get<ShareStatus>(this.url));
        this.status.set(status);
        this.includeNotes.set(!!status.includeNotes);
      } catch (err) {
        this.problem.set(errorMessage(err, translate('recipe.share.failed')));
      }
    });
  }

  /** Makes the link, or a new one in its place: the old one stops working. */
  protected make(): Promise<void> {
    return this.busy.run(async () => {
      this.said.set('');
      this.problem.set('');
      try {
        const made = await firstValueFrom(
          this.http.post<{ secret: string; createdAt: string; includeNotes: boolean }>(this.url, {
            includeNotes: this.includeNotes()
          })
        );
        const replaced = this.status()?.shared;
        this.status.set({ shared: true, createdAt: made.createdAt, includeNotes: made.includeNotes });
        this.address.set(shareAddress(made.secret));
        this.said.set(translate(replaced ? marker('recipe.share.replaced') : marker('recipe.share.made')));
      } catch (err) {
        this.problem.set(errorMessage(err, translate('recipe.share.failed')));
      }
    });
  }

  protected stop(): Promise<void> {
    return this.busy.run(async () => {
      this.said.set('');
      this.problem.set('');
      try {
        await firstValueFrom(this.http.delete(this.url));
        this.status.set({ shared: false });
        this.address.set('');
        this.said.set(translate('recipe.share.stopped'));
      } catch (err) {
        this.problem.set(errorMessage(err, translate('recipe.share.failed')));
      }
    });
  }

  /** Whether the shared page shows the notes: saved at once for a link there is, or used for the next one made. */
  protected async setIncludeNotes(on: boolean): Promise<void> {
    if (this.busy.active()) return;
    this.includeNotes.set(on);
    if (!this.status()?.shared) return;
    await this.busy.run(async () => {
      this.said.set('');
      this.problem.set('');
      try {
        await firstValueFrom(this.http.put(this.url, { includeNotes: on }));
        this.said.set(translate(on ? marker('recipe.share.notesShown') : marker('recipe.share.notesHidden')));
      } catch (err) {
        this.includeNotes.set(!on);
        this.problem.set(errorMessage(err, translate('recipe.share.failed')));
      }
    });
  }

  protected async copy(address: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(address);
      this.said.set(translate('recipe.share.copied'));
    } catch {
      // No clipboard (an older browser, or not allowed): the link is selected, to copy by hand.
      this.said.set(translate('recipe.share.copyByHand'));
    }
  }
}
