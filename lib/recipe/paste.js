'use strict';

// Paste-in import (docs/adr/0030-nameless-chemistry-core.md): the catalog's reader of pasted recipes
// (lib/catalog/paste.ts), with Glazecalc's host given to parsePaste, whose firing lines are read with its cone
// charts.
const paste = require('../catalog/text/index.ts');
const { withHost } = require('../chemistry/host');

const {
  PASTE_LIMITS,
  ambiguousNumbers,
  pasteTooLong,
  spacedReading,
  joinedNumber,
  importAmounts,
  matchName,
  nameMatcher,
  likeness,
  foldedName,
  compactName
} = paste;
const parsePaste = withHost(paste.parsePaste);

module.exports = {
  PASTE_LIMITS,
  ambiguousNumbers,
  pasteTooLong,
  parsePaste,
  spacedReading,
  joinedNumber,
  importAmounts,
  matchName,
  nameMatcher,
  likeness,
  foldedName,
  compactName
};
