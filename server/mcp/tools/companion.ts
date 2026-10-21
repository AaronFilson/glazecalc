// The tools of the teaching companion (docs/adr/0017-mcp-server.md; the lessons of
// server/mcp/course.ts), public and read-only like the blend tool they sit beside:
//   vary_material  what one material does across a range, put into a base recipe on top
//                  of it or in place of another (an ingredient blend, a progression test),
//   compare_recipes  two recipes side by side, under a name a person looks for.
// Both work with the code the Blends and recipe pages use, through the helpers of
// blends.ts (a tile's chemistry, the oxide-by-oxide differences). They are arithmetic
// on published figures, not a test: the tiles, fired, decide.
import * as z from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
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
  type RecipeLine
} from '../common.ts';
import { cornerOf, differencesOf, rounded, tileChemistry } from './blends.ts';
import { TOP_NOTE } from './public.ts';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

/** Tiles in a vary_material range: 2 to 11 (a line blend's most), 5 unless asked. */
export const MOST_VARY_STEPS = 11;
const DEFAULT_VARY_STEPS = 5;

const NOTE = 'A calculation from published figures, not a test result. Fire the tiles: they decide.';

const limitSetArg = z
  .string()
  .max(40)
  .optional()
  .describe('The limits to check against, as check_limits takes it: "glazecalc" (the default) or "hesselberth-roy".');

/** A limit set that is not there is a refusal, named before any tile. */
const checkLimitSet = (limitSet: string | undefined): void => {
  if (!recipe.LIMIT_SETS[limitSet ?? 'glazecalc']) {
    throw new ToolProblem(`No limit set ${limitSet}. Choose one of: ${Object.keys(recipe.LIMIT_SETS).join(', ')}.`);
  }
};

/** A recipe's lines as percents of their total, for a tile's recipe. */
const percentOf = (lines: RecipeLine[]): Array<{ material: string; percent: number }> => {
  const total = lines.reduce((sum, line) => sum + Number(line.amount), 0);
  return lines.map((line) => ({ material: line.name, percent: rounded((Number(line.amount) * 100) / total, 2) }));
};

type Tile = Record<string, unknown> & {
  unity?: { SiO2: number; Al2O3: number; B2O3: number; fluxes: Record<string, number> };
  silicaToAlumina?: number | null;
  expansion?: number | null;
  stull?: { region: string | null } | null;
};

/** How a figure goes from the first tile to the last. */
const direction = (change: number, steady: number): 'rises' | 'falls' | 'steady' =>
  Math.abs(change) < steady ? 'steady' : change > 0 ? 'rises' : 'falls';

/**
 * What changes from the first tile to the last: each oxide of the key unity formula figures that moves (by at
 * least 0.005), silica to alumina and expansion where they move, and the regions of Stull's chart the tiles
 * cross, in order. A tile with no unity formula is left out.
 */
const trendOf = (tiles: Tile[]) => {
  const worked = tiles.filter((tile) => tile.unity);
  const first = worked[0];
  const last = worked.at(-1);
  if (!first?.unity || !last?.unity || first === last) return undefined;
  const figures = (tile: Tile): Record<string, number> => ({
    SiO2: tile.unity!.SiO2,
    Al2O3: tile.unity!.Al2O3,
    B2O3: tile.unity!.B2O3,
    ...tile.unity!.fluxes
  });
  const [from, to] = [figures(first), figures(last)];
  const oxides = [...new Set([...Object.keys(from), ...Object.keys(to)])]
    .map((oxide) => ({ oxide, first: from[oxide] ?? 0, last: to[oxide] ?? 0 }))
    .map((row) => ({
      ...row,
      change: rounded(row.last - row.first),
      direction: direction(row.last - row.first, 0.005)
    }))
    .filter((row) => row.direction !== 'steady');
  const moved = (a: number | null | undefined, b: number | null | undefined, places: number, steady: number) =>
    a === null || a === undefined || b === null || b === undefined || Math.abs(b - a) < steady
      ? undefined
      : { first: a, last: b, change: rounded(b - a, places), direction: direction(b - a, steady) };
  const regions = worked
    .map((tile) => (tile.stull ? (tile.stull.region ?? 'off the chart') : undefined))
    .filter((region): region is string => typeof region === 'string')
    .filter((region, i, all) => i === 0 || region !== all[i - 1]);
  const ratio = moved(first.silicaToAlumina, last.silicaToAlumina, 2, 0.005);
  const expansion = moved(first.expansion, last.expansion, 2, 0.005);
  return {
    oxides,
    ...(ratio && { silicaToAlumina: ratio }),
    ...(expansion && { expansion }),
    ...(regions.length && { stullRegions: regions })
  };
};

export const registerCompanionTools = (server: McpServer): void => {
  server.registerTool(
    'vary_material',
    {
      title: 'What one material does across a range',
      description:
        'Shows what one material does to a glaze, by putting more and more of it into a base recipe (an ingredient blend or progression test: whiting 0 to 20, say, in 2 to 11 tiles). With mode "add" (the default) it goes on top of the base, so the recipe grows; with mode "replace" the same amount comes out of another material of the base (`instead`), so the total stays the same. Each tile has its amount of the material, its recipe in percent, its key unity formula figures (silica, alumina, boron, the fluxes), silica to alumina, calculated expansion, its place on Stull\'s chart (stull: region, crazed), the names of the limit cautions it has, and, with a firing, whether its chemistry fits that firing (coneFit verdict). trend sums up what moves from the first tile to the last, and which Stull regions the tiles cross. Give base materials only, no colorants. This is a calculation from published figures, not a test result: the tiles, fired, decide, and the cautions are guides, not a guarantee of food safety.',
      inputSchema: z.object({
        recipe: linesArg.describe('The base recipe the material goes into.'),
        material: z
          .string()
          .min(1)
          .max(200)
          .describe('The material to vary, by its library name (search_materials finds it), such as "Whiting".'),
        from: z
          .number()
          .min(0)
          .max(100000)
          .optional()
          .describe('The least of it, in the unit the recipe lines share (default 0: the base alone).'),
        to: z
          .number()
          .min(0)
          .max(100000)
          .describe('The most of it, in the unit the recipe lines share: it must be more than from.'),
        steps: z
          .number()
          .int()
          .min(2)
          .max(MOST_VARY_STEPS)
          .optional()
          .describe(`Tiles from from to to (2 to ${MOST_VARY_STEPS}, default ${DEFAULT_VARY_STEPS}).`),
        mode: z
          .enum(['add', 'replace'])
          .optional()
          .describe(
            '"add" (the default): put the material on top of the base. "replace": take the same amount out of `instead`, so the total stays the same.'
          ),
        instead: z
          .string()
          .min(1)
          .max(200)
          .optional()
          .describe('With mode "replace": the material of the base that gives way to it.'),
        firing: firingArg,
        limitSet: limitSetArg,
        language: languageArg
      }),
      annotations: READ_ONLY
    },
    async ({ recipe: baseLines, material, from, to, steps, mode, instead, firing, limitSet, language }) => {
      const lang = languageOf(language);
      return guarded(() => {
        const least = from ?? 0;
        const count = steps ?? DEFAULT_VARY_STEPS;
        const how = mode ?? 'add';
        if (!(to > least)) {
          throw new ToolProblem(`to (${to}) must be more than from (${least}).`);
        }
        if (how === 'replace' && !instead) {
          throw new ToolProblem('Mode "replace" needs `instead`: the material of the base that gives way.');
        }
        if (how === 'add' && instead) {
          throw new ToolProblem('`instead` goes with mode "replace". Leave it out to put the material on top.');
        }
        const base = cornerOf(baseLines, 'The base recipe', lang).materials;
        // The material by its library name, with the nearest names where it is not found.
        const [varied] = resolveLines([{ material, amount: 1 }]);
        const named = (name: string) => name.normalize('NFKC').toLowerCase().trim();
        const gives = instead ? base.find((line) => named(line.name) === named(resolveInstead(instead))) : undefined;
        if (how === 'replace' && !gives) {
          throw new ToolProblem(
            `${instead} is not in the base recipe, so ${varied!.name} cannot take its place. The base has: ${base.map((line) => line.name).join(', ')}.`
          );
        }
        if (gives && gives.name === varied!.name) {
          throw new ToolProblem('A material cannot replace itself: choose another for `instead`.');
        }
        checkLimitSet(limitSet);
        const at = firingOf(firing);

        const amounts = Array.from({ length: count }, (_, i) =>
          Number((least + (i * (to - least)) / (count - 1)).toFixed(6))
        );
        const varyBase = base.map((line) => ({ name: line.name, amount: Number(line.amount) }));
        const made = recipe.varyMaterial(varyBase, varied!.name, amounts, how, gives?.name);
        if (made.tooMuch !== undefined) {
          const only = Number(gives!.amount);
          throw new ToolProblem(
            `${gives!.name} would run out: the base has ${only}, so ${varied!.name} can replace at most ${only}, and ${made.tooMuch} was asked for. Lower to.`
          );
        }
        const records = new Map<string, RecipeLine>([...base, varied!].map((line) => [line.name, line]));
        let limits: { id: string; band: unknown } | undefined;
        const tiles = made.tiles.map((tile, i): Tile => {
          const lines = tile.lines.map((line) => ({ ...records.get(line.name)!, amount: String(line.amount) }));
          const total = tile.lines.reduce((sum, line) => sum + line.amount, 0);
          const worked = tileChemistry(lines, percentOf(lines), at, limitSet, lang);
          limits ??= worked.limits;
          return {
            number: i + 1,
            amount: tile.amount,
            amountPercent: rounded((tile.amount * 100) / total, 2),
            total: rounded(total, 4),
            ...worked.tile
          } as Tile;
        });

        const celsius = at.celsius;
        const trend = trendOf(tiles);
        return ok({
          material: varied!.name,
          mode: how,
          ...(gives && { instead: gives.name }),
          from: least,
          to,
          steps: count,
          baseTotal: rounded(
            base.reduce((sum, line) => sum + Number(line.amount), 0),
            4
          ),
          ...(limits && { limitSet: limits.id, limitBand: limits.band }),
          ...(limits?.band === 'top' && { limitsNote: TOP_NOTE }),
          ...(celsius !== undefined && { celsius }),
          tiles,
          ...(trend && { trend }),
          note: NOTE
        });
      }, lang);
    }
  );

  server.registerTool(
    'compare_recipes',
    {
      title: 'Compare two recipes',
      description:
        "Compares two glaze recipes side by side: for each, its recipe in percent, key unity formula figures, silica to alumina, calculated expansion, place on Stull's chart (stull), the names of the limit cautions it has and, with a firing, whether its chemistry fits that firing (coneFit verdict); then what changes from A to B oxide by oxide (differences), and which materials are in A only, in B only, or in both, with their percents. It is the same comparison blend_recipes makes with two recipes and two steps, under a name that is easy to find. Give base materials only, no colorants. This is a calculation from published figures, not a test result: fire both, and the tiles decide.",
      inputSchema: z.object({
        a: linesArg.describe('Recipe A.'),
        b: linesArg.describe('Recipe B.'),
        labels: z
          .array(z.string().max(60))
          .length(2)
          .optional()
          .describe('Names for A and B, two of them, such as ["Original", "With whiting"], echoed back.'),
        firing: firingArg,
        limitSet: limitSetArg,
        language: languageArg
      }),
      annotations: READ_ONLY
    },
    async ({ a, b, labels, firing, limitSet, language }) => {
      const lang = languageOf(language);
      return guarded(() => {
        const sides = [cornerOf(a, 'Recipe A', lang), cornerOf(b, 'Recipe B', lang)];
        checkLimitSet(limitSet);
        const at = firingOf(firing);
        let limits: { id: string; band: unknown } | undefined;
        const [left, right] = sides.map((side, i) => {
          const worked = tileChemistry(side.materials, percentOf(side.materials), at, limitSet, lang);
          limits ??= worked.limits;
          return { label: labels?.[i] ?? (i === 0 ? 'A' : 'B'), ...worked.tile };
        });
        const percents = sides.map((side) => new Map(percentOf(side.materials).map((l) => [l.material, l.percent])));
        const names = [...new Set(sides.flatMap((side) => side.materials.map((line) => line.name)))];
        const only = (i: number) =>
          names
            .filter((name) => percents[i]!.has(name) && !percents[1 - i]!.has(name))
            .map((name) => ({ material: name, percent: percents[i]!.get(name)! }));
        const both = names
          .filter((name) => percents[0]!.has(name) && percents[1]!.has(name))
          .map((name) => ({ material: name, a: percents[0]!.get(name)!, b: percents[1]!.get(name)! }));
        const celsius = at.celsius;
        return ok({
          ...(limits && { limitSet: limits.id, limitBand: limits.band }),
          ...(limits?.band === 'top' && { limitsNote: TOP_NOTE }),
          ...(celsius !== undefined && { celsius }),
          a: left,
          b: right,
          differences: differencesOf(sides[0]!.analysis.result, sides[1]!.analysis.result),
          materials: { onlyInA: only(0), onlyInB: only(1), inBoth: both },
          note: NOTE
        });
      }, lang);
    }
  );
};

/** The library name of an `instead` as given, or the words as typed (an own material is matched by name). */
const resolveInstead = (instead: string): string => {
  try {
    return resolveLines([{ material: instead, amount: 1 }])[0]!.name;
  } catch {
    return instead;
  }
};
