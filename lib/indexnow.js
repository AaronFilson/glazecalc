'use strict';

// The site's IndexNow key (https://www.indexnow.org/documentation), which tells
// search engines that a list of changed addresses comes from the site's owner.
// It is public by design: client/public/<key>.txt holds it, served at
// https://glazecalcapp.com/<key>.txt, and scripts/indexnow.mjs sends it.
const INDEXNOW_KEY = '7f3c9a2e5b8d41f6a0c2e9b74d1f8a63';

module.exports = { INDEXNOW_KEY };
