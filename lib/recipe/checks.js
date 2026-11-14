'use strict';

const { boronFor } = require('../chemistry');
const { prepareMaterial } = require('../chemistry/materials');
const { amountOf } = require('./amounts');
const {
  FIRING,
  CHECK_LIMITS: L,
  GLAZECALC_LIMITS,
  asShown,
  bandOf,
  bandIn,
  pastSide,
  isLikely,
  isThin
} = require('./limits');
const { say, figure } = require('./messages');
const { CONE_FIT } = require('./cone-fit');

// Past a recommended limit, say what the fired glaze will likely do, rather
// than block (docs/adr/0012-choosing-materials.md, and the research report
// "Extra materials in glaze substitution"). Each warning has two strengths:
// between the app's caution and the published ceiling a glaze "tends to"
// show the fault; past the ceiling it "will probably". Limits depend on the
// firing where it is known. With an old recipe to compare, a value the old
// one already had is not news: only a limit newly crossed, or one made worse.
//
// A caution is the check that raised it, what it measured (the quantity, its
// value, the limit and which side of it is past, and how serious), and its
// sentences, each a message code with its values: where how sure it is
// changes a sentence, the sentence comes in both forms rather than with a
// phrase swapped in, so it translates whole.

const KNAO = (u) => (u['K2O'] ?? 0) + (u['Na2O'] ?? 0);
const value = (u, oxide) => (u ? (u[oxide] ?? 0) : 0);

const hasColorant = (additives, pattern, oxides) =>
  additives.some(
    (a) =>
      amountOf(a.amount) > 0 &&
      (pattern.test(a.name) || (a.fields ?? []).some((f) => oxides.includes(f.name) && Number(f.amount) > 0))
  );

// A material with no category (a potter's own; every standard one has a category) is known by its
// analysis: raw clay is 20% or more Al2O3 with an LOI of 8 to 16%, as kaolins and ball clays have;
// whiting is nearly all CaO once fired, with an LOI of 40 to 48% (pure whiting loses 44%); and
// dolomite, the carbonate of calcium and magnesium, nearly all CaO and MgO, more CaO than MgO (it
// fires to 58% CaO), with an LOI of 45 to 48% (pure dolomite loses 47.7%, magnesite 52%).
const OWN_CLAY = { alumina: 20, loi: [8, 16] };
const OWN_WHITING = { calcia: 0.9, loi: [40, 48] };
const OWN_DOLOMITE = { calciaMagnesia: 0.9, loi: [45, 48] };

/**
 * What a material with no category is by its analysis: 'clay', 'whiting', 'dolomite', or null (or
 * with a category).
 */
function kindByAnalysis(material) {
  if (material.category) return null;
  let prepared;
  try {
    prepared = prepareMaterial(material);
  } catch {
    return null;
  }
  const { analysis, loi } = prepared;
  const within = (range) => loi >= range[0] && loi <= range[1];
  if ((analysis['Al2O3'] ?? 0) >= OWN_CLAY.alumina && within(OWN_CLAY.loi)) return 'clay';
  const fired = Object.values(analysis).reduce((sum, percent) => sum + percent, 0);
  const calcia = analysis['CaO'] ?? 0;
  const magnesia = analysis['MgO'] ?? 0;
  if (fired > 0 && calcia >= OWN_WHITING.calcia * fired && within(OWN_WHITING.loi)) return 'whiting';
  if (
    fired > 0 &&
    calcia + magnesia >= OWN_DOLOMITE.calciaMagnesia * fired &&
    calcia >= magnesia &&
    within(OWN_DOLOMITE.loi)
  ) {
    return 'dolomite';
  }
  return null;
}

// A clay that loses less than this percent of its weight when fired has been calcined: a raw clay
// loses its chemical water, 4% and more (kaolin 14%), and Molochite, a calcined china clay, none.
const CALCINED_LOI = 2;

/**
 * Whether a material is raw (not calcined) clay, which shrinks as the glaze dries: by its category,
 * calcined by its name or its LOI, or for one with no category by its analysis.
 */
const isRawClay = (material) =>
  (material.category === 'clay' && !/calcined/i.test(material.name) && !(Number(material.loi ?? NaN) < CALCINED_LOI)) ||
  kindByAnalysis(material) === 'clay';

/** Whether a material is raw whiting or dolomite: by its name, or for one with no category by its analysis. */
const isRawCalcium = (material) =>
  /^(whiting|dolomite)$/i.test(material.name) || ['whiting', 'dolomite'].includes(kindByAnalysis(material));

/** Raw (not calcined) clay as a percent of the batch. */
function rawClayPercent(lines) {
  const total = lines.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const clay = lines.filter(isRawClay).reduce((sum, line) => sum + amountOf(line.amount), 0);
  return total > 0 ? (100 * clay) / total : 0;
}

/**
 * Whether raw clay at `clay` percent of the batch is too much to pass without
 * a caution: over the caution's 20%, and not about what the old recipe had
 * (`clayWas`, if there is one) when it was over too, as seriously: from under
 * the likely figure (25%) to it is news.
 */
function rawClayHigh(clay, clayWas) {
  const already =
    clayWas !== undefined &&
    clayWas >= L.clay.caution &&
    (clayWas >= L.clay.likely || clay < L.clay.likely) &&
    clay <= clayWas * L.alreadyFactor;
  return clay > L.clay.caution && !already;
}

/** What a check measured: the quantity, its value, the limit and the side of it that is past. */
const measured = (quantity, value, limit, direction, severity) => ({ severity, quantity, value, limit, direction });

/** 'likely' at or past the likely figure, otherwise 'caution'. */
const severityOf = (x, likely) => (x >= likely ? 'likely' : 'caution');

/** How serious each severity is, to compare two: a likely fault is more so than a caution. */
const SERIOUS = Object.freeze({ caution: 1, likely: 2 });

// BaO in the unity formula, at any firing, from Digitalfire's Limit Formula page
// (https://digitalfire.com/glossary/123): "For functional glazes low BaO levels can often be
// tolerated (e.g. 0.05-0.1) if the glaze chemistry is balanced", and "any glaze that has 0.4 BaO
// would be off-the-scale for potential to leach" (CHECK_LIMITS.barium: 0.1 and 0.4). A range, read
// as the limit sets' are (pastSide, isLikely): at the two decimals shown, 0.10 itself within.
const BARIUM = Object.freeze({ max: L.barium.caution, maxLikely: L.barium.likely });

/** How serious the BaO in a unity formula is: null to 0.10 as shown, 'likely' from 0.40, else 'caution'. */
function bariumSeverity(barium) {
  if (pastSide(barium, BARIUM) !== 'above') return null;
  return isLikely(barium, BARIUM, 'above') ? 'likely' : 'caution';
}

/**
 * Cautions for what is past a recommended limit. The limits on the unity
 * formula come from `input.limitSet` (the app's own by default), for the band
 * the firing falls in: `input.band` where it is given (a cone's band, from
 * lib/cones/firing.js coneBand, read as the set's own), else the band of
 * `input.celsius`. With the firing unknown they are its `whenUnknown` band's,
 * but the checks that only mean something at a known firing (too little
 * boron, magnesia, raw whiting) are left out. A band the set has no figures
 * for (Hesselberth & Roy's low fire, every set's 'top') checks no ranges.
 */
function pastLimits(input) {
  const { unity, old } = input;
  // Anything but a finite number is an unknown firing: null is not 0 °C.
  const celsius = Number.isFinite(input.celsius) ? input.celsius : undefined;
  const set = input.limitSet ?? GLAZECALC_LIMITS;
  const additives = input.additives ?? [];
  const band = input.band !== undefined ? bandIn(set, input.band) : bandOf(set, celsius);
  const low = band === undefined ? undefined : band === 'low';
  const range = set.unity[band ?? set.whenUnknown] ?? {};
  const cautions = [];
  const sure = (x, likely, probably, tends) => (x >= likely ? probably : tends);
  // A range's caution: past it by the limits' own rule (pastSide, which the table uses too), and
  // 'likely' only past a set's figure for a likely fault. A set with none (Hesselberth & Roy give one
  // figure per edge) only cautions, as its table does.
  const graded = (likely) => (likely ? 'likely' : 'caution');
  const worded = (likely, probably, tends) => (likely ? probably : tends);
  // Whether the old recipe already had it as bad: then it is not news. It had when it raised the
  // same caution as seriously or more (`severityIn` of a unity formula: null for no caution), and the
  // new one is worse by no more than alreadyFactor: more of `bad`, or less of it for a `floor`. A
  // limit newly crossed, from within it or from a caution to a likely fault, is news.
  const already = (bad, severityIn, floor = false) => {
    if (old === undefined) return false;
    const was = severityIn(old);
    if (was === null || SERIOUS[was] < SERIOUS[severityIn(unity)]) return false;
    return floor ? bad(unity) * L.alreadyFactor >= bad(old) : bad(unity) <= bad(old) * L.alreadyFactor;
  };
  // The same for a range's caution, past it on `side` as the check reads it (boron's likely figure
  // is its own for a thin glaze).
  const alreadyPast = (bad, r, side) =>
    already(
      bad,
      (u) => (pastSide(bad(u), r) === side ? graded(isLikely(bad(u), r, side, isThin(u))) : null),
      side === 'below'
    );
  // The band whose figures are used, which picks the words: the firing's, or the set's choice when
  // the firing is not known (low fire for the app's own set, cone 6 for Hesselberth & Roy's).
  const used = band ?? set.whenUnknown;
  const caution = (check, fields, ...sentences) =>
    cautions.push({ check, ...fields, sentences: sentences.filter(Boolean) });
  const two = (x) => figure(x, 2);

  // Boron, in the words of the band whose figures are used: cone 06-04's in a low band, cone 6's in
  // a mid band, and cone 10's in a set's high band (Hesselberth & Roy's). At cone 6 the app's own set
  // says industry counts its figure as high (0.33: the research report "Extra materials in glaze
  // substitution"); another set's figure is its own (Hesselberth & Roy's 0.35 is the top of their
  // cone 6 range), and the sentence says so.
  const boron = value(unity, 'B2O3');
  const thin = isThin(unity ?? {});
  const boronRange = range['B2O3'];
  if (
    boronRange?.max !== undefined &&
    pastSide(boron, boronRange) === 'above' &&
    !alreadyPast((u) => value(u, 'B2O3'), boronRange, 'above')
  ) {
    const likely = isLikely(boron, boronRange, 'above', thin);
    const fields = measured('B2O3', boron, boronRange.max, 'above', graded(likely));
    if (used === 'low') {
      caution(
        'boron-high',
        fields,
        say('checks.boronLowFire', { boron: two(boron) }),
        worded(likely, say('checks.boronLowFireProbably'), say('checks.boronLowFireTends')),
        say('checks.boronLowFireEffects')
      );
    } else {
      const figures = { boron: two(boron), high: two(boronRange.max) };
      caution(
        'boron-high',
        fields,
        used === 'high'
          ? say('checks.boronHighFire', figures)
          : set.id === GLAZECALC_LIMITS.id
            ? say('checks.boronMidFire', figures)
            : say('checks.boronMidFireSet', figures),
        worded(likely, say('checks.boronMidFireProbably'), say('checks.boronMidFireTends')),
        say('checks.boronMidFireFix')
      );
    }
  }

  // Too little boron to melt at low fire: Katz's rule for the firing, the boron as shown. Not for a lead or
  // an alkaline glaze, which melt without it and which the rule is not for (cone-fit.js skips them too).
  const meltsWithoutBoron =
    value(unity, 'PbO') > CONE_FIT.lead || value(unity, 'K2O') + value(unity, 'Na2O') >= CONE_FIT.alkali;
  if (low && celsius !== undefined && !meltsWithoutBoron && asShown(boron) < L.boronShortShare * boronFor(celsius)) {
    caution(
      'boron-short',
      measured('B2O3', boron, L.boronShortShare * boronFor(celsius), 'below', 'caution'),
      say('checks.boronShort', { boron: two(boron), needed: two(boronFor(celsius)) }),
      say('checks.boronShortEffects')
    );
  }

  // Alumina, low or high. No alumina at all (a frit and silica, say) is the lowest there is, so it is
  // checked too; only a unity formula with nothing in it is not.
  const alumina = value(unity, 'Al2O3');
  const aluminaRange = range['Al2O3'];
  const anything = Object.values(unity ?? {}).some((moles) => moles > 0);
  if (
    aluminaRange?.min !== undefined &&
    anything &&
    pastSide(alumina, aluminaRange) === 'below' &&
    !alreadyPast((u) => value(u, 'Al2O3'), aluminaRange, 'below')
  ) {
    const likely = isLikely(alumina, aluminaRange, 'below');
    caution(
      'alumina-low',
      measured('Al2O3', alumina, aluminaRange.min, 'below', graded(likely)),
      say('checks.aluminaLow', { alumina: two(alumina) }),
      worded(likely, say('checks.aluminaLowProbably'), say('checks.aluminaLowTends')),
      say('checks.aluminaLowFix')
    );
  }
  const ratio = alumina > 0 ? value(unity, 'SiO2') / alumina : Infinity;
  const below = L.silicaAluminaBelow;
  if (ratio < below && !(old && value(old, 'Al2O3') > 0 && value(old, 'SiO2') / value(old, 'Al2O3') < below)) {
    caution(
      'alumina-high',
      measured('SiO2:Al2O3', ratio, below, 'below', 'caution'),
      say('checks.aluminaHigh', { ratio: figure(ratio, 1) }),
      say('checks.aluminaHighEffects'),
      low ? say('checks.aluminaHighLowFire') : null,
      say('checks.aluminaHighFix')
    );
  }

  // Boron blue, its figures read at the two decimals shown: B2O3 and CaO over 0.50, Al2O3 under 0.20.
  const pink = hasColorant(additives, /pink/i, []);
  const blue = L.boronBlue;
  const isBlue = (u) =>
    asShown(value(u, 'B2O3')) > blue.boron &&
    asShown(value(u, 'CaO')) > blue.calcia &&
    asShown(value(u, 'Al2O3')) < blue.alumina;
  if (isBlue(unity) && !(old && isBlue(old))) {
    caution(
      'boron-blue',
      measured('B2O3', boron, blue.boron, 'above', 'caution'),
      say('checks.boronBlue'),
      pink ? say('checks.boronBlueFixPink') : say('checks.boronBlueFix')
    );
  }

  // Soda and potash.
  const alkali = KNAO(unity);
  const alkaliRange = range['K2O+Na2O'];
  if (
    alkaliRange?.max !== undefined &&
    pastSide(alkali, alkaliRange) === 'above' &&
    !alreadyPast(KNAO, alkaliRange, 'above')
  ) {
    const likely = isLikely(alkali, alkaliRange, 'above');
    caution(
      'alkali',
      measured('K2O+Na2O', alkali, alkaliRange.max, 'above', graded(likely)),
      say('checks.alkali', { alkali: two(alkali) }),
      worded(likely, say('checks.alkaliProbably'), say('checks.alkaliTends')),
      say('checks.alkaliFix')
    );
  }

  // Magnesia, at a known firing whose band the set limits it in (the app's own: low fire).
  // The words say it does not melt at cone 06-04, so only a low band's limit is used.
  const magnesia = value(unity, 'MgO');
  const magnesiaRange = low ? set.unity[band]?.['MgO'] : undefined;
  if (
    magnesiaRange?.max !== undefined &&
    pastSide(magnesia, magnesiaRange) === 'above' &&
    !alreadyPast((u) => value(u, 'MgO'), magnesiaRange, 'above')
  ) {
    const likely = isLikely(magnesia, magnesiaRange, 'above');
    caution(
      'magnesia',
      measured('MgO', magnesia, magnesiaRange.max, 'above', graded(likely)),
      say('checks.magnesia', { magnesia: two(magnesia) }),
      worded(likely, say('checks.magnesiaProbably'), say('checks.magnesiaTends')),
      say('checks.magnesiaNote')
    );
  }

  // Zinc with colorants, and below cone 03: from ZnO 0.02 at the two decimals shown, as barium and the
  // limits are read, so 0.0196, shown as 0.02, is zinc that matters.
  const zinc = value(unity, 'ZnO');
  const zincIn = (u) => value(u, 'ZnO');
  const zincMatters = (u) => (asShown(zincIn(u)) >= L.zinc ? 'caution' : null);
  if (zincMatters(unity) && !already(zincIn, zincMatters)) {
    const fields = measured('ZnO', zinc, L.zinc, 'above', 'caution');
    if (hasColorant(additives, /chrom|pink/i, ['Cr2O3'])) caution('zinc-chrome', fields, say('checks.zincChrome'));
    if (hasColorant(additives, /iron|ochre/i, ['Fe2O3', 'FeO'])) caution('zinc-iron', fields, say('checks.zincIron'));
    if (hasColorant(additives, /copper/i, ['CuO'])) caution('zinc-copper', fields, say('checks.zincCopper'));
    if (celsius !== undefined && celsius < FIRING.zincMeltsFrom) {
      caution('zinc-low-fire', fields, say('checks.zincLowFire', { zinc: two(zinc) }));
    }
  }

  // Barium, which can leach from the fired glaze onto food, at any firing: past 0.10 as shown, and
  // likely from 0.40 (Digitalfire's Limit Formula page, https://digitalfire.com/glossary/123; BARIUM).
  const barium = value(unity, 'BaO');
  const bariumPast = bariumSeverity(barium);
  const bariumOf = (u) => value(u, 'BaO');
  if (bariumPast && !already(bariumOf, (u) => bariumSeverity(bariumOf(u)))) {
    caution(
      'barium',
      measured('BaO', barium, L.barium.caution, 'above', bariumPast),
      say('checks.barium', { barium: two(barium) }),
      bariumPast === 'likely' ? say('checks.bariumLikely') : say('checks.bariumTends')
    );
  }

  // Materials: raw whiting at low fire, fluorspar, kaolin, soluble ones, frits doing the wrong job.
  const total = input.lines.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const percent = (amount) => (total > 0 ? (100 * amountOf(amount)) / total : 0);
  const rawCalcium = input.lines.filter((line) => isRawCalcium(line.material));
  const rawShare = rawCalcium.reduce((sum, line) => sum + percent(line.amount), 0);
  if (low && rawShare > L.rawCalcium.caution) {
    caution(
      'whiting',
      measured(
        'raw-calcium-percent',
        rawShare,
        L.rawCalcium.caution,
        'above',
        severityOf(rawShare, L.rawCalcium.likely)
      ),
      say('checks.whiting'),
      sure(
        rawShare,
        L.rawCalcium.likely,
        say('checks.whitingProbably', { percent: figure(rawShare, 0) }),
        say('checks.whitingTends', { percent: figure(rawShare, 0) })
      ),
      say('checks.whitingFix')
    );
  }
  for (const line of input.lines) {
    if (line.material.fluorine && amountOf(line.amount) > 0) {
      caution(
        'fluorine',
        { severity: 'caution', material: line.material.name },
        say('checks.fluorine', { name: line.material.name })
      );
    }
  }
  const clay = input.lines
    .filter((line) => isRawClay(line.material))
    .reduce((sum, line) => sum + percent(line.amount), 0);
  const clayWas = input.oldClay;
  if (clay < L.clay.least && (clayWas === undefined || clayWas >= L.clay.least)) {
    const how =
      clay > 0
        ? clayWas !== undefined
          ? say('checks.clayLowWas', { clay: figure(clay, 0), was: figure(clayWas, 0) })
          : say('checks.clayLow', { clay: figure(clay, 0) })
        : clayWas !== undefined
          ? say('checks.clayNoneWas', { was: figure(clayWas, 0) })
          : say('checks.clayNone');
    caution(
      'clay-low',
      measured('raw-clay-percent', clay, L.clay.least, 'below', 'caution'),
      how,
      say('checks.clayLowFix')
    );
  }
  // As much raw clay as the old recipe had (to rounding, or a little more) is not news.
  if (rawClayHigh(clay, clayWas)) {
    caution(
      'clay-high',
      measured('raw-clay-percent', clay, L.clay.caution, 'above', severityOf(clay, L.clay.likely)),
      say('checks.clayHigh', { clay: figure(clay, 0) }),
      sure(clay, L.clay.likely, say('checks.clayHighProbably'), say('checks.clayHighTends')),
      say('checks.clayHighFix')
    );
  }
  for (const line of input.lines) {
    if (line.material.soluble && amountOf(line.amount) > 0) {
      caution(
        'soluble',
        { severity: 'caution', material: line.material.name },
        say('checks.soluble', { name: line.material.name })
      );
    }
  }
  const main = [...input.lines].sort((p, q) => amountOf(q.amount) - amountOf(p.amount))[0];
  const role = main?.material.fritRole;
  const frit = { severity: 'note', material: main?.material.name };
  if (role === 'boron') caution('frit-role', frit, say('checks.boronFrit'));
  else if (role === 'low-expansion') caution('frit-role', frit, say('checks.lowExpansionFrit'));
  else if (role === 'alkali') caution('frit-role', frit, say('checks.alkaliFrit'));

  // Expansion against the old recipe: crazing or shivering.
  const was = input.expansion?.was ?? null;
  const now = input.expansion?.now ?? null;
  if (was !== null && now !== null) {
    const { expansionRises: rises, expansionFalls: falls } = L;
    if (now > was + rises.caution) {
      const likely = now > was + rises.likely;
      caution(
        'expansion-rises',
        measured('expansion', now, was + rises.caution, 'above', likely ? 'likely' : 'caution'),
        say('checks.expansionRises', { was: figure(was, 1), now: figure(now, 1) }),
        likely ? say('checks.expansionRisesProbably') : say('checks.expansionRisesMay'),
        say('checks.expansionRisesFix')
      );
    } else if (now < was - falls.caution) {
      const likely = now < was - falls.likely;
      caution(
        'expansion-falls',
        measured('expansion', now, was - falls.caution, 'below', likely ? 'likely' : 'caution'),
        say('checks.expansionFalls', { was: figure(was, 1), now: figure(now, 1) }),
        likely ? say('checks.expansionFallsProbably') : say('checks.expansionFallsCan'),
        say('checks.expansionFallsTest')
      );
    }
  }
  return cautions;
}

/**
 * Notes on the recipe's size and small amounts: many materials to buy and
 * weigh, or an amount too small to weigh well in a test batch.
 */
function sizeNotes(lines, low) {
  const used = lines.filter((line) => amountOf(line.amount) > 0);
  const total = used.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const notes = [];
  const many = low ? L.manyMaterialsLowFire : L.manyMaterials;
  if (used.length >= many) {
    notes.push({
      check: 'many-materials',
      ...measured('materials', used.length, many, 'above', 'note'),
      sentences: [say('checks.manyMaterials', { count: used.length })]
    });
  }
  for (const line of used) {
    const percent = (100 * amountOf(line.amount)) / total;
    if (percent < L.smallPercent) {
      notes.push({
        check: 'small-amount',
        ...measured('material-percent', percent, L.smallPercent, 'below', 'note'),
        material: line.material.name,
        sentences: [
          say('checks.smallAmount', {
            name: line.material.name,
            percent: figure(percent, 1),
            reads: figure(L.scaleReads, 1)
          })
        ]
      });
    }
  }
  return notes;
}

module.exports = { pastLimits, sizeNotes, rawClayPercent, isRawClay, rawClayHigh, bariumSeverity };
