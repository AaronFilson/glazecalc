// What the chemistry tells a person: each problem and warning has a code and
// its English, with named values (docs/translating.md). The app shows it in
// the reader's language by its code (client/public/i18n/chemistry/<lang>.json,
// whose English npm run i18n:sources writes from here); elsewhere, and where
// there is no translation, the English is used. Messages are ICU
// MessageFormat, so a literal brace is quoted.
//
// The English of the core's codes, and the app's way of putting it on what the core returns: Glazecalc's
// (docs/adr/0030-nameless-chemistry-core.md). With it, formatFormula, which writes a formula's counts as
// subscripts.

import type { Params, Problem, Warning } from '../core/problem.ts';

/** A problem or warning from the core with its English: `message` is the English. */
export type WordedWarning = Warning & { message: string };

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

// A chemical formula for display, with its counts as subscripts:
// Ca3(PO4)2 becomes Ca₃(PO₄)₂. Only the digits right after an element or a
// closing bracket are counts. Coefficients and amounts stay as they are, so
// 2CaO•3B2O3 becomes 2CaO•3B₂O₃ and "CaO: 0.304" is unchanged. Text that
// already has subscripts is left as it is.
const formatFormula = (text: unknown): string =>
  String(text ?? '').replace(/([A-Za-z)\]])(\d+(?:\.\d+)?)/g, (_match, before: string, count: string) => {
    return before + count.replace(/\d/g, (digit) => SUBSCRIPT_DIGITS[Number(digit)]!);
  });

const MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  // Problems that stop a calculation.
  'unknown-compound': 'Unknown compound {compound} in formula',
  'unknown-oxide': 'Unknown oxide {oxide} in material {material}',
  'invalid-oxide-amount': 'Invalid amount for {oxide} in material {material}',
  'loi-range': 'LOI of {material} must be at least 0 and less than 100',
  'invalid-loi': 'LOI of {material} must be a number',
  'invalid-molecular-weight': 'Molecular weight of {material} must be a number',
  'no-oxides': 'Material {material} has no oxides',
  'unknown-percentmole': 'Material {material} must give its oxides in percent or in moles',
  'no-name': 'Material must have a name',
  'no-analysis': 'Material {material} needs a formula or an analysis',
  'recipe-shape': "Recipe must be an array of '{ material, amount }' or a map of amounts",
  'invalid-amount': 'Invalid amount for material {material}',
  'missing-material': 'Recipe line is missing a material',
  'unknown-material': 'Unknown material {material}',
  'blank-name': 'The name {name} of material {material} has no letters or digits to find it by',
  'duplicate-name': 'Materials {other} and {material} both go by the name {name}',
  'no-flux': 'Recipe contains no flux oxides, so the UMF is undefined',
  'no-target': 'The target has no oxides to aim for',
  'no-materials': 'There are no materials to work out',
  'no-temperature': 'The firing temperature is needed to set the boron',
  'no-flux-to-rebuild': 'The glaze has no flux to rebuild',
  'unknown-element': 'Unknown element {element} in {formula}',
  'bad-formula': 'Could not parse formula {formula}',
  // Warnings: the calculation goes on.
  'analysis-total': 'Analysis of {material} totals {total}% including LOI; expected about 100%.',
  'stored-equivalent':
    'The stored equivalent weight of {material} does not match its formula and LOI; the formula and LOI were used instead.',
  'trace-flux': 'Recipe contains only traces of flux oxides, so the UMF is not meaningful.',
  'colorant-flux':
    'Colorant oxides ({oxides}) are most of the flux, so the unity formula is scaled to them; compare it only with other colorant-rich glazes, not with limits for ordinary glazes.',
  'silica-high':
    'The unity formula has {silica} SiO₂, unusually high for a glaze: the recipe is for a very high firing, has too little flux, or is not a glaze.',
  'loi-molecular-weight':
    'The LOI of {material} ({loi}%) does not match its molecular weight, which gives {implied}%; the LOI was used.',
  'molecular-weight-low':
    'The molecular weight of {material} ({molecularWeight}) is less than its fired oxides weigh ({firedWeight}), so it gives no LOI: check the formula and the molecular weight.'
});

/** The English of a message with its values in place. Numbers are written to two places. */
const english = (code: string, params?: Params | null): string =>
  MESSAGES[code]!.replace(/\{(\w+)\}/g, (_whole, name: string) => {
    const value = params && params[name];
    return typeof value === 'number' ? value.toFixed(2) : String(value);
  }).replace(/'(\{[^']*\})'/g, '$1');

/** An error that stops a calculation, with its code and values for the app to translate. */
const problem = (code: string, params?: Params): Problem => {
  const error = new Error(english(code, params)) as Problem;
  error.code = code;
  error.params = params || {};
  return error;
};

/** A warning: its English, and its code and values. */
const warning = (code: string, params?: Params): WordedWarning => ({
  code,
  params: params || {},
  message: english(code, params)
});

// The core's values as the words show them: oxides written with subscripts, the colorants as a list.
const shown = (code: string, params: Params | undefined): Params | undefined => {
  if (!params) return params;
  if ((code === 'unknown-oxide' || code === 'invalid-oxide-amount') && params['oxide'] !== undefined) {
    params['oxide'] = formatFormula(params['oxide']);
  }
  if (code === 'colorant-flux' && Array.isArray(params['oxides'])) {
    params['oxides'] = (params['oxides'] as unknown[]).map(formatFormula).join(', ');
  }
  return params;
};

/** A problem from the core, given its English (the same error, so its stack and identity stay). */
const worded = <E>(error: E): E => {
  const e = error as Partial<Problem> | null | undefined;
  if (e && typeof e.code === 'string' && Object.hasOwn(MESSAGES, e.code)) {
    e.params = shown(e.code, e.params || {});
    e.message = english(e.code, e.params);
  }
  return error;
};

/** A warning from the core, with its English. */
const wordedWarning = (w: Warning): WordedWarning => {
  const out = w as WordedWarning;
  out.params = shown(w.code, w.params) as Params;
  out.message = english(w.code, w.params);
  return out;
};

/** The core's warnings worded, as they were met (with `once`, each once by its English); and their English. */
const wordedWarnings = (
  codes: ReadonlyArray<Warning>,
  { once }: { once: boolean }
): { warnings: string[]; warningCodes: WordedWarning[] } => {
  const kept: WordedWarning[] = [];
  codes.forEach((w) => {
    const done = wordedWarning(w);
    if (!once || !kept.some((other) => other.message === done.message)) kept.push(done);
  });
  return { warnings: kept.map((w) => w.message), warningCodes: kept };
};

/** A function of the core, its problems worded. */
const inWords = <T extends (...args: never[]) => unknown>(work: T): T =>
  function (this: unknown, ...args: Parameters<T>) {
    try {
      return work.apply(this, args);
    } catch (error) {
      throw worded(error);
    }
  } as T;

/** A figure as the core gives it: a number, the places to write it to, and whether fewer will do. */
interface Figure {
  readonly value: number;
  readonly places: number;
  readonly upTo?: boolean;
}

/** A figure written in a locale, 4-digit numbers kept together (1240, 12 345). */
function figureText(value: Figure, locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: value.upTo ? 0 : value.places,
    maximumFractionDigits: value.places,
    useGrouping: 'min2',
    signDisplay: 'negative'
  }).format(value.value);
}

/** A message's values as text and plain numbers, for a message format: figures written in the locale. */
function paramsText(
  message: { readonly params?: Readonly<Record<string, unknown>> | null },
  locale = 'en',
  write: (value: Figure) => unknown = (value) => figureText(value, locale)
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(message.params ?? {}).map(([name, value]) => [
      name,
      value && typeof value === 'object' ? write(value as Figure) : value
    ])
  );
}

export {
  MESSAGES,
  english,
  figureText,
  formatFormula,
  inWords,
  paramsText,
  problem,
  warning,
  worded,
  wordedWarning,
  wordedWarnings
};
