'use strict';

const { MOLAR_MASS, bestFit, calculateUMF, leadFreeTarget, oxideMoles, selectMaterials } = require('../chemistry');
const { amountOf, formatAmount, totalOf } = require('./amounts');
const { pastLimits, sizeNotes } = require('./checks');
const { FIRING } = require('./limits');
const { say, figure, plainFigure, upTo } = require('./messages');
const { hasLead, suggestable } = require('./library');
const { expansionOf, fluxesOf, molesOf, oxidePercent, roleOf, unityOf } = require('./materials');
const { added, changed, explain, placesFor, recipeFrom, removed, scaled } = require('./pool');
const { modernMaterials } = require('./swaps');

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

/** Whether the recipe has lead in it: a material with PbO, with an amount. */
const recipeHasLead = (lines) => lines.some((line) => hasLead(line) && amountOf(line.amount) > 0);

const has = (additives, oxides, pattern) =>
  additives.some(
    (additive) =>
      amountOf(additive.amount) > 0 &&
      ((pattern && pattern.test(additive.name)) ||
        (additive.fields ?? []).some((field) => oxides.includes(field.name) && Number(field.amount) > 0))
  );
const hasChrome = (additives) => has(additives, ['Cr2O3'], /chrom|pink/i);

/** Sold somewhere the base is: a potter buys the frits from the same suppliers. */
const soldWith = (material, base) =>
  !material.region?.length || !base.region?.length || material.region.some((region) => base.region.includes(region));

const copyOf = (material) => ({ ...structuredClone(material), amount: '' });

/** The lead-free formula to aim at, for the recipe and its colorants. */
function targetFor({ lines, additives, celsius, extras }) {
  const chrome = hasChrome(additives);
  // Strontium only if something on offer has it: nothing in the set the solver picks from does.
  const strontium = [...lines.filter((line) => !hasLead(line)), ...(extras.tries ?? []).map((t) => t.material)].some(
    (material) => oxidePercent(material, 'SrO') > 0
  );
  return leadFreeTarget(molesOf(lines), {
    celsius,
    noZinc: chrome || has(additives, ['Fe2O3', 'FeO', 'CuO'], /iron|copper|ochre/i) || celsius < FIRING.zincMeltsFrom,
    noMagnesia: chrome || celsius < FIRING.zincMeltsFrom,
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
function linesFor(setting, base, size) {
  const { lines, additives, find, standard, region, celsius, extras } = setting;
  const withoutLead = lines.filter((line) => !hasLead(line));
  const { materials } = modernMaterials(withoutLead, find, region, { allowLead: false });
  const leadAmount = totalOf(lines.filter(hasLead).map((line) => line.amount));
  const fit = materials.map((material) => ({ material, start: amountOf(material.amount) }));
  const inRecipe = new Set(fit.map((line) => line.material.name));
  // The recipe's main raw clay stays, at least at 10% of the batch or what it had.
  const rawClay = (line) => line.material.category === 'clay' && !/calcined/i.test(line.material.name);
  const clay = fit.filter(rawClay).sort((p, q) => q.start - p.start)[0];
  if (clay) Object.assign(clay, { must: true, fixed: true, least: Math.min(clay.start, CLAY_SHARE * size) });
  const uncapped = new Set(extras.uncapped ?? []);
  const lowFire = celsius < FIRING.lowFireBelow;
  // Why each is capped, for the report.
  const rawCalciumWhy = say('lead.why.rawCalcium');
  const add = (material, extra = {}) => {
    if (!material || inRecipe.has(material.name)) return;
    inRecipe.add(material.name);
    const line = { material: copyOf(material), start: 0, least: LEAST_SHARE * size, ...extra };
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
      add(m, { most: LOW_EXPANSION_SHARE * size, why: say('lead.why.lowExpansion') });
    else if (role === 'boron' && soldWith(m, base))
      add(m, { most: BORON_FRIT_SHARE * size, why: say('lead.why.boronFrit') });
    else if (m.category === 'feldspar') add(m);
    else if (/wollastonite/i.test(m.name)) add(m);
    else if (RAW_CALCIUM.test(m.name)) add(m, lowFire ? { group: 'raw calcium', why: rawCalciumWhy } : {});
  }
  const zincWanted = !(
    hasChrome(additives) ||
    has(additives, ['Fe2O3', 'FeO', 'CuO'], /iron|copper|ochre/i) ||
    celsius < FIRING.zincMeltsFrom
  );
  if (zincWanted)
    add(
      offered.find((m) => m.name === 'Zinc Oxide'),
      { most: RAW_SHARE * size, why: say('lead.why.zinc') }
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
const optionsFor = (size) => ({
  near: NEAR,
  alkalis: 0.03,
  fluxTotal: 0.03,
  groups: { 'raw calcium': RAW_SHARE * size },
  extras: EXTRAS,
  keepOwn: true
});

/** A rebuild on `base`: the chosen lines, and the selection. */
function rebuild(setting, base) {
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
const basesIn = (standard, region) =>
  standard.filter((m) => m.category === 'frit' && suggestable(m, { region }) && roleOf(m) === 'base');

/** The 85:15 base with kaolin: its unity formula, and its calculated expansion. */
function colourBase(base, clay) {
  try {
    const result = calculateUMF([{ material: base, amount: 85 }, ...(clay ? [{ material: clay, amount: 15 }] : [])]);
    return { unity: result.umf, expansion: result.expansion };
  } catch {
    return null;
  }
}

const clayFor = (lines, standard) =>
  lines.find((line) => !hasLead(line) && line.category === 'clay') ?? standard.find((m) => m.name === 'China Clay');

/**
 * The lead-free base frits sold in the region, best first. To rebuild, how near
 * the best match on each comes to the lead-free formula for the firing (the
 * plain best match: fast). To keep the colour, those whose 85:15 base with
 * kaolin has enough alumina, nearest the old glaze's expansion first.
 */
function leadFreeBases(lines, additives, find, standard, region, celsius, mode = 'rebuild') {
  const bases = basesIn(standard, region);
  const choice = (base) => ({ name: base.name, boron: Math.round(oxidePercent(base, 'B2O3')) });
  if (mode === 'colour') {
    const was = expansionOf(lines) ?? 0;
    const clay = clayFor(lines, standard);
    return bases
      .map((base) => ({ base, mix: colourBase(base, clay) }))
      .filter(({ mix }) => mix && (mix.unity['Al2O3'] ?? 0) >= COLOUR_ALUMINA)
      .sort((p, q) => Math.abs((p.mix.expansion ?? 0) - was) - Math.abs((q.mix.expansion ?? 0) - was))
      .slice(0, CHOICES)
      .map(({ base }) => choice(base));
  }
  const setting = { lines, additives, find, standard, region, celsius, extras: {} };
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
function replaceLead(lines, additives, find, standard, region, { base: baseName, celsius, mode, ...extras }) {
  const base = standard.find((material) => material.name === baseName);
  if (!base) throw new Error('No frit called ' + baseName);
  const oldTotal = totalOf(lines.map((line) => line.amount));
  const places = placesFor(oldTotal);
  const cautions = cautionsFor(lines, additives);

  let materials;
  let changes;
  let report = null;
  if (mode === 'colour') {
    const clay = clayFor(lines, standard);
    const parts = [[base, 0.85], ...(clay ? [[clay, 0.15]] : [])];
    materials = parts.map(([material, share]) => ({
      ...copyOf(material),
      amount: formatAmount(share * oldTotal, places)
    }));
    const old = new Map(lines.map((line) => [line.name, amountOf(line.amount)]));
    changes = materials.map((m) =>
      old.has(m.name)
        ? changed(m.name, upTo(old.get(m.name), places), plainFigure(m.amount))
        : added(m.name, plainFigure(m.amount))
    );
    for (const line of lines) {
      if (!materials.some((m) => m.name === line.name) && amountOf(line.amount) > 0) {
        changes.push(removed(line.name, amountOf(line.amount), places));
      }
    }
  } else {
    const setting = { lines, additives, find, standard, region, celsius, extras };
    const { fit, selection } = rebuild(setting, base);
    // The base comes to the old batch's total.
    const newTotal = selection.amounts.reduce((sum, amount) => sum + amount, 0);
    const onTotal = scaled(selection, newTotal > 0 ? oldTotal / newTotal : 1);
    const made = recipeFrom(onTotal, fit, new Set(), places);
    materials = made.materials;
    changes = made.changes;
    for (const line of lines.filter(hasLead)) {
      if (amountOf(line.amount) > 0) changes.push(removed(line.name, amountOf(line.amount), places));
    }
    report = explain(onTotal, fit, places);
    const baseShare = (onTotal.amounts[fit.findIndex((line) => line.material.name === base.name)] ?? 0) / oldTotal;
    if (baseShare < BASE_DOING_LITTLE) {
      cautions.push({
        check: 'base-doing-little',
        sentences: [say('lead.baseDoingLittle', { percent: figure(Math.round(baseShare * 100), 0), base: base.name })]
      });
    }
  }

  const moles = molesOf(materials);
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
      celsius < FIRING.lowFireBelow
    )
  );
  return { materials, changes, cautions, report };
}

/** What changes without lead, for the colorants in the recipe. */
function cautionsFor(lines, additives) {
  const moles = molesOf(lines);
  const fluxes = fluxesOf(moles);
  const lead = fluxes > 0 ? (moles['PbO'] ?? 0) / fluxes : 0;
  const cautions = [];
  const caution = (check, code) => cautions.push({ check, sentences: [say(code)] });
  if (has(additives, ['Sb2O3', 'Sb2O5'], /antimon|naples/i)) caution('lead-antimony', 'lead.antimony');
  if (hasChrome(additives) && lead >= 0.5) caution('lead-chrome', 'lead.chrome');
  if (has(additives, ['CuO'])) caution('lead-copper', 'lead.copper');
  if (has(additives, ['MnO'])) caution('lead-manganese', 'lead.manganese');
  if (has(additives, ['Fe2O3', 'FeO']) || (moles['Fe2O3'] ?? 0) / (fluxes || 1) > 0.02) {
    caution('lead-iron', 'lead.iron');
  }
  return cautions;
}

/**
 * The share of the fired glaze that is lead oxide, and PbO in the unity
 * formula, for the recipe's warning. A line whose material cannot be read (one
 * saved with no oxides, say) adds nothing: the page says what is wrong with it,
 * and the lead in the rest is still worth warning about.
 */
function leadIn(lines) {
  const readable = lines.filter((line) => {
    try {
      oxideMoles([{ material: line, amount: 1 }]);
      return true;
    } catch {
      return false;
    }
  });
  const moles = molesOf(readable);
  const fluxes = fluxesOf(moles);
  const grams = Object.entries(moles).reduce((sum, [oxide, amount]) => sum + amount * MOLAR_MASS[oxide], 0);
  const lead = moles['PbO'] ?? 0;
  return {
    unity: fluxes > 0 ? lead / fluxes : 0,
    percent: grams > 0 ? (100 * lead * MOLAR_MASS['PbO']) / grams : 0
  };
}

module.exports = { recipeHasLead, leadFreeBases, replaceLead, leadIn };
