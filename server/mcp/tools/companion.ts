// The tools of the teaching companion (docs/adr/0017-mcp-server.md; the lessons of
// server/mcp/course.ts), public and read-only like the blend tool they sit beside:
//   vary_material  what one material does across a range, put into a base recipe on top
//                  of it or in place of another (an ingredient blend, a progression test),
//   compare_recipes  two recipes side by side, under a name a person looks for, given as lines or
//                  (signed in) as the person's own saved recipes, with a summary of what matters.
// Both declare an outputSchema, the first tools of the server to do so.
// Both work with the code the Blends and recipe pages use, through the helpers of
// blends.ts (a tile's chemistry, the oxide-by-oxide differences). They are arithmetic
// on published figures, not a test: the tiles, fired, decide.
import * as z from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import chemistry from '../../../lib/chemistry/index.js';
import recipe from '../../../lib/recipe/index.js';
import { allows } from '../../lib/scopes.ts';
import Recipe from '../../models/recipe.ts';
import {
  type Caller,
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
import mongoose from 'mongoose';
import { savedLines } from './account.ts';
import { cornerFrom, cornerOf, differencesOf, rounded, tileChemistry } from './blends.ts';
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

const recipeIdArg = z.string().min(1).max(40).optional();

/**
 * One of the caller's own saved recipes, as get_recipe reads it (only the account's, never one in the Trash),
 * or a ToolProblem: signed out, a token that may not read recipes, or an id that is not one of theirs.
 */
const ownRecipe = async (caller: Caller | undefined, id: string) => {
  if (!caller?.userId) {
    throw new ToolProblem(
      'Sign in to Glazecalc to compare your own saved recipes by id, or give the recipe as lines instead.'
    );
  }
  if (!allows(caller.scopes ?? [], 'recipes:read')) {
    throw new ToolProblem('This connection may not read your recipes: give the recipe as lines instead.');
  }
  const found = mongoose.isObjectIdOrHexString(id)
    ? await Recipe.findOne({ _id: id, ownedBy: caller.userId }, { title: 1, materials: 1 }).lean()
    : null;
  if (!found) throw new ToolProblem(`No recipe with id ${id} in your account.`);
  return { title: typeof found.title === 'string' ? found.title : undefined, materials: found.materials as unknown[] };
};

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
  number?: number;
  unity?: { SiO2: number; Al2O3: number; B2O3: number; fluxes: Record<string, number> };
  fluxRatio?: FluxRatio | null;
  silicaToAlumina?: number | null;
  expansion?: number | null;
  stull?: { region: string | null } | null;
  cautions?: string[];
  coneFit?: string;
};

interface FluxRatio {
  R2O: number;
  RO: number;
}

/**
 * The flux ratio of a unity formula: the alkalis (R2O: Na2O, K2O, Li2O...) against the alkaline earths and the
 * other RO fluxes (CaO, MgO, SrO, BaO, ZnO...), the groups lib/chemistry gives each oxide. null with no fluxes.
 */
export const fluxRatioOf = (fluxes: Record<string, number> | undefined): FluxRatio | null => {
  if (!fluxes) return null;
  let r2o = 0;
  let ro = 0;
  for (const [oxide, amount] of Object.entries(fluxes)) {
    const group = (chemistry.OXIDE_GROUPS as Record<string, string>)[oxide];
    if (group === 'R2O') r2o += amount;
    else if (group === 'RO') ro += amount;
  }
  return r2o + ro > 0 ? { R2O: rounded(r2o), RO: rounded(ro) } : null;
};

/**
 * How far the calculated expansion (x10^-6 per °C) of two recipes may differ before compare_recipes flags that
 * their fit on the same clay may differ. 0.3 is the plan's default, TO BE CONFIRMED BY THE OWNER (or a glaze
 * chemist): scratch/round12/d-teach/plan.md, owner question 3.
 */
export const EXPANSION_FIT_FLAG = 0.3;

/** A tile with its flux ratio, where it has a unity formula. */
const withFluxRatio = (tile: Record<string, unknown>): Record<string, unknown> => {
  const unity = tile.unity as Tile['unity'];
  return unity ? { ...tile, fluxRatio: fluxRatioOf(unity.fluxes) } : tile;
};

// The answers' shapes, as outputSchema (the first tools here to declare one). Loose objects: a client sees
// every field named, and a field added later does not break one that validates against an older listing.
const unitySchema = z.looseObject({
  SiO2: z.number(),
  Al2O3: z.number(),
  B2O3: z.number(),
  fluxes: z.record(z.string(), z.number())
});
const fluxRatioSchema = z.looseObject({ R2O: z.number(), RO: z.number() });
const tileFields = {
  recipe: z.array(z.looseObject({ material: z.string(), percent: z.number() })),
  unity: unitySchema.optional(),
  fluxRatio: fluxRatioSchema.nullable().optional(),
  silicaToAlumina: z.number().nullable().optional(),
  expansion: z.number().nullable().optional(),
  stull: z.looseObject({ region: z.string().nullable(), crazed: z.boolean() }).nullable().optional(),
  cautions: z.array(z.string()).optional(),
  coneFit: z.string().optional(),
  problem: z.string().optional()
};
const limitFields = {
  limitSet: z.string().optional(),
  limitBand: z.string().nullable().optional(),
  limitsNote: z.string().optional(),
  celsius: z.number().optional()
};
const movedSchema = z.looseObject({
  first: z.number(),
  last: z.number(),
  change: z.number(),
  direction: z.enum(['rises', 'falls', 'steady'])
});
const varyOutput = z.looseObject({
  material: z.string(),
  mode: z.enum(['add', 'replace']),
  instead: z.string().optional(),
  from: z.number(),
  to: z.number(),
  steps: z.number().int(),
  baseTotal: z.number(),
  ...limitFields,
  tiles: z.array(
    z.looseObject({
      number: z.number().int(),
      amount: z.number(),
      amountPercent: z.number(),
      total: z.number(),
      ...tileFields
    })
  ),
  trend: z
    .looseObject({
      oxides: z.array(
        z.looseObject({
          oxide: z.string(),
          first: z.number(),
          last: z.number(),
          change: z.number(),
          direction: z.enum(['rises', 'falls', 'steady'])
        })
      ),
      silicaToAlumina: movedSchema.optional(),
      expansion: movedSchema.optional(),
      fluxRatio: movedSchema.optional(),
      stullRegions: z.array(z.string()).optional(),
      firstCaution: z.looseObject({ tile: z.number().int(), cautions: z.array(z.string()) }).optional(),
      firstConeFitChange: z.looseObject({ tile: z.number().int(), from: z.string(), to: z.string() }).optional()
    })
    .optional(),
  note: z.string()
});
const pairSchema = z.looseObject({ a: z.number().nullable(), b: z.number().nullable(), change: z.number().nullable() });
const compareOutput = z.looseObject({
  ...limitFields,
  a: z.looseObject({ label: z.string(), recipeId: z.string().optional(), ...tileFields }),
  b: z.looseObject({ label: z.string(), recipeId: z.string().optional(), ...tileFields }),
  differences: z.array(
    z.looseObject({
      what: z.string(),
      a: z.number().nullable(),
      b: z.number().nullable(),
      change: z.number().nullable()
    })
  ),
  materials: z.looseObject({
    onlyInA: z.array(z.looseObject({ material: z.string(), percent: z.number() })),
    onlyInB: z.array(z.looseObject({ material: z.string(), percent: z.number() })),
    inBoth: z.array(z.looseObject({ material: z.string(), a: z.number(), b: z.number() }))
  }),
  summary: z.looseObject({
    fluxRatio: z.looseObject({
      a: fluxRatioSchema.nullable(),
      b: fluxRatioSchema.nullable(),
      change: z.number().nullable()
    }),
    silicaToAlumina: pairSchema,
    SiO2: pairSchema,
    Al2O3: pairSchema,
    B2O3: pairSchema,
    expansion: pairSchema.extend({ fitFlag: z.boolean(), fitThreshold: z.number(), fitNote: z.string().optional() }),
    stull: z.looseObject({ a: z.string().nullable(), b: z.string().nullable() }),
    cautions: z.looseObject({ onlyA: z.array(z.string()), onlyB: z.array(z.string()) }),
    coneFit: z.looseObject({ a: z.string().nullable(), b: z.string().nullable() }).optional()
  }),
  note: z.string()
});

/** Two figures and the change from the first to the second, null where either is missing. */
const pairOf = (a: number | null | undefined, b: number | null | undefined, places = 3) => ({
  a: a ?? null,
  b: b ?? null,
  change: a === null || a === undefined || b === null || b === undefined ? null : rounded(b - a, places)
});

/** The differences that matter between two recipes as tiles, for compare_recipes' summary. */
const summaryOf = (a: Tile, b: Tile) => {
  const expansion = pairOf(a.expansion, b.expansion, 2);
  const fitFlag = expansion.change !== null && Math.abs(expansion.change) >= EXPANSION_FIT_FLAG;
  const [ra, rb] = [a.fluxRatio ?? null, b.fluxRatio ?? null];
  const [ca, cb] = [a.cautions ?? [], b.cautions ?? []];
  return {
    fluxRatio: { a: ra, b: rb, change: ra && rb ? rounded(rb.R2O - ra.R2O) : null },
    silicaToAlumina: pairOf(a.silicaToAlumina, b.silicaToAlumina, 2),
    SiO2: pairOf(a.unity?.SiO2, b.unity?.SiO2),
    Al2O3: pairOf(a.unity?.Al2O3, b.unity?.Al2O3),
    B2O3: pairOf(a.unity?.B2O3, b.unity?.B2O3),
    expansion: {
      ...expansion,
      fitFlag,
      fitThreshold: EXPANSION_FIT_FLAG,
      ...(fitFlag && {
        fitNote: `The calculated expansions differ by ${Math.abs(expansion.change!)} (x10^-6 per °C), so the two may fit the same clay differently (crazing or shivering): test both on it.`
      })
    },
    stull: { a: a.stull?.region ?? null, b: b.stull?.region ?? null },
    cautions: { onlyA: ca.filter((c) => !cb.includes(c)), onlyB: cb.filter((c) => !ca.includes(c)) },
    ...((a.coneFit !== undefined || b.coneFit !== undefined) && {
      coneFit: { a: a.coneFit ?? null, b: b.coneFit ?? null }
    })
  };
};

/** How a figure goes from the first tile to the last. */
const direction = (change: number, steady: number): 'rises' | 'falls' | 'steady' =>
  Math.abs(change) < steady ? 'steady' : change > 0 ? 'rises' : 'falls';

/**
 * What changes from the first tile to the last: each oxide of the key unity formula figures that moves (by at
 * least 0.005), silica to alumina, expansion and the R2O share of the flux ratio where they move, the regions
 * of Stull's chart the tiles cross, in order, the first tile with a limit caution the first tile does not have,
 * and the first whose cone fit verdict differs from the first's. A tile with no unity formula is left out.
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
  // The flux ratio by its alkali share (R2O); RO moves the other way.
  const fluxRatio = moved(first.fluxRatio?.R2O, last.fluxRatio?.R2O, 3, 0.005);
  // The first tile with a limit caution the first tile does not have, and the first whose cone fit differs.
  const startCautions = first.cautions ?? [];
  const cautionAt = worked.find((tile) => (tile.cautions ?? []).some((c) => !startCautions.includes(c)));
  const fitAt =
    first.coneFit === undefined
      ? undefined
      : worked.find((tile) => tile.coneFit !== undefined && tile.coneFit !== first.coneFit);
  return {
    oxides,
    ...(ratio && { silicaToAlumina: ratio }),
    ...(expansion && { expansion }),
    ...(fluxRatio && { fluxRatio }),
    ...(regions.length && { stullRegions: regions }),
    ...(cautionAt && {
      firstCaution: {
        tile: cautionAt.number!,
        cautions: (cautionAt.cautions ?? []).filter((c) => !startCautions.includes(c))
      }
    }),
    ...(fitAt && { firstConeFitChange: { tile: fitAt.number!, from: first.coneFit!, to: fitAt.coneFit! } })
  };
};

export const registerCompanionTools = (server: McpServer, caller?: Caller): void => {
  server.registerTool(
    'vary_material',
    {
      title: 'What one material does across a range',
      description:
        'Shows what one material does to a glaze, by putting more and more of it into a base recipe (an ingredient blend or progression test: whiting 0 to 20, say, in 2 to 11 tiles). With mode "add" (the default) it goes on top of the base, so the recipe grows; with mode "replace" the same amount comes out of another material of the base (`instead`), so the total stays the same. Each tile has its amount of the material, its recipe in percent, its key unity formula figures (silica, alumina, boron, the fluxes), silica to alumina, calculated expansion, its place on Stull\'s chart (stull: region, crazed), the names of the limit cautions it has, and, with a firing, whether its chemistry fits that firing (coneFit verdict), and its flux ratio (fluxRatio: R2O alkalis against RO fluxes, in the unity formula). trend sums up what moves from the first tile to the last (oxides, silica to alumina, expansion, the R2O share of the flux ratio), which Stull regions the tiles cross, the first tile with a limit caution the first tile does not have (firstCaution) and, with a firing, the first whose coneFit verdict changes (firstConeFitChange). Give base materials only, no colorants. This is a calculation from published figures, not a test result: the tiles, fired, decide, and the cautions are guides, not a guarantee of food safety.',
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
      outputSchema: varyOutput,
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
            ...withFluxRatio(worked.tile)
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
        "Compares two glaze recipes side by side: for each, its recipe in percent, key unity formula figures, flux ratio (R2O against RO), silica to alumina, calculated expansion, place on Stull's chart (stull), the names of the limit cautions it has and, with a firing, whether its chemistry fits that firing (coneFit verdict); then what changes from A to B oxide by oxide (differences), which materials are in A only, in B only, or in both, with their percents, and a summary of the differences that matter (flux ratio, silica to alumina, silica, alumina and boron, expansion with fitFlag when the two differ by 0.3 x10^-6 per °C or more, so they may fit the same clay differently, Stull regions, the cautions only one side has, and coneFit). Give each recipe as lines (a, b) or, signed in to Glazecalc, one of your own saved recipes by its id from list_recipes (aRecipeId, bRecipeId): one or the other for each side. It is the same comparison blend_recipes makes with two recipes and two steps, under a name that is easy to find. Give base materials only, no colorants. This is a calculation from published figures, not a test result: fire both, and the tiles decide.",
      inputSchema: z.object({
        a: linesArg.optional().describe('Recipe A as lines (or give aRecipeId instead).'),
        b: linesArg.optional().describe('Recipe B as lines (or give bRecipeId instead).'),
        aRecipeId: recipeIdArg.describe(
          'Recipe A as one of your own saved recipes, by its id from list_recipes (signed in only), instead of a.'
        ),
        bRecipeId: recipeIdArg.describe(
          'Recipe B as one of your own saved recipes, by its id from list_recipes (signed in only), instead of b.'
        ),
        labels: z
          .array(z.string().max(60))
          .length(2)
          .optional()
          .describe('Names for A and B, two of them, such as ["Original", "With whiting"], echoed back.'),
        firing: firingArg,
        limitSet: limitSetArg,
        language: languageArg
      }),
      outputSchema: compareOutput,
      annotations: READ_ONLY
    },
    async ({ a, b, aRecipeId, bRecipeId, labels, firing, limitSet, language }) => {
      const lang = languageOf(language);
      return guarded(async () => {
        /** One side: its lines as given, or the caller's own saved recipe; exactly one of the two. */
        const sideOf = async (lines: typeof a, id: string | undefined, letter: 'A' | 'B') => {
          const name = `Recipe ${letter}`;
          const arg = letter.toLowerCase();
          if (lines && id !== undefined) {
            throw new ToolProblem(`Give ${name} once: as lines (${arg}) or by ${arg}RecipeId, not both.`);
          }
          if (lines) return { ...cornerOf(lines, name, lang), title: undefined, recipeId: undefined };
          if (id === undefined) {
            throw new ToolProblem(`Give ${name}: as lines (${arg}) or, signed in, by ${arg}RecipeId.`);
          }
          const found = await ownRecipe(caller, id);
          return { ...cornerFrom(savedLines(found.materials), name, lang), title: found.title, recipeId: id };
        };
        const sides = [await sideOf(a, aRecipeId, 'A'), await sideOf(b, bRecipeId, 'B')];
        checkLimitSet(limitSet);
        const at = firingOf(firing);
        let limits: { id: string; band: unknown } | undefined;
        const [left, right] = sides.map((side, i): Tile => {
          const worked = tileChemistry(side.materials, percentOf(side.materials), at, limitSet, lang);
          limits ??= worked.limits;
          const label = labels?.[i] ?? side.title?.slice(0, 60) ?? (i === 0 ? 'A' : 'B');
          return { label, ...(side.recipeId && { recipeId: side.recipeId }), ...withFluxRatio(worked.tile) };
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
          summary: summaryOf(left!, right!),
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
