// The core's one rule for a number saved as text (docs/adr/0030-nameless-chemistry-core.md): a plain decimal,
// "12.5" or "-3", and nothing Number() would read beyond it, such as "12,5", "1e3", "0x10" or "Infinity".
// The chemistry (umf.ts, materials.ts) and the recipes read numbers by it.

const PLAIN = /^-?\d*\.?\d+$/;

/**
 * A number saved plainly ("12.5", "-3"); null for anything else, such as
 * "12,5", "1e3" or "0x10" (which Number() would read).
 */
function plainNumber(text: unknown): number | null {
  const plain = String(text ?? '').trim();
  return PLAIN.test(plain) ? Number(plain) : null;
}

/**
 * A value that may be left out, read as a number: null when it is (absent, null or blank text); a number as
 * it is; text as plainNumber reads it; NaN for anything else ("1e1", "43,97", true), so a caller can tell a
 * value left out from one that is not a number.
 */
function givenNumber(value: unknown): number | null {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) return null;
  if (typeof value === 'number') return value;
  return typeof value === 'string' ? (plainNumber(value) ?? NaN) : NaN;
}

export { plainNumber, givenNumber };
