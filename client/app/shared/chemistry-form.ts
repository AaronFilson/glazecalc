import { signal } from '@angular/core';
import { MaterialField, materialWeights } from '../../../lib/chemistry';
import { optional } from './dates';
import { Check, FieldChecks, numberCheck, required } from './field-checks';
import { Notices } from './notices';

export interface FormulaLine {
  name: string;
  amount: string;
}

/** A material or additive as entered, with its unity formula and weights worked out. */
export interface ChemistryRecord {
  name: string;
  rawformula?: string;
  relatedTo?: string;
  notes?: string;
  percentmole: 'molecular' | 'percent';
  loi: number;
  molecularweight: number;
  equivalent: number;
  formulaweight: number;
  fields: MaterialField[];
}

const round = (value: number, places: number): number => Number(value.toFixed(places));

/**
 * The entry form for a material or an additive: its fired formula or oxide
 * analysis, and its LOI. The unity formula and weights are worked out from them
 * when it is saved, so they always agree; recipes work them out again, so
 * rounding them for display is safe.
 */
export class ChemistryForm {
  readonly name = signal('');
  readonly rawformula = signal('');
  readonly relatedTo = signal('');
  readonly notes = signal('');
  readonly loi = signal('');
  readonly molecularweight = signal('');
  readonly percentmole = signal<'molecular' | 'percent'>('molecular');
  readonly selectedOxide = signal('');
  readonly formula = signal<FormulaLine[]>([]);
  /** An additive with no oxide analysis, such as a commercial stain (not offered for materials). */
  readonly noChemistry = signal(false);

  /** The fields' problems: oxide amounts are amount-0, amount-1 and so on. */
  readonly checks = new FieldChecks(
    () => ({
      name: required(this.name, `Give the ${this.noun} a name.`),
      // An additive with no chemistry needs only its name.
      ...(this.noChemistry()
        ? {}
        : {
            loi: numberCheck(this.loi, 'Enter the LOI as a percent from 0 to under 100, such as 12.5.', {
              below: 100
            }),
            molecularweight: numberCheck(
              this.molecularweight,
              'Enter the molecular weight as a number, such as 100.09.'
            ),
            oxide: () =>
              this.formula().length ? null : 'Add at least one oxide: choose it, then Add the oxide to the list.',
            ...Object.fromEntries(this.formula().map((line, i) => ['amount-' + i, amountCheck(line)]))
          })
    }),
    { sendOnly: ['oxide'] }
  );

  /** `noun` names the record in messages: "Give the material a name." */
  constructor(
    private readonly notices: Notices,
    private readonly noun = 'material'
  ) {}

  addOxide(): void {
    const oxide = this.selectedOxide();
    if (!oxide) {
      this.checks.report('oxide', 'Choose an oxide, then Add the oxide to the list.');
      return;
    }
    this.formula.update((lines) => [...lines, { name: oxide, amount: '0' }]);
    this.checks.recheck('oxide');
  }

  removeOxide(index: number): void {
    // The amounts after it move up a place, so their marks would be on the wrong lines.
    this.formula().forEach((_, i) => this.checks.clear('amount-' + i));
    this.formula.update((lines) => lines.filter((_, i) => i !== index));
  }

  /** The record to save, or null when something is missing or wrong (said in the notices). */
  build(): ChemistryRecord | null {
    if (!this.checks.validate()) return null;
    const entered = {
      name: this.name(),
      percentmole: this.percentmole(),
      loi: this.loi(),
      molecularweight: this.molecularweight(),
      fields: this.formula().map((line) => ({ ...line }))
    };
    let weights;
    try {
      weights = materialWeights(entered);
    } catch (e) {
      this.notices.error('Error: ' + (e as Error).message);
      return null;
    }
    this.notices.warnings(weights.warnings);
    return {
      name: entered.name,
      rawformula: optional(this.rawformula()),
      relatedTo: optional(this.relatedTo()),
      notes: optional(this.notes()),
      percentmole: entered.percentmole,
      loi: weights.loi,
      molecularweight: round(weights.molecularWeight, 2),
      equivalent: round(weights.equivalent, 2),
      formulaweight: round(weights.firedWeight, 2),
      fields: entered.fields.map((field) => ({ ...field, amountUnity: round(weights.unity[field.name] ?? 0, 4) }))
    };
  }

  reset(): void {
    for (const field of [this.name, this.rawformula, this.relatedTo, this.notes, this.loi, this.molecularweight]) {
      field.set('');
    }
    this.percentmole.set('molecular');
    this.selectedOxide.set('');
    this.formula.set([]);
    this.noChemistry.set(false);
    this.checks.clear();
  }

  /** An additive with no chemistry to save, or null when it has no name (marked on the field). */
  buildWithoutChemistry(): NoChemistryRecord | null {
    if (!this.checks.validate()) return null;
    return {
      name: this.name(),
      rawformula: optional(this.rawformula()),
      relatedTo: optional(this.relatedTo()),
      notes: optional(this.notes()),
      noChemistry: true,
      fields: []
    };
  }
}

/** An additive left out of the unity formula: no oxides, LOI or weights. */
export interface NoChemistryRecord {
  name: string;
  rawformula?: string;
  relatedTo?: string;
  notes?: string;
  noChemistry: true;
  fields: [];
}

/** An oxide's amount: a number of 0 or more. */
function amountCheck(line: FormulaLine): Check {
  return () =>
    String(line.amount ?? '').trim() === ''
      ? 'Enter an amount, such as 0.5.'
      : numberCheck(() => line.amount, 'Enter the amount as a number, such as 0.5.')();
}
