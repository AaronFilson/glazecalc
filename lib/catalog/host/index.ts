// The catalog's tables and readers for the core's host (lib/chemistry/host.js builds Glazecalc's from them):
// oxides, cones, limits and Stull, densities, expansion, policy, and the readers of traits, ids and keys. A finer
// index than lib/catalog/index.ts, so a bundle that needs only the host takes only these.

export * from '../oxides.ts';
export * from '../cones.ts';
export * from '../limits.ts';
export * from '../densities.ts';
export * from '../expansion.ts';
export * from '../policy.ts';
export * from '../readers.ts';
export * from '../traits.ts';
export * from '../density-names.ts';
export * from '../same-key.ts';
export * from '../ids.ts';
