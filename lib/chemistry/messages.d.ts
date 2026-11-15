import type { ChemistryError, ChemistryMessage } from './index';

/** Each chemistry message's English by its code (ICU MessageFormat). */
export const MESSAGES: Readonly<Record<string, string>>;
/** The English of a message with its values in place; numbers to two places. */
export function english(code: string, params?: Record<string, unknown>): string;
/** An error that stops a calculation, with its code, its values and its English. */
export function problem(code: string, params?: Record<string, unknown>): ChemistryError;
/** A warning: its code, values and English. */
export function warning(code: string, params?: Record<string, unknown>): ChemistryMessage;
/** A problem from the core, given its English. */
export function worded<E>(error: E): E;
/** The core's warnings worded, as they were met (with `once`, each once by its English), and their English. */
export function wordedWarnings(
  codes: Array<{ code: string; params: Record<string, unknown> }>,
  options: { once: boolean }
): { warnings: string[]; warningCodes: ChemistryMessage[] };
/** A function of the core, its problems worded. */
export function inWords<T extends (...args: any[]) => any>(work: T): T;
/** Sets the core's hooks to Glazecalc's: identity, label, same-material key and traits. */
export function useGlazecalcHosts(): void;
