'use strict';

const oxides = require('./oxides');
const { ALKALIS, CLOSE, CLOSE_APART, CLOSE_SHARE } = require('./fit');
const { unityOf } = require('./select');

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

const row = (oxide, was, now, close) => {
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
 */
function closeness(target, moles) {
  const was = unityOf(target);
  const now = unityOf(moles);
  const shown = [...new Set([...Object.keys(was), ...Object.keys(now)])].filter(
    (oxide) => Math.max(was[oxide] || 0, now[oxide] || 0) >= SHOWN
  );
  const place = (oxide) => {
    const group = ORDER.indexOf(oxides.OXIDE_GROUPS[oxide]);
    return group < 0 ? ORDER.length : group;
  };
  const rows = shown
    .sort((p, q) => place(p) - place(q) || (was[q] || 0) - (was[p] || 0) || p.localeCompare(q))
    .map((oxide) => row(oxide, was[oxide] || 0, now[oxide] || 0, ALKALIS.includes(oxide) ? CLOSE_APART : CLOSE));
  if (shown.some((oxide) => ALKALIS.includes(oxide))) {
    const both = (unity) => ALKALIS.reduce((sum, oxide) => sum + (unity[oxide] || 0), 0);
    const after = rows.filter((r) => place(r.oxide) === 0).length;
    rows.splice(after, 0, row('KNaO', both(was), both(now), CLOSE));
  }
  const verdict = rows.some((r) => r.verdict === 'far')
    ? 'poor'
    : rows.every((r) => r.verdict === 'close')
      ? 'close'
      : 'fair';
  return { verdict, oxides: rows };
}

module.exports = { closeness };
