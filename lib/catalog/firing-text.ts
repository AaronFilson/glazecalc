// Firings and cones read from text (docs/adr/0030-nameless-chemistry-core.md): a pasted recipe's firing line,
// a typed cone, a firing log's cone columns, and Glazy's names for a firing. Each takes the host, whose cone
// charts say which cones there are; Glazecalc binds its own (lib/cones/firing.js).

import { ATMOSPHERES, SCALES, cleanFiring, compareCones, isCone } from '../core/cones/firing.ts';
import type { Atmosphere, ConeScale, FiringBlock, FiringProcess } from '../core/cones/firing.ts';
import type { Host } from '../core/host.ts';
import { plainDigits, separators } from './numbers.ts';
import type { DecimalMark } from './numbers.ts';

/** How text is read: "6,5" is a half cone only when the reader writes decimal commas and it is the one number. */
export interface ReadOptions {
  decimalComma?: boolean;
}

/** What a line says about the firing. */
export interface ReadFiring {
  scale?: ConeScale;
  low?: string;
  high?: string;
  atmospheres?: Atmosphere[];
  processes?: FiringProcess[];
  /** The line names an SK cone the chart does not have (SK 26): kept in the notes, not read. */
  unknown?: true;
  /** The line is nothing but a firing. */
  whole: boolean;
}

/** readFiring, with whether it rests on more than a bare number or weak words, and whether it names a bisque. */
interface FiringDetail extends ReadFiring {
  clear: boolean;
  bisque?: true;
}

/** A firing log as conesFromLog reads it: its columns and rows. */
export interface FiringLog {
  fieldsIncluded?: readonly unknown[];
  rows?: readonly unknown[];
}

const isAtmosphere = (name: string): name is Atmosphere => (ATMOSPHERES as readonly string[]).includes(name);

/** A cone as it is shown: 5.5 is 5½. */
const coneLabel = (cone: string | null | undefined): string => String(cone ?? '').replace(/\.5$/, '½');

// Glazy's names (its data export's "Atmospheres" list and "Cone" string).
const GLAZY_ATMOSPHERES: Readonly<Record<Atmosphere | FiringProcess, string>> = { oxidation: 'Oxidation', reduction: 'Reduction', neutral: 'Neutral', wood: 'Wood', soda: 'Soda', salt: 'Salt', raku: 'Raku', pit: 'Pit' }; // prettier-ignore

/**
 * A block as Glazy's export writes a firing: "Cone" as a string ("6",
 * "9 - 10"; SK and temperatures as "SK 8" and "1240°C", which Glazy's Orton
 * field cannot hold), and "Atmospheres" as a list.
 */
function glazyFiring(host: Host, block: FiringBlock | null | undefined): { cone: string; atmospheres: string[] } {
  const clean = cleanFiring(host, block);
  if (!clean) return { cone: '', atmospheres: [] };
  const one = (c: string) => (clean.scale === 'sk' ? 'SK ' + c : clean.scale === 'temperature' ? c + '°C' : c);
  const cone = clean.low ? one(clean.low) + (clean.high ? ' - ' + one(clean.high) : '') : '';
  const atmospheres = [...(clean.atmospheres ?? []), ...(clean.processes ?? [])].map((a) => GLAZY_ATMOSPHERES[a]);
  return { cone, atmospheres };
}

/**
 * The CSV's "Cone" cell: Glazy's string, with each Orton cone marked by the
 * cone sign ("Δ06", "Δ9 - Δ10"). A spreadsheet reads a bare 06 as the number
 * 6 and drops its zero, which makes cone 06 (about 1000 °C) read as cone 6
 * (about 1220 °C); with the sign it stays text, exactly as written. Glazy
 * shows its cones with the same sign, and a reader of Glazy's strings needs
 * only to drop it (Glazecalc's paste-in reads "Δ06" as it is). SK cones and
 * temperatures ("SK 8", "1240°C") are text already.
 */
function glazyConeCell(host: Host, block: FiringBlock | null | undefined): string {
  const clean = cleanFiring(host, block);
  if (!clean?.low) return '';
  if (clean.scale !== 'orton') return glazyFiring(host, clean).cone;
  return 'Δ' + clean.low + (clean.high ? ' - Δ' + clean.high : '');
}

// Reading a firing from pasted text: "Cone 6 ox", "^6", "C/6", "Δ6", "cone 5-6",
// "SK8", "1240°C", "06", "6½", "ox/red".

const NUM = '(0\\d{1,2}|\\d{1,2}(?:\\.5)?)';
// A whole cone written with a point and zeros ("Cone 6.0", "cone 10.00"): the cone.
const POINT_ZERO = '(?:\\.0+(?!\\d))?';
const TO = '\\s*(?:-|–|—|~|/|to)\\s*';
// "sk", spaces, then a dash and spaces if any: written so a long run of spaces is not tried two ways.
const SK_SEP = '\\s*(?:-\\s*)?';
const SK_RE = new RegExp(`\\bsk${SK_SEP}(0?\\d{1,2}a?)(?:${TO}(?:sk${SK_SEP})?(0?\\d{1,2}a?))?(?![\\d.])`, 'u');
const ORTON_RE = new RegExp(
  `(?:\\b(?:orton\\s+)?cones?\\s*|\\bc\\s*/\\s*|\\^\\s*|[δ△∆]\\s*|\\bc(?=\\d))${NUM}${POINT_ZERO}(?:${TO}(?:cones?\\s*|c\\s*/\\s*|\\^\\s*|[δ△∆]\\s*)?${NUM}${POINT_ZERO})?(?![\\d]|\\.\\d)`,
  'u'
);
// A list of cones, "cone 4,5" or "cone 4, 5, 6": each cone listed, never a decimal ("4,5" is not 4½ here).
const CONE_PREFIX = '(?:cones?\\s*|c\\s*/\\s*|\\^\\s*|[δ△∆]\\s*)';
const NUM_ANY = '(?:0\\d{1,2}|\\d{1,2}(?:\\.5)?)';
const ORTON_LIST_RE = new RegExp(
  `(?:\\b(?:orton\\s+)?cones?\\s*|\\bc\\s*/\\s*|\\^\\s*|[δ△∆]\\s*|\\bc(?=\\d))(${NUM_ANY}(?:\\s*,\\s*${CONE_PREFIX}?${NUM_ANY})+)(?![\\d.])`,
  'u'
);
const SK_LIST_RE = /\bsk\s*(?:-\s*)?(0?\d{1,2}a?(?:\s*,\s*(?:sk\s*(?:-\s*)?)?0?\d{1,2}a?)+)(?![\d.])/u;
const BARE_RE = new RegExp(`^${NUM}(?:${TO}${NUM})?(?=\\s|$|,)`, 'u');
// A temperature, with a thousands separator or not ("1240°C", "1,945°F", "1.240°C"; "1240ºC" is read as "1240°C").
const DEGREES = '(?:[1-9][,.]\\d{3}(?!\\d)|[1-9]\\d{2,3})';
const TEMP_RE = new RegExp(`(?<![\\d.,])(${DEGREES}|\\d{3,4})\\s*(?:°|deg(?:rees)?)\\s*([cf])\\b`, 'gu');
// A range of temperatures, "1220-1260°C", "1220°C-1260°C", "1220°-1260°C", "1220 to 1260 deg C": the unit at its
// end, or at both.
const TEMP_RANGE_RE = new RegExp(
  `(?<![\\d.,])(${DEGREES})\\s*(?:(?:°|deg(?:rees)?)(?:\\s*([cf]))?\\s*)?(?:-|–|—|~|to)\\s*(${DEGREES})\\s*(?:°|deg(?:rees)?)\\s*([cf])\\b`,
  'u'
);
// A bisque firing named on the line, with its cone, temperature or range of either beside the word ("Bisque to
// cone 04", "Bisque: ^06-^04", "cone 04 bisque", "bisque 1000-1040°C"): not the glaze's firing, so not read into
// it. Its own is the one after the word, with a colon, an equals sign, an at sign, a bracket or a dash between
// them, or none ("Glaze: cone 6 Bisque: cone 04"); the one before the word only when none follows it ("Cone 04
// bisque, cone 6 glaze"). Taken out in that order (readFiringDetail), so a glaze's cone before the word stays.
const BISQUE_CONE =
  '(?:(?:orton\\s+)?cones?\\s*|\\^\\s*|[δ△∆]\\s*|c\\s*/\\s*|sk\\s*(?:-\\s*)?)?0?\\d{1,2}(?:\\.5|a)?(?!\\d|\\.\\d)';
const BISQUE_DEGREES = '(?:°|deg(?:rees)?)';
const BISQUE_AT =
  `(?:${BISQUE_CONE}(?:\\s*(?:-|–|—|~|to)\\s*${BISQUE_CONE})?` +
  `|\\d{3,4}(?:\\s*${BISQUE_DEGREES}(?:\\s*[cf])?)?\\s*(?:-|–|—|~|to)\\s*\\d{3,4}\\s*${BISQUE_DEGREES}\\s*[cf]\\b` +
  `|\\d{3,4}\\s*${BISQUE_DEGREES}\\s*[cf]\\b)`;
const BISQUE_WORD = '\\bbisqu(?:e|ed|ing)\\b(?:\\s*\\b(?:fired|firing|fire|to|at|in)\\b)*';
// The bisque's atmosphere, after its cone or its word ("Bisque cone 04 oxidation", "Bisque in oxidation"): not
// the glaze's either.
const BISQUE_AIR =
  '(?:\\s*(?:,\\s*)?\\b(?:in\\s+)?(?:ox|oxi|oxid|oxidation|oxidi[sz]ing|oxidi[sz]ed|reduction|reduced|reducing|neutral)\\b\\.?)?';
const BISQUE_RES = [
  new RegExp(`${BISQUE_WORD}\\s*(?:[:=@(\\-–—]\\s*)?${BISQUE_AT}${BISQUE_AIR}`, 'gu'),
  new RegExp(`${BISQUE_AT}\\s*${BISQUE_WORD}${BISQUE_AIR}`, 'gu'),
  new RegExp(BISQUE_WORD + BISQUE_AIR, 'gu')
];
// Each word, and whether it is weak: "red", "wood", "soda", "salt" and "pit" mean a firing only on a line
// that names a cone, a temperature or another firing word, or is nothing but firing words ("ox/red"),
// so "a deep red" or "wood ash" in a note is not read as one.
const WORDS: ReadonlyArray<readonly [name: Atmosphere | FiringProcess, pattern: RegExp, weak: boolean]> = [
  ['oxidation', /\b(?:ox|oxi|oxid|oxidation|oxidi[sz]ing|oxidi[sz]ed)\b\.?/gu, false],
  ['reduction', /\b(?:reduction|reduced|reducing)\b/gu, false],
  ['reduction', /\bred\b\.?/gu, true],
  ['neutral', /\bneutral\b/gu, false],
  ['wood', /\bwood(?:[- ]?fired|[- ]?firing)\b/gu, false],
  ['wood', /\bwood\b(?![- ]?ash)/gu, true],
  ['soda', /\bsoda(?:[- ]?fired|[- ]?firing)\b/gu, false],
  ['soda', /\bsoda\b(?!\s*(?:ash|feldspar|spar|frit))/gu, true],
  ['salt', /\bsalt(?:[- ]?fired|[- ]?firing|[- ]?glazed)\b/gu, false],
  ['salt', /\bsalt\b/gu, true],
  ['raku', /\braku\b/gu, false],
  ['pit', /\bpit(?:[- ]?fired|[- ]?firing)\b/gu, false],
  ['pit', /\bpit\b/gu, true]
];
const FILLER =
  /\b(?:fired|firing|fire|to|then|atmosphere|kiln|in|or|and|at|glaze|glazed|temp|temperature)\b|[&/,;:()+.\-–—|]/gu;

/**
 * Whether a reader writes decimals with a comma, by the decimal-mark setting
 * ('either', 'comma' or 'point') and, for 'either', the locale.
 */
function readsDecimalComma(mark: DecimalMark = 'either', locale = 'en'): boolean {
  if (mark === 'comma') return true;
  if (mark === 'point') return false;
  return separators(locale).decimal === ',';
}

/**
 * Typed text as the reader matches it: half cones as .5, lowercase. "6,5" is
 * a half cone only for a reader who writes decimal commas and only when it is
 * the one number in the text; otherwise "4,5" is a list, cones 4 and 5.
 */
function textForCones(text: string, { decimalComma = false }: ReadOptions = {}): string {
  const typed = plainDigits(text)
    .replace(/(\d)\s*(?:½|1\s*\/\s*2)(?!\d)/g, '$1.5')
    // The masculine ordinal typed for the degree sign ("1240ºC"), before NFKC makes it an o.
    .replace(/(\d\s*)º/g, '$1°')
    .normalize('NFKC')
    .toLowerCase();
  const numbers = typed.match(/\d+(?:[.,]\d+)*/g) ?? [];
  return decimalComma && numbers.length === 1 && /^\d{1,2},5$/.test(numbers[0])
    ? typed.replace(/(\d),5\b/, '$1.5')
    : typed;
}

/**
 * An SK cone as its chart writes it, or null when the chart has none: JIS
 * R 8101 has one cone for each number, and from 015 to 6 it is the "a" cone,
 * so "SK6" can only mean SK 6a and "SK015" SK 015a. Never a guess past that:
 * a number the chart lacks (SK 26) is not read into the block, and the text
 * stays in the notes.
 */
function skCone(host: Host, token: unknown): string | null {
  const text = String(token ?? '').toLowerCase();
  if (host.cones.skOrder.has(text)) return text;
  if (!text.endsWith('a') && host.cones.skOrder.has(text + 'a')) return text + 'a';
  return null;
}

/**
 * What a line of text says about the firing: { scale, low, high, atmospheres,
 * processes } with whatever it found, and `whole` when the line is nothing
 * but a firing (so a paste can set it aside). Null when it says nothing. A
 * temperature alone is a temperature firing, never a guessed cone; °F is
 * kept as °C, to the degree.
 */
function readFiring(host: Host, line: string, options?: ReadOptions): ReadFiring | null {
  const found = readFiringDetail(host, line, options);
  if (!found) return null;
  // Without what only readFiringDetail's callers need: whether it is clear, and the bisque.
  const read: ReadFiring & { clear?: boolean; bisque?: true } = { ...found };
  delete read.clear;
  delete read.bisque;
  // A line that names only a bisque firing says nothing of the glaze's.
  if (!Object.keys(read).some((key) => key !== 'whole')) return null;
  return read;
}

/**
 * One cone of a scale as it is typed, as stored ('6', '06', '5.5', SK '6a'),
 * or null: a bare cone ("6", "06", "5½", "05 1/2"; for SK "6", which is 6a,
 * or "SK 8") or a cone written as paste-in reads one ("Cone 6", "^6", "Δ6",
 * "C/6", "Δ٦"). Only one cone of that scale: a range, a firing word or
 * another scale's cone ("SK 8" asked as Orton) is not one.
 */
function readCone(host: Host, text: unknown, scale: ConeScale = 'orton'): string | null {
  if (scale !== 'orton' && scale !== 'sk') return null;
  const typed = textForCones(String(text ?? '')).trim();
  const bare = typed.replace(scale === 'sk' ? /^(?:sk|cones?)\s*(?:-\s*)?/u : /^(?:orton\s+)?cones?\s*/u, '');
  const cone = scale === 'sk' ? skCone(host, bare) : bare;
  if (cone && isCone(host, scale, cone)) return cone;
  const found = readFiringDetail(host, typed);
  const one = found?.whole && found.scale === scale && found.low && !found.high;
  return one && !found.atmospheres && !found.processes && !found.bisque ? found.low! : null;
}

/**
 * Whether a line is nothing but a firing, and clearly one: a cone written as
 * a cone ("Cone 6", "C/6", "^6", "SK8"), a temperature, or a firing word that
 * means nothing else ("oxidation", "ox/red", "wood fired"). A number alone
 * ("06", "5.5") or a weak word alone ("Red", "Salt", "Wood", "Pit") is not:
 * the first may be an amount or a total, the second a recipe's name.
 */
function isFiringLine(host: Host, line: string, options?: ReadOptions): boolean {
  const found = readFiringDetail(host, line, options);
  return !!found && found.whole && found.clear;
}

/**
 * readFiring, with `clear`: whether it rests on more than a bare number or weak words. The whole line is read,
 * so a long note's firing is found wherever it is: every pattern takes time in step with the line's length.
 */
function readFiringDetail(host: Host, line: unknown, options?: ReadOptions): FiringDetail | null {
  let text = textForCones(String(line ?? '').trim(), options);
  const found: Partial<FiringDetail> = {};
  let clear = false;
  // A bisque firing and its cone (BISQUE_RES): the one after the word, then the one before it, then the word.
  for (const re of BISQUE_RES) {
    const rest = text.replace(re, ' ');
    if (rest !== text) found.bisque = true;
    text = rest;
  }
  const take = (match: RegExpMatchArray) => {
    text = text.replace(match[0], ' ');
  };
  const range = (scale: ConeScale, a: string | null | undefined, b?: string | null) => {
    if (!isCone(host, scale, a)) return false;
    found.scale = scale;
    found.low = a;
    if (b && isCone(host, scale, b) && b !== a) {
      [found.low, found.high] = compareCones(host, scale, a, b) < 0 ? [a, b] : [b, a];
    }
    return true;
  };
  // A list, "cone 4,5" or "SK 8, 10": the range from the lowest to the highest. Nothing is marked tested: a pasted recipe only states its cone.
  const list = (scale: ConeScale, match: RegExpMatchArray, read: (cone: string) => string | null) => {
    const cones = [...new Set(match[1]!.split(',').map((part) => read(part.replace(/^\D*/, '').trim())))]
      .filter((cone) => isCone(host, scale, cone))
      .sort((a, b) => compareCones(host, scale, a, b));
    if (!cones.length) return false;
    range(scale, cones[0], cones[cones.length - 1]);
    take(match);
    return true;
  };
  const skList = text.match(SK_LIST_RE);
  if (skList) list('sk', skList, (cone) => skCone(host, cone));
  const sk = !found.scale && text.match(SK_RE);
  if (sk) {
    // Written without its letter, "SK6" is the chart's SK 6a. A number the chart lacks is still an SK firing line.
    if (range('sk', skCone(host, sk[1]), skCone(host, sk[2]))) take(sk);
    else {
      found.unknown = true;
      clear = true;
      take(sk);
    }
  }
  if (!found.scale && !clear) {
    const ortonList = text.match(ORTON_LIST_RE);
    if (ortonList) list('orton', ortonList, (cone) => cone);
  }
  if (!found.scale && !clear) {
    const orton = text.match(ORTON_RE);
    if (orton && range('orton', orton[1], orton[2])) take(orton);
  }
  if (found.scale) clear = true;
  // A temperature or a range of them, whichever the line names first: a peak before a cooling range ("Fire to
  // 1240°C, slow cool 1100-900°C") is the firing, as a range before anything else is ("1220-1260°C"). A range
  // that is no firing ("open the kiln at 100-150°C") gives way to the first temperature that is one.
  const celsius = (written: string, unit: string | undefined) => {
    const degrees = Number(written.replace(/[,.]/g, ''));
    return String(Math.round(unit === 'f' ? ((degrees - 32) * 5) / 9 : degrees));
  };
  const temps = [...text.matchAll(TEMP_RE)];
  const tempRange = text.match(TEMP_RANGE_RE);
  const [low, high] = tempRange
    ? [celsius(tempRange[1], tempRange[2] ?? tempRange[4]), celsius(tempRange[3], tempRange[4])]
    : [];
  if (
    tempRange &&
    (!temps.length || tempRange.index! <= temps[0]!.index) &&
    isCone(host, 'temperature', low) &&
    isCone(host, 'temperature', high)
  ) {
    if (!found.scale) range('temperature', low, high);
    clear = true;
    take(tempRange);
  } else if (temps.length) {
    const temp = temps.find((one) => isCone(host, 'temperature', celsius(one[1], one[2]))) ?? temps[0];
    if (!found.scale && isCone(host, 'temperature', celsius(temp[1], temp[2]))) {
      found.scale = 'temperature';
      found.low = celsius(temp[1], temp[2]);
    }
    clear = true;
    take(temp);
  }
  // A range always has a temperature too, its high end with its unit, so a range that is no firing is taken
  // as that temperature is: the line is a firing line all the same.
  const atmospheres: Atmosphere[] = [];
  const processes: FiringProcess[] = [];
  const named = (name: Atmosphere | FiringProcess) => {
    if (isAtmosphere(name)) {
      if (!atmospheres.includes(name)) atmospheres.push(name);
    } else if (!processes.includes(name)) processes.push(name);
  };
  const weak: Array<readonly [Atmosphere | FiringProcess, RegExp]> = [];
  for (const [name, re, isWeak] of WORDS) {
    if (!re.test(text)) continue;
    re.lastIndex = 0;
    if (isWeak) weak.push([name, re]);
    else {
      named(name);
      clear = true;
      text = text.replace(re, ' ');
    }
  }
  if (weak.length) {
    const rest = weak.reduce((t, [, re]) => t.replace(re, ' '), text);
    if (found.scale || atmospheres.length || processes.length || !rest.replace(FILLER, '').trim()) {
      weak.forEach(([name]) => named(name));
      text = rest;
    }
  }
  // A bare cone ("06", "6½", "6 ox") only where nothing else is on the line.
  if (!found.scale) {
    const bare = text.trim().match(BARE_RE);
    if (bare && (bare[1].startsWith('0') || bare[1].includes('.') || atmospheres.length || processes.length)) {
      const rest = text.trim().slice(bare[0].length);
      if (!rest.replace(FILLER, '').trim() && range('orton', bare[1], bare[2])) text = rest;
    }
  }
  if (atmospheres.length) found.atmospheres = atmospheres;
  if (processes.length) found.processes = processes;
  if (!Object.keys(found).length) return null;
  return { ...found, whole: !text.replace(FILLER, '').trim(), clear: clear || !!found.bisque };
}

/**
 * A firing block from lines of text (a pasted recipe's notes): the first cone
 * or temperature found, and every atmosphere and process named; null when
 * none says anything. No cone is marked tested: the potter ticks it after firing.
 */
function firingFromLines(
  host: Host,
  lines: readonly string[] | null | undefined,
  fallbackScale: ConeScale = 'orton',
  options?: ReadOptions
): FiringBlock | null {
  let block: FiringBlock | null = null;
  for (const line of lines ?? []) {
    const found = readFiring(host, line, options);
    if (!found) continue;
    block ??= { scale: found.scale ?? (found.unknown ? 'sk' : fallbackScale) };
    if (found.scale && !block.low) {
      block.scale = found.scale;
      block.low = found.low;
      if (found.high) block.high = found.high;
    }
    if (found.atmospheres) block.atmospheres = [...new Set([...(block.atmospheres ?? []), ...found.atmospheres])];
    if (found.processes) block.processes = [...new Set([...(block.processes ?? []), ...found.processes])];
  }
  if (!block) return null;
  // A scale from JavaScript may be any text: one that is none of SCALES is Orton.
  if (!SCALES.includes(block.scale)) block.scale = 'orton';
  return cleanFiring(host, block);
}

/**
 * The cones of a scale a firing log names in its cone columns ("Cone",
 * "Cones Top", "Cones Bottom"; a cell such as "6", "06 down" or "SK 8"), in
 * order, each once. The recipe page offers them as tested cones, within the
 * recipe's range, and asks before replacing the ticks there. A cell "4,5" is
 * cones 4 and 5, unless the reader writes decimal commas and it is the cell's
 * one number (options.decimalComma), when it is 4½; an SK cell "6" is SK 6a.
 */
function conesFromLog(
  host: Host,
  log: FiringLog | null | undefined,
  scale: ConeScale,
  options?: ReadOptions
): string[] {
  if (!log || scale === 'temperature') return [];
  const columns = (log.fieldsIncluded ?? [])
    .map((field, i) => (/^cones?\b/i.test(String(field)) ? i : -1))
    .filter((i) => i >= 0);
  const found = new Set<string>();
  for (const row of log.rows ?? []) {
    for (const i of columns) {
      const cell = textForCones(Array.isArray(row) ? String(row[i] ?? '') : '', options).replace(/\bsk\s*-?\s*/g, ' ');
      for (const [token] of cell.matchAll(/(?<![\d.])0?\d{1,2}(?:\.5|a)?(?![\d.])/g)) {
        const cone = scale === 'sk' ? skCone(host, token) : token;
        if (isCone(host, scale, cone)) found.add(cone);
      }
    }
  }
  return [...found].sort((a, b) => compareCones(host, scale, a, b));
}

export {
  coneLabel,
  glazyFiring,
  glazyConeCell,
  readsDecimalComma,
  textForCones,
  skCone,
  readFiring,
  readCone,
  isFiringLine,
  readFiringDetail,
  firingFromLines,
  conesFromLog
};
