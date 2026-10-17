'use strict';

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

const { SK } = require('./index');

const SCALES = Object.freeze(['orton', 'sk', 'temperature']);
/** The kiln atmosphere: any of these, or none stated. */
const ATMOSPHERES = Object.freeze(['oxidation', 'reduction', 'neutral']);
/** The firing process, besides the atmosphere: any of these, or none stated. */
const PROCESSES = Object.freeze(['wood', 'soda', 'salt', 'raku', 'pit']);

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

// Orton large cones heated at 60 °C an hour over the last 100 °C: the
// temperature each bends at, from Orton's temperature equivalent chart (the
// same column as lib/chemistry/lead.js, cone 06 to 6, which this agrees with).
// Cones above 14 are offered, as Orton makes them, but the chart here gives
// them no temperature.
const ORTON_60 = [
  ['022', 586], ['021', 600], ['020', 626], ['019', 678], ['018', 715], ['017', 738], ['016', 772],
  ['015', 791], ['014', 807], ['013', 837], ['012', 861], ['011', 875], ['010', 903], ['09', 920],
  ['08', 942], ['07', 976], ['06', 999], ['05', 1046], ['04', 1060], ['03', 1101], ['02', 1120],
  ['01', 1137], ['1', 1154], ['2', 1162], ['3', 1168], ['4', 1186], ['5', 1196], ['6', 1222],
  ['7', 1240], ['8', 1263], ['9', 1280], ['10', 1305], ['11', 1315], ['12', 1326], ['13', 1346],
  ['14', 1366]
]; // prettier-ignore
const ORTON_CELSIUS = new Map(ORTON_60);
/** Orton's cones above 14, rare in a pottery: offered at the end of the list. */
const ORTON_ABOVE_14 = ['15', '16', '17', '18', '19', '20', '23', '26', '27', '28', '29', '30', '31', '31.5', '32', '32.5', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42']; // prettier-ignore
/** Half cones between whole ones from 1 to 13: a cone partly bent, or a controller set between two. */
const ORTON_HALVES = Array.from({ length: 12 }, (_, i) => `${i + 1}.5`);

/** An Orton cone's place in order: '022' is -22, '01' -1, '1' 1, '5.5' 5.5. NaN when it is not a cone. */
function ortonOrdinal(cone) {
  const text = String(cone);
  if (/^0\d{1,2}$/.test(text)) return -Number(text);
  if (/^[1-9]\d?(?:\.5)?$/.test(text)) return Number(text);
  return NaN;
}

const ORTON_MAIN = ORTON_60.filter(([cone]) => ortonOrdinal(cone) <= 13).map(([cone]) => cone);
const ORTON_ALL = new Set([...ORTON_MAIN, '14', ...ORTON_ABOVE_14, ...ORTON_HALVES]);
const SK_ORDER = new Map(SK.cones.map((c, i) => [c.cone, i]));
const SK_NOMINAL = new Map(SK.cones.map((c) => [c.cone, c.celsius]));

/**
 * SK cones measured, not nominal: the Kyoto Municipal Institute of Industrial
 * Technology and Culture's bend points at 100 °C an hour, when it moved its
 * users from its own Seger cones to Orton (https://tc-kyoto.or.jp/app/uploads/2025/07/OrtonCorn.pdf,
 * read in the research report "Recipe cone field"). They are Kyoto's cones,
 * not JIS ones; they are used because the JIS figures (SK 8 1250 °C, SK 10
 * 1300 °C) read far hotter than a potter's kiln bends them.
 */
const SK_MEASURED = Object.freeze({ 8: 1198, 10: 1232 });
/** The institute's own replacement: SK 12 ≈ Orton 10. */
const SK_ORTON_STATED = Object.freeze({ 12: '10' });

/**
 * The band an SK cone's glaze is checked in, kept as a table rather than
 * read from the JIS figures: by Kyoto's measured bends SK 8 is near Orton 5
 * and SK 10 near Orton 6–7, and SK 12 stands in for Orton 10, so SK 5a to 10
 * is mid fire and SK 11 up high fire (the ADR gives the reasoning).
 */
const SK_MID_FROM = '5a';
const SK_HIGH_FROM = '11';

/** Band edges in °C, as Hesselberth & Roy's set draws them (lib/recipe/limits.js). */
const LOW_BELOW = 1150;
const MID_BELOW = 1250;

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
      { group: 'above', cones: ['14', ...ORTON_ABOVE_14] }
    ];
  }
  if (scale === 'sk') return [{ group: 'usual', cones: SK.cones.map((c) => c.cone) }];
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
  const list =
    scale === 'sk'
      ? SK.cones.map((c) => c.cone)
      : [...ORTON_MAIN, '14', ...ORTON_ABOVE_14.filter((c) => !c.includes('.'))];
  const whole = list.filter((cone) => {
    const at = ordinal(scale, cone);
    return at > from && at < to;
  });
  return [low, ...whole, high].sort((a, b) => compareCones(scale, a, b));
}

/** The cones a block counts as tested: those ticked, or with a single cone and none ticked, that cone. */
function testedCones(block) {
  if (!block || !block.low) return [];
  const range = conesBetween(block.scale, block.low, block.high);
  const ticked = (block.tested ?? []).filter((cone) => range.includes(cone));
  if (ticked.length) return ticked;
  return range.length === 1 ? range : [];
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
function firingProblem(block) {
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
function cleanFiring(block) {
  if (!block || firingProblem(block)) return null;
  const out = { scale: block.scale };
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

/** Half cones are stored "5.5" and shown 5½. */
const coneLabel = (cone) => String(cone ?? '').replace(/\.5$/, '½');

const nearest = (map, celsius) => {
  let best = null;
  for (const [cone, at] of map) if (!best || Math.abs(at - celsius) < Math.abs(best[1] - celsius)) best = [cone, at];
  return best;
};

/**
 * A cone's approximate temperature in °C and what it rests on:
 *   'orton-60'      Orton's chart for large cones at 60 °C an hour (a half
 *                   cone halfway between its neighbours)
 *   'kyoto'         measured bend at 100 °C an hour (SK_MEASURED)
 *   'jis'           the SK chart's nominal figure; kilns usually bend cooler
 *   'stated'        a temperature firing, as given
 * Null for a cone with no figure (Orton above 14).
 */
function approxCelsius(scale, cone) {
  if (!isCone(scale, cone)) return null;
  if (scale === 'temperature') return { celsius: Number(cone), basis: 'stated' };
  if (scale === 'sk') {
    const measured = SK_MEASURED[cone];
    return measured ? { celsius: measured, basis: 'kyoto' } : { celsius: SK_NOMINAL.get(cone), basis: 'jis' };
  }
  if (cone.endsWith('.5')) {
    const lower = ORTON_CELSIUS.get(cone.slice(0, -2));
    const upper = ORTON_CELSIUS.get(String(Number(cone.slice(0, -2)) + 1));
    return lower && upper ? { celsius: Math.round((lower + upper) / 2), basis: 'orton-60' } : null;
  }
  const celsius = ORTON_CELSIUS.get(cone);
  return celsius ? { celsius, basis: 'orton-60' } : null;
}

/** How near a temperature must be to an SK cone's measured bend for that cone to be named. */
const SK_NEAR = 15;

/**
 * A cone in another scale, approximately, for display beside the original, or
 * null when there is no fair equivalent. Orton from SK only where Kyoto
 * measured the SK cone or named its Orton replacement; SK from Orton or a
 * temperature only near a measured SK bend or by that replacement; Orton
 * from a temperature by the nearest in its 60 °C/h chart. Never stored.
 */
function approxCone(scale, cone, toScale) {
  if (!isCone(scale, cone) || toScale === scale || toScale === 'temperature') return null;
  if (scale === 'sk') {
    if (toScale !== 'orton') return null;
    if (SK_ORTON_STATED[cone]) return { cone: SK_ORTON_STATED[cone], basis: 'kyoto' };
    if (!SK_MEASURED[cone]) return null;
    return { cone: nearest(ORTON_CELSIUS, SK_MEASURED[cone])[0], basis: 'kyoto' };
  }
  if (toScale === 'sk' && scale === 'orton') {
    const stated = Object.keys(SK_ORTON_STATED).find((sk) => SK_ORTON_STATED[sk] === cone);
    if (stated) return { cone: stated, basis: 'kyoto' };
  }
  const from = approxCelsius(scale, cone);
  if (!from) return null;
  if (toScale === 'sk') {
    const [sk, at] = nearest(new Map(Object.entries(SK_MEASURED)), from.celsius);
    return Math.abs(at - from.celsius) <= SK_NEAR ? { cone: sk, basis: 'kyoto' } : null;
  }
  // Orton from a temperature: only within the chart's span.
  const first = ORTON_60[0][1];
  const last = ORTON_60[ORTON_60.length - 1][1];
  if (from.celsius < first - 20 || from.celsius > last + 20) return null;
  return { cone: nearest(ORTON_CELSIUS, from.celsius)[0], basis: 'orton-60' };
}

/** The band a cone's glaze is checked in: 'low' (to about cone 02), 'mid' (cone 1–7), 'high' (cone 8 up). */
function coneBand(scale, cone) {
  if (!isCone(scale, cone)) return undefined;
  if (scale === 'sk') {
    const at = SK_ORDER.get(cone);
    return at >= SK_ORDER.get(SK_HIGH_FROM) ? 'high' : at >= SK_ORDER.get(SK_MID_FROM) ? 'mid' : 'low';
  }
  const celsius = approxCelsius(scale, cone)?.celsius;
  // Orton above 14 has no figure here, and is past any glaze limits' high band.
  if (celsius === undefined) return 'high';
  return celsius < LOW_BELOW ? 'low' : celsius < MID_BELOW ? 'mid' : 'high';
}

/** The bands a block's range touches, coolest first: one for a single cone, two or three for a range across them. */
function firingBands(block) {
  if (!block || !isCone(block.scale, block.low)) return [];
  const order = ['low', 'mid', 'high'];
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

// Glazy's names (its data export's "Atmospheres" list and "Cone" string).
const GLAZY_ATMOSPHERES = { oxidation: 'Oxidation', reduction: 'Reduction', neutral: 'Neutral', wood: 'Wood', soda: 'Soda', salt: 'Salt', raku: 'Raku', pit: 'Pit' }; // prettier-ignore

/**
 * A block as Glazy's export writes a firing: "Cone" as a string ("6",
 * "9 - 10"; SK and temperatures as "SK 8" and "1240°C", which Glazy's Orton
 * field cannot hold), and "Atmospheres" as a list.
 */
function glazyFiring(block) {
  const clean = cleanFiring(block);
  if (!clean) return { cone: '', atmospheres: [] };
  const one = (c) => (clean.scale === 'sk' ? 'SK ' + c : clean.scale === 'temperature' ? c + '°C' : c);
  const cone = clean.low ? one(clean.low) + (clean.high ? ' - ' + one(clean.high) : '') : '';
  const atmospheres = [...(clean.atmospheres ?? []), ...(clean.processes ?? [])].map((a) => GLAZY_ATMOSPHERES[a]);
  return { cone, atmospheres };
}

// Reading a firing from pasted text: "Cone 6 ox", "^6", "C/6", "Δ6", "cone 5-6",
// "SK8", "1240°C", "06", "6½", "ox/red".

const NUM = '(0\\d{1,2}|\\d{1,2}(?:\\.5)?)';
const TO = '\\s*(?:-|–|—|~|/|to)\\s*';
const SK_RE = new RegExp(`\\bsk\\s*-?\\s*(0?\\d{1,2}a?)(?:${TO}(?:sk\\s*-?\\s*)?(0?\\d{1,2}a?))?(?![\\d.])`, 'u');
const ORTON_RE = new RegExp(
  `(?:\\b(?:orton\\s+)?cones?\\s*|\\bc\\s*/\\s*|\\^\\s*|[δ△∆]\\s*|\\bc(?=\\d))${NUM}(?:${TO}(?:cones?\\s*|c\\s*/\\s*|\\^\\s*|[δ△∆]\\s*)?${NUM})?(?![\\d])`,
  'u'
);
const BARE_RE = new RegExp(`^${NUM}(?:${TO}${NUM})?(?=\\s|$|,)`, 'u');
const TEMP_RE = /(\d{3,4})\s*(?:°|º|deg(?:rees)?\s*)\s*([cf])\b/u;
// Each word, and whether it is weak: "red", "wood", "soda", "salt" and "pit" mean a firing only on a line
// that names a cone, a temperature or another firing word, or is nothing but firing words ("ox/red"),
// so "a deep red" or "wood ash" in a note is not read as one.
const WORDS = [
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
const FILLER = /\b(?:fired|firing|fire|atmosphere|kiln|in|or|and|at|glaze|temp|temperature)\b|[&/,;:()+.\-–—|]/gu;

/** Typed text as the reader matches it: half cones as .5, lowercase. */
const textForCones = (text) =>
  String(text ?? '')
    .replace(/(\d)\s*(?:½|1\s*\/\s*2)(?!\d)/g, '$1.5')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/(\d),5\b/g, '$1.5');

/**
 * What a line of text says about the firing: { scale, low, high, atmospheres,
 * processes } with whatever it found, and `whole` when the line is nothing
 * but a firing (so a paste can set it aside). Null when it says nothing. A
 * temperature alone is a temperature firing, never a guessed cone; °F is
 * kept as °C, to the degree.
 */
function readFiring(line) {
  let text = textForCones(line);
  const found = {};
  const take = (match) => {
    text = text.replace(match[0], ' ');
  };
  const range = (scale, a, b) => {
    if (!isCone(scale, a)) return false;
    found.scale = scale;
    found.low = a;
    if (b && isCone(scale, b) && b !== a) {
      [found.low, found.high] = compareCones(scale, a, b) < 0 ? [a, b] : [b, a];
    }
    return true;
  };
  const sk = text.match(SK_RE);
  if (sk && range('sk', sk[1], sk[2])) take(sk);
  if (!found.scale) {
    const orton = text.match(ORTON_RE);
    if (orton && range('orton', orton[1], orton[2])) take(orton);
  }
  const temp = text.match(TEMP_RE);
  if (temp) {
    const degrees = Number(temp[1]);
    const celsius = String(Math.round(temp[2] === 'f' ? ((degrees - 32) * 5) / 9 : degrees));
    if (!found.scale && isCone('temperature', celsius)) {
      found.scale = 'temperature';
      found.low = celsius;
    }
    take(temp);
  }
  const atmospheres = [];
  const processes = [];
  const named = (name) => {
    const list = ATMOSPHERES.includes(name) ? atmospheres : processes;
    if (!list.includes(name)) list.push(name);
  };
  const weak = [];
  for (const [name, re, isWeak] of WORDS) {
    if (!re.test(text)) continue;
    re.lastIndex = 0;
    if (isWeak) weak.push([name, re]);
    else {
      named(name);
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
  found.whole = !text.replace(FILLER, '').trim();
  return found;
}

/**
 * A firing block from lines of text (a pasted recipe's notes): the first cone
 * or temperature found, and every atmosphere and process named; null when
 * none says anything. A single cone counts as tested.
 */
function firingFromLines(lines, fallbackScale = 'orton') {
  let block = null;
  for (const line of lines ?? []) {
    const found = readFiring(line);
    if (!found) continue;
    block ??= { scale: found.scale ?? fallbackScale };
    if (found.scale && !block.low) {
      block.scale = found.scale;
      block.low = found.low;
      if (found.high) block.high = found.high;
    }
    for (const key of ['atmospheres', 'processes']) {
      if (found[key]) block[key] = [...new Set([...(block[key] ?? []), ...found[key]])];
    }
  }
  if (!block) return null;
  if (!SCALES.includes(block.scale)) block.scale = 'orton';
  if (block.low && !block.high) block.tested = [block.low];
  return cleanFiring(block);
}

/**
 * The cones of a scale a firing log names in its cone columns ("Cone",
 * "Cones Top", "Cones Bottom"; a cell such as "6", "06 down" or "SK 8"), in
 * order, each once. The recipe page offers them as tested cones, within the
 * recipe's range, and asks before replacing the ticks there.
 */
function conesFromLog(log, scale) {
  if (!log || scale === 'temperature') return [];
  const columns = (log.fieldsIncluded ?? [])
    .map((field, i) => (/^cones?\b/i.test(String(field)) ? i : -1))
    .filter((i) => i >= 0);
  const found = new Set();
  for (const row of log.rows ?? []) {
    for (const i of columns) {
      const cell = textForCones(Array.isArray(row) ? row[i] : '').replace(/\bsk\s*-?\s*/g, ' ');
      for (const [token] of cell.matchAll(/(?<![\d.])0?\d{1,2}(?:\.5|a)?(?![\d.])/g)) {
        if (isCone(scale, token)) found.add(token);
      }
    }
  }
  return [...found].sort((a, b) => compareCones(scale, a, b));
}

module.exports = {
  conesFromLog,
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
  coneLabel,
  approxCelsius,
  approxCone,
  coneBand,
  firingBands,
  inRange,
  glazyFiring,
  readFiring,
  firingFromLines
};
