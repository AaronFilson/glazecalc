'use strict';

// The catalog's ids (lib/catalog/ids.ts), with Glazecalc's host given.
const { withHost } = require('../chemistry/host');
const catalog = require('../catalog/host/index.ts');

const idsNamed = withHost(catalog.idsNamed);
const byName = catalog.byName;

module.exports = { idsNamed, byName };
