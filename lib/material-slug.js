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

/**
 * The addresses of standard materials that were renamed, to the address they
 * have now, so a link or a search result from before still finds the page
 * (server/app.ts answers the old one with a 301): "Nepheline Syenite" became
 * "Nepheline Syenite (typical)" when the generic word was freed to offer a
 * choice (2026-11-13).
 */
const FORMER_SLUGS = Object.freeze({ 'nepheline-syenite': 'nepheline-syenite-typical' });

/**
 * The current slug for a renamed material's former one; null for any other.
 * @param {string} slug
 * @returns {string | null}
 */
const currentSlug = (slug) => (Object.hasOwn(FORMER_SLUGS, slug) ? FORMER_SLUGS[slug] : null);

module.exports = { materialSlug, FORMER_SLUGS, currentSlug };
