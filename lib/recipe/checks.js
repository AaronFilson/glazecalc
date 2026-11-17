'use strict';

// The core's checks (lib/core/recipe/checks.js), their problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { withHost } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/checks.ts');

const pastLimits = inWords(withHost(core.pastLimits));
const sizeNotes = inWords(withHost(core.sizeNotes));
const rawClayPercent = inWords(withHost(core.rawClayPercent));
const isRawClay = inWords(withHost(core.isRawClay));
const rawClayHigh = inWords(core.rawClayHigh);
const bariumSeverity = inWords(core.bariumSeverity);

module.exports = { pastLimits, sizeNotes, rawClayPercent, isRawClay, rawClayHigh, bariumSeverity };
