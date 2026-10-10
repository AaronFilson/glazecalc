import { translate } from '@jsverse/transloco';
import { boronFor } from '../../../../lib/chemistry';
import { fixed, listOf } from '../../shared/format';
import { Additive, Material } from '../../core/models';
import { amountOf } from './rebase';
import { oxideName } from './pool';

// Past a recommended limit, say what the fired glaze will likely do, rather
// than block (docs/adr/0012-choosing-materials.md, and the research report
// "Extra materials in glaze substitution"). Each warning has two strengths:
// between the app's caution and the published ceiling a glaze "tends to"
// show the fault; past the ceiling it "will probably". Limits depend on the
// firing where it is known. With an old recipe to compare, a value the old
// one already had is not news: only a limit newly crossed, or one made worse.

/** Below this the firing is low fire (cone 06-02); above it, mid fire (cone 4-6). */
const LOW_FIRE_BELOW = 1150;
/** Zinc hardly melts below cone 03. */
const ZINC_MELTS_FROM = 1101;

export interface CheckInput {
  /** The new recipe's base materials and amounts. */
  lines: Array<{ material: Material; amount: string | number | undefined }>;
  /** Its unity formula, base materials only. */
  unity: Record<string, number>;
  /** The old recipe's unity formula, to warn only of what is new or worse. */
  old?: Record<string, number>;
  /** The firing temperature, when it is known. */
  celsius?: number;
  additives?: Additive[];
  /** The old recipe's raw clay, as a percent of its batch. */
  oldClay?: number;
  /** Calculated expansion, before and after. */
  expansion?: { was: number | null; now: number | null };
}

const KNAO = (u: Record<string, number>) => (u['K2O'] ?? 0) + (u['Na2O'] ?? 0);
const value = (u: Record<string, number> | undefined, oxide: string) => (u ? (u[oxide] ?? 0) : 0);

const hasColorant = (additives: Additive[], pattern: RegExp, oxides: string[]) =>
  additives.some(
    (a) =>
      amountOf(a.amount) > 0 &&
      (pattern.test(a.name) || (a.fields ?? []).some((f) => oxides.includes(f.name) && Number(f.amount) > 0))
  );

/** Warnings, in plain words, for what is past a recommended limit. */
export function pastLimits(input: CheckInput): string[] {
  const { unity, old, celsius } = input;
  const additives = input.additives ?? [];
  const low = celsius === undefined ? undefined : celsius < LOW_FIRE_BELOW;
  const warnings: string[] = [];
  // Whether the old recipe already had it as bad: then it is not news.
  const already = (bad: (u: Record<string, number>) => number, level: number) =>
    old !== undefined && bad(old) >= level && bad(unity) <= bad(old) * 1.1;
  // Each warning is whole sentences, each a message, so it translates whole: where how sure
  // it is changes a sentence, the sentence comes in both forms rather than with a phrase swapped in.
  const sure = (x: number, likely: number, probably: string, tends: string) => (x >= likely ? probably : tends);
  const say = (...sentences: string[]) => warnings.push(sentences.filter(Boolean).join(' '));
  const two = (x: number) => fixed(x, 2);

  // Boron.
  const boron = value(unity, 'B2O3');
  const thin = value(unity, 'Al2O3') < 0.15 || value(unity, 'SiO2') < 2;
  if (low !== false && boron >= 0.8 && !already((u) => value(u, 'B2O3'), 0.8)) {
    say(
      translate('recipe.checks.boronLowFire', { boron: two(boron) }),
      sure(
        boron,
        thin ? 0.8 : 1.0,
        translate('recipe.checks.boronLowFireProbably'),
        translate('recipe.checks.boronLowFireTends')
      ),
      translate('recipe.checks.boronLowFireEffects')
    );
  } else if (low === false && boron >= 0.33 && !already((u) => value(u, 'B2O3'), 0.33)) {
    say(
      translate('recipe.checks.boronMidFire', { boron: two(boron), high: two(0.33) }),
      sure(boron, 0.4, translate('recipe.checks.boronMidFireProbably'), translate('recipe.checks.boronMidFireTends')),
      translate('recipe.checks.boronMidFireFix')
    );
  }

  // Too little boron to melt at low fire: Katz's rule for the firing.
  if (low && celsius !== undefined && boron < 0.8 * boronFor(celsius)) {
    say(
      translate('recipe.checks.boronShort', { boron: two(boron), needed: two(boronFor(celsius)) }),
      translate('recipe.checks.boronShortEffects')
    );
  }

  // Alumina, low or high.
  const alumina = value(unity, 'Al2O3');
  const [aluminaCaution, aluminaLikely] = low === false ? [0.25, 0.2] : [0.15, 0.1];
  if (alumina > 0 && alumina < aluminaCaution && !already((u) => -value(u, 'Al2O3'), -aluminaCaution)) {
    say(
      translate('recipe.checks.aluminaLow', { alumina: two(alumina) }),
      sure(
        -alumina,
        -aluminaLikely,
        translate('recipe.checks.aluminaLowProbably'),
        translate('recipe.checks.aluminaLowTends')
      ),
      translate('recipe.checks.aluminaLowFix')
    );
  }
  const ratio = alumina > 0 ? value(unity, 'SiO2') / alumina : Infinity;
  if (ratio < 5 && !(old && value(old, 'Al2O3') > 0 && value(old, 'SiO2') / value(old, 'Al2O3') < 5)) {
    say(
      translate('recipe.checks.aluminaHigh', { ratio: fixed(ratio, 1) }),
      translate('recipe.checks.aluminaHighEffects'),
      low ? translate('recipe.checks.aluminaHighLowFire') : '',
      translate('recipe.checks.aluminaHighFix')
    );
  }

  // Boron blue.
  const pink = hasColorant(additives, /pink/i, []);
  if (
    boron > 0.5 &&
    value(unity, 'CaO') > 0.5 &&
    alumina < 0.2 &&
    !(old && value(old, 'B2O3') > 0.5 && value(old, 'CaO') > 0.5 && value(old, 'Al2O3') < 0.2)
  ) {
    say(
      translate('recipe.checks.boronBlue'),
      pink ? translate('recipe.checks.boronBlueFixPink') : translate('recipe.checks.boronBlueFix')
    );
  }

  // Soda and potash.
  const alkali = KNAO(unity);
  const [alkaliCaution, alkaliLikely] = low === false ? [0.3, 0.4] : [0.35, 0.5];
  if (alkali > alkaliCaution && !already(KNAO, alkaliCaution)) {
    say(
      translate('recipe.checks.alkali', { alkali: two(alkali) }),
      sure(alkali, alkaliLikely, translate('recipe.checks.alkaliProbably'), translate('recipe.checks.alkaliTends')),
      translate('recipe.checks.alkaliFix')
    );
  }

  // Magnesia at low fire.
  const magnesia = value(unity, 'MgO');
  if (low && magnesia > 0.1 && !already((u) => value(u, 'MgO'), 0.1)) {
    say(
      translate('recipe.checks.magnesia', { magnesia: two(magnesia) }),
      sure(magnesia, 0.3, translate('recipe.checks.magnesiaProbably'), translate('recipe.checks.magnesiaTends')),
      translate('recipe.checks.magnesiaNote')
    );
  }

  // Zinc with colorants, and below cone 03.
  const zinc = value(unity, 'ZnO');
  if (zinc >= 0.02 && !already((u) => value(u, 'ZnO'), 0.02)) {
    if (hasColorant(additives, /chrom|pink/i, ['Cr2O3'])) {
      warnings.push(translate('recipe.checks.zincChrome'));
    }
    if (hasColorant(additives, /iron|ochre/i, ['Fe2O3', 'FeO'])) {
      warnings.push(translate('recipe.checks.zincIron'));
    }
    if (hasColorant(additives, /copper/i, ['CuO'])) {
      warnings.push(translate('recipe.checks.zincCopper'));
    }
    if (celsius !== undefined && celsius < ZINC_MELTS_FROM) {
      warnings.push(translate('recipe.checks.zincLowFire', { zinc: two(zinc) }));
    }
  }

  // Materials: raw whiting at low fire, fluorspar, kaolin, soluble ones, frits doing the wrong job.
  const total = input.lines.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const percent = (amount: string | number | undefined) => (total > 0 ? (100 * amountOf(amount)) / total : 0);
  const rawCalcium = input.lines.filter((line) => /^(whiting|dolomite)$/i.test(line.material.name));
  const rawShare = rawCalcium.reduce((sum, line) => sum + percent(line.amount), 0);
  if (low && rawShare > 5) {
    say(
      translate('recipe.checks.whiting'),
      sure(
        rawShare,
        10,
        translate('recipe.checks.whitingProbably', { percent: fixed(rawShare, 0) }),
        translate('recipe.checks.whitingTends', { percent: fixed(rawShare, 0) })
      ),
      translate('recipe.checks.whitingFix')
    );
  }
  for (const line of input.lines) {
    if (line.material.fluorine && amountOf(line.amount) > 0) {
      warnings.push(translate('recipe.checks.fluorine', { name: line.material.name }));
    }
  }
  const clay = input.lines
    .filter((line) => line.material.category === 'clay' && !/calcined/i.test(line.material.name))
    .reduce((sum, line) => sum + percent(line.amount), 0);
  const clayWas = input.oldClay;
  if (clay < 5 && (clayWas === undefined || clayWas >= 5)) {
    const how =
      clay > 0
        ? clayWas !== undefined
          ? translate('recipe.checks.clayLowWas', { clay: fixed(clay, 0), was: fixed(clayWas, 0) })
          : translate('recipe.checks.clayLow', { clay: fixed(clay, 0) })
        : clayWas !== undefined
          ? translate('recipe.checks.clayNoneWas', { was: fixed(clayWas, 0) })
          : translate('recipe.checks.clayNone');
    say(how, translate('recipe.checks.clayLowFix'));
  }
  if (clay > 20) {
    say(
      translate('recipe.checks.clayHigh', { clay: fixed(clay, 0) }),
      sure(clay, 25, translate('recipe.checks.clayHighProbably'), translate('recipe.checks.clayHighTends')),
      translate('recipe.checks.clayHighFix')
    );
  }
  for (const line of input.lines) {
    if (line.material.soluble && amountOf(line.amount) > 0) {
      warnings.push(translate('recipe.checks.soluble', { name: line.material.name }));
    }
  }
  const main = [...input.lines].sort((p, q) => amountOf(q.amount) - amountOf(p.amount))[0];
  const role = main?.material.fritRole;
  if (role === 'boron') {
    warnings.push(translate('recipe.checks.boronFrit'));
  } else if (role === 'low-expansion') {
    warnings.push(translate('recipe.checks.lowExpansionFrit'));
  } else if (role === 'alkali') {
    warnings.push(translate('recipe.checks.alkaliFrit'));
  }

  // Expansion against the old recipe: crazing or shivering.
  const was = input.expansion?.was ?? null;
  const now = input.expansion?.now ?? null;
  if (was !== null && now !== null) {
    if (now > was + 0.2) {
      say(
        translate('recipe.checks.expansionRises', { was: fixed(was, 1), now: fixed(now, 1) }),
        now > was + 0.5
          ? translate('recipe.checks.expansionRisesProbably')
          : translate('recipe.checks.expansionRisesMay'),
        translate('recipe.checks.expansionRisesFix')
      );
    } else if (now < was - 0.5) {
      say(
        translate('recipe.checks.expansionFalls', { was: fixed(was, 1), now: fixed(now, 1) }),
        now < was - 1
          ? translate('recipe.checks.expansionFallsProbably')
          : translate('recipe.checks.expansionFallsCan'),
        translate('recipe.checks.expansionFallsTest')
      );
    }
  }
  return warnings;
}

/**
 * Notes on the recipe's size and small amounts: many materials to buy and
 * weigh, or an amount too small to weigh well in a test batch.
 */
export function sizeNotes(
  lines: Array<{ material: Material; amount: string | number | undefined }>,
  low?: boolean
): string[] {
  const used = lines.filter((line) => amountOf(line.amount) > 0);
  const total = used.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const notes: string[] = [];
  const many = low ? 7 : 8;
  if (used.length >= many) {
    notes.push(translate('recipe.checks.manyMaterials', { count: used.length }));
  }
  for (const line of used) {
    const percent = (100 * amountOf(line.amount)) / total;
    if (percent < 1) {
      notes.push(
        translate('recipe.checks.smallAmount', {
          name: line.material.name,
          percent: fixed(percent, 1),
          reads: fixed(0.1, 1)
        })
      );
    }
  }
  return notes;
}

/** Raw (not calcined) clay as a percent of the batch. */
export function rawClayPercent(lines: Array<{ category?: string; name: string; amount?: string | number }>): number {
  const total = lines.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const clay = lines
    .filter((line) => line.category === 'clay' && !/calcined/i.test(line.name))
    .reduce((sum, line) => sum + amountOf(line.amount), 0);
  return total > 0 ? (100 * clay) / total : 0;
}

/** "potash, soda": oxide names for a list. */
export const oxideNames = (oxides: string[]): string => listOf(oxides.map(oxideName));
