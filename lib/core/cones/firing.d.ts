// The core's cones/firing has the declarations of the app's (lib/cones/firing.d.ts) for what the two share.
export {
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
} from '../../cones/firing';
/** Each SK cone's place in the chart, coolest first. */
export const SK_ORDER: Map<string, number>;
