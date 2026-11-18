// What Glazecalc knows about a material, for the core to read as traits (lib/core/traits.ts,
// docs/adr/0030-nameless-chemistry-core.md). A standard record carries its own (data/, `traits`); any
// other record (a potter's own, or a line saved before standard records had them) has them read from its
// name, exactly as the code once read them.

import { densityOf } from './density-names.ts';
import type { Traits } from '../core/traits.ts';

/** A record as the traits read it: its name, whose it is, and a standard record's own traits. */
export interface TraitsRecord {
  readonly name?: unknown;
  readonly ownedBy?: unknown;
  readonly traits?: unknown;
}

// Each test is given the name as the record has it, as the code once tested it.
const KAOLIN_OR_BALL_CLAY = /kaolin|caol[ií]n|china clay|ball clay/i;

// Each record's traits from its name, worked out once while its name is the same: the core asks often.
const known = new WeakMap<object, { name: unknown; ownedBy: unknown; traits: Traits }>();

/** A record's traits, read from its name. A name that is not a string is tested as the regexes coerce it. */
const readTraits = (record: TraitsRecord | null | undefined): Traits => {
  const name = record?.name as string;
  const text = typeof name === 'string' ? name : '';
  return {
    // A theoretical (stoichiometric) mineral: 'Kaolin (theoretical)'.
    theoretical: text.includes('(theoretical)'),
    // A calcined clay: it does not shrink as a raw one does.
    calcined: /calcined/i.test(name),
    // Raw whiting or dolomite by name.
    rawCalcium: /^(whiting|dolomite)$/i.test(name),
    // Which colorant an additive is, by name.
    chrome: /chrom|pink/i.test(name),
    // A pink stain (chrome-tin), which boron blue's fix names apart.
    pink: /pink/i.test(name),
    iron: /iron|ochre/i.test(name),
    copper: /copper/i.test(name),
    antimony: /antimon|naples/i.test(name),
    // Wollastonite, a calcium source that brings its own silica.
    wollastonite: /wollastonite/i.test(name),
    // The zinc oxide the lead-free rebuild may bring in.
    zincOxide: name === 'Zinc Oxide',
    // A kaolin (or china clay), the clay a lead-free rebuild prefers; with ball clays, the clays that keep
    // a colour's base.
    kaolin: /kaolin|china clay/i.test(name),
    kaolinOrBallClay: KAOLIN_OR_BALL_CLAY.test(name),
    // The standard clay and silica the lead-free rebuild falls back on.
    defaultClay: name === 'China Clay',
    defaultSilica: name === 'Silica',
    // A standard record's mineral for its dry SG, or null with why there is none.
    density: densityOf(record)
  };
};

/** A record's traits, from its name. */
const traitsFromName = (record: TraitsRecord | null | undefined): Traits => {
  if (record && typeof record === 'object') {
    const kept = known.get(record);
    if (kept && kept.name === record.name && kept.ownedBy === record.ownedBy) return kept.traits;
    const traits = readTraits(record);
    known.set(record, { name: record.name, ownedBy: record.ownedBy, traits });
    return traits;
  }
  return readTraits(record);
};

/** A record's traits: a standard record's own, or from its name. */
const traitsOf = (record: TraitsRecord | null | undefined): Traits =>
  record?.ownedBy === 'Standard' && record.traits && typeof record.traits === 'object'
    ? (record.traits as Traits)
    : traitsFromName(record);

export { traitsOf, traitsFromName };
