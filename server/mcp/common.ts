// What the MCP tools share: the shape of a recipe line, finding its material,
// the firing, the language, how a result and a refusal are sent, and the
// limit on the tools that fit amounts (docs/integrations-plan.md, item 23).
import * as z from 'zod';
import chemistry from '../../lib/chemistry/index.js';
import firingLib from '../../lib/cones/firing.js';
import type { Band, FiringBlock } from '../../lib/cones/firing.js';
import recipe from '../../lib/recipe/index.js';
import type { Caution, MaterialRecord } from '../../lib/recipe/index.js';
import * as log from '../lib/log.ts';
import { findMaterial, searchLibrary } from './library.ts';
import { writeChallenge } from './urls.ts';
import { cautionText, chemistryText, languageOf, recipeText } from './words.ts';

/** At most this many lines in a recipe sent to a tool. */
export const MOST_LINES = 40;

/** Who is calling, for the limits: 'user:<id>' with a token, 'ip:<address>' without. */
export interface Caller {
  key: string;
  /** The account, when the request carried a working token with data:read. */
  userId?: string;
  tokenId?: string;
  /** The token's name, for the activity log. */
  name?: string;
  scopes?: string[];
  /** Which kind of token: a personal one, or an app connected with OAuth (docs/adr/0024). */
  via?: 'pat' | 'oauth';
  /** The connected app's client id (OAuth only). */
  clientId?: string;
}

export const languageArg = z
  .string()
  .max(20)
  .optional()
  .describe(
    'The language for any sentences in the answer, as a BCP 47 tag such as "en", "de" or "ja". Languages Glazecalc does not offer are answered in English.'
  );

export const lineSchema = z.object({
  material: z
    .string()
    .min(1)
    .max(200)
    .describe(
      'The material, by its name in the Glazecalc library ("Custer Spar", "Whiting", "EPK"), or your own name when you give its analysis.'
    ),
  amount: z
    .number()
    .min(0)
    .max(100000)
    .describe('Its amount in the recipe, in any unit the other lines share (grams, parts, percent).'),
  analysis: z
    .record(z.string().max(20), z.number().min(0).max(100))
    .optional()
    .describe(
      'Only for a material not in the library: its oxides in weight percent, as { "SiO2": 68.5, "Al2O3": 17.4 }.'
    ),
  loi: z.number().min(0).max(99.9).optional().describe('Its loss on ignition in percent, with an analysis.')
});
export type Line = z.infer<typeof lineSchema>;

export const linesArg = z
  .array(lineSchema)
  .min(1)
  .max(MOST_LINES)
  .describe(`The recipe's base materials (not colorants), at most ${MOST_LINES} lines.`);

/** The highest firing temperature a tool takes, as a recipe's firing does (FIRING_LIMITS in lib/cones/firing.js). */
const MOST_CELSIUS = firingLib.FIRING_LIMITS.celsius.max;

export const firingArg = z
  .object({
    cone: z
      .string()
      .max(10)
      .optional()
      .describe(
        'An Orton cone from 022 to 42 ("06", "6", "10", "14", a half cone as "5.5"), or with chart "sk" an SK cone (JIS R 8101) from SK 022 to SK 20 ("6a", "8", "14").'
      ),
    chart: z
      .enum(['orton', 'sk'])
      .optional()
      .describe('Which cones the cone is: Orton (the default) or SK (JIS R 8101).'),
    celsius: z.number().min(500).max(MOST_CELSIUS).optional(),
    fahrenheit: z
      .number()
      .min(900)
      .max(Math.round(recipe.fahrenheit(MOST_CELSIUS)))
      .optional()
  })
  .optional()
  .describe(
    'The firing, as a cone or a temperature. Leave it out when it is not known. From cone 12 up (about 1320 °C) no published glaze limits reach, so the limits are not checked there; the cone check judges cone 06 to 10 only.'
  );
export type Firing = z.infer<typeof firingArg>;

/** A tool's answer: the data, and the same as JSON text for clients that read only text. */
export const ok = <T extends Record<string, unknown>>(data: T) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  structuredContent: data
});

/** A tool's refusal, in words the assistant can pass on. */
export const fail = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: true as const });

/** Thrown inside a tool to refuse with these words; the tool's wrapper turns it into fail(). */
export class ToolProblem extends Error {}

/**
 * A ToolProblem for a token that may only read, calling a tool that changes
 * records. Its refusal also carries the challenge that asks for more, in
 * _meta["mcp/www_authenticate"], where ChatGPT looks for one in a tool's result.
 */
export class ScopeProblem extends ToolProblem {}

/**
 * A cone as Glazecalc writes it in its chart ("5½" as "5.5", SK "6" as "6a"),
 * or a ToolProblem saying which cones there are.
 */
export const coneOf = (cone: string, chart: 'orton' | 'sk' = 'orton'): string => {
  const typed = cone
    .trim()
    .toLowerCase()
    .replace(/^(?:sk|cone)\s*/, '')
    .replace(/\s*½$/, '.5');
  const found = chart === 'sk' ? firingLib.skCone(typed) : typed;
  if (found && firingLib.isCone(chart, found)) return found;
  throw new ToolProblem(
    chart === 'sk'
      ? `SK ${cone} is not in Glazecalc's SK chart: JIS R 8101 large cones, SK 022 to SK 20 (022 … 016, 015a … 01a, 1a … 6a, then 7 … 20). You can give the temperature instead.`
      : `Cone ${cone} is not an Orton cone: Orton's run 022 … 01, then 1 … 42, with half cones from 1.5 to 15.5 written as "5.5". You can give the temperature instead.`
  );
};

/**
 * A firing asked about, as the recipe page reads a recipe's (lib/cones/firing.js):
 * a temperature as given, or a cone with the band its glaze is checked in
 * (coneBand: by the cone, not by a figure, so SK 8 is mid fire as on the page)
 * and its approximate temperature where Glazecalc has one (Orton's older chart
 * to cone 15; Kyoto's measured SK 8 and 10). The block is what the cone check
 * judges. Nothing when no firing was given.
 */
export const firingOf = (
  firing: Firing
): { block: FiringBlock | null; celsius: number | undefined; band: Band | undefined } => {
  const none = { block: null, celsius: undefined, band: undefined };
  if (!firing) return none;
  if (firing.celsius !== undefined || firing.fahrenheit !== undefined) {
    const celsius = firing.celsius ?? Math.round(recipe.celsius(firing.fahrenheit!));
    const low = String(Math.round(celsius));
    return {
      block: firingLib.isCone('temperature', low) ? { scale: 'temperature', low } : null,
      celsius,
      band: undefined
    };
  }
  if (!firing.cone) return none;
  const scale = firing.chart ?? 'orton';
  const cone = coneOf(firing.cone, scale);
  return {
    block: { scale, low: cone },
    celsius: firingLib.approxCelsius(scale, cone)?.celsius,
    band: firingLib.coneBand(scale, cone)
  };
};

/** A material and its amount, as the recipe tools read a line. */
export type RecipeLine = MaterialRecord & { amount: string };

/**
 * The lines' materials, found by name (in `own` first, then the library), or
 * built from the analysis given. A ToolProblem lists the names not found,
 * with the nearest library names.
 */
export const resolveLines = (lines: Line[], own?: (name: string) => MaterialRecord | undefined): RecipeLine[] => {
  const unknown: string[] = [];
  const resolved = lines.map((line): RecipeLine | null => {
    const amount = String(line.amount);
    if (line.analysis) {
      if (!Object.keys(line.analysis).length) {
        throw new ToolProblem(`The analysis of ${line.material} has no oxides.`);
      }
      return {
        name: line.material,
        percentmole: 'percent',
        loi: line.loi ?? 0,
        fields: Object.entries(line.analysis).map(([name, value]) => ({ name, amount: value })),
        amount
      };
    }
    const found = own?.(line.material) ?? findMaterial(line.material);
    if (!found) {
      unknown.push(line.material);
      return null;
    }
    return { ...found, amount };
  });
  if (unknown.length) {
    const hints = unknown.map((name) => {
      const near = searchLibrary(name.split(/\s+/)[0] ?? name, { limit: 3 }).map((record) => record.name);
      return near.length ? `${name} (perhaps ${near.join(', ')})` : name;
    });
    throw new ToolProblem(
      `Not in the Glazecalc library: ${hints.join('; ')}. Use search_materials to find the name, or give the material's analysis.`
    );
  }
  return resolved as RecipeLine[];
};

/** A caution as data and words. */
export const cautionOut = (caution: Caution, language: string) => ({
  check: caution.check,
  severity: caution.severity,
  ...(caution.quantity !== undefined && { quantity: caution.quantity }),
  ...(caution.value !== undefined && { value: caution.value }),
  ...(caution.limit !== undefined && { limit: caution.limit }),
  ...(caution.direction !== undefined && { direction: caution.direction }),
  ...(caution.material !== undefined && { material: caution.material }),
  text: cautionText(caution, language)
});

export { languageOf };

// The tools that fit amounts (substitutions, matching the materials on hand)
// work hardest: FITS_PER_MINUTE each minute for each caller (an account, or an
// address without a token, an IPv6 one with its /48), on top of the request limits
// (server/lib/rate_limit.ts); and FITS_ANYONE_ALL_PER_MINUTE for every caller
// without a token together, so the server's work stays bounded however many
// addresses ask. Kept in memory, as those are.
export const FITS_PER_MINUTE = 10;
export const FITS_ANYONE_ALL_PER_MINUTE = 200;
const ANYONE_ALL = 'anyone-all';
const fits = new Map<string, { start: number; count: number }>();

/** Whether one more fit for this key would be over `limit`; counts it when not. */
const overFits = (key: string, limit: number, now: number): boolean => {
  const seen = fits.get(key);
  if (!seen || now - seen.start >= 60 * 1000) {
    fits.set(key, { start: now, count: 1 });
    // Old windows go as new ones start, so the map stays small.
    if (fits.size > 10000) for (const [old, value] of fits) if (now - value.start >= 60 * 1000) fits.delete(old);
    return false;
  }
  if (seen.count >= limit) return true;
  seen.count++;
  return false;
};

const tooManyFits = (limit: number, forYou: boolean) =>
  new ToolProblem(
    forYou
      ? `Too many substitutions or matches were worked out for you in the last minute (at most ${limit}). Please wait a minute and try again.`
      : 'Too many substitutions or matches are being worked out for people without a Glazecalc account just now. Please wait a minute and try again, or connect your account.'
  );

/** Counts one fit for the caller; a ToolProblem once over the limit. */
export const countFit = (caller: Caller, now = Date.now()): void => {
  if (process.env.RATE_LIMITS === 'off') return;
  if (!caller.userId) {
    // The ceiling for everyone without a token first: a caller turned away there uses none of its own count.
    const all = fits.get(ANYONE_ALL);
    if (all && now - all.start < 60 * 1000 && all.count >= FITS_ANYONE_ALL_PER_MINUTE) {
      throw tooManyFits(FITS_ANYONE_ALL_PER_MINUTE, false);
    }
  }
  if (overFits(caller.key, FITS_PER_MINUTE, now)) throw tooManyFits(FITS_PER_MINUTE, true);
  if (!caller.userId) overFits(ANYONE_ALL, Number.POSITIVE_INFINITY, now);
};

/** Forgets the fit counts (the tests). */
export const resetFits = (): void => fits.clear();

/** What a tool says when its work failed in a way nobody foresaw: nothing about why. */
export const UNEXPECTED =
  'Glazecalc could not work that out because of a problem on its side. Please try again; if it keeps happening, the problem has been logged for the Glazecalc team.';

/**
 * Runs a tool's work, turning a ToolProblem or a recipe tool's refusal into a
 * refusal in words. Anything else is logged here (its kind and code, never its
 * message or the request) and the assistant gets UNEXPECTED, never the error.
 */
export const guarded = async <T>(work: () => T | Promise<T>, language = 'en') => {
  try {
    return await work();
  } catch (err) {
    if (err instanceof ScopeProblem) {
      return { ...fail(err.message), _meta: { 'mcp/www_authenticate': [writeChallenge()] } };
    }
    if (err instanceof ToolProblem) return fail(err.message);
    if (err instanceof recipe.RecipeError) {
      return fail(recipeText({ code: err.code, params: err.params }, language));
    }
    const coded = err as { code?: unknown; message?: unknown; params?: Record<string, string | number> };
    // The chemistry's errors (no flux, an unknown oxide) say what is wrong in English, with a code of its own.
    if (
      coded &&
      typeof coded.code === 'string' &&
      typeof coded.message === 'string' &&
      Object.hasOwn(chemistry.MESSAGES, coded.code)
    ) {
      return fail(chemistryText({ code: coded.code, params: coded.params, message: coded.message }, language));
    }
    log.error('An MCP tool failed', {
      kind: err instanceof Error ? err.constructor.name : typeof err,
      code: log.codeOf(err)
    });
    return fail(UNEXPECTED);
  }
};
