import { Component, computed, inject, linkedSignal, model, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import {
  ATMOSPHERES,
  ConeScale,
  FIRING_LIMITS,
  FiringBlock,
  PROCESSES,
  cleanFiring,
  coneChoices,
  coneLabel,
  conesBetween,
  isCone
} from '../../../../lib/cones/firing';
import { LocaleService } from '../../core/locale.service';
import { upTo } from '../../shared/format';
import { ATMOSPHERE_NAMES, Reader, coneText, firingWords } from './firing-text';

// The recipe's firing, as the potter states it (docs/adr/0021-recipe-firing.md):
// the scale (Orton, SK or a temperature), the cone or a claimed range, a tick
// per cone of the range actually tested, the atmosphere and process, for a
// temperature the rate over the last hour and the hold, a schedule note and a
// witness cone; and whether the glaze is for a food surface, which brings the
// safety note. The scale starts from the potter's cone setting; the cone is
// kept as chosen and never converted, and the conversion beside it says it is
// approximate.

const SCALE_NAMES: Record<ConeScale, string> = {
  orton: marker('recipe.firing.scales.orton'),
  sk: marker('recipe.firing.scales.sk'),
  temperature: marker('recipe.firing.scales.temperature')
};
const GROUP_NAMES: Record<string, string> = {
  usual: marker('recipe.firing.groups.usual'),
  half: marker('recipe.firing.groups.half'),
  above: marker('recipe.firing.groups.above')
};

@Component({
  selector: 'gc-recipe-firing',
  imports: [RouterLink, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="firing-block" aria-labelledby="firing-heading">
      <div class="firing-top">
        <h3 id="firing-heading">{{ t('recipe.firing.heading') }}</h3>
        <a routerLink="/guides/firing" class="small">{{ t('recipe.firing.whatIsCone') }}</a>
      </div>
      <div class="firing-row">
        <div>
          <label for="firing-scale" class="form-label">{{ t('recipe.firing.scale') }}</label>
          <select id="firing-scale" class="form-select" (change)="chooseScale($any($event.target).value)">
            @for (s of scales; track s) {
              <option [value]="s" [selected]="s === scale()">{{ t(scaleNames[s]) }}</option>
            }
          </select>
        </div>
        @if (scale() === 'temperature') {
          <div>
            <label for="firing-low" class="form-label">{{
              ranged() ? t('recipe.firing.lowTemperature', { unit: unit() }) : t('recipe.firing.peak', { unit: unit() })
            }}</label>
            <input
              id="firing-low"
              type="number"
              inputmode="numeric"
              class="form-control"
              [value]="typedLow()"
              (change)="setTemperature('low', $any($event.target).value)"
            />
          </div>
          @if (ranged()) {
            <div>
              <label for="firing-high" class="form-label">{{
                t('recipe.firing.highTemperature', { unit: unit() })
              }}</label>
              <input
                id="firing-high"
                type="number"
                inputmode="numeric"
                class="form-control"
                [value]="typedHigh()"
                (change)="setTemperature('high', $any($event.target).value)"
              />
            </div>
          }
        } @else {
          <div>
            <label for="firing-low" class="form-label">{{
              ranged() ? t('recipe.firing.lowCone') : t('recipe.firing.coneLabel')
            }}</label>
            <select id="firing-low" class="form-select" (change)="setCone('low', $any($event.target).value)">
              <option value="" [selected]="!block()?.low">{{ t('recipe.firing.notStated') }}</option>
              @for (group of choices(); track group.group) {
                <optgroup [label]="t(groupNames[group.group])">
                  @for (cone of group.cones; track cone) {
                    <option [value]="cone" [selected]="cone === block()?.low">{{ label(cone) }}</option>
                  }
                </optgroup>
              }
            </select>
          </div>
          @if (ranged()) {
            <div>
              <label for="firing-high" class="form-label">{{ t('recipe.firing.highCone') }}</label>
              <select id="firing-high" class="form-select" (change)="setCone('high', $any($event.target).value)">
                <option value="" [selected]="!block()?.high">{{ t('recipe.firing.noHigh') }}</option>
                @for (group of choices(); track group.group) {
                  <optgroup [label]="t(groupNames[group.group])">
                    @for (cone of group.cones; track cone) {
                      <option [value]="cone" [selected]="cone === block()?.high">{{ label(cone) }}</option>
                    }
                  </optgroup>
                }
              </select>
            </div>
          }
        }
        <div class="form-check firing-range-check">
          <input
            id="firing-range"
            class="form-check-input"
            type="checkbox"
            [checked]="ranged()"
            (change)="setRanged($any($event.target).checked)"
          />
          <label for="firing-range" class="form-check-label">{{ t('recipe.firing.rangeToggle') }}</label>
        </div>
      </div>
      @if (problem()) {
        <p class="firing-problem" role="alert">{{ problem() }}</p>
      }
      @if (ranged() && rangeCones().length > 1) {
        <fieldset class="firing-ticks">
          <legend class="form-label">{{ t('recipe.firing.testedLegend') }}</legend>
          @for (cone of rangeCones(); track cone) {
            <div class="form-check form-check-inline">
              <input
                [id]="'firing-tested-' + cone"
                class="form-check-input"
                type="checkbox"
                [checked]="block()?.tested?.includes(cone)"
                (change)="setTested(cone, $any($event.target).checked)"
              />
              <label [for]="'firing-tested-' + cone" class="form-check-label">{{ coneName(cone) }}</label>
            </div>
          }
        </fieldset>
      }
      @if (words(); as w) {
        <p class="firing-summary" aria-live="polite">
          @if (w.tested) {
            <strong class="firing-tested">{{ w.tested }}</strong>
          }
          @if (w.range) {
            <span class="firing-claimed">{{ w.range }}</span>
          }
          @if (w.conversion) {
            <span class="firing-approx">{{ w.conversion }}</span>
          }
        </p>
      }
      <div class="firing-row">
        <fieldset>
          <legend class="form-label">{{ t('recipe.firing.atmosphere') }}</legend>
          @for (a of atmospheres; track a) {
            <div class="form-check form-check-inline">
              <input
                [id]="'firing-atmosphere-' + a"
                class="form-check-input"
                type="checkbox"
                [checked]="block()?.atmospheres?.includes(a)"
                (change)="toggleList('atmospheres', a, $any($event.target).checked)"
              />
              <label [for]="'firing-atmosphere-' + a" class="form-check-label">{{ t(names[a]) }}</label>
            </div>
          }
        </fieldset>
        <fieldset>
          <legend class="form-label">{{ t('recipe.firing.process') }}</legend>
          @for (p of processes; track p) {
            <div class="form-check form-check-inline">
              <input
                [id]="'firing-process-' + p"
                class="form-check-input"
                type="checkbox"
                [checked]="block()?.processes?.includes(p)"
                (change)="toggleList('processes', p, $any($event.target).checked)"
              />
              <label [for]="'firing-process-' + p" class="form-check-label">{{ t(names[p]) }}</label>
            </div>
          }
        </fieldset>
      </div>
      <div class="firing-row">
        @if (scale() === 'temperature') {
          <div>
            <label for="firing-rate" class="form-label">{{ t('recipe.firing.rate', { unit: unit() }) }}</label>
            <input
              id="firing-rate"
              type="number"
              inputmode="numeric"
              class="form-control"
              [value]="typedRate()"
              (change)="setRate($any($event.target).value)"
            />
          </div>
          <div>
            <label for="firing-hold" class="form-label">{{ t('recipe.firing.hold') }}</label>
            <input
              id="firing-hold"
              type="number"
              inputmode="numeric"
              class="form-control"
              [value]="block()?.hold ?? ''"
              (change)="setHold($any($event.target).value)"
            />
          </div>
        }
        <div class="firing-schedule">
          <label for="firing-schedule" class="form-label">{{ t('recipe.firing.schedule') }}</label>
          <input
            id="firing-schedule"
            type="text"
            class="form-control"
            [maxLength]="scheduleMax"
            [placeholder]="t('recipe.firing.schedulePlaceholder')"
            [value]="block()?.schedule ?? ''"
            (change)="update({ schedule: $any($event.target).value })"
          />
        </div>
      </div>
      <div class="form-check">
        <input
          id="firing-witness"
          class="form-check-input"
          type="checkbox"
          [checked]="!!block()?.witness"
          (change)="update({ witness: $any($event.target).checked || undefined })"
        />
        <label for="firing-witness" class="form-check-label">{{ t('recipe.firing.witness') }}</label>
      </div>
      <div class="form-check">
        <input
          id="food-surface"
          class="form-check-input"
          type="checkbox"
          [checked]="foodSurface()"
          (change)="foodSurface.set($any($event.target).checked)"
        />
        <label for="food-surface" class="form-check-label">{{ t('recipe.firing.foodSurface') }}</label>
      </div>
      @if (foodSurface()) {
        <div class="firing-liner" role="note">
          <p>{{ t('recipe.firing.liner.note') }}</p>
          @if (ranged() && block()?.high) {
            <p>{{ t('recipe.firing.liner.range') }}</p>
          }
          @if (!words()?.tested) {
            <p>{{ t('recipe.firing.liner.untested') }}</p>
          }
          <p>{{ t('recipe.firing.liner.test') }}</p>
        </div>
      }
      <details class="firing-help">
        <summary>{{ t('recipe.firing.helpSummary') }}</summary>
        <p>{{ t('recipe.firing.help.cone') }}</p>
        <p>{{ t('recipe.firing.help.range') }}</p>
        <p>{{ t('recipe.firing.help.convert') }}</p>
        <p>{{ t('recipe.firing.help.move') }}</p>
      </details>
    </section>
  </ng-container>`,
  styles: `
    .firing-block {
      border-top: 1px solid var(--gc-border);
      padding-top: 0.75rem;
      margin-bottom: 1rem;
    }
    .firing-top {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.25rem 1rem;
    }
    .firing-top h3 {
      font-size: 1.1rem;
      margin: 0 0 0.5rem;
    }
    .firing-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.5rem 1rem;
      margin-bottom: 0.5rem;
    }
    .firing-row > div,
    .firing-row > fieldset {
      flex: 0 1 12rem;
      min-width: 0;
    }
    .firing-row > fieldset {
      flex-basis: 18rem;
    }
    .firing-row > .firing-schedule {
      flex: 1 1 16rem;
    }
    /* Its own width, but no wider than the row: a language's long words (Malayalam's) wrap on a phone. */
    .firing-row > .firing-range-check {
      flex: 0 1 auto;
      min-width: 0;
      padding-bottom: 0.4rem;
      margin-inline-start: 1.5rem;
    }
    .firing-ticks {
      margin-bottom: 0.5rem;
    }
    .firing-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      margin-bottom: 0.5rem;
    }
    .firing-tested {
      font-size: 1.05rem;
    }
    .firing-claimed,
    .firing-approx {
      color: var(--gc-muted);
    }
    .firing-approx {
      font-size: 0.9rem;
    }
    .firing-problem {
      color: var(--gc-danger-text);
    }
    .firing-liner {
      border-inline-start: 4px solid var(--gc-warning-border, #c08a00);
      background: var(--gc-warning-bg, transparent);
      padding: 0.5rem 0.75rem;
      margin: 0.5rem 0;
    }
    .firing-liner p {
      margin: 0 0 0.25rem;
    }
    .firing-help {
      font-size: 0.9rem;
      color: var(--gc-muted);
      margin-top: 0.5rem;
    }
  `
})
export class RecipeFiring {
  /** The firing as stated; null is not stated. Saved with the recipe as firedAt. */
  readonly block = model<FiringBlock | null>(null);
  /** For a food surface (a liner): brings the safety note. Saved with the recipe as foodSurface. */
  readonly foodSurface = model(false);

  private readonly locale = inject(LocaleService);
  protected readonly scales: ConeScale[] = ['orton', 'sk', 'temperature'];
  protected readonly scaleNames = SCALE_NAMES;
  protected readonly groupNames = GROUP_NAMES;
  protected readonly atmospheres = ATMOSPHERES;
  protected readonly processes = PROCESSES;
  protected readonly names = ATMOSPHERE_NAMES;
  protected readonly scheduleMax = FIRING_LIMITS.schedule;
  protected readonly label = coneLabel;
  protected readonly problem = signal('');

  private readonly reader = computed<Reader>(() => ({
    cones: this.locale.cones(),
    temperature: this.locale.temperature()
  }));
  protected readonly unit = computed(() => '°' + this.locale.temperature());
  /** The scale: the block's, or the last chosen, or the potter's cone setting. */
  protected readonly scale = linkedSignal<FiringBlock | null, ConeScale>({
    source: this.block,
    computation: (block, previous) => block?.scale ?? previous?.value ?? this.locale.cones()
  });
  /** Whether a range is given: the block has a high end, or the potter asked for one. */
  protected readonly ranged = linkedSignal<FiringBlock | null, boolean>({
    source: this.block,
    computation: (block, previous) => (block ? !!block.high || (previous?.value ?? false) : false)
  });
  protected readonly choices = computed(() => coneChoices(this.scale()));
  protected readonly rangeCones = computed(() => {
    const block = this.block();
    return block ? conesBetween(block.scale, block.low, block.high) : [];
  });
  protected readonly words = computed(() => firingWords(this.block(), this.reader()));

  /** A temperature in °C, in the reader's scale for typing. */
  private typed(celsius: string | undefined): string {
    if (!celsius) return '';
    const c = Number(celsius);
    return String(Math.round(this.locale.temperature() === 'F' ? (c * 9) / 5 + 32 : c));
  }
  protected readonly typedLow = computed(() => (this.scale() === 'temperature' ? this.typed(this.block()?.low) : ''));
  protected readonly typedHigh = computed(() => (this.scale() === 'temperature' ? this.typed(this.block()?.high) : ''));
  protected readonly typedRate = computed(() => {
    const rate = this.block()?.rate;
    if (rate === undefined) return '';
    return upTo(this.locale.temperature() === 'F' ? (rate * 9) / 5 : rate, 0);
  });

  protected coneName(cone: string): string {
    return coneText(this.scale(), cone, this.reader());
  }

  /** Sets fields of the block, keeping only what can be saved; a block that says nothing is null. */
  update(changes: Partial<FiringBlock>): void {
    const next: FiringBlock = { ...(this.block() ?? {}), scale: this.scale(), ...changes };
    for (const key of Object.keys(next) as Array<keyof FiringBlock>) {
      if (next[key] === undefined || next[key] === '') delete next[key];
    }
    // A single cone counts as tested; a range keeps the ticks still inside it.
    const range = conesBetween(next.scale, next.low, next.high);
    if (next.tested) next.tested = next.tested.filter((cone) => range.includes(cone));
    if (range.length === 1) next.tested = range;
    this.block.set(cleanFiring(next));
  }

  protected chooseScale(scale: ConeScale): void {
    if (scale === this.scale()) return;
    this.problem.set('');
    this.scale.set(scale);
    // The cone is kept as entered, never converted: a new scale starts with no cone.
    const block = this.block();
    this.block.set(
      cleanFiring({
        scale,
        atmospheres: block?.atmospheres,
        processes: block?.processes,
        schedule: block?.schedule,
        witness: block?.witness
      })
    );
    this.scale.set(scale);
  }

  protected setRanged(ranged: boolean): void {
    this.ranged.set(ranged);
    if (!ranged && this.block()?.high) this.update({ high: undefined, tested: undefined });
    this.ranged.set(ranged);
  }

  protected setCone(end: 'low' | 'high', cone: string): void {
    this.problem.set('');
    const block = this.block();
    const low = end === 'low' ? cone || undefined : block?.low;
    let high = end === 'high' ? cone || undefined : block?.high;
    if (!low) high = undefined;
    // A high end below the low one is turned round, so the range reads lowest first.
    if (low && high && conesBetween(this.scale(), low, high).length === 0) {
      this.update({ low: high, high: low });
      return;
    }
    this.update({ low, high: high === low ? undefined : high });
  }

  /** A temperature as typed, in the reader's scale, kept in °C to the degree. */
  protected setTemperature(end: 'low' | 'high', typed: string): void {
    this.problem.set('');
    const text = typed.trim();
    if (!text) {
      this.setCone(end, '');
      return;
    }
    const value = Number(text.replace(',', '.'));
    const celsius = String(Math.round(this.locale.temperature() === 'F' ? ((value - 32) * 5) / 9 : value));
    if (!Number.isFinite(value) || !isCone('temperature', celsius)) {
      const { min, max } = FIRING_LIMITS.celsius;
      const shown = (c: number) => this.typed(String(c)) + ' ' + this.unit();
      this.problem.set(translate('recipe.firing.temperatureProblem', { min: shown(min), max: shown(max) }));
      return;
    }
    this.setCone(end, celsius);
  }

  protected setTested(cone: string, tested: boolean): void {
    const now = new Set(this.block()?.tested ?? []);
    if (tested) now.add(cone);
    else now.delete(cone);
    this.update({ tested: [...now] });
  }

  protected toggleList(key: 'atmospheres' | 'processes', value: string, on: boolean): void {
    const now = new Set<string>(this.block()?.[key] ?? []);
    if (on) now.add(value);
    else now.delete(value);
    this.update({ [key]: [...now] } as Partial<FiringBlock>);
  }

  protected setRate(typed: string): void {
    this.problem.set('');
    const value = Number(typed.trim().replace(',', '.'));
    if (!typed.trim()) return this.update({ rate: undefined });
    // Kept in °C to a tenth, so a rate typed in °F comes back as typed (100 °F an hour is 55.6 °C, shown 100).
    const perHour = Math.round((this.locale.temperature() === 'F' ? (value * 5) / 9 : value) * 10) / 10;
    if (!(perHour >= FIRING_LIMITS.rate.min && perHour <= FIRING_LIMITS.rate.max)) {
      this.problem.set(translate('recipe.firing.rateProblem'));
      return;
    }
    this.update({ rate: perHour });
  }

  protected setHold(typed: string): void {
    this.problem.set('');
    if (!typed.trim()) return this.update({ hold: undefined });
    const minutes = Math.round(Number(typed.trim().replace(',', '.')));
    if (!(minutes >= FIRING_LIMITS.hold.min && minutes <= FIRING_LIMITS.hold.max)) {
      this.problem.set(translate('recipe.firing.holdProblem'));
      return;
    }
    this.update({ hold: minutes });
  }
}
