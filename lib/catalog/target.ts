// Reading a target pasted from another app, for Solve (lib/core/recipe/solve.ts): the oxides and amounts of
// the unity formula it aims at.

import { LOI, TOGETHER } from '../core/recipe/solve.ts';
import type { Host } from '../core/host.ts';
import type { Oxides } from '../core/types.ts';

// "SiO2 3.20", "SiO₂: 3,2", one per line or several on one, or a row of oxides over a row of numbers.

/** Subscript digits as plain ones: SiO₂ is SiO2. */
const SUBSCRIPTS: Readonly<Record<string, string>> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9'
};
/**
 * A word that may be an oxide's formula, whole, then perhaps a colon or equals
 * sign, then a number: "SiO2 3.20", not "SiO" and 2.
 */
const PAIR = /(?<![A-Za-z0-9])([A-Za-z][A-Za-z0-9]*)(?![A-Za-z0-9])[ \t]*[:=]?[ \t]*(\d+(?:[.,]\d+)?|[.,]\d+)/g;
const FORMULA = /^[A-Z][A-Za-z0-9]*$/;
const NUMBER = /^(\d+(?:[.,]\d+)?|[.,]\d+)$/;

/** The oxide a pasted name stands for, as the app writes it, ignoring case: "sio2" is SiO2. */
const knownName = (host: Pick<Host, 'oxides'>, name: string): string | undefined => {
  const wanted = name.toLowerCase();
  if (wanted === LOI.toLowerCase()) return LOI;
  return (
    Object.keys(host.oxides.groups).find((oxide) => oxide.toLowerCase() === wanted) ??
    TOGETHER.find((together) => together.toLowerCase() === wanted)
  );
};
const numberOf = (text: string): number => Number(text.replace(',', '.'));
/** Whether a word reads as an oxide's formula: a capital first and oxygen last (Xx2O3, CO2), not "Total" or "UMF". */
const formulaLike = (word: string): boolean => FORMULA.test(word) && /O\d*$/.test(word) && word.length <= 8;

/**
 * The oxides in pasted text: { oxides: { oxide: amount }, unknown: [names that
 * look like formulas the app does not know], together: whether potash and
 * soda came together (KNaO) }. LOI is read and left out. An oxide given twice
 * keeps the first.
 */
function parseTarget(
  host: Pick<Host, 'oxides'>,
  text: unknown
): { oxides: Oxides; unknown: string[]; together: boolean } {
  const plain = String(text ?? '').replace(/[₀-₉]/g, (digit) => SUBSCRIPTS[digit]);
  const oxides: Oxides = {};
  const unknown: string[] = [];
  let together = false;
  const take = (name: string, value: string) => {
    const oxide = knownName(host, name);
    if (!oxide) {
      if (formulaLike(name) && !unknown.includes(name)) unknown.push(name);
      return;
    }
    if (oxide === LOI) return;
    if (TOGETHER.includes(oxide)) {
      together = true;
      return;
    }
    if (!(oxide in oxides)) oxides[oxide] = numberOf(value);
  };
  for (const [, name, value] of plain.matchAll(PAIR)) take(name, value);
  // A row of oxides over a row of numbers, as a spreadsheet copies a table.
  if (!Object.keys(oxides).length && !together) {
    const rows = plain
      .split(/\r?\n/)
      .map((row) => row.split(/[\t;]|\s+/).filter(Boolean))
      .filter((row) => row.length);
    for (let r = 0; r + 1 < rows.length; r++) {
      const [names, values] = [rows[r], rows[r + 1]];
      if (names.length > 1 && names.every((word) => FORMULA.test(word)) && values.length >= names.length) {
        const numbers = values.slice(values.length - names.length);
        if (numbers.every((value) => NUMBER.test(value))) names.forEach((name, i) => take(name, numbers[i]));
      }
    }
  }
  return { oxides, unknown, together };
}

export { parseTarget };
