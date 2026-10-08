import { boronFor } from '../../../../lib/chemistry';
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
  const strength = (x: number, likely: number) => (x >= likely ? 'will probably' : 'tends to');
  const fixed = (x: number) => x.toFixed(2);

  // Boron.
  const boron = value(unity, 'B2O3');
  const thin = value(unity, 'Al2O3') < 0.15 || value(unity, 'SiO2') < 2;
  if (low !== false && boron >= 0.8 && !already((u) => value(u, 'B2O3'), 0.8)) {
    const s = strength(boron, thin ? 0.8 : 1.0);
    warnings.push(
      `This has more boron (${fixed(boron)}) than most cone 06-04 glazes. It ${s} melt early and run, so leave a wider foot; it may pinhole or blister, turn milky blue-white where thick, and wear less well. More kaolin and silica steady it.`
    );
  } else if (low === false && boron >= 0.33 && !already((u) => value(u, 'B2O3'), 0.33)) {
    const s = strength(boron, 0.4);
    warnings.push(
      `This is a lot of boron for cone 6 (${fixed(boron)}; industry counts 0.33 as high). Glazes like this ${s} run, go milky or streaky, and may craze or wear less well. Use just enough boron to melt; kaolin and silica steady it.`
    );
  }

  // Too little boron to melt at low fire: Katz's rule for the firing.
  if (low && celsius !== undefined && boron < 0.8 * boronFor(celsius)) {
    warnings.push(
      `This has less boron (${fixed(boron)}) than glazes usually need at this firing (about ${fixed(boronFor(celsius))}). It may not melt fully, coming out stiff, dry or pinholed. Test it; if it is underfired, a hotter firing or a little more base frit helps.`
    );
  }

  // Alumina, low or high.
  const alumina = value(unity, 'Al2O3');
  const [aluminaCaution, aluminaLikely] = low === false ? [0.25, 0.2] : [0.15, 0.1];
  if (alumina > 0 && alumina < aluminaCaution && !already((u) => -value(u, 'Al2O3'), -aluminaCaution)) {
    const s = alumina <= aluminaLikely ? 'will probably' : 'tends to';
    warnings.push(
      `There is very little alumina here (${fixed(alumina)}). It ${s} be a glossy glaze that runs, may grow crystals or cloud as it cools, and is softer and less durable. More kaolin, or a frit with more alumina, usually fixes it.`
    );
  }
  const ratio = alumina > 0 ? value(unity, 'SiO2') / alumina : Infinity;
  if (ratio < 5 && !(old && value(old, 'Al2O3') > 0 && value(old, 'SiO2') / value(old, 'Al2O3') < 5)) {
    warnings.push(
      `There is a lot of alumina for the silica (silica to alumina ${ratio.toFixed(1)}:1). It may not melt fully and can come out dry or matte, with pinholes or bare patches${low ? '; at cone 06-02 a matte like this is often under-melted, so test it before using it for food' : ''}. More flux or less kaolin brings back the gloss.`
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
    warnings.push(
      `Lots of calcium with lots of boron tends to go milky blue-white where the glaze pools ("boron blue"). ${pink ? 'More kaolin or faster cooling' : 'Less calcium, more kaolin or faster cooling'} usually clears it.`
    );
  }

  // Soda and potash.
  const alkali = KNAO(unity);
  const [alkaliCaution, alkaliLikely] = low === false ? [0.3, 0.4] : [0.35, 0.5];
  if (alkali > alkaliCaution && !already(KNAO, alkaliCaution)) {
    warnings.push(
      `This has a lot of soda and potash (${fixed(alkali)}). Colours will be bright (copper turns turquoise), but it ${strength(alkali, alkaliLikely)} craze, sometimes weeks later, and has a softer surface that can leach: fine for decorative pieces, not for food surfaces. Trading some for calcium, magnesium, boron or lithium reduces crazing.`
    );
  }

  // Magnesia at low fire.
  const magnesia = value(unity, 'MgO');
  if (low && magnesia > 0.1 && !already((u) => value(u, 'MgO'), 0.1)) {
    warnings.push(
      `Magnesia (${fixed(magnesia)}) does not melt at cone 06-04. It ${strength(magnesia, 0.3)} make the glaze stiffer, more matte and opaque, and can make it crawl; it mutes chrome-tin pinks, though it does help against crazing.`
    );
  }

  // Zinc with colorants, and below cone 03.
  const zinc = value(unity, 'ZnO');
  if (zinc >= 0.02 && !already((u) => value(u, 'ZnO'), 0.02)) {
    if (hasColorant(additives, /chrom|pink/i, ['Cr2O3'])) {
      warnings.push(
        'Zinc turns chrome greens brown and spoils chrome-tin pinks; Mason says no zinc with these stains. Leave the zinc out, or use a stain made for zinc glazes.'
      );
    }
    if (hasColorant(additives, /iron|ochre/i, ['Fe2O3', 'FeO'])) {
      warnings.push('Zinc can muddy iron colours. For clean ambers and honey browns, test a version without zinc.');
    }
    if (hasColorant(additives, /copper/i, ['CuO'])) {
      warnings.push('Zinc shifts copper colour, often bluer or brighter rather than green. Test before relying on it.');
    }
    if (celsius !== undefined && celsius < ZINC_MELTS_FROM) {
      warnings.push(
        `Below about cone 03, zinc (${fixed(zinc)}) does little melting. It may crawl or pinhole and give a matte or crystal surface; calcined zinc crawls less.`
      );
    }
  }

  // Materials: raw whiting at low fire, fluorspar, kaolin, soluble ones, frits doing the wrong job.
  const total = input.lines.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const percent = (amount: string | number | undefined) => (total > 0 ? (100 * amountOf(amount)) / total : 0);
  const rawCalcium = input.lines.filter((line) => /^(whiting|dolomite)$/i.test(line.material.name));
  const rawShare = rawCalcium.reduce((sum, line) => sum + percent(line.amount), 0);
  if (low && rawShare > 5) {
    warnings.push(
      `Whiting barely melts at cone 06-04 and gives off gas as it breaks down. At ${rawShare.toFixed(0)}% it ${strength(rawShare, 10)} pinhole or blister and come out dry, matte or chalky. Calcium from a frit or from wollastonite avoids both. (5% is this app's guideline; no published limit gives one.)`
    );
  }
  if (input.lines.some((line) => line.material.fluorine && amountOf(line.amount) > 0)) {
    warnings.push(
      'Fluorspar and cryolite release fluorine as they fire. Vent the kiln well, or take the calcium or soda from a frit or wollastonite.'
    );
  }
  const clay = input.lines
    .filter((line) => line.material.category === 'clay' && !/calcined/i.test(line.material.name))
    .reduce((sum, line) => sum + percent(line.amount), 0);
  const clayWas = input.oldClay;
  if (clay < 5 && (clayWas === undefined || clayWas >= 5)) {
    warnings.push(
      `This has ${clay > 0 ? `only ${clay.toFixed(0)}%` : 'no'} raw clay${clayWas !== undefined ? ` (the old recipe had ${clayWas.toFixed(0)}%)` : ''}. Without clay a glaze settles hard in the bucket and dusts off the pot before firing. Add 1-2% bentonite to keep it suspended, or keep some clay and accept a slightly different match.`
    );
  }
  if (clay > 20) {
    warnings.push(
      `Over 20% raw clay (${clay.toFixed(0)}%) shrinks a lot as the glaze dries. It ${strength(clay, 25)} crack on the pot and crawl into bare patches in the kiln. Swap part of it for calcined kaolin (about 12% less by weight), keeping about 15-20% raw so the glaze stays suspended.`
    );
  }
  for (const line of input.lines) {
    if (line.material.soluble && amountOf(line.amount) > 0) {
      warnings.push(
        `${line.material.name} dissolves in water, which makes it a poor glaze material: it soaks into the pot and changes as the glaze stands. Frits carry the same oxides without dissolving.`
      );
    }
  }
  const main = [...input.lines].sort((p, q) => amountOf(q.amount) - amountOf(p.amount))[0];
  const role = main?.material.fritRole;
  if (role === 'boron') {
    warnings.push(
      'A calcium borate frit is normally a small boron top-up, not a base (one seller says 10% at most). As the main frit, expect a runny glaze that may turn milky or blue-white and grow crystals in the bucket. Use a borosilicate base frit and keep this one small.'
    );
  } else if (role === 'low-expansion') {
    warnings.push(
      'Low-expansion frits are craze cures, used at about 5-10%. As the main frit the glaze may not melt fully at cone 06-02 and can look dull; where it does melt, it may shiver, throwing sharp flakes off rims.'
    );
  } else if (role === 'alkali') {
    warnings.push(
      'A high-alkaline frit as the main flux gives bright colour but a soft, fluid glaze that crazes on almost any clay: good for crackle and raku, not for food surfaces.'
    );
  }

  // Expansion against the old recipe: crazing or shivering.
  const was = input.expansion?.was ?? null;
  const now = input.expansion?.now ?? null;
  if (was !== null && now !== null) {
    if (now > was + 0.2) {
      warnings.push(
        `Its calculated expansion rises from ${was.toFixed(1)} to ${now.toFixed(1)}. If the old glaze only just fitted your clay, this one ${now > was + 0.5 ? 'will probably' : 'may'} craze, sometimes weeks later; crazing weakens pots and is not advised on food surfaces. Less soda and potash, or more boron, silica or alumina, brings it down.`
      );
    } else if (now < was - 0.5) {
      warnings.push(
        `Its calculated expansion falls from ${was.toFixed(1)} to ${now.toFixed(1)}. A little lower usually resists crazing better; much lower ${now < was - 1 ? 'will probably' : 'can'} shiver, with sharp flakes off rims and edges. Test it on your own clay.`
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
    notes.push(
      `This recipe has ${used.length} base materials. Most published glazes have 4 to 6, and fewer than 1 in 25 have 8 or more; each one is another material to buy, store and weigh.`
    );
  }
  for (const line of used) {
    const percent = (100 * amountOf(line.amount)) / total;
    if (percent < 1) {
      notes.push(
        `${line.material.name} is ${percent.toFixed(1)}% of the batch, ${percent.toFixed(1)} g in a 100 g test: weigh it on a scale that reads 0.1 g or better, or leave it out.`
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
export const oxideNames = (oxides: string[]): string => oxides.map(oxideName).join(', ');
