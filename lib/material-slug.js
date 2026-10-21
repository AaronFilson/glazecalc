'use strict';

// The address of a standard material's public page (/materials/<slug>), made
// from its name: "Ferro Frit 3134" is ferro-frit-3134, "Mondré & Manz Frit M 1233"
// mondre-and-manz-frit-m-1233. Letters that are not Latin (the Japanese in
// "Amakusa Pottery Stone (天草陶石)") are left out, the Latin name before them
// stays. Every standard material's slug is its own (server/test/pages_tests.ts).

/**
 * @param {string} name
 * @returns {string}
 */
const materialSlug = (name) =>
  String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

module.exports = { materialSlug };
