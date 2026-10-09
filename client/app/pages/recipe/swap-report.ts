import { Component, computed, input, output, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { Material } from '../../core/models';
import { RichText } from '../../i18n/rich-text';
import { LeadMode } from './lead';
import { Report, TryMaterial, oxideName } from './pool';
import { TryMaterials } from './try-materials';
import { listOf } from '../../shared/format';
import { FixedPipe } from '../../shared/format-pipes';

/** A substitution as asked, to run again with changes from its report. */
export interface Run {
  kind: 'suggest' | 'lead' | 'shelf';
  /** Suggest amounts: what the potter chose to bring short oxides back. */
  bringIn: Material[];
  tries: TryMaterial[];
  /** Names to leave out. */
  avoid: string[];
  /** Replace lead: names whose suggested cap the potter lifted. */
  uncapped: string[];
  cone: string;
  mode: LeadMode;
  base: string;
}

/** What a substitution made, beside the recipe: how, and what to watch for. */
export interface SwapResult {
  run: Run;
  report: Report | null;
  cautions: string[];
}

/** Below this the match is close (the solver's "good enough"). */
const CLOSE = 1;
/** More than this above the best the materials could do, and the match could come nearer. */
const COULD_BE_NEARER = 0.5;

const list = (names: string[]): string => listOf(names);

/**
 * How a substitution was made (docs/adr/0012): what each material supplies,
 * what else would help, near-identical choices, caps that cost match, and what
 * to watch for; with buttons that work it out again from the recipe as it was,
 * leaving a material out, adding one, or lifting a cap.
 */
@Component({
  selector: 'gc-swap-report',
  imports: [FixedPipe, RichText, TranslocoDirective, TryMaterials],
  template: `<ng-container *transloco="let t">
    <section class="swap-report" [attr.aria-labelledby]="headingId()">
      @if (level() === 2) {
        <h2 [id]="headingId()" class="swap-report-heading" tabindex="-1">{{ t('recipe.swapReport.heading') }}</h2>
      } @else {
        <h4 [id]="headingId()" class="swap-report-heading" tabindex="-1">{{ t('recipe.swapReport.heading') }}</h4>
      }
      @if (result().report; as report) {
        <p>{{ summary() }}</p>
        <ul class="swap-uses">
          @for (use of report.uses; track use.name) {
            <li>
              <gc-rich
                [text]="t('recipe.swapReport.use', { name: use.name, amount: use.amount, supplies: use.supplies })"
              />{{ ' ' }}
              @if (!use.needed) {
                <span class="muted">{{ t('recipe.swapReport.nearlyAsGood') }}</span>
              }
              @if (!use.fixed) {
                <button
                  type="button"
                  class="btn btn-link btn-sm swap-action"
                  [attr.aria-label]="t('recipe.swapReport.leaveOutName', { name: use.name })"
                  (click)="leaveOut(use.name)"
                >
                  {{ t('recipe.swapReport.leaveOut') }}
                </button>
              }
            </li>
          }
        </ul>
        @if (report.unreachable.length) {
          <p>{{ t('recipe.swapReport.unreachable', { list: unreachable() }) }}</p>
        }
        @for (cap of report.capped; track cap.name) {
          <p>
            {{
              cap.why
                ? t('recipe.swapReport.cappedWhy', {
                    wouldBe: (cap.wouldBe | gcFixed: 0),
                    list: list(cap.members),
                    most: (cap.most | gcFixed: 0),
                    why: cap.why
                  })
                : t('recipe.swapReport.capped', {
                    wouldBe: (cap.wouldBe | gcFixed: 0),
                    list: list(cap.members),
                    most: (cap.most | gcFixed: 0)
                  })
            }}
            <button
              type="button"
              class="btn btn-link btn-sm swap-action"
              [attr.aria-label]="t('recipe.swapReport.allowMoreOf', { list: list(cap.members) })"
              (click)="allowMore(cap.members)"
            >
              {{ t('recipe.swapReport.allowMore') }}
            </button>
          </p>
        }
        @if (report.couldHelp.length) {
          <p>{{ t('recipe.swapReport.couldHelp') }}</p>
          <ul class="swap-uses">
            @for (help of report.couldHelp; track help.name) {
              <li>
                {{ help.name }}
                <button
                  type="button"
                  class="btn btn-link btn-sm swap-action"
                  [attr.aria-label]="t('recipe.swapReport.addName', { name: help.name })"
                  (click)="add(help.name)"
                >
                  {{ t('recipe.swapReport.add') }}
                </button>
              </li>
            }
          </ul>
        }
        @if (report.alike.length) {
          <p>{{ t('recipe.swapReport.alike') }}</p>
          <ul class="swap-uses">
            @for (pair of report.alike; track pair.used + pair.other) {
              <li>
                {{ t('recipe.swapReport.standIn', { other: pair.other, used: pair.used }) }}
                <button
                  type="button"
                  class="btn btn-link btn-sm swap-action"
                  [attr.aria-label]="t('recipe.swapReport.useInsteadOf', { other: pair.other, used: pair.used })"
                  (click)="useInstead(pair.used, pair.other)"
                >
                  {{ t('recipe.swapReport.useInstead') }}
                </button>
              </li>
            }
          </ul>
        }
        @if (report.countCost >= 0.1) {
          <p class="muted">
            {{ t('recipe.swapReport.fourAtMost') }}
          </p>
        }
      }
      @if (result().cautions.length) {
        <p class="swap-watch">
          <b>{{ t('recipe.swapReport.watchFor') }}</b>
        </p>
        <ul class="swap-cautions">
          @for (caution of result().cautions; track caution) {
            <li>{{ caution }}</li>
          }
        </ul>
      }
      @if (result().run.avoid.length) {
        <p>
          {{ t('recipe.swapReport.leftOut', { list: list(result().run.avoid) }) }}
          <button type="button" class="btn btn-link btn-sm swap-action" (click)="rerun.emit({ avoid: [] })">
            {{ t('recipe.swapReport.allowAgain') }}
          </button>
        </p>
      }
      <div class="recipe-swap-buttons">
        <button
          type="button"
          class="btn btn-light border btn-sm"
          [attr.aria-expanded]="trying()"
          (click)="toggleTrying()"
        >
          {{ t('recipe.swapReport.tryOthers') }}
        </button>
      </div>
      @if (trying()) {
        <gc-try-materials
          [(tries)]="tries"
          [mine]="mine()"
          [standard]="standard()"
          [hideLead]="hideLead()"
          [inRecipe]="inRecipe()"
        />
        <div class="recipe-swap-buttons">
          <button type="button" class="btn btn-primary btn-sm" (click)="workOutAgain()">
            {{ t('recipe.swapReport.workOutAgain') }}
          </button>
        </div>
      }
    </section>
  </ng-container>`
})
export class SwapReport {
  readonly result = input.required<SwapResult>();
  /** 2 in the compare view, 4 under the recipe's Materials. */
  readonly level = input<2 | 4>(4);
  readonly headingId = input('swap-report-heading');
  readonly mine = input.required<Material[]>();
  readonly standard = input.required<Material[]>();
  readonly hideLead = input(false);
  readonly inRecipe = input<ReadonlySet<string>>(new Set());
  /** Work it out again from the recipe as it was, with these changes. */
  readonly rerun = output<Partial<Run>>();

  protected readonly list = list;
  protected readonly trying = signal(false);
  protected readonly tries = signal<TryMaterial[]>([]);

  protected readonly summary = computed(() => {
    const { report, run } = this.result();
    if (!report) return '';
    // What it aims at: the lead-free formula for the firing, or the old recipe's fired oxides.
    const aim = run.kind === 'lead' ? 'lead' : 'old';
    if (report.miss < CLOSE) return translate('recipe.swapReport.close', { aim });
    if (report.miss - report.best < COULD_BE_NEARER) return translate('recipe.swapReport.asNear', { aim });
    return translate('recipe.swapReport.couldBeNearer', { aim });
  });
  protected readonly unreachable = computed(() => list((this.result().report?.unreachable ?? []).map(oxideName)));

  private material(name: string): Material | undefined {
    return [...this.standard(), ...this.mine()].find((material) => material.name === name);
  }

  /** Left out, though still offered: Allow them again brings it back. */
  protected leaveOut(name: string): void {
    this.rerun.emit({ avoid: [...new Set([...this.result().run.avoid, name])] });
  }

  protected add(name: string): void {
    const material = this.material(name);
    if (!material) return;
    const { run } = this.result();
    this.rerun.emit({
      tries: [...run.tries.filter((tried) => tried.material.name !== name), { material, must: true }],
      avoid: run.avoid.filter((avoided) => avoided !== name)
    });
  }

  protected useInstead(used: string, other: string): void {
    const material = this.material(other);
    if (!material) return;
    const { run } = this.result();
    this.rerun.emit({
      avoid: [...new Set([...run.avoid.filter((avoided) => avoided !== other), used])],
      tries: [...run.tries.filter((tried) => tried.material.name !== other), { material, must: true }]
    });
  }

  protected allowMore(names: string[]): void {
    this.rerun.emit({ uncapped: [...new Set([...this.result().run.uncapped, ...names])] });
  }

  protected toggleTrying(): void {
    if (!this.trying()) this.tries.set(this.result().run.tries);
    this.trying.update((trying) => !trying);
  }

  protected workOutAgain(): void {
    const names = new Set(this.tries().map((tried) => tried.material.name));
    this.trying.set(false);
    this.rerun.emit({ tries: this.tries(), avoid: this.result().run.avoid.filter((name) => !names.has(name)) });
  }
}
