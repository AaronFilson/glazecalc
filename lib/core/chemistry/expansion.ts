// A glaze's calculated thermal expansion, as Digitalfire's Insight and Glazy
// work it out: each fired oxide's weight percent (volatiles left out, the
// whole normalized to 100) times its coefficient, summed. The result reads as
// x10^-6 per °C, typically 5 to 8. It is for comparing glazes, not a measured
// value; which way it moves is surer than by how much.
//
// The coefficients per weight percent are the host's (host.expansion; the catalog's, lib/catalog/expansion.ts).

import type { Host } from '../host.ts';

/** The calculated expansion of a fired analysis ({ oxide: weight percent }), or null with nothing to go on. */
const expansion = function (host: Host, analysis: Record<string, unknown> | null | undefined): number | null {
  const oxides = Object.keys(analysis || {});
  const total = oxides.reduce((sum, oxide) => sum + (Number(analysis![oxide]) || 0), 0);
  if (!(total > 0)) return null;
  return oxides.reduce(
    (sum, oxide) => sum + ((Number(analysis![oxide]) || 0) / total) * 100 * (host.expansion[oxide] || 0),
    0
  );
};

export { expansion };
