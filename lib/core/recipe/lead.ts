import { idOf, labelOf } from '../identity.ts';
import { traitsOf } from '../traits.ts';
import { problem } from '../problem.ts';
import { bestFit, calculateUMF, leadFreeTarget, oxideMoles, selectMaterials } from '../chemistry/index.ts';
import { amountOf, formatAmount, totalOf } from './amounts.ts';
import { bariumSeverity, isRawClay, pastLimits, sizeNotes } from './checks.ts';
import { say, figure, plainFigure, upTo } from './messages.ts';
import { hasLead, suggestable } from './library.ts';
import { expansionOf, fluxesOf, molesOf, oxidePercent, roleOf, unityOf } from './materials.ts';
import { added, changed, explain, placesFor, recipeFrom, removed, scaled } from './pool.ts';
import { modernMaterials } from './swaps.ts';
import type { Oxides, SelectOptions } from '../types.ts';
import type { AdditiveRecord, MaterialRecord, TryMaterial } from './library.ts';
import type { Caution, CheckName, RecipeMessageCode } from './messages.ts';
import type { PoolLine, Report } from './pool.ts';
import type { Host } from '../host.ts';

/**
 * A line a rebuild chooses from (selectMaterials'), with what the report says
 * of it: whether the app requires it, whether it is new to the recipe though it
 * starts with an amount (the base frit in place of the lead), and why it is capped.
 */
type Line = PoolLine;

export type LeadMode = 'rebuild' | 'colour';

/** A lead-free frit to build on (its label), with its weight percent of B₂O₃. */
export interface BaseChoice {
  name: unknown;
  boron: number;
}

export interface Replacement<M extends MaterialRecord = MaterialRecord> {
  materials: M[];
  changes: import('./messages.ts').RecipeMessage[];
  /** What to expect, and what to watch for: colours, crazing, haze, limits passed. */
  cautions: Caution[];
  /** What each material does (a rebuild only). */
  report: Report | null;
}

/** More to work with, and limits the potter lifted. */
export interface LeadExtras<M extends MaterialRecord = MaterialRecord> {
  tries?: TryMaterial<M>[];
  /** Identities (idOf) of materials not to use. */
  avoid?: unknown[];
  /** Identities (idOf) of materials whose suggested cap the potter lifted. */
  uncapped?: unknown[];
}

/** Finds a record's library record, or a substitute's by its reference. */
type Find<M extends MaterialRecord> = (wanted: M | string) => M | undefined;

/** What a rebuild works from. */
interface Setting<M extends MaterialRecord> {
  lines: M[];
  additives: AdditiveRecord[];
  find: Find<M>;
  standard: M[];
  region: string;
  celsius: number;
  extras: LeadExtras<M>;
}

// Replace lead (docs/adr/0011-replacing-lead.md and 0012): an old lead glaze
// rebuilt without lead. Either its formula is rebuilt (silica and alumina kept,
// lead's share of the fluxes handed to other fluxes, boron for the firing) on a
// lead-free base frit the potter chooses, with up to four other materials the
// solver picks from a curated set and any the potter adds; or its colorants are
// carried onto that frit's standard 85:15 base with kaolin, as potters usually
// convert.

// How near the rebuilt formula should come: boron, alumina, soda and potash
// together and the fluxes' total closely; the calcium group loosely, since
// any of them can stand in for another; potash against soda hardly at all.
const NEAR: Oxides = {
  B2O3: 0.05,
  Al2O3: 0.02,
  K2O: 0.15,
  Na2O: 0.15,
  CaO: 0.1,
  MgO: 0.1,
  ZnO: 0.1,
  SrO: 0.1,
  BaO: 0.1,
  Li2O: 0.1
};
/** Up to four materials beyond the base frit: the research's break point for a lead rebuild. */
const EXTRAS = 4;
/** Caps, as shares of the batch: raw calcium and zinc oxide at low fire, and two frits that are additives. */
const RAW_SHARE = 0.05;
const LOW_EXPANSION_SHARE = 0.1;
const BORON_FRIT_SHARE = 0.15;
/** A material added is worth at least 1% of the batch, or nothing. */
const LEAST_SHARE = 0.01;
/**
 * Raw clay keeps a frit glaze suspended in the bucket and stuck to the pot as
 * it dries: at least 10% of the batch (or what the recipe had, if less).
 */
const CLAY_SHARE = 0.1;
/** A base frit under this share of the batch is doing little of the melting. */
const BASE_DOING_LITTLE = 0.2;
/** In colour mode a base must bring at least this much alumina with its kaolin, or it may cloud. */
const COLOUR_ALUMINA = 0.2;
const CHOICES = 3;

/** Whether the recipe has lead in it: a material with PbO, with an amount. */
const recipeHasLead = (lines: MaterialRecord[]): boolean =>
  lines.some((line) => hasLead(line) && amountOf(line.amount) > 0);

// Whether an additive with an amount is one of these colorants (its traits) or carries one of the oxides.
const has = (host: Host, additives: AdditiveRecord[], oxides: string[], colorants: string[] = []): boolean =>
  additives.some(
    (additive) =>
      amountOf(additive.amount) > 0 &&
      (colorants.some((colorant) => traitsOf(host, additive)[colorant] === true) ||
        (additive.fields ?? []).some((field) => oxides.includes(field.name) && Number(field.amount) > 0))
  );
const hasChrome = (host: Host, additives: AdditiveRecord[]) => has(host, additives, ['Cr2O3'], ['chrome']);

/** Sold somewhere the base is: a potter buys the frits from the same suppliers. */
const soldWith = (material: MaterialRecord, base: MaterialRecord): boolean =>
  !material.region?.length || !base.region?.length || material.region.some((region) => base.region!.includes(region));

const copyOf = <M extends MaterialRecord>(material: M): M => ({ ...structuredClone(material), amount: '' });

/** The lead-free formula to aim at, for the recipe and its colorants. */
function targetFor<M extends MaterialRecord>(host: Host, { lines, additives, celsius, extras }: Setting<M>): Oxides {
  const chrome = hasChrome(host, additives);
  // Strontium only if something on offer has it: nothing in the set the solver picks from does.
  const strontium = [...lines.filter((line) => !hasLead(line)), ...(extras.tries ?? []).map((t) => t.material)].some(
    (material) => oxidePercent(host, material, 'SrO') > 0
  );
  return leadFreeTarget(host, molesOf(host, lines), {
    celsius,
    noZinc:
      chrome ||
      has(host, additives, ['Fe2O3', 'FeO', 'CuO'], ['iron', 'copper']) ||
      celsius < host.limits.firing.zincMeltsFrom,
    noMagnesia: chrome || celsius < host.limits.firing.zincMeltsFrom,
    noStrontium: !strontium
  });
}

/**
 * The lines to choose from for a rebuild on `base`: the recipe's materials
 * without lead (any other old ones swapped for what replaces them), kept; the
 * base frit, which must be used, in place of the lead; a curated set the
 * solver may pick from (alkali, low-expansion and boron frits sold with the
 * base, feldspars, wollastonite, whiting and zinc oxide where they melt, and
 * kaolin and silica if the recipe has none); and what the potter added.
 */
function linesFor<M extends MaterialRecord>(host: Host, setting: Setting<M>, base: M, size: number): Line[] {
  const { lines, additives, find, standard, region, celsius, extras } = setting;
  const withoutLead = lines.filter((line) => !hasLead(line));
  const { materials } = modernMaterials(host, withoutLead, find, region, { allowLead: false });
  const leadAmount = totalOf(lines.filter(hasLead).map((line) => line.amount));
  const fit: Line[] = materials.map((material): Line => ({ material, start: amountOf(material.amount) }));
  const inRecipe = new Set(fit.map((line) => idOf(host, line.material)));
  // The recipe's main raw clay stays, at least at 10% of the batch or what it had.
  const rawClay = (line: Line) => line.material.category === 'clay' && !traitsOf(host, line.material).calcined;
  const clay = fit.filter(rawClay).sort((p, q) => q.start - p.start)[0];
  if (clay) Object.assign(clay, { must: true, fixed: true, least: Math.min(clay.start, CLAY_SHARE * size) });
  const uncapped = new Set(extras.uncapped ?? []);
  const lowFire = celsius < host.limits.firing.lowFireBelow;
  // Why each is capped, for the report.
  const rawCalciumWhy = say('lead.why.rawCalcium');
  const add = (material: M | undefined, extra: Partial<Line> = {}) => {
    if (!material || inRecipe.has(idOf(host, material))) return;
    inRecipe.add(idOf(host, material));
    const line: Line = { material: copyOf(material), start: 0, least: LEAST_SHARE * size, ...extra };
    if (uncapped.has(idOf(host, material))) {
      delete line.most;
      delete line.group;
      delete line.why;
    }
    fit.push(line);
  };
  fit.push({ material: copyOf(base), start: leadAmount, must: true, added: true, fixed: true });
  inRecipe.add(idOf(host, base));
  // What the potter added comes first, so a cap or must of theirs holds.
  for (const t of extras.tries ?? []) add(t.material, { must: t.must });

  const offered = standard.filter((m) => suggestable(host, m, { region }));
  for (const m of offered) {
    const role = roleOf(host, m);
    if (role === 'alkali' && soldWith(m, base)) add(m);
    else if (role === 'low-expansion' && soldWith(m, base))
      add(m, { most: LOW_EXPANSION_SHARE * size, why: say('lead.why.lowExpansion') });
    else if (role === 'boron' && soldWith(m, base))
      add(m, { most: BORON_FRIT_SHARE * size, why: say('lead.why.boronFrit') });
    else if (m.category === 'feldspar') add(m);
    else if (traitsOf(host, m).wollastonite) add(m);
    else if (traitsOf(host, m).rawCalcium) add(m, lowFire ? { group: 'raw calcium', why: rawCalciumWhy } : {});
  }
  const zincWanted = !(
    hasChrome(host, additives) ||
    has(host, additives, ['Fe2O3', 'FeO', 'CuO'], ['iron', 'copper']) ||
    celsius < host.limits.firing.zincMeltsFrom
  );
  if (zincWanted)
    add(
      offered.find((m) => traitsOf(host, m).zincOxide),
      { most: RAW_SHARE * size, why: say('lead.why.zinc') }
    );
  if (!clay) {
    add(
      offered.find((m) => m.category === 'clay' && traitsOf(host, m).kaolin) ??
        standard.find((m) => traitsOf(host, m).defaultClay),
      { must: true, fixed: true, least: CLAY_SHARE * size }
    );
  }
  if (!fit.some((line) => line.material.category === 'silica'))
    add(standard.find((m) => traitsOf(host, m).defaultSilica));
  const avoid = new Set(extras.avoid ?? []);
  return fit.map((line) => (avoid.has(idOf(host, line.material)) && !line.must ? { ...line, avoid: true } : line));
}

// No pull toward the old glaze's expansion: tried, it moved expansion by 0.2 to
// 0.3 at a large cost to the match, since the lead-free formula's soda and
// potash set it. The rise is reported instead (docs/adr/0012).
const optionsFor = (size: number): SelectOptions => ({
  near: NEAR,
  alkalis: 0.03,
  fluxTotal: 0.03,
  groups: { 'raw calcium': RAW_SHARE * size },
  extras: EXTRAS,
  keepOwn: true
});

/** A rebuild on `base`: the chosen lines, and the selection. */
function rebuild<M extends MaterialRecord>(host: Host, setting: Setting<M>, base: M) {
  const target = targetFor(host, setting);
  const oldTotal = totalOf(setting.lines.map((line) => line.amount));
  // Caps are shares of the new batch, lighter than the old (lead is heavy):
  // set from the old first, then again from the new and worked out once more.
  let size = oldTotal;
  let fit = linesFor(host, setting, base, size);
  let selection = selectMaterials(host, fit, target, optionsFor(size));
  const newTotal = selection.amounts.reduce((sum, amount) => sum + amount, 0);
  if (newTotal > 0 && Math.abs(newTotal - size) > 0.05 * size) {
    size = newTotal;
    fit = linesFor(host, setting, base, size);
    selection = selectMaterials(host, fit, target, optionsFor(size));
  }
  return { fit, selection, target };
}

/** The lead-free bases sold in the region. */
const basesIn = <M extends MaterialRecord>(host: Host, standard: M[], region: string): M[] =>
  standard.filter((m) => m.category === 'frit' && suggestable(host, m, { region }) && roleOf(host, m) === 'base');

/** The 85:15 base with kaolin: its unity formula, and its calculated expansion. */
function colourBase(
  host: Host,
  base: MaterialRecord,
  clay: MaterialRecord | undefined
): { unity: Oxides; expansion: number | null } | null {
  try {
    const result = calculateUMF(host, [
      { material: base, amount: 85 },
      ...(clay ? [{ material: clay, amount: 15 }] : [])
    ]);
    return { unity: result.umf, expansion: result.expansion };
  } catch {
    return null;
  }
}

/**
 * The clay of the 85:15 base that keeps the colour: the recipe's raw clay that is still sold (not
 * calcined, not discontinued or historical), a kaolin or a ball clay before another and then the
 * most of it; else China Clay, the standard kaolin. A potter's own raw clay, known by its analysis
 * (checks.js isRawClay), has a kaolin's or a ball clay's.
 */
function clayFor<L extends MaterialRecord, M extends MaterialRecord>(
  host: Host,
  lines: readonly L[],
  standard: readonly M[]
): L | M | undefined {
  const sold = (line: MaterialRecord) => line.status !== 'discontinued' && line.status !== 'historical';
  const kaolin = (line: MaterialRecord) => (!line.category || traitsOf(host, line).kaolinOrBallClay ? 1 : 0);
  const [clay] = lines
    .filter((line) => !hasLead(line) && isRawClay(host, line) && sold(line))
    .sort((p, q) => kaolin(q) - kaolin(p) || amountOf(q.amount) - amountOf(p.amount));
  return clay ?? standard.find((m) => traitsOf(host, m).defaultClay);
}

/**
 * The lead-free base frits sold in the region, best first. To rebuild, how near
 * the best match on each comes to the lead-free formula for the firing (the
 * plain best match: fast). To keep the colour, those whose 85:15 base with
 * kaolin has enough alumina, nearest the old glaze's expansion first.
 */
function leadFreeBases<M extends MaterialRecord>(
  host: Host,
  lines: M[],
  additives: AdditiveRecord[],
  find: Find<M>,
  standard: M[],
  region: string,
  celsius: number,
  mode: LeadMode = 'rebuild'
): BaseChoice[] {
  const bases = basesIn(host, standard, region);
  const choice = (base: M): BaseChoice => ({
    name: labelOf(host, base),
    boron: Math.round(oxidePercent(host, base, 'B2O3'))
  });
  if (mode === 'colour') {
    const was = expansionOf(host, lines) ?? 0;
    const clay = clayFor(host, lines, standard);
    return bases
      .map((base) => ({ base, mix: colourBase(host, base, clay) }))
      .filter(
        (p): p is { base: M; mix: NonNullable<typeof p.mix> } =>
          !!p.mix && (p.mix.unity['Al2O3'] ?? 0) >= COLOUR_ALUMINA
      )
      .sort((p, q) => Math.abs((p.mix.expansion ?? 0) - was) - Math.abs((q.mix.expansion ?? 0) - was))
      .slice(0, CHOICES)
      .map(({ base }) => choice(base));
  }
  const setting: Setting<M> = { lines, additives, find, standard, region, celsius, extras: {} };
  const target = targetFor(host, setting);
  const size = totalOf(lines.map((line) => line.amount));
  return bases
    .map((base) => {
      const fit = linesFor(host, setting, base, size).map((line) => ({ ...line, least: 0 }));
      return { base, miss: bestFit(host, fit, target, optionsFor(size)).miss };
    })
    .sort((p, q) => p.miss - q.miss)
    .slice(0, CHOICES)
    .map(({ base }) => choice(base));
}

/**
 * The recipe without lead, on the chosen base frit: rebuilt to the lead-free
 * formula for the firing, or its colorants carried onto the frit's 85:15 base
 * with kaolin. Either way the base comes to the old batch's total, so
 * colorants keep their share of it.
 */
function replaceLead<M extends MaterialRecord>(
  host: Host,
  lines: M[],
  additives: AdditiveRecord[],
  find: Find<M>,
  standard: M[],
  region: string,
  { base: baseName, celsius, mode, ...extras }: { base: unknown; celsius: number; mode: LeadMode } & LeadExtras<M>
): Replacement<M> {
  const base = standard.find((material) => idOf(host, material) === baseName);
  if (!base) throw problem('no-frit', { base: baseName });
  const oldTotal = totalOf(lines.map((line) => line.amount));
  // As a substitution's (pool.js placesFor): enough decimals that 1% of a small batch, the least the base frit
  // is given, is not written as 0 (a batch of 0.00035 came to 0 of everything, and had no unity formula).
  const places = placesFor(oldTotal);
  const cautions = cautionsFor(host, lines, additives);

  let materials: M[];
  let changes: import('./messages.ts').RecipeMessage[];
  let report: Report | null = null;
  if (mode === 'colour') {
    const clay = clayFor(host, lines, standard);
    const parts: Array<[M, number]> = [[base, 0.85], ...(clay ? [[clay, 0.15] as [M, number]] : [])];
    materials = parts.map(([material, share]) => ({
      ...copyOf(material),
      amount: formatAmount(share * oldTotal, places)
    }));
    const old = new Map(lines.map((line) => [idOf(host, line), amountOf(line.amount)]));
    changes = materials.map((m) =>
      old.has(idOf(host, m))
        ? changed(labelOf(host, m), upTo(old.get(idOf(host, m))!, places), plainFigure(m.amount))
        : added(labelOf(host, m), plainFigure(m.amount))
    );
    for (const line of lines) {
      if (!materials.some((m) => idOf(host, m) === idOf(host, line)) && amountOf(line.amount) > 0) {
        changes.push(removed(labelOf(host, line), amountOf(line.amount), places));
      }
    }
  } else {
    const setting: Setting<M> = { lines, additives, find, standard, region, celsius, extras };
    const { fit, selection } = rebuild(host, setting, base);
    // The base comes to the old batch's total.
    const newTotal = selection.amounts.reduce((sum, amount) => sum + amount, 0);
    const onTotal = scaled(selection, newTotal > 0 ? oldTotal / newTotal : 1);
    const made = recipeFrom(host, onTotal, fit as Array<Line & { material: M }>, new Set(), places);
    materials = made.materials;
    changes = made.changes;
    for (const line of lines.filter(hasLead)) {
      if (amountOf(line.amount) > 0) changes.push(removed(labelOf(host, line), amountOf(line.amount), places));
    }
    report = explain(host, onTotal, fit, places);
    const baseShare =
      (onTotal.amounts[fit.findIndex((line) => idOf(host, line.material) === idOf(host, base))] ?? 0) / oldTotal;
    if (baseShare < BASE_DOING_LITTLE) {
      cautions.push({
        check: 'base-doing-little',
        severity: 'caution',
        material: labelOf(host, base),
        sentences: [
          say('lead.baseDoingLittle', { percent: figure(Math.round(baseShare * 100), 0), base: labelOf(host, base) })
        ]
      });
    }
  }

  const moles = molesOf(host, materials);
  cautions.push(
    ...pastLimits(host, {
      lines: materials.map((material) => ({ material, amount: material.amount })),
      unity: unityOf(host, moles),
      celsius,
      additives,
      expansion: { was: expansionOf(host, lines), now: expansionOf(host, materials) }
    }),
    ...sizeNotes(
      host,
      materials.map((material) => ({ material, amount: material.amount })),
      celsius < host.limits.firing.lowFireBelow
    )
  );
  return { materials, changes, cautions, report };
}

/** What changes without lead, for the colorants in the recipe. */
function cautionsFor(host: Host, lines: MaterialRecord[], additives: AdditiveRecord[]): Caution[] {
  const moles = molesOf(host, lines);
  const fluxes = fluxesOf(host, moles);
  const lead = fluxes > 0 ? (moles['PbO'] ?? 0) / fluxes : 0;
  const cautions: Caution[] = [];
  const caution = (check: CheckName, code: RecipeMessageCode) =>
    cautions.push({ check, severity: 'note', sentences: [say(code)] });
  if (has(host, additives, ['Sb2O3', 'Sb2O5'], ['antimony'])) caution('lead-antimony', 'lead.antimony');
  if (hasChrome(host, additives) && lead >= 0.5) caution('lead-chrome', 'lead.chrome');
  if (has(host, additives, ['CuO'])) caution('lead-copper', 'lead.copper');
  if (has(host, additives, ['MnO'])) caution('lead-manganese', 'lead.manganese');
  if (has(host, additives, ['Fe2O3', 'FeO']) || (moles['Fe2O3'] ?? 0) / (fluxes || 1) > 0.02) {
    caution('lead-iron', 'lead.iron');
  }
  return cautions;
}

/**
 * Moles of each oxide in the lines whose material can be read. A line that
 * cannot (one saved with no oxides, say) adds nothing: the page says what is
 * wrong with it, and what the rest holds is still worth warning about.
 */
function readableMoles(host: Host, lines: MaterialRecord[]): Oxides {
  const readable = lines.filter((line) => {
    try {
      oxideMoles(host, [{ material: line, amount: 1 }]);
      return true;
    } catch {
      return false;
    }
  });
  return molesOf(host, readable);
}

/**
 * The share of the fired glaze that is lead oxide, and PbO in the unity
 * formula, for the recipe's warning.
 */
function leadIn(host: Host, lines: MaterialRecord[]): { unity: number; percent: number } {
  const moles = readableMoles(host, lines);
  const fluxes = fluxesOf(host, moles);
  const grams = Object.entries(moles).reduce((sum, [oxide, amount]) => sum + amount * host.oxides.molarMass[oxide], 0);
  const lead = moles['PbO'] ?? 0;
  return {
    unity: fluxes > 0 ? lead / fluxes : 0,
    percent: grams > 0 ? (100 * lead * host.oxides.molarMass['PbO']) / grams : 0
  };
}

/**
 * BaO in the unity formula, for the warning beside lead's, read as leadIn reads
 * the lines and compared as the barium check compares it (checks.js
 * bariumSeverity): null to 0.10 as shown, and `likely` from 0.40. The figures
 * are Digitalfire's, on its Limit Formula page (https://digitalfire.com/glossary/123):
 * "low BaO levels can often be tolerated (e.g. 0.05-0.1)", and "any glaze that
 * has 0.4 BaO would be off-the-scale for potential to leach".
 */
function bariumIn(host: Host, lines: MaterialRecord[]): { unity: number; likely: boolean } | null {
  const moles = readableMoles(host, lines);
  const fluxes = fluxesOf(host, moles);
  const unity = fluxes > 0 ? (moles['BaO'] ?? 0) / fluxes : 0;
  const severity = bariumSeverity(host, unity);
  return severity ? { unity, likely: severity === 'likely' } : null;
}

export { recipeHasLead, leadFreeBases, replaceLead, clayFor, leadIn, bariumIn };
