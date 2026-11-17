// A recipe's firing, as the potter states it (docs/adr/0021-recipe-firing.md):
// the cone scale, the low cone and an optional high one (the claimed range),
// the cones of that range actually tested, the atmosphere and the process, and
// for a firing given by temperature the peak in °C with an optional rate over
// the last hour and hold. The cone is kept exactly as entered with its scale;
// nothing here stores a converted cone. Conversions are for display only, and
// each says what it rests on, so the page can call it approximate.
//
// Cones are put in order by an ordinal, never by their text or number: Orton
// "06" is far below "6". Orton's run 022 … 01, then 1 … 42; half cones
// ("5.5", shown 5½) sit between whole ones. SK cones (JIS R 8101) are in the
// order of their chart (lib/cones/index.js), letter cones and all.

import { SK_CONES, ORTON_CHART_CONES, ORTON_PUBLISHED_CONES } from './charts.ts';

export type ConeScale = 'orton' | 'sk' | 'temperature';
export type Atmosphere = 'oxidation' | 'reduction' | 'neutral';
export type FiringProcess = 'wood' | 'soda' | 'salt' | 'raku' | 'pit';

/**
 * A recipe's firing as stated: the cone exactly as entered with its scale
 * ('06', '6', '5.5' for 5½, '6a' for SK; °C as text for temperature), an
 * optional high end for a claimed range, the cones of the range the potter has
 * test-fired (none until ticked: a stated cone is not a tested one), and
 * the rest optional. Saved on a recipe as `firedAt`.
 */
export interface FiringBlock {
  scale: ConeScale;
  low?: string;
  high?: string;
  tested?: string[];
  atmospheres?: Atmosphere[];
  processes?: FiringProcess[];
  /** °C an hour over the last hour. */
  rate?: number;
  /** Minutes held at peak. */
  hold?: number;
  /** A schedule note: "C6DHSC slow cool". */
  schedule?: string;
  /** Confirmed by a witness cone. */
  witness?: boolean;
}

const SCALES: readonly ConeScale[] = Object.freeze(['orton', 'sk', 'temperature']);
/** The kiln atmosphere: any of these, or none stated. */
const ATMOSPHERES: readonly Atmosphere[] = Object.freeze(['oxidation', 'reduction', 'neutral']);
/** The firing process, besides the atmosphere: any of these, or none stated. */
const PROCESSES: readonly FiringProcess[] = Object.freeze(['wood', 'soda', 'salt', 'raku', 'pit']);

/** Bounds of what a firing block may hold. */
const FIRING_LIMITS = Object.freeze({
  /** A peak temperature in °C. */
  celsius: Object.freeze({ min: 500, max: 1600 }),
  /** The heating rate over the last hour, °C an hour. */
  rate: Object.freeze({ min: 1, max: 1000 }),
  /** The hold at peak, minutes. */
  hold: Object.freeze({ min: 0, max: 1440 }),
  /** The schedule note, characters. */
  schedule: 300
});

// Orton cones' figures (approxCelsius): large cones heated at 150 °C an hour
// over the last 100 °C, from Orton's older chart (ORTON.chart in
// lib/cones/index.js, where it is read), 022 to 15; the same column as
// lib/chemistry/lead.js, cone 06 to 6. Orton's current figures (ORTON.published)
// stop at cone 14 and are not mixed in, but for cone 05½: the older chart has no
// half cones, and Orton's 2016 chart gives 05½ alone a figure for large cones at
// 150 °C an hour (ORTON_HALF_150). Cones above 15 are offered, as Orton makes
// them, but no chart gives them a figure.
const ORTON_CELSIUS = new Map(ORTON_CHART_CONES.map((c) => [c.cone, c.celsius]));
/** The half cones Orton's 2016 chart gives a figure for large cones at 150 °C an hour: 05½ (1023 °C). */
const ORTON_HALF_150 = new Map(
  ORTON_PUBLISHED_CONES.filter((c) => c.cone.endsWith('.5') && c.large?.[150]).map((c) => [c.cone, c.large[150]])
);
/** Orton's cones above 15, rare in a pottery: offered at the end of the list, as Orton sells them. */
const ORTON_ABOVE_15 = ['16', '17', '18', '19', '20', '21', '23', '26', '27', '28', '29', '30', '31', '31.5', '32', '32.5', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42']; // prettier-ignore
/**
 * Half cones: 05½, which Orton makes and charts (ORTON.published), between 06
 * and 05; and those between whole ones from 1 to 16, a cone partly bent or a
 * controller set between two (Orton sells self-supporting 13½, 14½ and 15½).
 */
const ORTON_HALVES = ['05.5', ...Array.from({ length: 15 }, (_, i) => `${i + 1}.5`)];

/**
 * An Orton cone's place in order: '022' is -22, '01' -1, '1' 1, '5.5' 5.5, and
 * '05.5' -5.5, between 06 and 05. NaN when it is not a cone.
 */
function ortonOrdinal(cone) {
  const text = String(cone);
  if (/^0\d{1,2}(?:\.5)?$/.test(text)) return -Number(text.slice(1));
  if (/^[1-9]\d?(?:\.5)?$/.test(text)) return Number(text);
  return NaN;
}

/** Orton's usual cones, 022 to 13, and those from 14 up: 14 and 15 with a figure, then ORTON_ABOVE_15. */
const ORTON_MAIN = ORTON_CHART_CONES.filter((c) => ortonOrdinal(c.cone) <= 13).map((c) => c.cone);
const ORTON_ABOVE = [
  ...ORTON_CHART_CONES.filter((c) => ortonOrdinal(c.cone) > 13).map((c) => c.cone),
  ...ORTON_ABOVE_15
];
const ORTON_ALL = new Set([...ORTON_MAIN, ...ORTON_ABOVE, ...ORTON_HALVES]);
/** Orton's whole cones, in order. */
const ORTON_WHOLE = [...ORTON_MAIN, ...ORTON_ABOVE.filter((c) => !c.includes('.'))];
const SK_ORDER = new Map(SK_CONES.map((c, i) => [c.cone, i]));

/**
 * SK cones measured, not nominal: the Kyoto Municipal Institute of Industrial
 * Technology and Culture's bend points at 100 °C an hour, when it moved its
 * users from its own Seger cones to Orton (https://tc-kyoto.or.jp/app/uploads/2025/07/OrtonCorn.pdf,
 * read in the research report "Recipe cone field"). They are Kyoto's cones,
 * not JIS ones; they are used because the JIS figures (SK 8 1250 °C, SK 10
 * 1300 °C) read far hotter than a potter's kiln bends them. Of them only SK 8
 * and SK 10 are shown as a temperature, and every other SK cone is shown with
 * no temperature at all (the owner's decision, docs/adr/0021-recipe-firing.md):
 * mixing them with the JIS figures of their neighbours (SK 7 1230 °C, SK 9
 * 1280 °C) would put the cones out of order.
 */
const SK_MEASURED = Object.freeze({ 8: 1198, 10: 1232 });
/**
 * Kyoto's whole table, both columns bent in the same kiln at 100 °C an hour
 * (ADR 0021, amended 2026-10-19): its own cones SK 7 to 14, and Orton cones 4
 * to 12 (the table labels the first three 4a, 5a and 6a; the figure sits in
 * the Orton column). SK and Orton are matched across these two columns, not
 * against Orton's chart (ORTON_CELSIUS), which is another heating rate. They give
 * only the match between the scales; the temperatures shown are SK_MEASURED
 * and ORTON_CELSIUS.
 */
const KYOTO_SK = Object.freeze({ 7: 1183, 8: 1198, 9: 1211, 10: 1232, 11: 1253, 12: 1290, 13: 1311, 14: 1331 });
const KYOTO_ORTON = Object.freeze({
  4: 1179,
  5: 1207,
  6: 1211,
  7: 1232,
  8: 1252,
  9: 1271,
  10: 1290,
  11: 1301,
  12: 1324
});
/** The institute's own replacement: SK 12 ≈ Orton 10. */
const SK_ORTON_STATED = Object.freeze({ 12: '10' });

/**
 * The band an SK cone's glaze is checked in, kept as a table rather than
 * read from the JIS figures: by Kyoto's same-kiln columns SK 8 is near Orton 5
 * and SK 10 near Orton 7, SK 11 near Orton 8, and SK 12 stands in for Orton 10,
 * so SK 5a to 10 is mid fire and SK 11 up high fire (the ADR gives the reasoning).
 * SK 13 is near Orton 11 and SK 14 near Orton 12, so from SK 14 up is past
 * every limit set's figures, as Orton 12 is (ADR 0021, amended 2026-10-20).
 */
const SK_MID_FROM = '5a';
const SK_HIGH_FROM = '11';
const SK_TOP_FROM = '14';

/** Band edges in °C, as Hesselberth & Roy's set draws them (lib/recipe/limits.js). */
const LOW_BELOW = 1150;
const MID_BELOW = 1250;
/** From here up (Orton cone 12, 1326 °C, and hotter) no limit set has figures: the 'top' band. */
const HIGH_BELOW = 1320;

/** Whether a cone is one of the scale's, as stored ('5.5', '6a', or °C as text for temperature). */
function isCone(scale, cone) {
  if (typeof cone !== 'string' || !cone) return false;
  if (scale === 'orton') return ORTON_ALL.has(cone);
  if (scale === 'sk') return SK_ORDER.has(cone);
  if (scale === 'temperature') {
    if (!/^\d{3,4}$/.test(cone)) return false;
    const c = Number(cone);
    return c >= FIRING_LIMITS.celsius.min && c <= FIRING_LIMITS.celsius.max;
  }
  return false;
}

/** A cone's place in its scale's order, for sorting and ranges; NaN when it is not one. */
function ordinal(scale, cone) {
  if (!isCone(scale, cone)) return NaN;
  if (scale === 'orton') return ortonOrdinal(cone);
  if (scale === 'sk') return SK_ORDER.get(cone);
  return Number(cone);
}

/** Two cones of a scale in order: negative when a is lower. */
const compareCones = (scale, a, b) => ordinal(scale, a) - ordinal(scale, b);

/**
 * The cones the picker offers for a scale, in groups: Orton's usual 022 … 13,
 * then its half cones, then 14 … 42; SK's chart. None for temperature.
 */
function coneChoices(scale) {
  if (scale === 'orton') {
    return [
      { group: 'usual', cones: ORTON_MAIN },
      { group: 'half', cones: ORTON_HALVES },
      { group: 'above', cones: ORTON_ABOVE }
    ];
  }
  if (scale === 'sk') return [{ group: 'usual', cones: SK_CONES.map((c) => c.cone) }];
  return [];
}

/**
 * The cones of a range that can be ticked as tested: each whole cone from low
 * to high and the two ends themselves (so 5.5–6.5 offers 5.5, 6 and 6.5);
 * for a temperature, the two ends. Just the low cone with no high one.
 */
function conesBetween(scale, low, high) {
  if (!isCone(scale, low)) return [];
  if (!high || high === low || !isCone(scale, high)) return [low];
  const [from, to] = [ordinal(scale, low), ordinal(scale, high)];
  if (to < from) return [];
  if (scale === 'temperature') return [low, high];
  const list = scale === 'sk' ? SK_CONES.map((c) => c.cone) : ORTON_WHOLE;
  const whole = list.filter((cone) => {
    const at = ordinal(scale, cone);
    return at > from && at < to;
  });
  return [low, ...whole, high].sort((a, b) => compareCones(scale, a, b));
}

/**
 * The cones a block counts as tested: only those ticked, within its range. A cone that is just
 * stated (a recipe from a book) is not tested; the potter ticks it after firing it.
 */
function testedCones(block) {
  if (!block || !block.low) return [];
  const range = conesBetween(block.scale, block.low, block.high);
  return (block.tested ?? []).filter((cone) => range.includes(cone));
}

const isWhole = (value, { min, max }) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const uniqueIn = (list, allowed) =>
  Array.isArray(list) && list.every((item) => allowed.includes(item)) && new Set(list).size === list.length;

/**
 * What is wrong with a firing block, as a code, or null when it can be saved:
 * 'block', 'scale', 'low', 'high', 'order', 'tested', 'atmospheres',
 * 'processes', 'rate', 'hold', 'schedule', 'witness'. Absent fields are
 * fine; a high cone needs a low one.
 */
function firingProblem(block: any): string | null {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return 'block';
  const { scale, low, high, tested, atmospheres, processes, rate, hold, schedule, witness } = block;
  if (!SCALES.includes(scale)) return 'scale';
  if (low !== undefined && low !== null && low !== '' && !isCone(scale, low)) return 'low';
  if (high !== undefined && high !== null && high !== '') {
    if (!isCone(scale, high)) return 'high';
    if (!low) return 'low';
    if (compareCones(scale, low, high) > 0) return 'order';
  }
  if (tested !== undefined && tested !== null) {
    const range = conesBetween(scale, low, high);
    if (!Array.isArray(tested) || !tested.every((cone) => range.includes(cone))) return 'tested';
    if (new Set(tested).size !== tested.length) return 'tested';
  }
  if (atmospheres !== undefined && atmospheres !== null && !uniqueIn(atmospheres, ATMOSPHERES)) return 'atmospheres';
  if (processes !== undefined && processes !== null && !uniqueIn(processes, PROCESSES)) return 'processes';
  if (rate !== undefined && rate !== null && !isWhole(rate, FIRING_LIMITS.rate)) return 'rate';
  if (hold !== undefined && hold !== null && !isWhole(hold, FIRING_LIMITS.hold)) return 'hold';
  if (schedule !== undefined && schedule !== null) {
    if (typeof schedule !== 'string' || schedule.length > FIRING_LIMITS.schedule) return 'schedule';
  }
  if (witness !== undefined && witness !== null && typeof witness !== 'boolean') return 'witness';
  return null;
}

/**
 * A block with only its known fields, each only when set, or null when it
 * says nothing (no cone, atmosphere, process, schedule or rate): what is
 * shared, exported and given to an assistant.
 */
function cleanFiring(block: FiringBlock | null | undefined): FiringBlock | null {
  if (!block || firingProblem(block)) return null;
  const out: FiringBlock = { scale: block.scale };
  if (block.low) out.low = block.low;
  if (block.high && block.high !== block.low) out.high = block.high;
  const tested = (block.tested ?? []).filter((cone) => conesBetween(block.scale, block.low, block.high).includes(cone));
  if (tested.length) out.tested = tested.sort((a, b) => compareCones(block.scale, a, b));
  if (block.atmospheres?.length) out.atmospheres = ATMOSPHERES.filter((a) => block.atmospheres.includes(a));
  if (block.processes?.length) out.processes = PROCESSES.filter((p) => block.processes.includes(p));
  if (typeof block.rate === 'number') out.rate = block.rate;
  if (typeof block.hold === 'number') out.hold = block.hold;
  if (block.schedule?.trim()) out.schedule = block.schedule.trim();
  if (block.witness === true) out.witness = true;
  return Object.keys(out).length > 1 ? out : null;
}

/** Whether a block states anything: a cone, an atmosphere, a process, a schedule. */
const isStated = (block) => cleanFiring(block) !== null;

const nearest = (map, celsius) => {
  let best = null;
  for (const [cone, at] of map) if (!best || Math.abs(at - celsius) < Math.abs(best[1] - celsius)) best = [cone, at];
  return best;
};

/**
 * A cone's approximate temperature in °C and what it rests on:
 *   'orton-150'          Orton's older chart for large cones at 150 °C an hour
 *                        (ORTON.chart), whole cones only
 *   'orton-150-halfway'  a half cone halfway between its neighbours on that chart
 *   'orton-2016-150'     Orton's 2016 chart for large cones at 150 °C an hour
 *                        (ORTON.published): cone 05½, the one half cone it gives
 *                        large cones a figure for
 *   'kyoto'              measured bend at 100 °C an hour (SK_MEASURED: SK 8 and 10)
 *   'stated'             a temperature firing, as given
 * Null for a cone with no figure: Orton above 15 (and 15½), and every SK cone
 * but 8 and 10 (the JIS nominal figures are never shown as a conversion).
 */
function approxCelsius(scale, cone) {
  if (!isCone(scale, cone)) return null;
  if (scale === 'temperature') return { celsius: Number(cone), basis: 'stated' };
  if (scale === 'sk') {
    const measured = SK_MEASURED[cone];
    return measured ? { celsius: measured, basis: 'kyoto' } : null;
  }
  if (ORTON_HALF_150.has(cone)) return { celsius: ORTON_HALF_150.get(cone), basis: 'orton-2016-150' };
  if (cone.endsWith('.5')) {
    // The whole cones either side, in order: 5 and 6 for 5½.
    const at = ortonOrdinal(cone);
    const lower = ORTON_CELSIUS.get(ORTON_WHOLE.find((c) => ortonOrdinal(c) === at - 0.5));
    const upper = ORTON_CELSIUS.get(ORTON_WHOLE.find((c) => ortonOrdinal(c) === at + 0.5));
    return lower && upper ? { celsius: Math.round((lower + upper) / 2), basis: 'orton-150-halfway' } : null;
  }
  const celsius = ORTON_CELSIUS.get(cone);
  return celsius ? { celsius, basis: 'orton-150' } : null;
}

/** How near a temperature must be to an SK cone's measured bend for that cone to be named. */
const SK_NEAR = 15;

/**
 * Kyoto's two columns matched one to one (KYOTO_SK, KYOTO_ORTON): SK 12 to the institute's stated Orton 10, then
 * the nearest pairs within SK_NEAR °C first, each cone in one pair at most, so a cone taken across and back is the
 * cone it was. Orton 5 (1207 °C) is nearer SK 9 (1211) than SK 8 (1198), but SK 9 is Orton 6's (1211), so Orton 5
 * is SK 8, as SK 8 is Orton 5. Orton 9 (1271) is 18 °C from SK 11 and 19 from SK 12: none.
 */
const KYOTO_MATCH = (() => {
  /** @type {Map<string, string>} */
  const toOrton = new Map<string, string>(Object.entries(SK_ORTON_STATED));
  const toSk = new Map<string, string>([...toOrton].map(([sk, orton]) => [orton, sk]));
  const pairs = Object.entries(KYOTO_SK)
    .flatMap(([sk, skAt]) =>
      Object.entries(KYOTO_ORTON).map(([orton, at]) => ({ sk, orton, apart: Math.abs(skAt - at) }))
    )
    .filter((pair) => pair.apart <= SK_NEAR)
    .sort((a, b) => a.apart - b.apart || ordinal('sk', a.sk) - ordinal('sk', b.sk));
  for (const { sk, orton } of pairs) {
    if (toOrton.has(sk) || toSk.has(orton)) continue;
    toOrton.set(sk, orton);
    toSk.set(orton, sk);
  }
  return { toOrton, toSk };
})();

/**
 * A cone in another scale, approximately, for display beside the original, or
 * null when there is no fair equivalent. Between SK and Orton by Kyoto's
 * same-kiln columns matched one to one (KYOTO_MATCH: SK 7 to 14 against Orton 4
 * to 12, SK 12 the institute's stated Orton 10); SK from a temperature only
 * near a measured SK bend; Orton from a temperature by the nearest in its chart
 * (ORTON_CELSIUS, 022 to 15). Never stored.
 */
function approxCone(scale, cone, toScale) {
  if (!isCone(scale, cone) || toScale === scale || toScale === 'temperature') return null;
  if (scale === 'sk' || (scale === 'orton' && toScale === 'sk')) {
    const match = scale === 'sk' ? toScale === 'orton' && KYOTO_MATCH.toOrton.get(cone) : KYOTO_MATCH.toSk.get(cone);
    return match ? { cone: match, basis: 'kyoto' } : null;
  }
  const from = approxCelsius(scale, cone);
  if (!from) return null;
  if (toScale === 'sk') {
    const [sk, at] = nearest(new Map(Object.entries(SK_MEASURED)), from.celsius);
    return Math.abs(at - from.celsius) <= SK_NEAR ? { cone: sk, basis: 'kyoto' } : null;
  }
  // Orton from a temperature: only within the chart's span.
  const figures = [...ORTON_CELSIUS.values()];
  if (from.celsius < figures[0] - 20 || from.celsius > figures[figures.length - 1] + 20) return null;
  return { cone: nearest(ORTON_CELSIUS, from.celsius)[0], basis: 'orton-150' };
}

/**
 * The band a cone's glaze is checked in: 'low' (to about cone 02), 'mid' (cone
 * 1–7), 'high' (cone 8–11), 'top' (cone 12 up, past every limit set's figures).
 */
function coneBand(scale, cone) {
  if (!isCone(scale, cone)) return undefined;
  if (scale === 'sk') {
    const at = SK_ORDER.get(cone);
    if (at >= SK_ORDER.get(SK_TOP_FROM)) return 'top';
    return at >= SK_ORDER.get(SK_HIGH_FROM) ? 'high' : at >= SK_ORDER.get(SK_MID_FROM) ? 'mid' : 'low';
  }
  const celsius = approxCelsius(scale, cone)?.celsius;
  // Orton above 15 has no figure here, and is far past any limits' figures.
  if (celsius === undefined) return 'top';
  return celsius < LOW_BELOW ? 'low' : celsius < MID_BELOW ? 'mid' : celsius < HIGH_BELOW ? 'high' : 'top';
}

/** The bands a block's range touches, coolest first: one for a single cone, more for a range across them. */
function firingBands(block) {
  if (!block || !isCone(block.scale, block.low)) return [];
  const order = ['low', 'mid', 'high', 'top'];
  const from = coneBand(block.scale, block.low);
  const to = block.high && isCone(block.scale, block.high) ? coneBand(block.scale, block.high) : from;
  return order.slice(order.indexOf(from), order.indexOf(to) + 1);
}

/** Whether a cone of the same scale is within a block's range (both ends counted). */
function inRange(block, scale, cone) {
  if (!block || block.scale !== scale || !isCone(scale, cone) || !isCone(scale, block.low)) return false;
  const at = ordinal(scale, cone);
  const high = block.high && isCone(scale, block.high) ? block.high : block.low;
  return at >= ordinal(scale, block.low) && at <= ordinal(scale, high);
}

/** How near, in °C, a cone's figure must be to a temperature firing for the two to match. */
const MATCH_NEAR = 15;

/**
 * Whether a block's firing includes a cone asked about in any scale (an
 * assistant's "which of my glazes fire at cone 6?"). The same scale: the cone
 * is within the range. Orton and SK: the recipe's cones are put into the
 * asked scale by Kyoto's same-kiln columns (approxCone: SK 7 to 14 against
 * Orton 4 to 12, SK 12 for Orton 10), and the cone must fall within them; a
 * cone with no equivalent there matches only recipes in its own scale. A temperature against a
 * cone: the cone's figure (Orton's older chart at 150 °C an hour, Kyoto's measured
 * SK bends) within MATCH_NEAR °C of the stated range. Display aside, nothing is
 * converted for storing.
 */
function matchesCone(block, scale, cone) {
  if (!block || !isCone(scale, cone) || !isCone(block.scale, block.low)) return false;
  if (block.scale === scale) return inRange(block, scale, cone);
  const ends = [block.low, block.high && isCone(block.scale, block.high) ? block.high : block.low];
  if (block.scale === 'temperature' || scale === 'temperature') {
    const span =
      block.scale === 'temperature' ? ends.map(Number) : ends.map((c) => approxCelsius(block.scale, c)?.celsius);
    const at = scale === 'temperature' ? Number(cone) : approxCelsius(scale, cone)?.celsius;
    if (at === undefined || span.some((c) => c === undefined)) return false;
    return at >= span[0] - MATCH_NEAR && at <= span[1] + MATCH_NEAR;
  }
  const mapped = ends.map((c) => approxCone(block.scale, c, scale)?.cone);
  if (mapped.some((c) => c === undefined)) return false;
  const [from, to] = mapped.map((c) => ordinal(scale, c)).sort((a, b) => a - b);
  const at = ordinal(scale, cone);
  return at >= from && at <= to;
}

export {
  SK_ORDER,
  SCALES,
  ATMOSPHERES,
  PROCESSES,
  FIRING_LIMITS,
  SK_MEASURED,
  isCone,
  ordinal,
  compareCones,
  coneChoices,
  conesBetween,
  testedCones,
  firingProblem,
  cleanFiring,
  isStated,
  approxCelsius,
  approxCone,
  coneBand,
  firingBands,
  inRange,
  matchesCone
};
