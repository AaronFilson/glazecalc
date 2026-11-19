'use strict';

// Typed numbers are read and written by the catalog (lib/catalog/numbers.ts).
const numbers = require('../catalog/numbers.ts');

const { plainNumber, plainDigits, withoutDirectionMarks, separators, parseNumber, forTyping, toPlain } = numbers;

module.exports = { plainNumber, plainDigits, withoutDirectionMarks, separators, parseNumber, forTyping, toPlain };
