// What the MCP tools share: the shape of a recipe line, finding its material,
// the firing, the language, how a result and a refusal are sent, and the
// limit on the tools that fit amounts (docs/integrations-plan.md, item 23).
import * as z from 'zod';
import chemistry from '../../lib/chemistry/index.js';
import cones from '../../lib/cones/index.js';
import recipe from '../../lib/recipe/index.js';
import type { Caution, MaterialRecord } from '../../lib/recipe/index.js';
import * as log from '../lib/log.ts';
import { findMaterial, searchLibrary } from './library.ts';
import { cautionText, chemistryText, languageOf, recipeText } from './words.ts';

/** At most this many lines in a recipe sent to a tool. */
export const MOST_LINES = 40;

/** Who is calling, for the limits: 'user:<id>' with a token, 'ip:<address>' without. */
export interface Caller {
  key: string;
  /** The account, when the request carried a working token with data:read. */
  userId?: string;
  tokenId?: string;
  scopes?: string[];
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

export const firingArg = z
  .object({
    cone: z
      .string()
      .max(5)
      .optional()
      .describe('An Orton cone from 06 to 6 ("06", "04", "6"), or an SK cone with chart "sk".'),
    chart: z
      .enum(['orton', 'sk'])
      .optional()
      .describe('Which cones the cone is: Orton (the default) or SK (JIS R 8101).'),
    celsius: z.number().min(500).max(1500).optional(),
    fahrenheit: z.number().min(900).max(2750).optional()
  })
  .optional()
  .describe('The firing, as a cone or a temperature. Leave it out when it is not known.');
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

/** The Orton or SK cone's temperature in °C, or a ToolProblem naming the cones known. */
export const coneCelsius = (cone: string, chart: 'orton' | 'sk' = 'orton'): number => {
  const list = chart === 'sk' ? cones.SK.cones : chemistry.CONES;
  const wanted = cone.trim().toLowerCase();
  const found = list.find((c) => c.cone.toLowerCase() === wanted);
  if (!found) {
    throw new ToolProblem(
      `Cone ${cone} is not in Glazecalc's ${chart === 'sk' ? 'SK' : 'Orton'} chart. Known cones: ${list.map((c) => c.cone).join(', ')}. You can give the temperature instead.`
    );
  }
  return found.celsius;
};

/** A firing's temperature in °C, or undefined when none was given. */
export const celsiusOf = (firing: Firing): number | undefined => {
  if (!firing) return undefined;
  if (firing.celsius !== undefined) return firing.celsius;
  if (firing.fahrenheit !== undefined) return Math.round(recipe.celsius(firing.fahrenheit));
  if (firing.cone) return coneCelsius(firing.cone, firing.chart);
  return undefined;
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
// work hardest: FITS_PER_MINUTE each minute for each caller, on top of the
// request limits (server/lib/rate_limit.ts). Kept in memory, as those are.
export const FITS_PER_MINUTE = 10;
const fits = new Map<string, { start: number; count: number }>();

/** Counts one fit for the caller; a ToolProblem once over the limit. */
export const countFit = (caller: Caller, now = Date.now()): void => {
  if (process.env.RATE_LIMITS === 'off') return;
  const seen = fits.get(caller.key);
  if (!seen || now - seen.start >= 60 * 1000) {
    fits.set(caller.key, { start: now, count: 1 });
    // Old windows go as new ones start, so the map stays small.
    if (fits.size > 10000) for (const [key, value] of fits) if (now - value.start >= 60 * 1000) fits.delete(key);
    return;
  }
  if (seen.count >= FITS_PER_MINUTE) {
    throw new ToolProblem(
      `Too many substitutions or matches were worked out for you in the last minute (at most ${FITS_PER_MINUTE}). Please wait a minute and try again.`
    );
  }
  seen.count++;
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
