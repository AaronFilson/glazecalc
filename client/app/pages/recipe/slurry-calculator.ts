import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import * as slurry from '../../../../lib/recipe/slurry';
import { LocaleService } from '../../core/locale.service';
import { Density, PreferencesService } from '../../core/preferences.service';
import { fixed, plainNumber, upTo } from '../../shared/format';
import { NumberInput } from '../../shared/number-input';
import { GRAMS_PER_POUND, formatWeight } from '../../shared/weights';

// Specific gravity and water for a bucket of glaze (lib/recipe/slurry.js,
// Brongniart's formula): what the bucket holds, the water to bring it to the
// SG wanted, and the water for a new batch. Densities are typed as Settings
// say (SG, degrees Baumé or imperial pint weight), volumes in litres or
// gallons, and weights come out in grams and kilograms or pounds and ounces.

type VolumeUnit = 'litres' | 'usGallon' | 'imperialGallon';
const LITRES_IN: Record<VolumeUnit, number> = {
  litres: 1,
  usGallon: slurry.LITRES.usGallon,
  imperialGallon: slurry.LITRES.imperialGallon
};
const VOLUME_UNITS: ReadonlyArray<{ value: VolumeUnit; label: string; amount: string }> = [
  { value: 'litres', label: marker('recipe.slurry.units.litres'), amount: marker('recipe.slurry.amounts.litres') },
  {
    value: 'usGallon',
    label: marker('recipe.slurry.units.usGallon'),
    amount: marker('recipe.slurry.amounts.usGallon')
  },
  {
    value: 'imperialGallon',
    label: marker('recipe.slurry.units.imperialGallon'),
    amount: marker('recipe.slurry.amounts.imperialGallon')
  }
];
const MEASURED: Record<Density, string> = {
  sg: marker('recipe.slurry.measured.sg'),
  baume: marker('recipe.slurry.measured.baume'),
  pint: marker('recipe.slurry.measured.pint')
};
const TARGET: Record<Density, string> = {
  sg: marker('recipe.slurry.target.sg'),
  baume: marker('recipe.slurry.target.baume'),
  pint: marker('recipe.slurry.target.pint')
};
/** A dipping glaze's usual SG (Digitalfire), as each density is read. */
const TYPICAL: Record<Density, string> = { sg: '1.45', baume: '45', pint: '29' };

/** SG from a density as Settings read it; null for what is not a number. */
function sgOf(text: string, density: Density): number | null {
  const value = plainNumber(text);
  if (value === null) return null;
  return density === 'baume' ? slurry.sgFromBaume(value) : density === 'pint' ? slurry.sgFromPint(value) : value;
}

@Component({
  selector: 'gc-slurry-calculator',
  imports: [NumberInput, TranslocoDirective],
  template: `<ng-container *transloco="let t">
    <section class="panel slurry" aria-labelledby="slurry-heading">
      <h2 id="slurry-heading">{{ t('recipe.slurry.heading') }}</h2>
      <p>{{ t('recipe.slurry.intro') }}</p>
      <div class="slurry-fields">
        <div>
          <label for="slurry-volume" class="form-label">{{ t('recipe.slurry.volume') }}</label>
          <div class="slurry-pair">
            <input
              id="slurry-volume"
              type="text"
              inputmode="decimal"
              class="form-control form-control-sm"
              [gcNumber]="volume()"
              (gcNumberChange)="volume.set($event)"
            />
            <select
              class="form-select form-select-sm"
              [attr.aria-label]="t('recipe.slurry.volumeUnit')"
              (change)="volumeUnit.set($any($event.target).value)"
            >
              @for (unit of volumeUnits; track unit.value) {
                <option [value]="unit.value" [selected]="unit.value === volumeUnit()">{{ t(unit.label) }}</option>
              }
            </select>
          </div>
        </div>
        <div>
          <label for="slurry-measured" class="form-label">{{ t(measuredLabel()) }}</label>
          <input
            id="slurry-measured"
            type="text"
            inputmode="decimal"
            class="form-control form-control-sm"
            [gcNumber]="measured()"
            (gcNumberChange)="measured.set($event)"
          />
        </div>
        <div>
          <label for="slurry-target" class="form-label">{{ t(targetLabel()) }}</label>
          <input
            id="slurry-target"
            type="text"
            inputmode="decimal"
            class="form-control form-control-sm"
            [gcNumber]="target()"
            (gcNumberChange)="target.set($event)"
          />
        </div>
        <div>
          <label for="slurry-dry" class="form-label">{{ t('recipe.slurry.drySg') }}</label>
          <input
            id="slurry-dry"
            type="text"
            inputmode="decimal"
            class="form-control form-control-sm"
            aria-describedby="slurry-dry-help"
            [gcNumber]="dry()"
            (gcNumberChange)="dry.set($event)"
          />
          <div id="slurry-dry-help" class="form-text">{{ t('recipe.slurry.drySgHelp') }}</div>
        </div>
        <div>
          <label for="slurry-batch" class="form-label">{{
            t('recipe.slurry.batch', { unit: pounds() ? 'lb' : 'kg' })
          }}</label>
          <input
            id="slurry-batch"
            type="text"
            inputmode="decimal"
            class="form-control form-control-sm"
            [gcNumber]="batch()"
            (gcNumberChange)="batch.set($event)"
          />
        </div>
      </div>
      <div class="slurry-results" aria-live="polite">
        @if (problem()) {
          <p class="slurry-problem">{{ problem() }}</p>
        }
        @for (line of results(); track $index) {
          <p>{{ line }}</p>
        }
      </div>
      <p class="slurry-note">{{ t('recipe.slurry.note') }}</p>
    </section>
  </ng-container>`,
  styles: `
    .slurry-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
      gap: 0.75rem 1.25rem;
      margin-bottom: 0.75rem;
    }
    .slurry-pair {
      display: flex;
      gap: 0.4rem;
    }
    .slurry-pair input {
      flex: 1 1 5rem;
      min-width: 0;
    }
    .slurry-pair select {
      flex: 1 1 8rem;
      min-width: 0;
    }
    .slurry-results p {
      margin-bottom: 0.35rem;
      font-weight: 600;
    }
    .slurry-problem {
      color: var(--gc-danger-text);
    }
    .slurry-note {
      font-size: 0.9rem;
      color: var(--gc-muted);
    }
  `
})
export class SlurryCalculator {
  private readonly locale = inject(LocaleService);
  private readonly preferences = inject(PreferencesService);
  protected readonly volumeUnits = VOLUME_UNITS;
  protected readonly pounds = computed(() => this.preferences.weightUnit() === 'lb');

  protected readonly volume = signal('');
  /** Litres with weights in grams; gallons with pounds, imperial ones in Britain and Ireland. */
  protected readonly volumeUnit = linkedSignal<VolumeUnit>(() =>
    !this.pounds() ? 'litres' : ['GB', 'IE'].includes(this.locale.region()) ? 'imperialGallon' : 'usGallon'
  );
  protected readonly measured = signal('');
  /** The usual SG for dipping, as Settings read densities, until another is typed. */
  protected readonly target = linkedSignal(() => TYPICAL[this.locale.density()]);
  protected readonly dry = signal(String(slurry.DRY_SG));
  protected readonly batch = signal('');

  protected readonly measuredLabel = computed(() => MEASURED[this.locale.density()]);
  protected readonly targetLabel = computed(() => TARGET[this.locale.density()]);

  private readonly numbers = computed(() => {
    const density = this.locale.density();
    const volume = plainNumber(this.volume());
    return {
      litres: volume === null ? null : volume * LITRES_IN[this.volumeUnit()],
      sg: sgOf(this.measured(), density),
      target: sgOf(this.target(), density),
      dry: plainNumber(this.dry()) ?? slurry.DRY_SG,
      batchKg: ((plainNumber(this.batch()) ?? 0) * (this.pounds() ? GRAMS_PER_POUND : 1000)) / 1000
    };
  });

  /** Why an SG typed cannot be worked with: not over water's, or not under the dry materials'. */
  protected readonly problem = computed(() => {
    const { sg, target, dry } = this.numbers();
    const bad = (value: number | null) => value !== null && (value <= 1 || value >= dry);
    if (!(dry > 1)) return translate('recipe.slurry.badDry');
    return bad(sg) || bad(target) ? translate('recipe.slurry.badSg', { dry: upTo(dry, 2) }) : '';
  });

  protected readonly results = computed(() => {
    const { litres, sg, target, dry, batchKg } = this.numbers();
    const lines: string[] = [];
    if (litres !== null && sg !== null) {
      const contents = slurry.slurryContents(litres, sg, dry);
      if (contents) {
        lines.push(
          translate('recipe.slurry.contents', {
            sg: fixed(sg, 2),
            glaze: this.weight(contents.glaze),
            water: this.weight(contents.water)
          })
        );
      }
      const water = target !== null ? slurry.waterToReach(litres, sg, target, dry) : null;
      if (water !== null && target !== null) {
        const params = {
          target: fixed(target, 2),
          water: this.weight(Math.abs(water)),
          volume: this.volumeText(litres + water)
        };
        lines.push(
          Math.abs(water) < 0.0005 * litres
            ? translate('recipe.slurry.already', params)
            : water > 0
              ? translate('recipe.slurry.add', params)
              : translate('recipe.slurry.pourOff', params)
        );
      }
    }
    if (batchKg > 0 && target !== null) {
      const mix = slurry.waterForBatch(batchKg, target, dry);
      if (mix) {
        lines.push(
          translate('recipe.slurry.mix', {
            glaze: this.weight(batchKg),
            water: this.weight(mix.water),
            target: fixed(target, 2),
            volume: this.volumeText(mix.litres)
          })
        );
      }
    }
    return lines;
  });

  /** Kilograms as the account weighs: 8.33 kg or 640 g, or 18 lb 6.1 oz. */
  private weight(kg: number): string {
    if (this.pounds()) return formatWeight(kg * 1000, 'lb', this.preferences.gramPrecision());
    return kg >= 1 ? upTo(kg, 2) + ' kg' : upTo(kg * 1000, 0) + ' g';
  }

  /** Litres in the unit chosen: 12.5 L, 3.3 US gal. */
  private volumeText(litres: number): string {
    const unit = VOLUME_UNITS.find((u) => u.value === this.volumeUnit())!;
    return translate(unit.amount, { amount: upTo(litres / LITRES_IN[unit.value], 2) });
  }
}
