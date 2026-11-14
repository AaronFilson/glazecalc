import { Injector, WritableSignal, afterNextRender, computed, inject, signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { Additive, AdditiveUnit, Material, RecipeMaterial } from '../../core/models';
import { PreferencesService } from '../../core/preferences.service';
import { FieldChecks } from '../../shared/field-checks';
import { upTo } from '../../shared/format';
import { GRAMS_PER_POUND, WeightUnit, formatWeight } from '../../shared/weights';
import { Rebase, amountOf, rebase, totalOf, unitOf } from './rebase';

// The recipe's materials and its colorants and additives, as the potter edits them on the recipe page:
// adding from the lists, amounts and units, taking one out, and changing the scale (to percent, to parts,
// or to a batch in grams or pounds). The page holds the lists themselves (recipe-page.ts).

/** Each label is the key of its message. */
const ADDITIVE_UNITS: ReadonlyArray<{ value: AdditiveUnit; label: string }> = [
  { value: 'percent', label: marker('recipe.page.units.percent') },
  { value: 'parts', label: marker('recipe.page.units.parts') },
  { value: 'grams', label: marker('recipe.page.units.grams') }
];

/** What a change of scale did, as the key of its message. */
const SCALE_NOTES: Record<Exclude<Rebase['to'], 'batch'>, string> = {
  percent: marker('recipe.page.scaledPercent'),
  parts: marker('recipe.page.scaledParts')
};

/** A batch weight to start from, in each unit: about a pound either way. */
const DEFAULT_BATCH: Record<WeightUnit, string> = { g: '500', lb: '1' };

/** The recipe page, as editing its lists reads and changes it. */
export interface LinesPage {
  readonly lines: WritableSignal<RecipeMaterial[]>;
  readonly additiveLines: WritableSignal<Additive[]>;
  /** The title's and the amounts' checks, by their fields' ids (shared/field-checks.ts). */
  readonly checks: FieldChecks;
  /** Why an amount stops a change of scale: the first that is not a number, said; '' when each is one. */
  unreadable(): string;
  /** The materials changed: the questions the swaps asked about them are closed. */
  closeQuestions(): void;
  /** Tells a screen reader what was done. */
  announce(text: string): void;
}

export class RecipeLines {
  private readonly injector = inject(Injector);
  private readonly weightUnit = inject(PreferencesService).weightUnit;

  constructor(private readonly page: LinesPage) {}

  readonly materials = computed(() => this.page.lines());
  readonly additives = computed(() => this.page.additiveLines());
  readonly additiveUnits = ADDITIVE_UNITS;
  readonly unitOf = unitOf;
  readonly total = computed(() => totalOf(this.page.lines().map((l) => l.amount)));

  // Scale changes.
  readonly batchOpen = signal(false);
  /** The batch weight as typed, and the unit it was typed in. */
  private readonly batchTyped = signal<{ text: string; unit: WeightUnit } | null>(null);
  /** The batch weight in the account's unit (grams, or pounds). */
  readonly batchText = computed(() => {
    const typed = this.batchTyped();
    const unit = this.weightUnit();
    return typed?.unit === unit ? typed.text : DEFAULT_BATCH[unit];
  });
  readonly batchUnit = computed(() => (this.weightUnit() === 'lb' ? 'lb' : 'g'));
  readonly scaleMessage = signal<{ text: string; problem: boolean } | null>(null);
  /**
   * Scaled to a batch in pounds: the amounts are pounds, and each shows what it
   * weighs in pounds and ounces, until the scale changes or another recipe opens.
   */
  private readonly inPounds = signal(false);
  readonly poundReadings = computed(() => {
    if (!this.inPounds()) return null;
    const reading = (pounds: number): string => (pounds > 0 ? formatWeight(pounds * GRAMS_PER_POUND, 'lb') : '');
    const base = this.total();
    return {
      materials: this.page.lines().map((line) => reading(amountOf(line.amount))),
      // A percent of the base is that share of the batch.
      additives: this.page
        .additiveLines()
        .map((line) =>
          reading(unitOf(line) === 'percent' ? (amountOf(line.amount) / 100) * base : amountOf(line.amount))
        ),
      total: reading(base)
    };
  });

  /** The title's and the amounts' checks, for the amounts' fields. */
  get checks(): FieldChecks {
    return this.page.checks;
  }

  /** Another recipe is on the page: what a change of scale said goes, and the weights in pounds with it. */
  clear(): void {
    this.scaleMessage.set(null);
    this.inPounds.set(false);
  }

  addMaterial(material: Material): void {
    this.page.lines.update((list) => [...list, { ...structuredClone(material), amount: '' }]);
    this.scaleMessage.set(null);
    this.page.closeQuestions();
    this.focusAmount('material', this.page.lines().length - 1);
  }

  setAmount(index: number, amount: string): void {
    this.page.lines.update((list) => list.map((line, i) => (i === index ? { ...line, amount } : line)));
    this.scaleMessage.set(null);
    this.page.closeQuestions();
  }

  /**
   * Enter in an amount: that line is done, so the focus goes back to the list the next one is added from (its
   * filter field, which a screen reader names). Enter did nothing here before, and there is no form to send.
   * An amount missing or unreadable keeps the focus, marked, with its problem said.
   */
  amountEntered(event: Event, kind: 'material' | 'additive', index: number): void {
    // Enter that ends a composition (Chinese, Japanese, Korean) belongs to it.
    if ((event as KeyboardEvent).isComposing) return;
    event.preventDefault();
    if (!this.page.checks.confirm(kind + '-amount-' + index)) return;
    document.getElementById(kind + 's-filter')?.focus();
  }

  removeMaterial(index: number): void {
    const name = this.page.lines()[index]?.name;
    this.page.lines.update((list) => list.filter((_, i) => i !== index));
    this.page.closeQuestions();
    // The amounts after it move up a place, so their marks would be on the wrong lines.
    this.page.checks.clear();
    this.afterTakingOut('material', name, index, this.page.lines().length);
  }

  addAdditive(additive: Additive): void {
    // Most recipes give colorants as a percent of the base.
    this.page.additiveLines.update((list) => [...list, { ...structuredClone(additive), amount: '', unit: 'percent' }]);
    this.focusAmount('additive', this.page.additiveLines().length - 1);
  }

  setAdditiveAmount(index: number, amount: string): void {
    this.page.additiveLines.update((list) => list.map((line, i) => (i === index ? { ...line, amount } : line)));
  }

  setAdditiveUnit(index: number, unit: AdditiveUnit): void {
    this.page.additiveLines.update((list) => list.map((line, i) => (i === index ? { ...line, unit } : line)));
  }

  removeAdditive(index: number): void {
    const name = this.page.additiveLines()[index]?.name;
    this.page.additiveLines.update((list) => list.filter((_, i) => i !== index));
    this.page.checks.clear();
    this.afterTakingOut('additive', name, index, this.page.additiveLines().length);
  }

  /** A material's share of the batch, as a percent. */
  share(amount: string | undefined): string {
    const total = this.total();
    return total && amountOf(amount) ? upTo((amountOf(amount) / total) * 100, 1) + '%' : '';
  }

  /** The whole batch's share, 100%, in the reader's digits as the other shares are. */
  totalShare(): string {
    return this.total() ? upTo(100, 0) + '%' : '';
  }

  formatTotal(): string {
    return upTo(this.total(), 3);
  }

  scale(how: Exclude<Rebase, { to: 'batch' }>): void {
    if (this.rescale(how, translate('recipe.page.enterAmountsFirst'))) {
      this.inPounds.set(false);
      this.scaleMessage.set({ text: translate(SCALE_NOTES[how.to]), problem: false });
    }
  }

  setBatchText(text: string): void {
    this.batchTyped.set({ text, unit: this.weightUnit() });
  }

  /** Scales to a batch in the account's unit: grams, or pounds (shown in pounds and ounces too). */
  scaleToBatch(): void {
    const pounds = this.weightUnit() === 'lb';
    const missing = pounds ? translate('recipe.page.batchPounds') : translate('recipe.page.batchGrams');
    if (!this.rescale({ to: 'batch', weight: amountOf(this.batchText()) }, missing)) return;
    if (!pounds) {
      this.inPounds.set(false);
      this.scaleMessage.set({ text: translate('recipe.page.scaledGrams'), problem: false });
      return;
    }
    // Colorants in grams would now be pounds: in parts, they say they scale as the materials do.
    const inGrams = this.page.additiveLines().some((line) => unitOf(line) === 'grams');
    this.page.additiveLines.update((list) =>
      list.map((line) => (unitOf(line) === 'grams' ? { ...line, unit: 'parts' as const } : line))
    );
    this.inPounds.set(true);
    this.scaleMessage.set({
      text: inGrams ? translate('recipe.page.scaledPoundsParts') : translate('recipe.page.scaledPounds'),
      problem: false
    });
  }

  /** Puts the recipe on a new scale; false, with the reason shown, when it cannot. */
  private rescale(how: Rebase, missing: string): boolean {
    // Scaling around an amount it cannot read would change the proportions.
    const unreadable = this.page.unreadable();
    if (unreadable) {
      this.scaleMessage.set({ text: unreadable, problem: true });
      return false;
    }
    const result = rebase(
      this.page.lines().map((l) => l.amount),
      this.page.additiveLines(),
      how
    );
    if (!result) {
      this.scaleMessage.set({ text: missing, problem: true });
      return false;
    }
    this.page.lines.update((list) => list.map((line, i) => ({ ...line, amount: result.materials[i] })));
    this.page.additiveLines.update((list) => list.map((line, i) => ({ ...line, amount: result.additives[i] })));
    this.batchOpen.set(false);
    return true;
  }

  /**
   * Says what was taken out, and keeps the focus in the list: on the ✕ now in
   * the same place, or the one before, or the list's heading once it is empty.
   */
  private afterTakingOut(kind: 'material' | 'additive', name: string | undefined, index: number, left: number): void {
    this.page.announce(
      name === undefined ? translate('recipe.page.itTakenOut') : translate('recipe.page.takenOut', { name })
    );
    afterNextRender(
      () => {
        const target = left
          ? document.getElementById(kind + '-remove-' + Math.min(index, left - 1))
          : document.getElementById(kind + 's-heading');
        target?.focus();
      },
      { injector: this.injector }
    );
  }

  private focusAmount(kind: 'material' | 'additive', index: number): void {
    afterNextRender(() => document.getElementById(kind + '-amount-' + index)?.focus(), { injector: this.injector });
  }
}
