'use strict';

const { boronFor } = require('../chemistry');
const { amountOf } = require('./amounts');
const { FIRING, CHECK_LIMITS: L } = require('./limits');
const { say, figure } = require('./messages');

// Past a recommended limit, say what the fired glaze will likely do, rather
// than block (docs/adr/0012-choosing-materials.md, and the research report
// "Extra materials in glaze substitution"). Each warning has two strengths:
// between the app's caution and the published ceiling a glaze "tends to"
// show the fault; past the ceiling it "will probably". Limits depend on the
// firing where it is known. With an old recipe to compare, a value the old
// one already had is not news: only a limit newly crossed, or one made worse.
//
// A caution is the check that raised it and its sentences, each a message
// code with its values: where how sure it is changes a sentence, the sentence
// comes in both forms rather than with a phrase swapped in, so it translates whole.

const KNAO = (u) => (u['K2O'] ?? 0) + (u['Na2O'] ?? 0);
const value = (u, oxide) => (u ? (u[oxide] ?? 0) : 0);

const hasColorant = (additives, pattern, oxides) =>
  additives.some(
    (a) =>
      amountOf(a.amount) > 0 &&
      (pattern.test(a.name) || (a.fields ?? []).some((f) => oxides.includes(f.name) && Number(f.amount) > 0))
  );

/** Raw (not calcined) clay as a percent of the batch. */
function rawClayPercent(lines) {
  const total = lines.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const clay = lines
    .filter((line) => line.category === 'clay' && !/calcined/i.test(line.name))
    .reduce((sum, line) => sum + amountOf(line.amount), 0);
  return total > 0 ? (100 * clay) / total : 0;
}

/** Cautions for what is past a recommended limit. */
function pastLimits(input) {
  const { unity, old, celsius } = input;
  const additives = input.additives ?? [];
  const low = celsius === undefined ? undefined : celsius < FIRING.lowFireBelow;
  const cautions = [];
  // Whether the old recipe already had it as bad: then it is not news.
  const already = (bad, level) => old !== undefined && bad(old) >= level && bad(unity) <= bad(old) * L.alreadyFactor;
  const sure = (x, likely, probably, tends) => (x >= likely ? probably : tends);
  const caution = (check, ...sentences) => cautions.push({ check, sentences: sentences.filter(Boolean) });
  const two = (x) => figure(x, 2);

  // Boron.
  const boron = value(unity, 'B2O3');
  const thin = value(unity, 'Al2O3') < L.thin.alumina || value(unity, 'SiO2') < L.thin.silica;
  const { boronLowFire, boronMidFire } = L;
  if (low !== false && boron >= boronLowFire.caution && !already((u) => value(u, 'B2O3'), boronLowFire.caution)) {
    caution(
      'boron-high',
      say('checks.boronLowFire', { boron: two(boron) }),
      sure(
        boron,
        thin ? boronLowFire.thinLikely : boronLowFire.likely,
        say('checks.boronLowFireProbably'),
        say('checks.boronLowFireTends')
      ),
      say('checks.boronLowFireEffects')
    );
  } else if (
    low === false &&
    boron >= boronMidFire.caution &&
    !already((u) => value(u, 'B2O3'), boronMidFire.caution)
  ) {
    caution(
      'boron-high',
      say('checks.boronMidFire', { boron: two(boron), high: two(boronMidFire.caution) }),
      sure(boron, boronMidFire.likely, say('checks.boronMidFireProbably'), say('checks.boronMidFireTends')),
      say('checks.boronMidFireFix')
    );
  }

  // Too little boron to melt at low fire: Katz's rule for the firing.
  if (low && celsius !== undefined && boron < L.boronShortShare * boronFor(celsius)) {
    caution(
      'boron-short',
      say('checks.boronShort', { boron: two(boron), needed: two(boronFor(celsius)) }),
      say('checks.boronShortEffects')
    );
  }

  // Alumina, low or high.
  const alumina = value(unity, 'Al2O3');
  const aluminaLimit = low === false ? L.aluminaMidFire : L.aluminaLowFire;
  if (alumina > 0 && alumina < aluminaLimit.caution && !already((u) => -value(u, 'Al2O3'), -aluminaLimit.caution)) {
    caution(
      'alumina-low',
      say('checks.aluminaLow', { alumina: two(alumina) }),
      sure(-alumina, -aluminaLimit.likely, say('checks.aluminaLowProbably'), say('checks.aluminaLowTends')),
      say('checks.aluminaLowFix')
    );
  }
  const ratio = alumina > 0 ? value(unity, 'SiO2') / alumina : Infinity;
  const below = L.silicaAluminaBelow;
  if (ratio < below && !(old && value(old, 'Al2O3') > 0 && value(old, 'SiO2') / value(old, 'Al2O3') < below)) {
    caution(
      'alumina-high',
      say('checks.aluminaHigh', { ratio: figure(ratio, 1) }),
      say('checks.aluminaHighEffects'),
      low ? say('checks.aluminaHighLowFire') : null,
      say('checks.aluminaHighFix')
    );
  }

  // Boron blue.
  const pink = hasColorant(additives, /pink/i, []);
  const blue = L.boronBlue;
  if (
    boron > blue.boron &&
    value(unity, 'CaO') > blue.calcia &&
    alumina < blue.alumina &&
    !(old && value(old, 'B2O3') > blue.boron && value(old, 'CaO') > blue.calcia && value(old, 'Al2O3') < blue.alumina)
  ) {
    caution('boron-blue', say('checks.boronBlue'), pink ? say('checks.boronBlueFixPink') : say('checks.boronBlueFix'));
  }

  // Soda and potash.
  const alkali = KNAO(unity);
  const alkaliLimit = low === false ? L.alkaliMidFire : L.alkaliLowFire;
  if (alkali > alkaliLimit.caution && !already(KNAO, alkaliLimit.caution)) {
    caution(
      'alkali',
      say('checks.alkali', { alkali: two(alkali) }),
      sure(alkali, alkaliLimit.likely, say('checks.alkaliProbably'), say('checks.alkaliTends')),
      say('checks.alkaliFix')
    );
  }

  // Magnesia at low fire.
  const magnesia = value(unity, 'MgO');
  const magnesiaLimit = L.magnesiaLowFire;
  if (low && magnesia > magnesiaLimit.caution && !already((u) => value(u, 'MgO'), magnesiaLimit.caution)) {
    caution(
      'magnesia',
      say('checks.magnesia', { magnesia: two(magnesia) }),
      sure(magnesia, magnesiaLimit.likely, say('checks.magnesiaProbably'), say('checks.magnesiaTends')),
      say('checks.magnesiaNote')
    );
  }

  // Zinc with colorants, and below cone 03.
  const zinc = value(unity, 'ZnO');
  if (zinc >= L.zinc && !already((u) => value(u, 'ZnO'), L.zinc)) {
    if (hasColorant(additives, /chrom|pink/i, ['Cr2O3'])) caution('zinc-chrome', say('checks.zincChrome'));
    if (hasColorant(additives, /iron|ochre/i, ['Fe2O3', 'FeO'])) caution('zinc-iron', say('checks.zincIron'));
    if (hasColorant(additives, /copper/i, ['CuO'])) caution('zinc-copper', say('checks.zincCopper'));
    if (celsius !== undefined && celsius < FIRING.zincMeltsFrom) {
      caution('zinc-low-fire', say('checks.zincLowFire', { zinc: two(zinc) }));
    }
  }

  // Materials: raw whiting at low fire, fluorspar, kaolin, soluble ones, frits doing the wrong job.
  const total = input.lines.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const percent = (amount) => (total > 0 ? (100 * amountOf(amount)) / total : 0);
  const rawCalcium = input.lines.filter((line) => /^(whiting|dolomite)$/i.test(line.material.name));
  const rawShare = rawCalcium.reduce((sum, line) => sum + percent(line.amount), 0);
  if (low && rawShare > L.rawCalcium.caution) {
    caution(
      'whiting',
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
      caution('fluorine', say('checks.fluorine', { name: line.material.name }));
    }
  }
  const clay = input.lines
    .filter((line) => line.material.category === 'clay' && !/calcined/i.test(line.material.name))
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
    caution('clay-low', how, say('checks.clayLowFix'));
  }
  if (clay > L.clay.caution) {
    caution(
      'clay-high',
      say('checks.clayHigh', { clay: figure(clay, 0) }),
      sure(clay, L.clay.likely, say('checks.clayHighProbably'), say('checks.clayHighTends')),
      say('checks.clayHighFix')
    );
  }
  for (const line of input.lines) {
    if (line.material.soluble && amountOf(line.amount) > 0) {
      caution('soluble', say('checks.soluble', { name: line.material.name }));
    }
  }
  const main = [...input.lines].sort((p, q) => amountOf(q.amount) - amountOf(p.amount))[0];
  const role = main?.material.fritRole;
  if (role === 'boron') caution('frit-role', say('checks.boronFrit'));
  else if (role === 'low-expansion') caution('frit-role', say('checks.lowExpansionFrit'));
  else if (role === 'alkali') caution('frit-role', say('checks.alkaliFrit'));

  // Expansion against the old recipe: crazing or shivering.
  const was = input.expansion?.was ?? null;
  const now = input.expansion?.now ?? null;
  if (was !== null && now !== null) {
    const { expansionRises: rises, expansionFalls: falls } = L;
    if (now > was + rises.caution) {
      caution(
        'expansion-rises',
        say('checks.expansionRises', { was: figure(was, 1), now: figure(now, 1) }),
        now > was + rises.likely ? say('checks.expansionRisesProbably') : say('checks.expansionRisesMay'),
        say('checks.expansionRisesFix')
      );
    } else if (now < was - falls.caution) {
      caution(
        'expansion-falls',
        say('checks.expansionFalls', { was: figure(was, 1), now: figure(now, 1) }),
        now < was - falls.likely ? say('checks.expansionFallsProbably') : say('checks.expansionFallsCan'),
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
    notes.push({ check: 'many-materials', sentences: [say('checks.manyMaterials', { count: used.length })] });
  }
  for (const line of used) {
    const percent = (100 * amountOf(line.amount)) / total;
    if (percent < L.smallPercent) {
      notes.push({
        check: 'small-amount',
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

module.exports = { pastLimits, sizeNotes, rawClayPercent };
