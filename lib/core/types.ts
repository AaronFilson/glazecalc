// The core's shapes (docs/adr/0030-nameless-chemistry-core.md). A record has an identity (identity.ts idOf)
// and its chemistry; the core never reads a name, so none is here. A host's records may carry more.

/** Amounts of oxides, by formula: moles, a unity formula, or weight percent, as the use says. */
export type Oxides = Record<string, number>;

export type OxideGroup = 'R2O' | 'RO' | 'R2O3' | 'RO2';

/** An oxide amount in the stored material shape. */
export interface MaterialField {
  name: string;
  amount: string | number;
  amountUnity?: number;
}

/** A material as a molar formula, a weight-percent analysis, or the stored { fields, percentmole, loi } shape. */
export interface MaterialInput {
  id?: unknown;
  formula?: Record<string, number>;
  analysis?: Record<string, number | string>;
  fields?: MaterialField[];
  percentmole?: string;
  loi?: number | string | null;
  molecularweight?: number | string | null;
  equivalent?: number | string | null;
  [more: string]: unknown;
}

/** The work a search has done, in multiply-adds, the most it may do, and whether a step stopped there. */
export interface Meter {
  used: number;
  most: number;
  cut: boolean;
  /** Made without a most of its own: a search over a larger problem may raise it. */
  scales?: boolean;
}

/** A line to fit: what to stay near, and the most and least it may be; group names a shared cap. */
export interface FitLine {
  material: MaterialInput;
  start: number;
  most?: number;
  least?: number;
  group?: string;
}

/** A line offered to selectMaterials: the recipe's own (start > 0) or a material to try. */
export interface SelectLine extends FitLine {
  must?: boolean;
  avoid?: boolean;
  lastResort?: boolean;
}

/** How near the oxides should come, shared caps on amounts (groups) and shares (0 to 1), and the meter. */
export interface FitOptions {
  near?: Oxides;
  alkalis?: number;
  fluxTotal?: number;
  groups?: Record<string, number>;
  shares?: Record<string, number>;
  meter?: Meter;
  /** selectMaterials: the most new materials it may add. */
  extras?: number;
  [more: string]: unknown;
}

/** selectMaterials' options: fitAmounts' and how the choosing goes (chemistry/select.ts). */
export interface SelectOptions extends FitOptions {
  /** Add back materials worth WORTH_ADDING each. */
  closer?: boolean;
  /** Never drop the recipe's own lines. */
  keepOwn?: boolean;
}

/** A material as the chemistry reads it once checked (chemistry/materials.ts prepareMaterial). */
export interface PreparedMaterial {
  id: unknown;
  label: unknown;
  /** Fired oxides, weight percent of the raw material. */
  analysis: Oxides;
  loi: number;
  /** The raw weight of the formula as written (100 for an analysis). */
  formulaWeight: number;
  warningCodes: import('./problem.ts').Warning[];
}

/** A recipe line: a record, or a reference a lookup turns into a prepared material, and its amount. */
export interface RecipeLine {
  material: MaterialInput | string;
  amount: unknown;
}
