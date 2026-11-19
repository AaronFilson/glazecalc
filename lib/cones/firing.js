'use strict';

// Firing blocks as the app reads and writes them (docs/adr/0030-nameless-chemistry-core.md): the core's
// cones and firings (lib/core/cones/firing.ts) with Glazecalc's host and the catalog's charts
// (lib/catalog/cones.ts), and the catalog's firings and cones read from text (lib/catalog/firing-text.ts).
const core = require('../core/cones/index.ts');
const { SK_MEASURED } = require('../catalog/host/index.ts');
const { withHost } = require('../chemistry/host');

const { SCALES, ATMOSPHERES, PROCESSES, FIRING_LIMITS } = core;
const isCone = withHost(core.isCone);
const ordinal = withHost(core.ordinal);
const compareCones = withHost(core.compareCones);
const coneChoices = withHost(core.coneChoices);
const conesBetween = withHost(core.conesBetween);
const testedCones = withHost(core.testedCones);
const firingProblem = withHost(core.firingProblem);
const cleanFiring = withHost(core.cleanFiring);
const isStated = withHost(core.isStated);
const approxCelsius = withHost(core.approxCelsius);
const approxCone = withHost(core.approxCone);
const coneBand = withHost(core.coneBand);
const firingBands = withHost(core.firingBands);
const inRange = withHost(core.inRange);
const matchesCone = withHost(core.matchesCone);

const text = require('../catalog/text/index.ts');

const { coneLabel, readsDecimalComma } = text;
const glazyFiring = withHost(text.glazyFiring);
const glazyConeCell = withHost(text.glazyConeCell);
const skCone = withHost(text.skCone);
const readFiring = withHost(text.readFiring);
const readCone = withHost(text.readCone);
const isFiringLine = withHost(text.isFiringLine);
const firingFromLines = withHost(text.firingFromLines);
const conesFromLog = withHost(text.conesFromLog);

module.exports = {
  conesFromLog,
  isFiringLine,
  readsDecimalComma,
  skCone,
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
  matchesCone,
  glazyFiring,
  glazyConeCell,
  readFiring,
  readCone,
  firingFromLines
};
