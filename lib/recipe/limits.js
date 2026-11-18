'use strict';

// The core's limits (lib/core/recipe/limits.ts), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { withHost } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const catalog = require('../catalog/limits.ts');
const core = require('../core/recipe/limits.ts');

// Each limit set as the app shows it: the catalog's figures (lib/catalog/limits.ts), with its name and
// where it is from.
const named = (set, meta) =>
  Object.freeze({ id: set.id, ...meta, ...Object.fromEntries(Object.entries(set).filter(([key]) => key !== 'id')) });
const GLAZECALC_LIMITS = named(catalog.GLAZECALC_LIMITS, {
  name: 'Glazecalc',
  source: Object.freeze({
    title:
      'Glazecalc: docs/adr/0012-choosing-materials.md and the research report "Extra materials in glaze substitution"',
    url: 'https://github.com/AaronFilson/glazecalc/blob/master/docs/adr/0012-choosing-materials.md'
  })
});
const HESSELBERTH_ROY_LIMITS = named(catalog.HESSELBERTH_ROY_LIMITS, {
  name: 'Hesselberth & Roy',
  source: Object.freeze({
    title: `John Hesselberth and Ron Roy, the table "Recommended Stable Glaze 'Limits'" (Ceramics Monthly, September 2000); the link is their book, Mastering Cone 6 Glazes, on Google Books`,
    // The article is not online from its publisher; the link is the book's, on Google Books.
    url: 'https://books.google.com/books/about/Mastering_Cone_6_Glazes.html?id=umSwAAAACAAJ'
  })
});
const LIMIT_SETS = Object.freeze({ 'hesselberth-roy': HESSELBERTH_ROY_LIMITS, glazecalc: GLAZECALC_LIMITS });

const bandOf = inWords(core.bandOf);
const bandIn = inWords(core.bandIn);
const unityFor = inWords(core.unityFor);
const asShown = inWords(core.asShown);
const pastSide = inWords(core.pastSide);
const isLikely = inWords(core.isLikely);
const isThin = inWords(withHost(core.isThin));
const limitRows = inWords(withHost(core.limitRows));

const FIRING = catalog.FIRING;
const CHECK_LIMITS = catalog.CHECK_LIMITS;
const FIRING_BANDS = core.FIRING_BANDS;
const DEFAULT_LIMIT_SET = catalog.DEFAULT_LIMIT_SET;

module.exports = {
  FIRING,
  CHECK_LIMITS,
  FIRING_BANDS,
  GLAZECALC_LIMITS,
  HESSELBERTH_ROY_LIMITS,
  LIMIT_SETS,
  DEFAULT_LIMIT_SET,
  bandOf,
  bandIn,
  unityFor,
  asShown,
  pastSide,
  isLikely,
  isThin,
  limitRows
};
