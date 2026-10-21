// The blend tool, public like the rest (docs/integrations-plan.md): the tiles of a line blend
// between two recipes, or of a triaxial blend between three, each worked out by the code the
// Blends page uses (lib/recipe/blends.js): its mix of the corner recipes, its unity formula, its
// cautions against the limits and, with a firing, whether the chemistry fits it. With two corners
// and two steps it is a comparison of two recipes. It is arithmetic on published figures, not a
// test: the tiles decide.
import * as z from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import chemistry from '../../../lib/chemistry/index.js';
import recipe from '../../../lib/recipe/index.js';
import {
  firingArg,
  firingOf,
  guarded,
  languageArg,
  languageOf,
  linesArg,
  ok,
  resolveLines,
  ToolProblem,
  type Line,
  type RecipeLine
} from '../common.ts';
import { analysisOf, checksOf, coneFitOut, stullOut, TOP_NOTE } from './public.ts';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const LETTERS = ['A', 'B', 'C'];
export const rounded = (value: number, places = 3): number => Number(value.toFixed(places));

/** The most steps each kind of blend takes here: 11 tiles in a line, 6 rows (21 tiles) of a triangle. */
const MOST_STEPS = { line: 11, triaxial: 6 } as const;
const DEFAULT_STEPS = { line: 5, triaxial: 4 } as const;

/** Oxides that count as fluxes in a unity formula. */
export const FLUXES = Object.entries(chemistry.OXIDE_GROUPS)
  .filter(([, group]) => group === 'R2O' || group === 'RO')
  .map(([oxide]) => oxide);

export const registerBlendTools = (server: McpServer): void => {
  server.registerTool(
    'blend_recipes',
    {
      title: 'Blend recipes for test tiles',
      description:
        'Works out the test tiles of a line blend between recipes a and b (2 to 11 steps), or of a triaxial blend when c is given too (2 to 6 rows, up to 21 tiles), as the Blends page of the Glazecalc app does. Each tile is a mix of the corner recipes, each taken as a percent of its base: its shares, its recipe in percent, its key unity formula figures (silica, alumina, boron, the fluxes), silica to alumina, calculated expansion, its place on the Stull chart (stull), the names of the limit cautions it has, and, with a firing, whether its chemistry fits that firing (coneFit verdict). With two recipes and steps 2 it compares them oxide by oxide (differences). Give base materials only, no colorants. This is a calculation from published figures, not a test result: the tiles, fired, decide, and the cautions are guides, not a guarantee of food safety.',
      inputSchema: z.object({
        a: linesArg.describe("Recipe A, the first corner (the line's first tile, or the top of the triangle)."),
        b: linesArg.describe("Recipe B (the line's last tile, or the triangle's bottom left)."),
        c: linesArg
          .optional()
          .describe("Recipe C, the triangle's bottom right. Leave it out for a line blend between a and b."),
        steps: z
          .number()
          .int()
          .min(2)
          .max(MOST_STEPS.line)
          .optional()
          .describe(
            `Tiles in the line (2 to ${MOST_STEPS.line}, default ${DEFAULT_STEPS.line}), or rows of the triangle when c is given (2 to ${MOST_STEPS.triaxial}, default ${DEFAULT_STEPS.triaxial}).`
          ),
        firing: firingArg,
        limitSet: z
          .string()
          .max(40)
          .optional()
          .describe(
            'The limits to check against, as check_limits takes it: "glazecalc" (the default) or "hesselberth-roy".'
          ),
        language: languageArg
      }),
      annotations: READ_ONLY
    },
    async ({ a, b, c, steps, firing, limitSet, language }) => {
      const lang = languageOf(language);
      return guarded(() => {
        const kind = c ? 'triaxial' : 'line';
        const count = steps ?? DEFAULT_STEPS[kind];
        if (count > MOST_STEPS[kind]) {
          throw new ToolProblem(
            `A ${kind === 'line' ? 'line blend' : 'triaxial blend'} takes at most ${MOST_STEPS[kind]} steps; ${count} was asked for.`
          );
        }
        const blend = recipe.blendTiles(kind, count)!;
        const given: Line[][] = c ? [a, b, c] : [a, b];
        // A corner with no unity formula (no flux, say) is refused by its letter, before any tile.
        const checked = given.map((lines, i) => cornerOf(lines, `Recipe ${LETTERS[i]}`, lang));
        const corners = checked.map(({ materials }) => ({ materials }));
        const cornerAnalyses = checked.map(({ analysis }) => analysis);
        // Named before any tile, so a limit set that is not there is a refusal, not a tile without cautions.
        if (!recipe.LIMIT_SETS[limitSet ?? 'glazecalc']) {
          throw new ToolProblem(
            `No limit set ${limitSet}. Choose one of: ${Object.keys(recipe.LIMIT_SETS).join(', ')}.`
          );
        }
        const at = firingOf(firing);
        const { celsius } = at;
        let limits: { id: string; band: unknown } | undefined;

        const tiles = blend.tiles.map((tile) => {
          const mixed = recipe.mixRecipes(corners, tile.shares);
          const base = {
            number: tile.number,
            ...(kind === 'triaxial' && { row: tile.row + 1 }),
            shares: Object.fromEntries(tile.shares.map((share, i) => [LETTERS[i], rounded(share, 4)]))
          };
          if (!mixed) return { ...base, problem: 'No recipe could be worked out for this tile.' };
          const lines: RecipeLine[] = mixed.materials.map(({ line, amount }) => ({ ...line, amount: String(amount) }));
          const percent = mixed.materials.map(({ line, amount }) => ({
            material: line.name,
            percent: rounded(amount, 2)
          }));
          const worked = tileChemistry(lines, percent, at, limitSet, lang);
          limits ??= worked.limits;
          return { ...base, ...worked.tile };
        });

        // Two recipes in two steps are a comparison: what changes from A to B, oxide by oxide.
        const differences =
          kind === 'line' && count === 2
            ? differencesOf(cornerAnalyses[0]!.result, cornerAnalyses[1]!.result)
            : undefined;

        return ok({
          kind,
          steps: count,
          tileCount: tiles.length,
          ...(limits && { limitSet: limits.id, limitBand: limits.band }),
          ...(limits?.band === 'top' && { limitsNote: TOP_NOTE }),
          ...(celsius !== undefined && { celsius }),
          tiles,
          ...(differences && { differences }),
          note: 'A calculation from published figures, not a test result. Fire the tiles: they decide.'
        });
      }, lang);
    }
  );
};

type Chemistry = ReturnType<typeof analysisOf>['result'];

/**
 * A recipe given to a blend or a comparison, by its name ("Recipe A"): its materials found, some amount above nothing,
 * and its unity formula worked out, or a ToolProblem naming the letter.
 */
export const cornerOf = (lines: Line[], name: string, lang: string) => {
  const materials = resolveLines(lines);
  if (!materials.some((line) => Number(line.amount) > 0)) {
    throw new ToolProblem(`${name} has no amounts to mix.`);
  }
  try {
    return { materials, analysis: analysisOf(materials, lang) };
  } catch (err) {
    const { code, message } = err as { code?: unknown; message?: unknown };
    if (typeof code === 'string' && typeof message === 'string') {
      throw new ToolProblem(`${name}: ${message}`);
    }
    throw err;
  }
};

/**
 * What changes from one recipe's chemistry to another's, oxide by oxide (the rows the compare page shows
 * that are not the same on both sides): blend_recipes with two steps and compare_recipes both answer it.
 */
export const differencesOf = (a: Chemistry, b: Chemistry) => {
  const [left, right] = [a, b].map((result) => ({
    uList: result.umf,
    groups: result.groups,
    loi: result.loi,
    siAlRatio: result.siAlRatio,
    expansion: result.expansion,
    analysis: result.analysis
  }));
  return recipe
    .compareUnity(left!, right!)
    .flatMap((group) => group.rows)
    .map((row) => ({
      what: row.key ?? row.label,
      a: row.left === null ? null : rounded(row.left, row.places),
      b: row.right === null ? null : rounded(row.right, row.places),
      change: row.change === null ? null : rounded(row.change, row.places)
    }))
    .filter((row) => row.change !== null && row.change !== 0);
};

/**
 * One recipe as a tile: its percent recipe, its key unity formula figures, silica to alumina, expansion, Stull
 * point, the names of the cautions it has against the limits, and with a firing whether it fits. A recipe with
 * no unity formula (no flux, say) is a tile with a problem. `limits` is the limit set and band used, for the
 * answer to name once.
 */
export const tileChemistry = (
  lines: RecipeLine[],
  percent: Array<{ material: string; percent: number }>,
  at: ReturnType<typeof firingOf>,
  limitSet: string | undefined,
  lang: string
) => {
  try {
    const { result } = analysisOf(lines, lang);
    const checks = checksOf(lines, at, limitSet, lang);
    const fit = coneFitOut(
      recipe.coneFit(checks.unityFormula, at.block, { materials: lines.map((line) => line.name) }),
      lang
    );
    const umf = result.umf;
    return {
      limits: { id: checks.limitSet.id, band: checks.bandUsed as unknown },
      tile: {
        recipe: percent,
        unity: {
          SiO2: rounded(umf.SiO2 ?? 0),
          Al2O3: rounded(umf.Al2O3 ?? 0),
          B2O3: rounded(umf.B2O3 ?? 0),
          fluxes: Object.fromEntries(
            FLUXES.filter((oxide) => (umf[oxide] ?? 0) > 0).map((oxide) => [oxide, rounded(umf[oxide])])
          )
        },
        silicaToAlumina: result.siAlRatio === null ? null : rounded(result.siAlRatio, 2),
        expansion: result.expansion === null ? null : rounded(result.expansion, 2),
        stull: stullOut(umf),
        cautions: [...new Set(checks.cautions.map((caution) => caution.check))],
        ...(fit && { coneFit: fit.verdict })
      } as Record<string, unknown>
    };
  } catch {
    return {
      limits: undefined,
      tile: { recipe: percent, problem: 'This tile has no unity formula (no flux, say).' } as Record<string, unknown>
    };
  }
};
