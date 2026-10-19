import { Component, OnInit, computed, inject, input, model, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { FiringBlock, cleanFiring, conesBetween, conesFromLog, readsDecimalComma } from '../../../../lib/cones/firing';
import { linkPlace } from '../../../../lib/cones/results';
import { ApiResourceFactory } from '../../core/api-resource.service';
import { errorMessage } from '../../core/error-message';
import { FiringLinksService } from '../../core/firing-links.service';
import { Firing, FiringLink } from '../../core/models';
import { LocaleService } from '../../core/locale.service';
import { DatePipe } from '../../shared/format-pipes';
import { formatLocale, listOf, typedDecimalMark } from '../../shared/format';
import { coneText } from './firing-text';

// The firing logs a recipe went through (docs/adr/0021-recipe-firing.md),
// each with what came of it there: "glossy, no crazing". The links are kept on
// the recipe; the firing log page can add them too. A saved recipe's links are
// changed on the server one at a time as they are made, so two pages open at
// once never undo each other's; a new recipe's go with it when it is saved.
// A link to a log in the Trash is not shown, and shows again if the log is put
// back. The cones a linked log names can fill in the tested ticks, after
// asking when that would change them. A linked log is placed at the cone and
// atmosphere it names clearly, for the result cards (recipe-cone-cards.ts):
// by the server for a saved recipe, here for one not saved yet.

/** How long a result note can be (server/models/recipe.ts, FIRING_LINKS). */
const RESULT_MAX = 500;

@Component({
  selector: 'gc-recipe-firings',
  imports: [DatePipe, RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="recipe-firings" aria-labelledby="firings-heading">
      <h3 id="firings-heading">{{ t('recipe.firings.heading') }}</h3>
      @if (failed()) {
        <p class="muted">{{ t('recipe.firings.fetchFailed') }}</p>
      } @else if (!logs().length && loaded()) {
        <p class="muted">
          {{ t('recipe.firings.noLogs') }} <a routerLink="/firing">{{ t('recipe.firings.toLogs') }}</a>
        </p>
      }
      @if (saveFailed(); as problem) {
        <p class="text-danger" role="alert">{{ problem }}</p>
      }
      @if (shown().length) {
        <ul class="firings-list">
          @for (link of shown(); track link.firing; let i = $index) {
            <li>
              <span class="firings-name">
                @if (logOf(link.firing); as log) {
                  <bdi>{{ log.title }}</bdi>
                  @if (log.date) {
                    <span class="muted"> · {{ log.date | gcDate }}</span>
                  }
                }
              </span>
              <label class="visually-hidden" [for]="'firing-result-' + i">{{
                t('recipe.firings.resultFor', { title: logOf(link.firing)?.title ?? '' })
              }}</label>
              <input
                [id]="'firing-result-' + i"
                type="text"
                class="form-control form-control-sm firings-result"
                [maxLength]="resultMax"
                [placeholder]="t('recipe.firings.resultPlaceholder')"
                [value]="link.result ?? ''"
                (change)="setResult(link.firing, $any($event.target).value)"
              />
              <button
                type="button"
                class="btn btn-light border btn-sm"
                [attr.aria-label]="t('recipe.firings.unlinkName', { title: logOf(link.firing)?.title ?? '' })"
                (click)="unlink(link.firing)"
              >
                {{ t('recipe.firings.unlink') }}
              </button>
            </li>
          }
        </ul>
      }
      @if (unlinked().length) {
        <div class="firings-add">
          <label for="firing-link-choice" class="visually-hidden">{{ t('recipe.firings.choose') }}</label>
          <select id="firing-link-choice" class="form-select form-select-sm" #choice>
            @for (log of unlinked(); track log._id) {
              <option [value]="log._id">{{ log.title }}{{ log.date ? ' · ' + log.date : '' }}</option>
            }
          </select>
          <button id="firing-link" type="button" class="btn btn-light border btn-sm" (click)="link(choice.value)">
            {{ t('recipe.firings.link') }}
          </button>
        </div>
      }
      @if (offered().length) {
        <p class="firings-fill">
          <button id="firings-fill" type="button" class="btn btn-light border btn-sm" (click)="fill()">
            {{ t('recipe.firings.fill', { cones: offeredText() }) }}
          </button>
        </p>
      }
      @if (asking(); as question) {
        <div class="firings-ask" role="alertdialog" aria-labelledby="firings-ask-text">
          <p id="firings-ask-text">{{ t('recipe.firings.replaceAsk', { now: question.now, logs: question.logs }) }}</p>
          <button id="firings-replace" type="button" class="btn btn-primary btn-sm" (click)="confirmFill()">
            {{ t('recipe.firings.replace') }}
          </button>
          <button type="button" class="btn btn-light border btn-sm" (click)="asking.set(null)">
            {{ t('recipe.firings.keep') }}
          </button>
        </div>
      }
    </section>
  </ng-container>`,
  styles: `
    .recipe-firings {
      margin-bottom: 1rem;
    }
    .recipe-firings h3 {
      font-size: 1.1rem;
      margin: 0 0 0.5rem;
    }
    .firings-list {
      list-style: none;
      padding: 0;
      margin: 0 0 0.5rem;
    }
    .firings-list li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.5rem;
      padding: 0.25rem 0;
      border-top: 1px solid var(--gc-border);
    }
    .firings-name {
      flex: 1 1 12rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .firings-result {
      flex: 2 1 14rem;
      width: auto;
    }
    .firings-add {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      max-width: 32rem;
    }
    .firings-add select {
      flex: 1 1 12rem;
      width: auto;
    }
    .firings-fill {
      margin: 0.5rem 0 0;
    }
    .firings-ask {
      margin-top: 0.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .firings-ask p {
      flex-basis: 100%;
      margin: 0;
    }
  `
})
export class RecipeFirings implements OnInit {
  /** The links, saved with the recipe as firings. */
  readonly links = model<FiringLink[]>([]);
  /** The recipe's firing block, whose tested ticks the logs can fill in. */
  readonly block = model<FiringBlock | null>(null);
  /** The saved recipe's id, whose links are changed on the server; null for a recipe not saved yet. */
  readonly recipeId = input<string | null>(null);
  /** A saved recipe's links as the server has them, after one changed: they are saved already. */
  readonly saved = output<FiringLink[]>();
  /** The account's firing logs that are there, once fetched: the result cards show the links to them. */
  readonly logsLoaded = output<Firing[]>();

  private readonly firings = inject(ApiResourceFactory).for<Firing>('firing');
  private readonly locale = inject(LocaleService);
  protected readonly resultMax = RESULT_MAX;
  protected readonly logs = signal<Firing[]>([]);
  protected readonly loaded = signal(false);
  protected readonly failed = signal(false);
  protected readonly asking = signal<{ now: string; logs: string; cones: string[] } | null>(null);

  private readonly linksApi = inject(FiringLinksService);
  /** Why the last change to a link was not saved, or ''. */
  protected readonly saveFailed = signal('');
  /** The links shown: those to logs that are there (one in the Trash is hidden, not lost). */
  protected readonly shown = computed(() =>
    this.loaded() ? this.links().filter((link) => this.logOf(link.firing)) : []
  );

  protected readonly unlinked = computed(() => {
    const linked = new Set(this.links().map((link) => link.firing));
    return [...this.logs()].reverse().filter((log) => log._id && !linked.has(log._id));
  });
  /** The cones the linked logs name within the recipe's range, which could be its tested ticks. */
  protected readonly offered = computed(() => {
    const block = this.block();
    if (!block?.low) return [];
    const range = conesBetween(block.scale, block.low, block.high);
    const reading = { decimalComma: readsDecimalComma(typedDecimalMark(), formatLocale()) };
    const named = new Set(
      this.links().flatMap((link) => {
        const log = this.logOf(link.firing);
        return log ? conesFromLog(log, block.scale, reading) : [];
      })
    );
    const cones = range.filter((cone) => named.has(cone));
    const ticked = block.tested ?? [];
    // Nothing to offer when the ticks already say just that.
    return cones.length === ticked.length && cones.every((cone) => ticked.includes(cone)) ? [] : cones;
  });
  protected readonly offeredText = computed(() => this.conesText(this.offered()));

  async ngOnInit(): Promise<void> {
    try {
      this.logs.set(await this.firings.getAll());
      this.logsLoaded.emit(this.logs());
    } catch {
      this.failed.set(true);
    } finally {
      this.loaded.set(true);
    }
  }

  protected logOf(id: string): Firing | undefined {
    return this.logs().find((log) => log._id === id);
  }

  protected link(id: string): Promise<void> {
    if (!id || this.links().some((link) => link.firing === id)) return Promise.resolve();
    const reading = { decimalComma: readsDecimalComma(typedDecimalMark(), formatLocale()) };
    const place = linkPlace(this.logOf(id), this.block(), reading);
    return this.change(
      (list) => [...list, { firing: id, ...place }],
      (recipeId) => this.linksApi.link(recipeId, id)
    );
  }

  protected unlink(firing: string): Promise<void> {
    return this.change(
      (list) => list.filter((link) => link.firing !== firing),
      (recipeId) => this.linksApi.unlink(recipeId, firing)
    );
  }

  protected setResult(firing: string, result: string): Promise<void> {
    const text = result.trim().slice(0, RESULT_MAX);
    return this.change(
      (list) =>
        list.map((link) => {
          if (link.firing !== firing) return link;
          return {
            firing,
            ...(text && { result: text }),
            ...(link.cone && { cone: link.cone }),
            ...(link.atmosphere && { atmosphere: link.atmosphere })
          };
        }),
      (recipeId) => this.linksApi.setResult(recipeId, firing, text)
    );
  }

  /** A change to the links: on the server for a saved recipe (and then the links it has), else here. */
  private async change(
    here: (list: FiringLink[]) => FiringLink[],
    onServer: (recipeId: string) => Promise<FiringLink[]>
  ): Promise<void> {
    this.saveFailed.set('');
    const recipeId = this.recipeId();
    if (!recipeId) {
      this.links.update(here);
      return;
    }
    try {
      const links = await onServer(recipeId);
      // Still the same recipe: the page may have moved on to another while it saved.
      if (this.recipeId() === recipeId) this.saved.emit(links);
    } catch (err) {
      this.saveFailed.set(errorMessage(err, translate('recipe.firings.saveFailed')));
    }
  }

  /** Fills the tested ticks from the logs; asks first when some are ticked already. */
  protected fill(): void {
    const block = this.block();
    const cones = this.offered();
    if (!block || !cones.length) return;
    const now = block.tested ?? [];
    if (now.length) {
      this.asking.set({ now: this.conesText(now), logs: this.conesText(cones), cones });
      return;
    }
    this.setTested(cones);
  }

  protected confirmFill(): void {
    const question = this.asking();
    this.asking.set(null);
    if (question) this.setTested(question.cones);
  }

  private setTested(cones: string[]): void {
    const block = this.block();
    if (block) this.block.set(cleanFiring({ ...block, tested: cones }));
  }

  private conesText(cones: string[]): string {
    const block = this.block();
    if (!block) return '';
    const reader = { cones: this.locale.cones(), temperature: this.locale.temperature() };
    return listOf(
      cones.map((cone) => coneText(block.scale, cone, reader)),
      'unit'
    );
  }
}
