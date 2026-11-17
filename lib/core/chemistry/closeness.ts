import { ALKALIS, CLOSE, CLOSE_APART, CLOSE_SHARE } from './fit.ts';
import { problem } from '../problem.ts';
import { unityOf } from './select.ts';
import type { Oxides } from '../types.ts';
import type { Host } from '../host.ts';

export type Verdict = 'close' | 'off' | 'far';

/** One oxide compared: its unity amounts was and now, how near it should come, and the verdict. */
export interface ClosenessRow {
  oxide: string;
  was: number;
  now: number;
  difference: number;
  near: number;
  verdict: Verdict;
}

export interface Closeness {
  verdict: 'close' | 'fair' | 'poor';
  oxides: ClosenessRow[];
}

// How near a match comes to what it aims at, oxide by oxide, in terms a potter
// (or an assistant reading a tool's answer) can weigh without the fit's own
// score: the two unity formulas, each per mole of its own fluxes as a potter
// compares two glazes, against how near the fit tries to bring each oxide
// (fit.js: within 0.02, or 5% of a large amount such as silica's; potash and
// soda apart within 0.06, and together as near as any oxide).

// An oxide worth comparing: at least this much in either unity formula.
const SHOWN = 0.01;
// Off by more than this many times "near" is far: another glaze, not the same one varied.
const FAR = 3;
// Fluxes first, then alumina and boron, then silica, as a unity formula is read.
const ORDER = ['R2O', 'RO', 'R2O3', 'RO2'];

const row = (oxide: string, was: number, now: number, close: number): ClosenessRow => {
  const near = Math.max(close, CLOSE_SHARE * was);
  const difference = now - was;
  const off = Math.abs(difference) / near;
  return { oxide, was, now, difference, near, verdict: off <= 1 + 1e-9 ? 'close' : off <= FAR ? 'off' : 'far' };
};

/**
 * How near the moles come to the target's, oxide by oxide, in the unity formula.
 *
 * Returns { verdict, oxides: [{ oxide, was, now, difference, near, verdict }] }:
 * each oxide's verdict is 'close' (within near of it), 'off' (within three
 * times near) or 'far'; KNaO is potash and soda together, after them. The whole
 * is 'close' when every oxide is, 'poor' when any is far, and 'fair' otherwise.
 * A target with no fluxes has no unity formula to come near: it throws
 * 'no-flux', as calculateUMF does. Moles with no fluxes, against a target that
 * has them, are 'poor'.
 */
function closeness(host: Host, target: Oxides, moles: Oxides): Closeness {
  const was = unityOf(host, target);
  if (!Object.keys(was).length) throw problem('no-flux');
  const now = unityOf(host, moles);
  const shown = [...new Set([...Object.keys(was), ...Object.keys(now)])].filter(
    (oxide) => Math.max(was[oxide] || 0, now[oxide] || 0) >= SHOWN
  );
  const place = (oxide: string) => {
    const group = ORDER.indexOf(host.oxides.groups[oxide]);
    return group < 0 ? ORDER.length : group;
  };
  const rows = shown
    // Ties by name, compared as plain text: not by the reader's language, which can sort ZrO2 before TiO2.
    .sort((p, q) => place(p) - place(q) || (was[q] || 0) - (was[p] || 0) || (p < q ? -1 : p > q ? 1 : 0))
    .map((oxide) => row(oxide, was[oxide] || 0, now[oxide] || 0, ALKALIS.includes(oxide) ? CLOSE_APART : CLOSE));
  if (shown.some((oxide) => ALKALIS.includes(oxide))) {
    const both = (unity: Oxides) => ALKALIS.reduce((sum, oxide) => sum + (unity[oxide] || 0), 0);
    const after = rows.filter((r) => place(r.oxide) === 0).length;
    rows.splice(after, 0, row('KNaO', both(was), both(now), CLOSE));
  }
  const verdict =
    !Object.keys(now).length || rows.some((r) => r.verdict === 'far')
      ? 'poor'
      : rows.every((r) => r.verdict === 'close')
        ? 'close'
        : 'fair';
  return { verdict, oxides: rows };
}

export { closeness };
