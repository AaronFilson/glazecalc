import {
  MOLAR_MASS,
  OXIDE_GROUPS,
  bestFit,
  calculateUMF,
  leadFreeTarget,
  oxideMoles,
  selectMaterials
} from '../../../../lib/chemistry';
import { Additive, FritRole, Material, RecipeMaterial } from '../../core/models';
import { hasLead } from '../../shared/library-info';
import { pastLimits, sizeNotes } from './checks';
import { LibraryMaterial, modernMaterials } from './compare';
import { Report, TryMaterial, explain, oxidePercent, placesFor, recipeFrom, suggestable } from './pool';
import { amountOf, formatAmount, totalOf } from './rebase';

// Replace lead (docs/adr/0011-replacing-lead.md and 0012): an old lead glaze
// rebuilt without lead. Either its formula is rebuilt (silica and alumina kept,
// lead's share of the fluxes handed to other fluxes, boron for the firing) on a
// lead-free base frit the potter chooses, with up to four other materials the
// solver picks from a curated set and any the potter adds; or its colorants are
// carried onto that frit's standard 85:15 base with kaolin, as potters usually
// convert.

export type LeadMode = 'rebuild' | 'colour';

/** A lead-free frit to build on, with its boron. */
export interface BaseChoice {
  name: string;
  /** Weight percent of B₂O₃. */
  boron: number;
}

export interface Replacement {
  materials: RecipeMaterial[];
  /** What changed: "China Clay 15 → 10.1", "Standard Borax Frit (Potclays 2263) 61.5, new". */
  changes: string[];
  /** What to expect, and what to watch for: colours, crazing, haze, limits passed. */
  cautions: string[];
  /** What each material does (a rebuild only). */
  report: Report | null;
}

/** More to work with, and limits the potter lifted. */
export interface LeadExtras {
  tries?: TryMaterial[];
  avoid?: string[];
  /** Names of materials whose suggested cap the potter lifted. */
  uncapped?: string[];
}

// How near the rebuilt formula should come: boron, alumina, soda and potash
// together and the fluxes' total closely; the calcium group loosely, since
// any of them can stand in for another; potash against soda hardly at all.
const NEAR = {
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
/** Low fire, where raw whiting and zinc barely melt: below cone 2 or so. */
const LOW_FIRE_BELOW = 1150;
/** Zinc hardly melts below cone 03. */
const ZINC_FROM = 1101;
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
const RAW_CALCIUM = /^(whiting|dolomite)$/i;
const RAW_CALCIUM_WHY =
  "this app's own guideline for raw whiting and dolomite at low fire, where they barely melt and give off gas";

/** Whether the recipe has lead in it: a material with PbO, with an amount. */
export const recipeHasLead = (lines: RecipeMaterial[]): boolean =>
  lines.some((line) => hasLead(line) && amountOf(line.amount) > 0);

const has = (additives: Additive[], oxides: string[], pattern?: RegExp): boolean =>
  additives.some(
    (additive) =>
      amountOf(additive.amount) > 0 &&
      ((pattern && pattern.test(additive.name)) ||
        (additive.fields ?? []).some((field) => oxides.includes(field.name) && Number(field.amount) > 0))
  );
const hasChrome = (additives: Additive[]) => has(additives, ['Cr2O3'], /chrom|pink/i);

/**
 * A frit's role: from its maker's stated use when the library has it, or
 * worked out from its oxides for one a potter entered (the research's window
 * for a base, and the alkali test for a partner).
 */
export function roleOf(frit: Material): FritRole | undefined {
  if (frit.fritRole) return frit.fritRole;
  if (frit.category !== 'frit') return undefined;
  if (hasLead(frit)) return 'lead';
  const p = (oxide: string) => oxidePercent(frit, oxide);
  const alkali = p('Na2O') + p('K2O') + p('Li2O');
  const minor = ['MgO', 'ZnO', 'BaO', 'SrO', 'ZrO2', 'Li2O'].every((oxide) => p(oxide) <= 3);
  if (p('B2O3') >= 10 && p('B2O3') <= 30 && p('SiO2') >= 40 && p('CaO') >= 8 && alkali >= 3 && alkali <= 13 && minor) {
    return 'base';
  }
  if (p('B2O3') < 10 && alkali >= 10) return 'alkali';
  if (p('B2O3') >= 40) return 'boron';
  return undefined;
}

/** Sold somewhere the base is: a potter buys the frits from the same suppliers. */
const soldWith = (material: Material, base: Material): boolean =>
  !material.region?.length || !base.region?.length || material.region.some((region) => base.region!.includes(region));

interface Line {
  material: RecipeMaterial;
  start: number;
  most?: number;
  least?: number;
  group?: string;
  must?: boolean;
  avoid?: boolean;
  added?: boolean;
  /** Required by the app: the base frit, and the clay. */
  fixed?: boolean;
  /** Why it is capped, for the report. */
  why?: string;
}

const copyOf = (material: Material): RecipeMaterial => ({ ...structuredClone(material), amount: '' });

/** The fluxes' total: the unity formula's one mole. */
const fluxesOf = (moles: Record<string, number>): number =>
  Object.entries(moles).reduce(
    (sum, [oxide, amount]) => (OXIDE_GROUPS[oxide] === 'R2O' || OXIDE_GROUPS[oxide] === 'RO' ? sum + amount : sum),
    0
  );
const unityOf = (moles: Record<string, number>): Record<string, number> => {
  const fluxes = fluxesOf(moles);
  return Object.fromEntries(Object.entries(moles).map(([oxide, amount]) => [oxide, fluxes > 0 ? amount / fluxes : 0]));
};

interface Setting {
  lines: RecipeMaterial[];
  additives: Additive[];
  find: (name: string) => LibraryMaterial | undefined;
  standard: LibraryMaterial[];
  region: string;
  celsius: number;
  extras: LeadExtras;
}

/** The lead-free formula to aim at, for the recipe and its colorants. */
function targetFor({ lines, additives, celsius, extras }: Setting) {
  const chrome = hasChrome(additives);
  // Strontium only if something on offer has it: nothing in the set the solver picks from does.
  const strontium = [...lines.filter((line) => !hasLead(line)), ...(extras.tries ?? []).map((t) => t.material)].some(
    (material) => oxidePercent(material, 'SrO') > 0
  );
  return leadFreeTarget(oxideMoles(lines.map((line) => ({ material: line, amount: amountOf(line.amount) }))), {
    celsius,
    noZinc: chrome || has(additives, ['Fe2O3', 'FeO', 'CuO'], /iron|copper|ochre/i) || celsius < ZINC_FROM,
    noMagnesia: chrome || celsius < ZINC_FROM,
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
function linesFor(setting: Setting, base: Material, size: number): Line[] {
  const { lines, additives, find, standard, region, celsius, extras } = setting;
  const withoutLead = lines.filter((line) => !hasLead(line));
  const { materials } = modernMaterials(withoutLead, find, region, { allowLead: false });
  const leadAmount = totalOf(lines.filter(hasLead).map((line) => line.amount));
  const fit: Line[] = materials.map((material) => ({ material, start: amountOf(material.amount) }));
  const inRecipe = new Set(fit.map((line) => line.material.name));
  // The recipe's main raw clay stays, at least at 10% of the batch or what it had.
  const rawClay = (line: Line) => line.material.category === 'clay' && !/calcined/i.test(line.material.name);
  const clay = fit.filter(rawClay).sort((p, q) => q.start - p.start)[0];
  if (clay) Object.assign(clay, { must: true, fixed: true, least: Math.min(clay.start, CLAY_SHARE * size) });
  const uncapped = new Set(extras.uncapped ?? []);
  const lowFire = celsius < LOW_FIRE_BELOW;
  const add = (material: Material | undefined, extra: Partial<Line> = {}) => {
    if (!material || inRecipe.has(material.name)) return;
    inRecipe.add(material.name);
    const line: Line = { material: copyOf(material), start: 0, least: LEAST_SHARE * size, ...extra };
    if (uncapped.has(material.name)) {
      delete line.most;
      delete line.group;
      delete line.why;
    }
    fit.push(line);
  };
  fit.push({ material: copyOf(base), start: leadAmount, must: true, added: true, fixed: true });
  inRecipe.add(base.name);
  // What the potter added comes first, so a cap or must of theirs holds.
  for (const t of extras.tries ?? []) add(t.material, { must: t.must });

  const offered = standard.filter((m) => suggestable(m, { region }));
  for (const m of offered) {
    const role = roleOf(m);
    if (role === 'alkali' && soldWith(m, base)) add(m);
    else if (role === 'low-expansion' && soldWith(m, base))
      add(m, { most: LOW_EXPANSION_SHARE * size, why: 'low-expansion frits are craze cures, used at about 5 to 10%' });
    else if (role === 'boron' && soldWith(m, base))
      add(m, { most: BORON_FRIT_SHARE * size, why: 'a calcium borate frit is a boron top-up, not a base' });
    else if (m.category === 'feldspar') add(m);
    else if (/wollastonite/i.test(m.name)) add(m);
    else if (RAW_CALCIUM.test(m.name)) add(m, lowFire ? { group: 'raw calcium', why: RAW_CALCIUM_WHY } : {});
  }
  const zincWanted = !(
    hasChrome(additives) ||
    has(additives, ['Fe2O3', 'FeO', 'CuO'], /iron|copper|ochre/i) ||
    celsius < ZINC_FROM
  );
  if (zincWanted)
    add(
      offered.find((m) => m.name === 'Zinc Oxide'),
      { most: RAW_SHARE * size, why: "raw zinc oxide's melting power drops quickly above about 5%, and it can crawl" }
    );
  if (!clay) {
    add(
      offered.find((m) => m.category === 'clay' && /kaolin|china clay/i.test(m.name)) ??
        standard.find((m) => m.name === 'China Clay'),
      { must: true, fixed: true, least: CLAY_SHARE * size }
    );
  }
  if (!fit.some((line) => line.material.category === 'silica')) add(standard.find((m) => m.name === 'Silica'));
  const avoid = new Set(extras.avoid ?? []);
  return fit.map((line) => (avoid.has(line.material.name) && !line.must ? { ...line, avoid: true } : line));
}

// No pull toward the old glaze's expansion: tried, it moved expansion by 0.2 to
// 0.3 at a large cost to the match, since the lead-free formula's soda and
// potash set it. The rise is reported instead (docs/adr/0012).
const optionsFor = (size: number) => ({
  near: NEAR,
  alkalis: 0.03,
  fluxTotal: 0.03,
  groups: { 'raw calcium': RAW_SHARE * size },
  extras: EXTRAS,
  keepOwn: true
});

/** A rebuild on `base`: the chosen lines, and the selection. */
function rebuild(setting: Setting, base: Material) {
  const target = targetFor(setting);
  const oldTotal = totalOf(setting.lines.map((line) => line.amount));
  // Caps are shares of the new batch, lighter than the old (lead is heavy):
  // set from the old first, then again from the new and worked out once more.
  let size = oldTotal;
  let fit = linesFor(setting, base, size);
  let selection = selectMaterials(fit, target, optionsFor(size));
  const newTotal = selection.amounts.reduce((sum, amount) => sum + amount, 0);
  if (newTotal > 0 && Math.abs(newTotal - size) > 0.05 * size) {
    size = newTotal;
    fit = linesFor(setting, base, size);
    selection = selectMaterials(fit, target, optionsFor(size));
  }
  return { fit, selection, target };
}

/** The lead-free bases sold in the region. */
const basesIn = (standard: LibraryMaterial[], region: string) =>
  standard.filter((m) => m.category === 'frit' && suggestable(m, { region }) && roleOf(m) === 'base');

/** The 85:15 base with kaolin: its unity formula, and its calculated expansion. */
function colourBase(base: Material, clay: Material | undefined) {
  try {
    const result = calculateUMF([{ material: base, amount: 85 }, ...(clay ? [{ material: clay, amount: 15 }] : [])]);
    return { unity: result.umf, expansion: result.expansion };
  } catch {
    return null;
  }
}

const expansionOf = (lines: RecipeMaterial[]): number | null => {
  try {
    return calculateUMF(lines.map((line) => ({ material: line, amount: amountOf(line.amount) }))).expansion;
  } catch {
    return null;
  }
};

const clayFor = (lines: RecipeMaterial[], standard: LibraryMaterial[]) =>
  lines.find((line) => !hasLead(line) && line.category === 'clay') ?? standard.find((m) => m.name === 'China Clay');

/**
 * The lead-free base frits sold in the region, best first. To rebuild, how near
 * the best match on each comes to the lead-free formula for the firing (the
 * plain best match: fast). To keep the colour, those whose 85:15 base with
 * kaolin has enough alumina, nearest the old glaze's expansion first.
 */
export function leadFreeBases(
  lines: RecipeMaterial[],
  additives: Additive[],
  find: (name: string) => LibraryMaterial | undefined,
  standard: LibraryMaterial[],
  region: string,
  celsius: number,
  mode: LeadMode = 'rebuild'
): BaseChoice[] {
  const bases = basesIn(standard, region);
  const choice = (base: Material) => ({ name: base.name, boron: Math.round(oxidePercent(base, 'B2O3')) });
  if (mode === 'colour') {
    const was = expansionOf(lines) ?? 0;
    const clay = clayFor(lines, standard);
    return bases
      .map((base) => ({ base, mix: colourBase(base, clay) }))
      .filter(({ mix }) => mix && (mix.unity['Al2O3'] ?? 0) >= COLOUR_ALUMINA)
      .sort((p, q) => Math.abs((p.mix!.expansion ?? 0) - was) - Math.abs((q.mix!.expansion ?? 0) - was))
      .slice(0, CHOICES)
      .map(({ base }) => choice(base));
  }
  const setting: Setting = { lines, additives, find, standard, region, celsius, extras: {} };
  const target = targetFor(setting);
  const size = totalOf(lines.map((line) => line.amount));
  return bases
    .map((base) => {
      const fit = linesFor(setting, base, size).map((line) => ({ ...line, least: 0 }));
      return { base, miss: bestFit(fit, target, optionsFor(size)).miss };
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
export function replaceLead(
  lines: RecipeMaterial[],
  additives: Additive[],
  find: (name: string) => LibraryMaterial | undefined,
  standard: LibraryMaterial[],
  region: string,
  { base: baseName, celsius, mode, ...extras }: { base: string; celsius: number; mode: LeadMode } & LeadExtras
): Replacement {
  const base = standard.find((material) => material.name === baseName);
  if (!base) throw new Error('No frit called ' + baseName);
  const oldTotal = totalOf(lines.map((line) => line.amount));
  const places = placesFor(oldTotal);
  const cautions = cautionsFor(lines, additives);

  let materials: RecipeMaterial[];
  let changes: string[];
  let report: Report | null = null;
  if (mode === 'colour') {
    const clay = clayFor(lines, standard);
    const parts: Array<[Material, number]> = [[base, 0.85], ...(clay ? [[clay, 0.15] as [Material, number]] : [])];
    materials = parts.map(([material, share]) => ({
      ...copyOf(material),
      amount: formatAmount(share * oldTotal, places)
    }));
    const old = new Map(lines.map((line) => [line.name, amountOf(line.amount)]));
    changes = materials.map((m) =>
      old.has(m.name)
        ? `${m.name} ${formatAmount(old.get(m.name)!, places)} → ${m.amount}`
        : `${m.name} ${m.amount}, new`
    );
    for (const line of lines) {
      if (!materials.some((m) => m.name === line.name) && amountOf(line.amount) > 0) {
        changes.push(`${line.name} ${formatAmount(amountOf(line.amount), places)} → 0`);
      }
    }
  } else {
    const setting: Setting = { lines, additives, find, standard, region, celsius, extras };
    const { fit, selection } = rebuild(setting, base);
    // The base comes to the old batch's total.
    const newTotal = selection.amounts.reduce((sum, amount) => sum + amount, 0);
    const scale = newTotal > 0 ? oldTotal / newTotal : 1;
    const scaled = {
      ...selection,
      amounts: selection.amounts.map((amount) => amount * scale),
      capped: selection.capped.map((c) => ({ ...c, most: c.most * scale, wouldBe: c.wouldBe * scale }))
    };
    const made = recipeFrom(scaled, fit, new Set(), places);
    materials = made.materials;
    changes = made.changes;
    for (const line of lines.filter(hasLead)) {
      if (amountOf(line.amount) > 0) changes.push(`${line.name} ${formatAmount(amountOf(line.amount), places)} → 0`);
    }
    report = explain(scaled, fit, places);
    const baseShare = (scaled.amounts[fit.findIndex((line) => line.material.name === base.name)] ?? 0) / oldTotal;
    if (baseShare < BASE_DOING_LITTLE) {
      cautions.push(
        `The match uses only ${Math.round(baseShare * 100)}% of ${base.name}: at this firing the other materials do most of the melting, so the choice of base frit matters little here.`
      );
    }
  }

  const moles = oxideMoles(materials.map((m) => ({ material: m, amount: amountOf(m.amount) })));
  cautions.push(
    ...pastLimits({
      lines: materials.map((material) => ({ material, amount: material.amount })),
      unity: unityOf(moles),
      celsius,
      additives,
      expansion: { was: expansionOf(lines), now: expansionOf(materials) }
    }),
    ...sizeNotes(
      materials.map((material) => ({ material, amount: material.amount })),
      celsius < LOW_FIRE_BELOW
    )
  );
  return { materials, changes, cautions, report };
}

/** What changes without lead, for the colorants in the recipe. */
function cautionsFor(lines: RecipeMaterial[], additives: Additive[]): string[] {
  const moles = oxideMoles(lines.map((line) => ({ material: line, amount: amountOf(line.amount) })));
  const fluxes = fluxesOf(moles);
  const lead = fluxes > 0 ? (moles['PbO'] ?? 0) / fluxes : 0;
  const cautions: string[] = [];
  if (has(additives, ['Sb2O3', 'Sb2O5'], /antimon|naples/i)) {
    cautions.push(
      'Antimony gives Naples yellow only with lead: without it the yellow will not form. Use a commercial yellow stain rated for your cone.'
    );
  }
  if (hasChrome(additives) && lead >= 0.5) {
    cautions.push(
      'Red, orange or yellow from chrome comes from lead; without it chrome turns green. Use a stain rated for your cone for those colours.'
    );
  }
  if (has(additives, ['CuO'])) cautions.push('Copper turns bluer, toward turquoise, without lead.');
  if (has(additives, ['MnO'])) cautions.push('Manganese turns plum or violet rather than brown.');
  if (has(additives, ['Fe2O3', 'FeO']) || (moles['Fe2O3'] ?? 0) / (fluxes || 1) > 0.02) {
    cautions.push('An iron honey glaze is less warm without lead, and can turn olive.');
  }
  return cautions;
}

/** The share of the fired glaze that is lead oxide, and PbO in the unity formula, for the recipe's warning. */
export function leadIn(lines: RecipeMaterial[]): { unity: number; percent: number } {
  const moles = oxideMoles(lines.map((line) => ({ material: line, amount: amountOf(line.amount) })));
  const fluxes = fluxesOf(moles);
  const grams = Object.entries(moles).reduce((sum, [oxide, amount]) => sum + amount * MOLAR_MASS[oxide], 0);
  const lead = moles['PbO'] ?? 0;
  return {
    unity: fluxes > 0 ? lead / fluxes : 0,
    percent: grams > 0 ? (100 * lead * MOLAR_MASS['PbO']) / grams : 0
  };
}
