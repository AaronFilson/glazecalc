'use strict';

// Each live language's link preview image (og:image, twitter:image), as
// scripts/og-images.mjs made it: its file under client/public, named for its
// content's hash (og/de.c10d78d3.jpg), so a new image is a new address that
// link previews fetch again. 1200 x 630, as index.html says.
const OG_IMAGES = require('./og-images.json');

/** The English image's file, or the old og-image.png if there is none. */
const ENGLISH = OG_IMAGES.en ?? 'og-image.png';

/**
 * The preview image's file for a language: its own where it has one, else the English.
 * @param {string} code
 * @returns {string}
 */
const ogImageFile = (code) => (Object.hasOwn(OG_IMAGES, code) ? OG_IMAGES[code] : ENGLISH);

module.exports = { OG_IMAGES, ogImageFile };
