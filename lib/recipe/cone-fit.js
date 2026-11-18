'use strict';

// The core's cone check (lib/core/recipe/cone-fit.js) as the app reads it (docs/adr/0030-nameless-chemistry-core.md):
// ash and Gerstley borate found by the materials' names, each cone shown with its label (5½), and each
// source with its title and link.
const { HOST } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const { coneLabel } = require('../cones/firing');
const { HESSELBERTH_ROY_LIMITS } = require('./limits');
const core = require('../core/recipe/cone-fit.ts');

/** Where each figure is from, for the note's sources. */
const SOURCES = Object.freeze({
  katz: Object.freeze({
    title: 'Matt Katz, "Boron in Glazes" (Ceramics Monthly, September 2012, pp. 14–15)',
    url: 'https://ceramicartsnetwork.org/docs/default-source/uploadedfiles/wp-content/uploads/2008/10/tf-boroninglazes-0912.pdf'
  }),
  'hesselberth-roy': HESSELBERTH_ROY_LIMITS.source,
  uk: Object.freeze({
    title: 'The UK traditional limits for cone 04–02, as Digitalfire gives them ("Limit formulas and target formulas")',
    url: 'https://digitalfire.com/article/limit+formulas+and+target+formulas'
  })
});

/** Wood or plant ash, not bone ash or the carbonates once called pearl ash and soda ash. */
const ASH = /\bash\b/i;
const NOT_ASH = /\b(bone|pearl|soda)\s+ash\b/i;
const GERSTLEY = /gerstley/i;

// A message's firing as it is shown: a cone by its label, a range of two joined by a dash.
const shown = (params) => {
  if (!params || params.scale === 'band' || params.cone === undefined) return params;
  const { coneTo, ...rest } = params;
  const cone = coneLabel(params.cone) + (coneTo !== undefined ? '–' + coneLabel(coneTo) : '');
  return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, key === 'cone' ? cone : value]));
};

/**
 * Whether a glaze's unity formula fits the firing it is stated for (lib/core/recipe/cone-fit.js).
 * options.materials: the recipe's material names, for ash and Gerstley borate.
 */
const coneFit = inWords((unity, firing, options = {}) => {
  const { materials = [], ...rest } = options;
  const fit = core.coneFit(HOST, unity, firing, {
    ...rest,
    ash: materials.some((name) => ASH.test(name) && !NOT_ASH.test(name)),
    gerstley: materials.some((name) => GERSTLEY.test(name))
  });
  if (!fit) return fit;
  return {
    ...fit,
    sentences: fit.sentences.map((s) => (s.params ? { ...s, params: shown(s.params) } : s)),
    sources: fit.sources.map(({ id }) => ({ id, ...SOURCES[id] }))
  };
});

// The figures the check compares with, Hesselberth & Roy's from the catalog's limits (lib/catalog/limits.ts).
const CONE_FIT = core.coneFitFigures(HOST);
const CONE_FIT_SOURCES = SOURCES;

module.exports = { CONE_FIT, CONE_FIT_SOURCES, coneFit };
