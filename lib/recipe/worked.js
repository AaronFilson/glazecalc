'use strict';

const { MOLAR_MASS, OXIDE_GROUPS } = require('../chemistry');
const { prepareMaterial } = require('../chemistry/materials');
const { problem } = require('../chemistry/messages');

// The unity (Seger) formula worked out step by step, as a potter would on
// paper, for teaching: each material's grams, the oxides it leaves after
// firing and their moles, the moles of each oxide in the batch, the fluxes
// added up, and each oxide divided by them. The arithmetic is calculateUMF's
// (lib/chemistry/umf.js), step for step, so the answer is the recipe page's.

/** The oxides in the order potters read them: fluxes (R₂O, RO), then R₂O₃ and RO₂, as OXIDE_GROUPS lists them. */
const ORDER = Object.keys(OXIDE_GROUPS);
const byOrder = (a, b) => ORDER.indexOf(a) - ORDER.indexOf(b);
const isFlux = (oxide) => OXIDE_GROUPS[oxide] === 'R2O' || OXIDE_GROUPS[oxide] === 'RO';

/**
 * The working of a unity formula, from recipe lines ([{ material, amount }],
 * each material with its chemistry, as calculateUMF takes them). Amounts are
 * read as grams; a line of 0 is left out. Throws the chemistry's error where
 * calculateUMF would (a material with no analysis, no flux at all).
 */
function workedCalculation(lines) {
  const materials = [];
  const moles = {};
  let batchGrams = 0;
  for (const line of lines) {
    const grams = Number(line.amount);
    if (!(grams > 0)) continue;
    const prepared = prepareMaterial(line.material);
    batchGrams += grams;
    const oxides = Object.keys(prepared.analysis)
      .filter((oxide) => prepared.analysis[oxide] > 0)
      .sort(byOrder)
      .map((oxide) => {
        const percent = prepared.analysis[oxide];
        const oxideGrams = (grams * percent) / 100;
        const oxideMoles = oxideGrams / MOLAR_MASS[oxide];
        moles[oxide] = (moles[oxide] || 0) + oxideMoles;
        return { oxide, percent, grams: oxideGrams, molarMass: MOLAR_MASS[oxide], moles: oxideMoles };
      });
    materials.push({ name: prepared.name, grams, loi: prepared.loi, oxides });
  }
  const present = Object.keys(moles).sort(byOrder);
  const fluxes = present.filter(isFlux).map((oxide) => ({ oxide, moles: moles[oxide] }));
  const fluxMoles = fluxes.reduce((sum, flux) => sum + flux.moles, 0);
  // As calculateUMF says it: there is nothing to divide by.
  if (!(fluxMoles > 0)) throw problem('no-flux');
  return {
    batchGrams,
    materials,
    fluxes,
    fluxMoles,
    oxides: present.map((oxide) => ({
      oxide,
      group: OXIDE_GROUPS[oxide],
      flux: isFlux(oxide),
      moles: moles[oxide],
      unity: moles[oxide] / fluxMoles
    }))
  };
}

module.exports = { workedCalculation };
