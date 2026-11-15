'use strict';

const oxides = require('./oxides');
const { prepare, fitAmounts, molesPerGram, newMeter, spent } = require('./fit');

// Choosing among any number of materials (docs/adr/0012-choosing-materials.md):
// offered a pool, propose the fewest that bring the glaze close, and say what
// each one does. Three stages, after the research report "Extra materials in
// glaze substitution":
//   A  the best match the whole pool can make (no pull toward the old amounts);
//   B  drop materials one at a time, the one whose loss matters least, while the
//      match stays under GOOD_ENOUGH (or within SLACK of the best when it cannot
//      get there), new materials before the recipe's own; then try swaps;
//   C  fitAmounts on the few chosen: as few amounts changed as possible.
// One choosing, with what its report tries again, may do at most the work
// its meter allows (fit.js WORK, unless the caller's says otherwise): past
// it, B's dropping and swapping, adding back, and trying unused materials
// stop where they are, with the best found (cutShort says so).

// A miss of 1 is about one oxide off by the whole of "near" (fit.js).
const GOOD_ENOUGH = 1;
const SLACK = 0.5;
// "Closer" adds materials back while each improves the miss by at least this:
// the room fitAmounts itself gives away to change fewer amounts.
const WORTH_ADDING = 0.1;
// A material not used is worth offering if adding it brings the match at least this much closer.
const WORTH_OFFERING = 0.05;
// An oxide is something to aim for if the target has at least this much of it, in the unity formula.
const TRACE = 0.005;
// A pull so slight it only settles ties: when several mixes match equally well,
// the one nearest the recipe as it was, its own materials kept.
const TIE_BREAK = 1e-3;
// Two materials whose oxides per gram point the same way within this are near-identical.
const SAME_DIRECTION = 0.98;
// An oxide worth naming in what a material supplies: not a trace of magnesium in a feldspar.
const WORTH_NAMING = 0.02;
// A material's share of an oxide worth saying: "most of the potash", not "2% of the silica".
const SHARE_WORTH_SAYING = 0.2;
// A last resort (lastResort: a fluorine or soluble material, which Solve and Match pick only where
// nothing else will do) counts in the choosing as this much more miss: of two that come about as near,
// the other is kept, never fluorspar for a whiting's calcium.
const LAST_RESORT = 1;
// A pool of more than SCREEN materials (a whole shelf, up to 500) is screened before stage A: over
// hundreds, A's one match takes all the work allowed before it settles, and the search cut there comes
// out poor (targets made exactly from 4 of 250 materials missed by 22 to 55, and the same with ten times
// the work). Kept: the musts and the recipe's own; for each oxide aimed at, the PER_OXIDE richest in it,
// no two of them alike (SAME_DIRECTION); then those whose oxides point most nearly the target's way, up
// to KEPT in all. Fewer leave the search the work to finish: of 16 such targets from 250 and 500
// materials, keeping 40 left one fair and none poor, keeping 60 two poor. A last resort counts as half
// as rich, so whiting, not fluorspar, stands for the calcium (alike, only one of the two is kept). A
// pool of SCREEN or fewer is chosen from whole, as before.
const SCREEN = 60;
const KEPT = 40;
const PER_OXIDE = 3;
// A material the potter said to use stays in at no less than this share of the batch (or, one of the
// recipe's own, than its own amount if that is less: its 0.5 of lithium carbonate is not raised to 1).
const MUST_SHARE = 0.01;

const isFlux = (oxide) => oxides.OXIDE_GROUPS[oxide] === 'R2O' || oxides.OXIDE_GROUPS[oxide] === 'RO';

/** The unity formula of oxide moles: per mole of the fluxes. */
const unityOf = (moles) => {
  const fluxes = Object.keys(moles).reduce((sum, oxide) => (isFlux(oxide) ? sum + moles[oxide] : sum), 0);
  const unity = {};
  if (fluxes > 0) Object.keys(moles).forEach((oxide) => (unity[oxide] = moles[oxide] / fluxes));
  return unity;
};

/**
 * The order of what a material supplies: largest share first, in bands of 5%;
 * within a band, the oxide the glaze has most of; then by name. A total order
 * (each share banded on its own, not their difference), so every engine sorts
 * alike.
 */
const largestShareFirst = (unity) => (p, q) =>
  Math.round(20 * q.share) - Math.round(20 * p.share) ||
  (unity[q.oxide] || 0) - (unity[p.oxide] || 0) ||
  (p.oxide < q.oxide ? -1 : p.oxide > q.oxide ? 1 : 0);

/** How nearly two vectors point the same way: 1 for the same direction. */
const cosine = (p, q) => {
  let dot = 0;
  let pp = 0;
  let qq = 0;
  p.forEach((value, r) => {
    dot += value * q[r];
    pp += value * value;
    qq += q[r] * q[r];
  });
  return pp > 0 && qq > 0 ? dot / Math.sqrt(pp * qq) : 0;
};

/**
 * The fewest materials from the lines that bring their oxides close to the
 * target, at amounts that change the recipe as little as possible.
 *
 *   lines    [{ material, start, most, least, group, must, avoid, lastResort }]:
 *            start > 0 for the recipe's own lines (dropped last), 0 for
 *            materials offered; must, never dropped; avoid, never used (the
 *            potter's "don't use"); least, the smallest useful amount if it is
 *            used at all; lastResort, used only where nothing else comes as
 *            near (LAST_RESORT: fluorine and soluble materials)
 *   options  as fitAmounts' (near, alkalis, fluxTotal, groups, shares, meter), and
 *            { closer: add back materials worth WORTH_ADDING each,
 *              extras: the most new materials to use,
 *              keepOwn: never drop the recipe's own lines (fitAmounts may still
 *              take one to nothing when the match has no use for it) }
 *
 * Returns {
 *   amounts, moles, miss       the chosen recipe (amounts for every line, 0 if unused)
 *   best                       the best miss the whole pool can make
 *   chosen                     indexes of the lines used
 *   unreachable                oxides the target has that no line supplies
 *   contributions              for each line used: the share of each oxide it supplies, and the
 *                              miss without it: miss, worse by what the best match within the
 *                              chosen lines loses without it
 *   unused                     for each line offered but not used: how much closer the match comes
 *                              when it is added (as a must) and chosen again, or 0
 *   alike                      near-identical pairs: a line used and one that could stand in
 *   capped                     caps that cost match, a line's or a shared one (on an amount or a
 *                              share of the batch, in grams of this batch): what lifting it gains;
 *                              and shared caps the recipe could not keep (broken, with wouldBe what
 *                              their members come to)
 *   countCost                  how much worse the match is for the extras limit, if any
 *   cutShort                   whether the work ran out (the meter's, fit.js WORK) before every step
 *                              was done: the best found by then, perhaps with other materials or more
 *                              amounts changed than needed, and unused tried for the likeliest only
 * }
 */
const selectMaterials = function (lines, target, options = {}) {
  // One meter for the choosing and what it tries again for the report (or the caller's, to share it).
  options = { ...options, meter: options.meter ?? newMeter() };
  const { meter } = options;
  const { fit, within, everything, columns, best, chosen, mustLeast, result, amounts, countCost } = choose(
    lines,
    target,
    options
  );
  const finalUse = new Set(chosen.filter((i) => amounts[i] > 0));
  const finalMiss = result.miss;
  // The best match within the final recipe: what leaving a material out or
  // adding one is measured against, since finalMiss gives some match away to
  // change fewer amounts.
  const base = within(finalUse).miss;

  // Oxides the target has that nothing offered supplies.
  const targetUnity = unityOf(target);
  const unreachable = Object.keys(targetUnity).filter(
    (oxide) =>
      targetUnity[oxide] >= TRACE && !columns.some((column, i) => everything.has(i) && (column[oxide] || 0) > 0)
  );

  // Measured within the final recipe: against the whole pool, a near-identical
  // material would stand in and everything would look free.
  // What each material supplies of the glaze's oxides (as Digitalfire shows it),
  // and how much worse the match is without it, refitted within the final recipe.
  const resultUnity = unityOf(result.moles);
  const contributions = [...finalUse].map((i) => {
    const supplies = Object.keys(result.moles)
      .map((oxide) => ({ oxide, share: ((columns[i][oxide] || 0) * amounts[i]) / result.moles[oxide] }))
      .filter((part) => part.share > 0 && (resultUnity[part.oxide] || 0) >= WORTH_NAMING)
      .sort(largestShareFirst(resultUnity))
      // Its main part, however small, then the others worth saying.
      .filter((part, k) => k === 0 || part.share >= SHARE_WORTH_SAYING);
    const without = new Set(finalUse);
    without.delete(i);
    const missWithout = without.size ? finalMiss + Math.max(0, within(without).miss - base) : Infinity;
    return { index: i, supplies, missWithout };
  });
  // What adding each would really give, chosen again with it a must, as the
  // report's Add does. That is slow, so it is tried only for those the best
  // match within the final recipe gains at least WORTH_OFFERING from, the
  // most promising first: when the work runs out, the likeliest have been
  // tried, and the rest are said to give nothing.
  const left = [...everything].filter((j) => !finalUse.has(j));
  const gains = spent(meter)
    ? left.map((j) => ({ index: j, gain: 0 }))
    : left.map((j) => ({ index: j, gain: base - within(new Set([...finalUse, j])).miss }));
  const helps = new Map();
  for (const { index: j } of gains.filter((g) => g.gain >= WORTH_OFFERING).sort((p, q) => q.gain - p.gain)) {
    if (spent(meter)) break;
    const added = choose(
      lines.map((line, i) => (i === j ? { ...line, must: true } : line)),
      target,
      options
    );
    // A choosing cut short is no measure of what adding it gives.
    if (meter.cut) break;
    helps.set(j, Math.max(0, finalMiss - added.result.miss));
  }
  const unused = gains.map(({ index }) => ({ index, helps: helps.get(index) ?? 0 }));
  // Alike in the fit's own terms: each row weighted by how near it should come,
  // so silica, which every material has, does not make flint look like feldspar.
  const root = fit.problem.w.map(Math.sqrt);
  const direction = fit.problem.a.map((column) => column.map((value, r) => value * root[r]));
  const alike = [];
  for (const i of finalUse) {
    for (const j of everything) {
      if (finalUse.has(j) || j === i) continue;
      if (cosine(direction[i], direction[j]) >= SAME_DIRECTION) alike.push({ used: i, other: j });
    }
  }
  // Caps that cost match: what lifting each alone would give, every other bound
  // kept (each line's least, a must's share), against the best match within
  // the chosen lines as they are.
  const leastKept = (j) => (amounts[j] > 0 ? Math.max(Number(lines[j].least) || 0, mustLeast(j)) : 0);
  const withCaps = (change) =>
    prepare(
      chosen.map((j) => change({ ...lines[j], least: leastKept(j) }, j)),
      target,
      options
    ).solve(0);
  let capBase;
  const asTheyAre = () => (capBase ??= withCaps((line) => line).miss);
  const capped = [];
  chosen.forEach((i, k) => {
    const most = Number(lines[i].most);
    if (!(most >= 0) || amounts[i] < most * (1 - 1e-6)) return;
    const lifted = withCaps((line, j) => (j === i ? { ...line, most: undefined, group: undefined } : line));
    if (asTheyAre() - lifted.miss >= WORTH_ADDING) {
      capped.push({ index: i, most, wouldBe: lifted.x[k], missLifted: lifted.miss });
    }
  });
  // And shared caps: what lifting the group's would give, named by its largest
  // member. A cap the recipe breaks (fitAmounts says which: over it by more
  // than a millionth of the batch, or the cap's own billionth, as fit.js keeps
  // caps) is not held, however little lifting it would give: it is said to be
  // broken, with what its members come to (their leasts alone came to more, or
  // the work ran out first).
  const batch = amounts.reduce((sum, amount) => sum + amount, 0);
  const notHeld = new Set(result.broken ?? []);
  const groups = options.groups || {};
  Object.keys(groups).forEach((name) => {
    const most = Number(groups[name]);
    const members = chosen.filter((i) => lines[i].group === name && amounts[i] > 0);
    const total = members.reduce((sum, i) => sum + amounts[i], 0);
    if (!members.length || !(most >= 0) || total < most * (1 - 1e-6)) return;
    const largest = members.reduce((p, q) => (amounts[q] > amounts[p] ? q : p));
    if (notHeld.has(name)) {
      capped.push({ index: largest, group: name, members, most, wouldBe: total, missLifted: finalMiss, broken: true });
      return;
    }
    const lifted = withCaps((line) => (line.group === name ? { ...line, group: undefined } : line));
    if (asTheyAre() - lifted.miss < WORTH_ADDING) return;
    const wouldBe = members.reduce((sum, i) => sum + lifted.x[chosen.indexOf(i)], 0);
    capped.push({ index: largest, group: name, members, most, wouldBe, missLifted: lifted.miss });
  });
  // And caps on a share of the batch: in grams of this batch, the share and
  // what lifting it would give (its members' share of that match).
  const shares = options.shares || {};
  Object.keys(shares).forEach((name) => {
    const share = Number(shares[name]);
    const members = chosen.filter((i) => lines[i].group === name && amounts[i] > 0);
    const total = members.reduce((sum, i) => sum + amounts[i], 0);
    if (!members.length || !(share >= 0 && share < 1) || total < share * batch * (1 - 1e-6)) return;
    if (notHeld.has(name)) {
      const largest = members.reduce((p, q) => (amounts[q] > amounts[p] ? q : p));
      capped.push({
        index: largest,
        group: name,
        members,
        most: share * batch,
        wouldBe: total,
        missLifted: finalMiss,
        broken: true
      });
      return;
    }
    const lifted = withCaps((line) => (line.group === name ? { ...line, group: undefined } : line));
    if (asTheyAre() - lifted.miss < WORTH_ADDING) return;
    const largest = members.reduce((p, q) => (amounts[q] > amounts[p] ? q : p));
    const liftedBatch = lifted.x.reduce((sum, amount) => sum + amount, 0);
    const liftedMembers = chosen.reduce((sum, i, k) => (lines[i].group === name ? sum + lifted.x[k] : sum), 0);
    const wouldBe = liftedBatch > 0 ? (liftedMembers / liftedBatch) * batch : 0;
    capped.push({ index: largest, group: name, members, most: share * batch, wouldBe, missLifted: lifted.miss });
  });

  return {
    amounts,
    moles: result.moles,
    miss: finalMiss,
    best: best.miss,
    chosen: [...finalUse].sort((p, q) => p - q),
    unreachable,
    contributions,
    unused,
    alike,
    capped,
    countCost,
    cutShort: meter.cut
  };
};

/**
 * Stages A to C: the lines chosen and their amounts (result is fitAmounts' on
 * them), with what the report measures against. The steps that only refine
 * stop once options.meter is spent; the potter's limit on new materials and
 * each line's least are kept all the same.
 */
const choose = function (lines, target, options) {
  const { meter } = options;
  // Each line's least is applied only once it is chosen, since a candidate may be
  // left out; but a must is always in, so its least holds from the start (or the
  // choosing would count on less of it than it will have).
  const pool = lines.map((line) => ({ ...line, least: line.must && !line.avoid ? line.least : 0 }));
  const fit = prepare(pool, target, options);
  const n = lines.length;
  const avoided = new Set(lines.map((line, i) => (line.avoid ? i : -1)).filter((i) => i >= 0));
  const must = new Set(lines.map((line, i) => (line.must && !line.avoid ? i : -1)).filter((i) => i >= 0));
  const own = (i) => (Number(lines[i].start) || 0) > 0;
  // The best match with only the lines in `use` (the rest at nothing); with `stopAt`, as near as it
  // comes before the meter reaches that.
  const within = (use, stopAt = Infinity) => {
    const off = new Set();
    for (let i = 0; i < n; i++) if (!use.has(i)) off.add(i);
    return fit.solve(TIE_BREAK, new Map(), off, stopAt);
  };
  // How many shared caps a match breaks. A choice that breaks more than another is the worse, however
  // near it comes: leaving out the only line that dilutes a share, say, is no better for the miss it saves.
  const breaks = (match) => (match.broken ?? []).length;
  // A match with the lines in `set`, scored for the choosing: its miss, and LAST_RESORT for each last resort.
  const resorts = (set) => [...set].filter((i) => lines[i].lastResort && !must.has(i)).length;
  const scored = (match, set) => match.miss + LAST_RESORT * resorts(set);

  // The oxides aimed at, the most first.
  const targetUnity = unityOf(target);
  const aimedAt = Object.keys(targetUnity)
    .filter((oxide) => targetUnity[oxide] >= TRACE)
    .sort((p, q) => targetUnity[q] - targetUnity[p] || (p < q ? -1 : 1));
  const columns = lines.map((line) => molesPerGram(line.material));
  // A pool of more than SCREEN: the musts, the recipe's own, the richest few in each oxide aimed at, and
  // those nearest the target's way (in the fit's own terms, each oxide weighted by how near it should come),
  // KEPT in all, or more where the musts, the recipe's own and the richest come to more.
  const screen = (offered) => {
    const kept = new Set([...offered].filter((i) => must.has(i) || own(i)));
    const root = fit.problem.w.map(Math.sqrt);
    const direction = fit.problem.a.map((column) => column.map((value, r) => value * root[r]));
    const rich = (i, oxide) => (columns[i][oxide] || 0) * (lines[i].lastResort && !must.has(i) ? 0.5 : 1);
    for (const oxide of aimedAt) {
      const richest = [...offered]
        .filter((i) => rich(i, oxide) > 0)
        .sort((p, q) => rich(q, oxide) - rich(p, oxide) || p - q);
      const taken = [];
      for (const i of richest) {
        if (taken.length >= PER_OXIDE) break;
        if (taken.some((j) => cosine(direction[i], direction[j]) >= SAME_DIRECTION)) continue;
        taken.push(i);
        kept.add(i);
      }
    }
    const toward = fit.problem.b.map((value, r) => value * root[r]);
    const nearest = [...offered]
      .filter((i) => !kept.has(i))
      .map((i) => ({ i, near: cosine(direction[i], toward) }))
      .sort((p, q) => q.near - p.near || p.i - q.i);
    for (const { i } of nearest) {
      if (kept.size >= KEPT) break;
      kept.add(i);
    }
    return kept;
  };

  // A: the whole pool (screened, if large), but what the potter said not to use. Over many materials
  // this one match can take all the work allowed and more: it stops where it is once the work is spent.
  const offered = new Set([...Array(n).keys()].filter((i) => !avoided.has(i)));
  const everything = offered.size > SCREEN ? screen(offered) : offered;
  const best = within(everything, meter.most);
  const threshold = best.miss < GOOD_ENOUGH ? GOOD_ENOUGH : best.miss + SLACK;

  // B: start from what the best match used, and the musts (and, with keepOwn, the recipe's own).
  const used = new Set(
    [...everything].filter((i) => best.x[i] > 1e-9 * fit.size || must.has(i) || (options.keepOwn && own(i)))
  );
  // With the work spent already, what A found within those it uses stands for their best match.
  let current = spent(meter) ? best : within(used);
  const drop = () => {
    // The removal that matters least, new materials before the recipe's own; none once the work is spent.
    let choice = null;
    for (const pass of [false, true]) {
      for (const i of used) {
        if (must.has(i) || own(i) !== pass || (pass && options.keepOwn)) continue;
        if (spent(meter)) return null;
        const without = new Set(used);
        without.delete(i);
        const tried = within(without);
        if (breaks(tried) > breaks(current)) continue;
        const score = scored(tried, without);
        if (tried.miss <= threshold && (!choice || score < choice.score)) choice = { i, tried, score };
      }
      if (choice) return choice;
    }
    return null;
  };
  for (let step = drop(); step; step = drop()) {
    used.delete(step.i);
    current = step.tried;
  }
  // Cut short with more in use than the target has oxides to aim for (no match needs more, but a
  // target many materials can make spreads over dozens of them, and C on all of those would take
  // ten times the work allowed): the musts, the recipe's own with keepOwn, and up to that many
  // others: first, for each oxide aimed at, the material that gives the match most of it (so a minor
  // oxide's one good source is not lost to the larger amounts of the major ones'); then those the
  // match uses most.
  const aimed = Math.max(1, aimedAt.length);
  const kept = [...used].filter((i) => must.has(i) || (options.keepOwn && own(i)));
  if (meter.cut && used.size > Math.max(aimed, kept.length)) {
    const others = [...used].filter((i) => !kept.includes(i)).sort((p, q) => current.x[q] - current.x[p] || p - q);
    const room = Math.max(0, aimed - kept.length);
    const keep = new Set();
    const per = new Map();
    const given = (i, oxide) => {
      if (!per.has(i)) per.set(i, molesPerGram(lines[i].material));
      return (per.get(i)[oxide] || 0) * current.x[i];
    };
    for (const oxide of aimedAt) {
      if (keep.size >= room) break;
      const source = others.reduce((p, q) => (given(q, oxide) > given(p, oxide) ? q : p), others[0]);
      if (given(source, oxide) > 0 && !kept.some((i) => given(i, oxide) >= given(source, oxide))) keep.add(source);
    }
    for (const i of others) if (keep.size < room) keep.add(i);
    for (const i of others) if (!keep.has(i)) used.delete(i);
    current = within(used);
  }
  // Swaps: trade a chosen new material for one not chosen, while that improves the match.
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    for (const i of [...used]) {
      if (must.has(i) || own(i)) continue;
      for (const j of everything) {
        if (used.has(j)) continue;
        if (spent(meter)) break;
        const swapped = new Set(used);
        swapped.delete(i);
        swapped.add(j);
        const tried = within(swapped);
        if ((breaks(tried) - breaks(current) || scored(tried, swapped) - (scored(current, used) - 1e-9)) < 0) {
          used.delete(i);
          used.add(j);
          current = tried;
          improved = true;
          break;
        }
      }
    }
    if (!improved) break;
  }
  // Closer: add back materials while each is worth it.
  if (options.closer) {
    for (;;) {
      let choice = null;
      for (const j of everything) {
        if (used.has(j)) continue;
        if (spent(meter)) break;
        const added = new Set([...used, j]);
        const tried = within(added);
        if (breaks(tried) > breaks(current)) continue;
        const score = scored(tried, added);
        if (scored(current, used) - score >= WORTH_ADDING && (!choice || score < choice.score))
          choice = { j, tried, score };
      }
      if (!choice) break;
      used.add(choice.j);
      current = choice.tried;
    }
  }
  // The limit on new materials: drop the least useful until it holds, noting the cost.
  let countCost = 0;
  const extrasLimit = Number.isFinite(options.extras) ? options.extras : Infinity;
  const extrasUsed = () => [...used].filter((i) => !own(i) && !must.has(i));
  while (extrasUsed().length > extrasLimit) {
    let choice = null;
    for (const i of extrasUsed()) {
      const without = new Set(used);
      without.delete(i);
      const tried = within(without);
      const score = scored(tried, without);
      if (!choice || (breaks(tried) - breaks(choice.tried) || score - choice.score) < 0) choice = { i, tried, score };
    }
    countCost += choice.tried.miss - current.miss;
    used.delete(choice.i);
    current = choice.tried;
  }
  // Cut short, stage A may have taken up only new materials, and the limit on them can leave none at all
  // ("no materials" thrown for a search with the recipe's own on hand): the recipe's own, which the limit
  // does not count, are chosen from then, as the search would have, uncut.
  if (!used.size && meter.cut) for (const i of everything) if (own(i)) used.add(i);

  // C: the chosen few, as few amounts changed as possible; each at least its
  // least, and a must at least a token amount, so it stays in.
  const chosen = [...used].sort((p, q) => p - q);
  const mustLeast = (i) =>
    must.has(i)
      ? Math.max(
          Number(lines[i].least) || 0,
          Math.min(MUST_SHARE * fit.size, own(i) ? Number(lines[i].start) : Infinity)
        )
      : 0;
  const run = (indexes, leastOf) =>
    fitAmounts(
      indexes.map((i) => ({ ...lines[i], least: Math.max(leastOf(i), mustLeast(i)) })),
      target,
      options
    );
  let result = run(chosen, () => 0);
  // A material under its least: tried at nothing and at its least, keeping the
  // better: the one that breaks fewer shared caps (so a member is kept at
  // nothing rather than raised to a least that breaks its cap), then the
  // nearer match. Those raised to their least stay at it or more in every run
  // after, and after any change the scan starts over, since a change can leave
  // a material already passed under its least.
  const raised = new Set();
  const leastOf = (i) => (raised.has(i) ? Number(lines[i].least) || 0 : 0);
  for (let k = 0; k < chosen.length; k++) {
    const i = chosen[k];
    const least = Number(lines[i].least) || 0;
    const amount = result.amounts[k];
    if (!(least > 0) || amount <= 0 || amount >= least || must.has(i) || raised.has(i)) continue;
    const without = chosen.filter((j) => j !== i);
    const atNothing = without.length ? run(without, leastOf) : null;
    const atLeast = run(chosen, (j) => (j === i ? least : leastOf(j)));
    if (atNothing && (breaks(atNothing) - breaks(atLeast) || atNothing.miss - atLeast.miss) <= 0) {
      chosen.splice(k, 1);
      result = atNothing;
    } else {
      raised.add(i);
      result = atLeast;
    }
    k = -1;
  }
  const amounts = new Array(n).fill(0);
  chosen.forEach((i, k) => (amounts[i] = result.amounts[k]));
  return { fit, within, everything, columns, best, chosen, mustLeast, result, amounts, countCost };
};

module.exports = { selectMaterials, unityOf, GOOD_ENOUGH, WORTH_ADDING };
