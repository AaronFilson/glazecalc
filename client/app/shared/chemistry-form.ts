import { signal } from '@angular/core';
import { MaterialField, materialWeights } from '../../../lib/chemistry';
import { optional } from './dates';
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

  constructor(private readonly notices: Notices) {}

  addOxide(): void {
    const oxide = this.selectedOxide();
    if (!oxide) {
      this.notices.error('Error: please select an oxide.');
      return;
    }
    this.formula.update((lines) => [...lines, { name: oxide, amount: '0' }]);
  }

  removeOxide(index: number): void {
    this.formula.update((lines) => lines.filter((_, i) => i !== index));
  }

  /** The record to save, or null when something is missing or wrong (said in the notices). */
  build(): ChemistryRecord | null {
    if (!this.name() || !this.formula().length) {
      this.notices.error('Error: enter a name and at least one oxide.');
      return null;
    }
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
  }
}
