import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import {
  ApproxBasis,
  ConeScale,
  FiringBlock,
  approxCelsius,
  approxCone,
  cleanFiring,
  coneLabel,
  ordinal,
  testedCones
} from '../../../../lib/cones/firing';
import type { ConeSystem, TemperatureScale } from '../../core/preferences.service';
import { formatTemperature, listOf, upTo } from '../../shared/format';

// A recipe's firing block in words (docs/adr/0021-recipe-firing.md): the
// tested cone first, the claimed range after it, the atmosphere and process,
// and beside it an approximate conversion into the reader's own scale, always
// labelled approximate and saying what it rests on. The cone itself is shown
// exactly as the author gave it, in the author's scale.

/** How the reader fires: their cone system and temperature scale (LocaleService). */
export interface Reader {
  cones: ConeSystem;
  temperature: TemperatureScale;
}

export const ATMOSPHERE_NAMES: Record<string, string> = {
  oxidation: marker('recipe.firing.atmospheres.oxidation'),
  reduction: marker('recipe.firing.atmospheres.reduction'),
  neutral: marker('recipe.firing.atmospheres.neutral'),
  wood: marker('recipe.firing.processes.wood'),
  soda: marker('recipe.firing.processes.soda'),
  salt: marker('recipe.firing.processes.salt'),
  raku: marker('recipe.firing.processes.raku'),
  pit: marker('recipe.firing.processes.pit')
};

const BASIS: Record<ApproxBasis, string> = {
  'orton-150': marker('recipe.firing.basis.orton150'),
  kyoto: marker('recipe.firing.basis.kyoto'),
  stated: marker('recipe.firing.basis.stated')
};

const SPAN = { orton: marker('recipe.firing.span.orton'), sk: marker('recipe.firing.span.sk') };
const CLAIMED = marker('recipe.firing.claimedRange');
const UNTESTED = marker('recipe.firing.rangeUntested');

/** One cone in its own scale: "cone 06", "cone 5½", "SK 6a", "1240 °C". */
export function coneText(scale: ConeScale, cone: string, reader: Reader): string {
  if (scale === 'temperature') return formatTemperature(Number(cone), reader.temperature);
  if (scale === 'sk') return translate('recipe.firing.one.sk', { cone: coneLabel(cone) });
  return translate('recipe.firing.one.orton', { cone: coneLabel(cone) });
}

/** A range in its own scale: "cone 6–10", "SK 8–10", "1220 °C to 1260 °C"; one cone when there is no high one. */
export function rangeText(scale: ConeScale, low: string, high: string | undefined, reader: Reader): string {
  if (!high || high === low) return coneText(scale, low, reader);
  if (scale === 'temperature') {
    return translate('recipe.firing.span.temperature', {
      low: coneText(scale, low, reader),
      high: coneText(scale, high, reader)
    });
  }
  return translate(SPAN[scale], {
    low: coneLabel(low),
    high: coneLabel(high)
  });
}

/** The atmospheres and processes named: "oxidation, reduction, wood". */
export function atmosphereText(block: FiringBlock): string {
  const names = [...(block.atmospheres ?? []), ...(block.processes ?? [])].map((a) => translate(ATMOSPHERE_NAMES[a]));
  return names.length ? listOf(names, 'unit') : '';
}

/** A temperature difference in the reader's scale: 60 °C is 108 °F. */
const rateText = (perHour: number, scale: TemperatureScale): string =>
  upTo(scale === 'F' ? (perHour * 9) / 5 : perHour, 0) + ' °' + scale;

/** The schedule: rate over the last hour, the hold, the note, a witness cone. */
export function scheduleText(block: FiringBlock, reader: Reader): string {
  const parts: string[] = [];
  if (block.rate !== undefined) {
    parts.push(translate('recipe.firing.rateText', { rate: rateText(block.rate, reader.temperature) }));
  }
  if (block.hold !== undefined) parts.push(translate('recipe.firing.holdText', { minutes: block.hold }));
  if (block.schedule) parts.push(block.schedule);
  if (block.witness) parts.push(translate('recipe.firing.witnessText'));
  return parts.join('; ');
}

/** Whether figures run low to high, so a range is never shown out of order. */
const inOrder = (values: number[]): boolean => values.every((v, i) => i === 0 || v >= values[i - 1]!);

/**
 * The approximate conversion beside the original, or '': the temperature
 * (for a cone) and, when the reader fires to another cone system, the nearest
 * fair cone in it. Each part says what it rests on. A range is converted
 * only when both ends have a figure and they run in order; otherwise that
 * part is left out rather than shown half or backwards.
 */
export function conversionText(block: FiringBlock, reader: Reader): string {
  if (!block.low) return '';
  const ends = [block.low, ...(block.high && block.high !== block.low ? [block.high] : [])];
  const parts: string[] = [];
  if (block.scale !== 'temperature') {
    const temps = ends.map((cone) => approxCelsius(block.scale, cone));
    if (temps.every((t) => t !== null) && inOrder(temps.map((t) => t!.celsius))) {
      const text = temps.map((t) => formatTemperature(t!.celsius, reader.temperature)).join('–');
      const bases = [...new Set(temps.map((t) => translate(BASIS[t!.basis])))];
      parts.push(translate('recipe.firing.approxTemperature', { temperature: text, basis: listOf(bases, 'unit') }));
    }
  }
  if (reader.cones !== 'temperature' && reader.cones !== block.scale) {
    const cones = ends.map((cone) => approxCone(block.scale, cone, reader.cones));
    if (cones.every((c) => c !== null) && inOrder(cones.map((c) => ordinal(reader.cones as ConeScale, c!.cone)))) {
      const named = [...new Set(cones.map((c) => c!.cone))];
      const text = rangeText(reader.cones, named[0]!, named[1], reader);
      const bases = [...new Set(cones.map((c) => translate(BASIS[c!.basis])))];
      parts.push(translate('recipe.firing.approxCone', { cone: text, basis: listOf(bases, 'unit') }));
    }
  }
  return parts.join(' ');
}

/** A block's parts in words, for the editor's summary, the saved list, the mix ticket and the shared page. */
export interface FiringWords {
  /** The tested cones, most prominent: "Tested at cone 6". '' when none is. */
  tested: string;
  /** The claimed range (or single cone) when the tested line does not say it all. */
  range: string;
  atmospheres: string;
  schedule: string;
  /** The approximate conversion into the reader's scale. */
  conversion: string;
}

export function firingWords(block: FiringBlock | null | undefined, reader: Reader): FiringWords | null {
  const clean = cleanFiring(block);
  if (!clean) return null;
  const tested = testedCones(clean);
  const testedText = tested.length
    ? translate('recipe.firing.testedAt', {
        cones: listOf(
          tested.map((cone) => coneText(clean.scale, cone, reader)),
          'unit'
        )
      })
    : '';
  const ranged = !!clean.high;
  const range = clean.low
    ? ranged
      ? translate(tested.length ? CLAIMED : UNTESTED, {
          range: rangeText(clean.scale, clean.low, clean.high, reader)
        })
      : ''
    : '';
  return {
    tested: testedText,
    range,
    atmospheres: atmosphereText(clean),
    schedule: scheduleText(clean, reader),
    conversion: conversionText(clean, reader)
  };
}

/** The firing on one line, for a list: "Tested at cone 6 · claimed cone 5–7 · oxidation". */
export function firingLine(block: FiringBlock | null | undefined, reader: Reader): string {
  const words = firingWords(block, reader);
  if (!words) return '';
  return [words.tested, words.range, words.atmospheres].filter(Boolean).join(' · ');
}

/**
 * The firing in a few words, for the folded firing part's summary: "Firing: cone 6, oxidation",
 * "Firing: cone 5–7"; "Firing: not set" when the block says nothing.
 */
export function firingSummary(block: FiringBlock | null | undefined, reader: Reader): string {
  const clean = cleanFiring(block);
  const cone = clean?.low ? rangeText(clean.scale, clean.low, clean.high, reader) : '';
  const parts = [cone, clean ? atmosphereText(clean) : ''].filter(Boolean);
  return parts.length
    ? translate('recipe.firing.summary', { what: parts.join(', ') })
    : translate('recipe.firing.summaryNone');
}
