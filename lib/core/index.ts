// The core (docs/adr/0030-nameless-chemistry-core.md): the host's shape and the record types, and each area as
// its own namespace (a name such as unityOf is in more than one). Glazecalc imports an area's index
// (chemistry/index.ts, recipe/index.ts, cones/index.ts) or this one.

export * from './host.ts';
export * from './identity.ts';
export * from './problem.ts';
export * from './traits.ts';
export * from './types.ts';
export * as chemistry from './chemistry/index.ts';
export * as recipe from './recipe/index.ts';
export * as cones from './cones/index.ts';
