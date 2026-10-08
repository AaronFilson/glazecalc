import { Component, computed, input, output, signal } from '@angular/core';
import { Material } from '../../core/models';
import { LeadMode } from './lead';
import { Report, TryMaterial, oxideName } from './pool';
import { TryMaterials } from './try-materials';

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

const list = (names: string[]): string =>
  names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names.at(-1) : (names[0] ?? '');

/**
 * How a substitution was made (docs/adr/0012): what each material supplies,
 * what else would help, near-identical choices, caps that cost match, and what
 * to watch for; with buttons that work it out again from the recipe as it was,
 * leaving a material out, adding one, or lifting a cap.
 */
@Component({
  selector: 'gc-swap-report',
  imports: [TryMaterials],
  template: `
    <section class="swap-report" [attr.aria-labelledby]="headingId()">
      @if (level() === 2) {
        <h2 [id]="headingId()" class="swap-report-heading" tabindex="-1">How the new recipe was made</h2>
      } @else {
        <h4 [id]="headingId()" class="swap-report-heading" tabindex="-1">How the new recipe was made</h4>
      }
      @if (result().report; as report) {
        <p>{{ summary() }}</p>
        <ul class="swap-uses">
          @for (use of report.uses; track use.name) {
            <li>
              <b>{{ use.name }}</b> {{ use.amount }}: {{ use.supplies }}.
              @if (!use.needed) {
                <span class="muted">The match is nearly as good without it.</span>
              }
              @if (!use.fixed) {
                <button
                  type="button"
                  class="btn btn-link btn-sm swap-action"
                  [attr.aria-label]="'Leave out ' + use.name"
                  (click)="leaveOut(use.name)"
                >
                  Leave it out
                </button>
              }
            </li>
          }
        </ul>
        @if (report.unreachable.length) {
          <p>Nothing on offer has {{ unreachable() }}. Add a material with it to try, below, to bring it back.</p>
        }
        @for (cap of report.capped; track cap.name) {
          <p>
            A closer match needs {{ cap.wouldBe.toFixed(0) }}% {{ list(cap.members) }}, more than the
            {{ cap.most.toFixed(0) }}% suggested{{ cap.why ? ': ' + cap.why : '' }}.
            <button
              type="button"
              class="btn btn-link btn-sm swap-action"
              [attr.aria-label]="'Allow more ' + list(cap.members)"
              (click)="allowMore(cap.members)"
            >
              Allow more
            </button>
          </p>
        }
        @if (report.couldHelp.length) {
          <p>Not used, but would bring it a little closer:</p>
          <ul class="swap-uses">
            @for (help of report.couldHelp; track help.name) {
              <li>
                {{ help.name }}
                <button
                  type="button"
                  class="btn btn-link btn-sm swap-action"
                  [attr.aria-label]="'Add ' + help.name"
                  (click)="add(help.name)"
                >
                  Add it
                </button>
              </li>
            }
          </ul>
        }
        @if (report.alike.length) {
          <p>Near enough the same, if one is easier to get:</p>
          <ul class="swap-uses">
            @for (pair of report.alike; track pair.used + pair.other) {
              <li>
                {{ pair.other }} could stand in for {{ pair.used }}.
                <button
                  type="button"
                  class="btn btn-link btn-sm swap-action"
                  [attr.aria-label]="'Use ' + pair.other + ' instead of ' + pair.used"
                  (click)="useInstead(pair.used, pair.other)"
                >
                  Use it instead
                </button>
              </li>
            }
          </ul>
        }
        @if (report.countCost >= 0.1) {
          <p class="muted">
            It uses at most four new materials; with more it could come a little closer, at the cost of more to buy and
            weigh.
          </p>
        }
      }
      @if (result().cautions.length) {
        <p class="swap-watch"><b>What to watch for</b></p>
        <ul class="swap-cautions">
          @for (caution of result().cautions; track caution) {
            <li>{{ caution }}</li>
          }
        </ul>
      }
      @if (result().run.avoid.length) {
        <p>
          Left out: {{ list(result().run.avoid) }}.
          <button type="button" class="btn btn-link btn-sm swap-action" (click)="rerun.emit({ avoid: [] })">
            Allow them again
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
          Try other materials
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
          <button type="button" class="btn btn-primary btn-sm" (click)="workOutAgain()">Work it out again</button>
        </div>
      }
    </section>
  `
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
    const aim = run.kind === 'lead' ? 'the lead-free formula for the firing' : "the old recipe's fired oxides";
    if (report.miss < CLOSE) return `Its fired oxides come close to ${aim}.`;
    if (report.miss - report.best < COULD_BE_NEARER) {
      return `This is as near to ${aim} as these materials come; the comparison shows which oxides are off.`;
    }
    return `These materials could come nearer to ${aim}: see what would help, below.`;
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
