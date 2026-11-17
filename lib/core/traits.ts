// What the core needs to know about a record beyond its chemistry (docs/adr/0030-nameless-chemistry-core.md):
// whether it is a theoretical mineral, calcined, a raw calcium source, which colorant an additive is, and the
// like. The core asks the host's traitsOf, never a name (docs/adr/0031-functional-core.md). By default a
// record carries its own (`record.traits`); a host whose records do not yet gives its own reader (Glazecalc's
// reads them from its standard names, lib/recipe/traits.js).

import type { Host } from './host.ts';

/** A material's mineral for its dry specific gravity (recipe/density.ts), or null with why there is none. */
export interface DensityTrait {
  mineral: string | null;
  reason?: string;
}

/** What the core needs to know about a record beyond its chemistry; a flag left out is false. */
export interface Traits {
  /** A theoretical (stoichiometric) mineral. */
  readonly theoretical?: boolean;
  /** A calcined clay: it does not shrink as a raw one does. */
  readonly calcined?: boolean;
  /** Raw whiting or dolomite. */
  readonly rawCalcium?: boolean;
  /** A calcium source that brings its own silica. */
  readonly wollastonite?: boolean;
  /** The zinc oxide the lead-free rebuild may bring in. */
  readonly zincOxide?: boolean;
  /** A kaolin (or china clay), the clay a lead-free rebuild prefers. */
  readonly kaolin?: boolean;
  /** A kaolin or a ball clay, the clays that keep a colour's base. */
  readonly kaolinOrBallClay?: boolean;
  /** The standard clay and silica the lead-free rebuild falls back on. */
  readonly defaultClay?: boolean;
  readonly defaultSilica?: boolean;
  /** The mineral for its dry SG. */
  readonly density?: DensityTrait | null;
  /** Which colorant an additive is (chrome, pink, iron, copper, antimony, ...): true for each it is. */
  readonly [colorant: string]: boolean | DensityTrait | null | undefined;
}

const recordTraits = (record: { traits?: Traits }): Traits => (record && record.traits) || {};

/** The traits of a record, as the host reads them (by default `record.traits`); empty for none. */
export const traitsOf = (host: Host, record: unknown): Traits =>
  record === null || record === undefined
    ? {}
    : (host.traitsOf ? host.traitsOf(record) : recordTraits(record as never)) || {};
