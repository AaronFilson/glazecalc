// The core's own tests (npm run test:core) run on Node alone: no server, MongoDB, app files or packages.
// The standard records come from standard.json (scripts/core-fixture.mjs), nameless and by id, and the
// core is called with HOST, its own readers (record.id, record.traits), as Glaze Vault and any other host see them.
import standard from './standard.json' with { type: 'json' };
import tables from './tables.json' with { type: 'json' };
import { coneTable } from '../cones/firing.ts';

/**
 * The host the tests call the core with (lib/core/host.ts): the core's own readers, a record's `id` and
 * `traits`, and the catalog's tables (tables.json, from lib/catalog by scripts/core-fixture.mjs), the cones'
 * lookups worked out by the core's coneTable as the catalog does. The core keeps neither readers nor tables
 * of its own, so each call is given them.
 */
const HOST = Object.freeze({
  oxides: tables.oxides,
  cones: coneTable(tables.cones),
  limits: tables.limits,
  stull: tables.stull,
  densities: tables.densities,
  expansion: tables.expansion
});

/** A few standard records by id, named here for the reader only. */
const IDS = Object.freeze({
  silica: '037aaaf9-36bd-4105-a481-852421db0b25',
  talc: '6a369ae2-a68a-429d-9ae9-923cea487840',
  whiting: '4b3b6aa7-f743-4a1a-bbed-b0516cf0a32c',
  zinc: '5ba0f4ed-8d6b-4377-87f3-87e16d5e0ab0',
  custer: '72fb4627-1dab-4d26-9974-4c3b128a6ee3',
  epk: '3b4956dc-9f53-4319-9868-052940063b16',
  frit3134: 'd4517cc9-68bb-4439-9131-80c0be48ba70',
  gerstley: '88e03917-f5f7-45b7-83e2-bf59f6b51d20'
});

const MATERIALS = standard.materials;
const ADDITIVES = standard.additives;
const byId = new Map([...MATERIALS, ...ADDITIVES].map((record) => [record.id, record]));

/** A standard record by id; a fresh copy, so a test cannot change another's. */
const record = (id) => {
  const found = byId.get(id);
  if (!found) throw new Error('No standard record ' + id);
  return structuredClone(found);
};

/** Recipe lines: records with amounts, as the recipe tools take them. */
const linesOf = (pairs) => pairs.map(([id, amount]) => ({ ...record(id), amount: String(amount) }));

/** The cone 6 glossy base the app's tests use: 40 spar, 20 whiting, 20 kaolin, 20 silica. */
const GLOSSY = [
  [IDS.custer, 40],
  [IDS.whiting, 20],
  [IDS.epk, 20],
  [IDS.silica, 20]
];

/** What a call throws, so a test can read its code and values. */
const thrown = (run) => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('It did not throw');
};

export { HOST, IDS, MATERIALS, ADDITIVES, record, linesOf, GLOSSY, thrown };
