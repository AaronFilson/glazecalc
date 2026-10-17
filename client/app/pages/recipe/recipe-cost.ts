import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { recipeCost } from '../../../../lib/recipe/cost';
import { AuthService } from '../../core/auth.service';
import { Additive, RecipeMaterial } from '../../core/models';
import { LocaleService } from '../../core/locale.service';
import { PreferencesService } from '../../core/preferences.service';
import { PricesService } from '../../core/prices.service';
import { RichText } from '../../i18n/rich-text';
import { forTyping, listOf, money, plainNumber } from '../../shared/format';
import { NumberInput } from '../../shared/number-input';
import { GRAMS_PER_POUND, WeightUnit, toGrams, unitLabel } from '../../shared/weights';
import { formatAmount } from './rebase';
import { libraryKey } from './recipe-library';

/** A batch size to start from, in each unit: the base materials. */
const DEFAULT_BATCH: Record<WeightUnit, string> = { g: '1000', lb: '2' };
/** A price per unit of weight from one per kilogram, and back. */
const KG_PER_UNIT: Record<WeightUnit, number> = { g: 1, lb: GRAMS_PER_POUND / 1000 };

/** How long the cost stays unchanged before a screen reader is told it. */
const ANNOUNCE_AFTER_MS = 1000;

interface CostRow {
  key: string;
  name: string;
  /** The price per kilogram or pound as the box shows it, a plain number; '' with none. */
  price: string;
  /** What it costs in the batch, written; '' with no batch. */
  cost: string;
  /** It weighs something and has no price. */
  missing: boolean;
}

/**
 * What a recipe costs, from the prices the potter pays (cost per batch): a
 * price per kilogram or pound for each material and additive, kept with the
 * account and private to it, in its one currency. A batch with a material
 * that has no price is costed for the rest, and that material is named: no
 * price is guessed.
 */
@Component({
  selector: 'gc-recipe-cost',
  imports: [NumberInput, RichText, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <button
      id="cost-toggle"
      type="button"
      class="btn btn-light border btn-sm recipe-cost-toggle"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      {{ t('recipe.cost.show') }}
    </button>
    @if (open()) {
      <section class="recipe-cost" aria-labelledby="cost-heading">
        <h3 id="cost-heading">{{ t('recipe.cost.heading') }}</h3>
        @if (skipped() > 0) {
          <p class="recipe-cost-skipped" role="status">{{ t('recipe.cost.skipped', { count: skipped() }) }}</p>
        }
        <p class="small muted">
          <gc-rich
            [text]="t('recipe.cost.intro', { unit: unit(), currency: currency() })"
            [links]="{ settings: '/account' }"
          />
        </p>
        @if (loaded()) {
          <div class="recipe-cost-size">
            <label for="cost-batch-size">{{ t('recipe.print.batchSize') }}</label>
            <div class="input-group input-group-sm">
              <input
                id="cost-batch-size"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                class="form-control"
                [gcNumber]="batchText()"
                (gcNumberChange)="setBatch($event)"
              />
              <span class="input-group-text">{{ unitLabel(unit()) }}</span>
            </div>
          </div>
          <div class="recipe-cost-scroll">
            <table class="recipe-table recipe-cost-table">
              <thead>
                <tr>
                  <th scope="col">{{ t('recipe.page.materialColumn') }}</th>
                  <th scope="col">{{ t('recipe.cost.priceColumn', { unit: unit(), currency: currency() }) }}</th>
                  <th scope="col">{{ t('recipe.cost.costColumn') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track $index) {
                  <tr>
                    <th scope="row">
                      <bdi>{{ row.name }}</bdi>
                    </th>
                    <td>
                      <input
                        [id]="'price-' + $index"
                        type="text"
                        inputmode="decimal"
                        autocomplete="off"
                        class="form-control form-control-sm recipe-price"
                        [attr.aria-label]="t('recipe.cost.priceOf', { name: row.name, unit: unit() })"
                        [attr.aria-invalid]="problems()[row.key] ? true : null"
                        [attr.aria-describedby]="problems()[row.key] ? 'price-problem-' + $index : null"
                        [gcNumber]="typed()[row.key] ?? row.price"
                        (gcNumberChange)="type(row.key, $event)"
                        (change)="savePrice(row.key)"
                      />
                      @if (problems()[row.key]; as problem) {
                        <span class="recipe-price-problem" [id]="'price-problem-' + $index">{{ problem }}</span>
                      }
                    </td>
                    <td class="recipe-cost-line">
                      @if (row.missing) {
                        <span class="muted">{{ t('recipe.cost.noPrice') }}</span>
                      } @else {
                        {{ row.cost }}
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="recipe-cost-summary">{{ summary() }}</p>
          @if (rounded()) {
            <p class="small muted recipe-cost-rounding">{{ t('recipe.cost.rounding') }}</p>
          }
          <p class="visually-hidden" role="status">{{ announced() }}</p>
        } @else if (!problem()) {
          <p class="muted">{{ t('recipe.cost.loading') }}</p>
        }
        @if (problem()) {
          <p class="recipe-swap-problem" role="alert">{{ problem() }}</p>
          @if (!loaded()) {
            <button type="button" class="btn btn-light border btn-sm" (click)="load()">
              {{ t('recipe.cost.tryAgain') }}
            </button>
          }
        }
      </section>
    }
  </ng-container>`,
  styles: `
    .recipe-cost-toggle {
      margin-top: 1rem;
    }
    .recipe-cost {
      margin-top: 0.75rem;
    }
    .recipe-cost h3 {
      font-size: 1.1rem;
    }
    .recipe-cost-size {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.75rem;
      margin-bottom: 0.5rem;
    }
    .recipe-cost-size .input-group {
      width: 10rem;
    }
    .recipe-cost-scroll {
      overflow-x: auto;
    }
    .recipe-price {
      max-width: 8rem;
    }
    .recipe-price-problem {
      display: block;
      color: var(--gc-danger-text);
      font-size: 0.875rem;
    }
    .recipe-cost-line {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .recipe-cost-summary {
      font-weight: 600;
      margin: 0.5rem 0 0;
    }
  `
})
export class RecipeCost {
  private readonly prices = inject(PricesService);
  private readonly preferences = inject(PreferencesService);
  private readonly locale = inject(LocaleService);
  private readonly auth = inject(AuthService);

  readonly materials = input.required<RecipeMaterial[]>();
  readonly additives = input.required<Additive[]>();

  protected readonly unitLabel = unitLabel;
  protected readonly unit = this.preferences.weightUnit;
  protected readonly currency = this.locale.currency;
  protected readonly loaded = computed(() => this.prices.prices() !== null);
  protected readonly problem = this.prices.problem;
  /** Prices a trial brought at sign-in that were in another currency than the account's, and so not copied. */
  protected readonly skipped = this.auth.pricesSkipped;

  /** The batch size as typed, and the unit it was typed in. */
  private readonly batchTyped = signal<{ text: string; unit: WeightUnit } | null>(null);
  protected readonly batchText = computed(() => {
    const typed = this.batchTyped();
    return typed?.unit === this.unit() ? typed.text : DEFAULT_BATCH[this.unit()];
  });
  /** Prices as typed, by key, until they are saved. */
  protected readonly typed = signal<Record<string, string>>({});
  /** Why a typed price was not saved, by key. */
  protected readonly problems = signal<Record<string, string>>({});

  private readonly perKg = computed(() => new Map((this.prices.prices() ?? []).map((p) => [p.key, p.perKg])));
  private readonly cost = computed(() =>
    recipeCost(
      {
        materials: this.materials().map((m) => ({ key: libraryKey(m), amount: m.amount })),
        additives: this.additives().map((a) => ({ key: libraryKey(a), amount: a.amount, unit: a.unit }))
      },
      toGrams(this.batchText(), this.unit()),
      this.perKg()
    )
  );
  protected readonly rows = computed<CostRow[]>(() => {
    const cost = this.cost();
    const perUnit = KG_PER_UNIT[this.unit()];
    return [...this.materials(), ...this.additives()].map((line, i) => {
      const key = libraryKey(line);
      const perKg = this.perKg().get(key);
      const costed = cost?.lines[i];
      return {
        key,
        name: line.name,
        price: perKg === undefined ? '' : formatAmount(perKg * perUnit, 4),
        cost: costed && costed.cost !== null ? money(costed.cost, this.currency()) : '',
        missing: perKg === undefined && !!costed && costed.cost === null
      };
    });
  });
  protected readonly summary = computed(() => {
    const cost = this.cost();
    if (!cost) return translate('recipe.cost.noBatch');
    const currency = this.currency();
    if (cost.perKg !== null) {
      return translate('recipe.cost.total', {
        cost: money(cost.cost, currency),
        perUnit: money(cost.perKg * KG_PER_UNIT[this.unit()], currency),
        unit: this.unit()
      });
    }
    const names = this.rows()
      .filter((row) => cost.missing.includes(row.key))
      .map((row) => row.name);
    return translate('recipe.cost.partial', {
      cost: money(cost.cost, currency),
      list: listOf([...new Set(names)])
    });
  });

  /** Whether the costs are shown: the prices are fetched the first time they are. */
  protected readonly open = signal(false);

  /**
   * The line costs are shown to the currency's smallest unit while the total is
   * worked from the unrounded costs: whether the shown lines add up to a
   * different amount than the shown total, which the page then says.
   */
  protected readonly rounded = computed(() => {
    const cost = this.cost();
    if (!cost) return false;
    let places = 2;
    try {
      places = new Intl.NumberFormat(undefined, { style: 'currency', currency: this.currency() }).resolvedOptions()
        .maximumFractionDigits as number;
    } catch {
      // Two places, as money() writes an unknown currency.
    }
    const round = (value: number) => Math.round(value * 10 ** places) / 10 ** places;
    const lines = cost.lines.reduce((sum, line) => sum + (line.cost === null ? 0 : round(line.cost)), 0);
    return Math.abs(round(lines) - round(cost.cost)) > 0.5 / 10 ** places;
  });

  /**
   * What a screen reader is told of the cost: the summary once it has stopped
   * changing, not on each keystroke.
   */
  protected readonly announced = signal('');

  constructor() {
    effect((onCleanup) => {
      const text = this.summary();
      const timer = setTimeout(() => this.announced.set(text), ANNOUNCE_AFTER_MS);
      onCleanup(() => clearTimeout(timer));
    });
    // Another sign-in (an account after a trial, or a different one) is another list: fetched again, and what was typed is dropped.
    effect(() => {
      this.auth.sessionVersion();
      if (!this.open()) return;
      untracked(() => {
        this.typed.set({});
        this.problems.set({});
        void this.prices.load();
      });
    });
  }

  protected toggle(): void {
    this.open.update((open) => !open);
    if (this.open()) void this.load();
  }

  protected load(): Promise<void> {
    return this.prices.load();
  }

  protected setBatch(text: string): void {
    this.batchTyped.set({ text, unit: this.unit() });
  }

  protected type(key: string, text: string): void {
    this.typed.update((typed) => ({ ...typed, [key]: text }));
  }

  /** Saves a price once the box is left: blank takes it away; one that is not a number of 0 or more is not saved. */
  protected async savePrice(key: string): Promise<void> {
    const text = this.typed()[key];
    if (text === undefined) return;
    const blank = text.trim() === '';
    const value = blank ? null : plainNumber(text);
    if (!blank && !(value !== null && value >= 0)) {
      this.setProblem(key, translate('recipe.cost.priceProblem', { example: forTyping('2.5') }));
      return;
    }
    this.setProblem(key, '');
    const saved = await this.prices.set(key, value === null ? null : value / KG_PER_UNIT[this.unit()], this.currency());
    if (saved) {
      this.typed.update((typed) => {
        const rest = { ...typed };
        delete rest[key];
        return rest;
      });
    }
  }

  private setProblem(key: string, problem: string): void {
    this.problems.update((problems) => {
      const rest = { ...problems };
      if (problem) rest[key] = problem;
      else delete rest[key];
      return rest;
    });
  }
}
