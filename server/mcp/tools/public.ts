// The MCP tools anyone may use, with no account (docs/integrations-plan.md,
// Phase 2, item 20): the library, a recipe's unity formula, the limit checks,
// substitutions for old materials, a match from given materials, and cones.
// Each runs the same code as the app (lib/chemistry, lib/recipe) and answers
// with structured data, sentences in the caller's language, and the same as
// JSON text. Nothing a caller sends is stored.
import * as z from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import chemistry from '../../../lib/chemistry/index.js';
import cones from '../../../lib/cones/index.js';
import recipe from '../../../lib/recipe/index.js';
import type { MaterialRecord, TryMaterial } from '../../../lib/recipe/index.js';
import {
  type Caller,
  cautionOut,
  celsiusOf,
  coneCelsius,
  countFit,
  firingArg,
  guarded,
  languageArg,
  languageOf,
  linesArg,
  ok,
  resolveLines,
  ToolProblem,
  type RecipeLine
} from '../common.ts';
import {
  findAdditive,
  findMaterial,
  oxidesOf,
  searchLibrary,
  standardMaterials,
  type LibraryRecord
} from '../library.ts';
import { chemistryText, recipeText } from '../words.ts';

/** Whether the tool only reads and changes nothing anywhere: true for every tool here. */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const REGIONS = ['US', 'UK', 'EU', 'AU'] as const;
const regionArg = z
  .enum(REGIONS)
  .optional()
  .describe(
    'Where the potter buys materials, so suggestions are ones sold there: US, UK, EU or AU. Leave it out for any.'
  );

/** A library record, short, for a list. */
const summaryOf = (record: LibraryRecord & { kind?: string }) => ({
  name: record.name,
  ...(record.kind && { kind: record.kind }),
  ...(record.category && { category: record.category }),
  ...(record.manufacturer && { manufacturer: record.manufacturer }),
  ...(record.status && { status: record.status }),
  ...(record.region?.length && { regions: record.region })
});

/** A library record in full: its chemistry and what the library says of it. */
export const materialOut = (record: LibraryRecord) => ({
  name: record.name,
  ...(record.aliases?.length && { aliases: record.aliases }),
  ...(record.category && { category: record.category }),
  ...(record.rawformula && { formula: record.rawformula }),
  oxides: oxidesOf(record),
  oxidesAre: record.percentmole === 'molecular' ? 'moles in the formula' : 'weight percent',
  loi: Number(record.loi ?? 0),
  ...(record.status && { status: record.status }),
  ...(record.statusSince && { statusSince: record.statusSince }),
  ...(record.substitutes?.length && { substitutes: record.substitutes }),
  ...(record.region?.length && { regions: record.region }),
  ...(record.fritRole && { fritRole: record.fritRole }),
  ...(record.manufacturer && { manufacturer: record.manufacturer }),
  ...(record.soluble && { soluble: true }),
  ...(record.hazards && { hazards: record.hazards }),
  ...(record.notes?.length && { notes: record.notes }),
  ...(record.source && { source: record.source })
});

const rounded = (value: number, places = 3): number => Number(value.toFixed(places));
const roundAll = (values: Record<string, number>, places = 3): Record<string, number> =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [key, rounded(value, places)]));

/** A recipe's unity formula and what goes with it, with the chemistry's warnings in the language. */
export const analysisOf = (lines: RecipeLine[], language: string) => {
  const result = chemistry.calculateUMF(lines.map((line) => ({ material: line, amount: line.amount })));
  return {
    result,
    out: {
      unityFormula: roundAll(result.umf),
      groups: roundAll(result.groups),
      silicaToAlumina: result.siAlRatio === null ? null : rounded(result.siAlRatio, 2),
      firedAnalysis: roundAll(result.analysis, 2),
      loi: rounded(result.loi, 2),
      expansion: result.expansion === null ? null : rounded(result.expansion, 2),
      warnings: result.warningCodes.map((warning) => ({ code: warning.code, text: chemistryText(warning, language) }))
    }
  };
};

/** The limit set a caller chose, or the app's own. */
const limitSetOf = (id: string | undefined) => {
  const set = recipe.LIMIT_SETS[id ?? 'glazecalc'];
  if (!set) throw new ToolProblem(`No limit set ${id}. Choose one of: ${Object.keys(recipe.LIMIT_SETS).join(', ')}.`);
  return set;
};

/** The cautions for a recipe against a limit set: what the app shows beside a recipe. */
export const checksOf = (
  lines: RecipeLine[],
  celsius: number | undefined,
  limitSetId: string | undefined,
  language: string
) => {
  const set = limitSetOf(limitSetId);
  const { result, out } = analysisOf(lines, language);
  const checkLines = lines.map((line) => ({ material: line, amount: line.amount }));
  const cautions = [
    ...recipe.pastLimits({
      lines: checkLines,
      unity: result.umf,
      celsius,
      expansion: { was: null, now: result.expansion },
      limitSet: set
    }),
    ...recipe.sizeNotes(checkLines, celsius !== undefined && celsius < recipe.FIRING.lowFireBelow)
  ];
  return {
    limitSet: { id: set.id, name: set.name, source: set.source },
    band: recipe.bandOf(set, celsius) ?? null,
    bandUsed: recipe.bandOf(set, celsius) ?? set.whenUnknown,
    ...(celsius !== undefined && { celsius }),
    unityFormula: out.unityFormula,
    cautions: cautions.map((caution) => cautionOut(caution, language))
  };
};

/** A suggested recipe's materials, as names and amounts. */
const recipeOut = (materials: MaterialRecord[]) =>
  materials.map((material) => ({ material: material.name, amount: Number(material.amount ?? 0) }));

/** What each material in a match or suggestion does. */
const reportOut = (report: ReturnType<typeof recipe.explain>) => ({
  uses: report.uses.map((use) => ({
    material: use.name,
    amount: rounded(use.amount.value, use.amount.places),
    supplies: use.supplies.map((s) => ({ oxide: s.oxide, share: rounded(s.share, 2) })),
    needed: use.needed
  })),
  couldHelp: report.couldHelp.map((c) => ({ material: c.name, helps: rounded(c.helps, 3) })),
  unreachable: report.unreachable,
  miss: rounded(report.miss, 4),
  best: rounded(report.best, 4)
});

export const registerPublicTools = (server: McpServer, caller: Caller): void => {
  server.registerTool(
    'search_materials',
    {
      title: 'Search the material library',
      description:
        "Finds ceramic raw materials (feldspars, clays, frits, fluxes) and, if asked, colorants in Glazecalc's library by name, alias or maker. Use it to find the exact name the other tools take.",
      inputSchema: z.object({
        query: z.string().min(1).max(100).describe('Words in the name, such as "custer", "ferro 3134" or "kaolin".'),
        includeColorants: z.boolean().optional().describe('Also search colorants and opacifiers.'),
        category: z.string().max(40).optional().describe('Only this category: feldspar, clay, frit, flux, silica...'),
        region: regionArg,
        limit: z.number().int().min(1).max(50).optional()
      }),
      annotations: READ_ONLY
    },
    async ({ query, includeColorants, category, region, limit }) =>
      guarded(() =>
        ok({
          materials: searchLibrary(query, { limit: limit ?? 20, additives: includeColorants, category, region }).map(
            summaryOf
          )
        })
      )
  );

  server.registerTool(
    'get_material',
    {
      title: 'Get a material',
      description:
        "One material from Glazecalc's library: its oxides, loss on ignition, whether it is discontinued and what replaces it, where it is sold, hazards and the data sheet it comes from.",
      inputSchema: z.object({ name: z.string().min(1).max(200).describe('Its name or alias.') }),
      annotations: READ_ONLY
    },
    async ({ name }) =>
      guarded(() => {
        const record = findMaterial(name) ?? findAdditive(name);
        if (!record) throw new ToolProblem(`No material named ${name} in the library. Try search_materials.`);
        return ok({ material: materialOut(record) });
      })
  );

  server.registerTool(
    'analyze_recipe',
    {
      title: 'Unity formula of a recipe',
      description:
        "Works out a glaze recipe's unity (Seger) formula, oxide groups, silica to alumina ratio, fired analysis, loss on ignition and calculated thermal expansion, as the Glazecalc app does.",
      inputSchema: z.object({ lines: linesArg, language: languageArg }),
      annotations: READ_ONLY
    },
    async ({ lines, language }) => {
      const lang = languageOf(language);
      return guarded(() => ok(analysisOf(resolveLines(lines), lang).out), lang);
    }
  );

  server.registerTool(
    'check_limits',
    {
      title: 'Check a recipe against limits',
      description:
        'Checks a glaze recipe for what is past a recommended limit for its firing (too much boron or alkali, too little alumina, too little or too much clay, rising expansion...) and says what the fired glaze will likely do, as the Glazecalc app does. These are cautions from published limits, not a guarantee of food safety.',
      inputSchema: z.object({
        lines: linesArg,
        firing: firingArg,
        limitSet: z
          .string()
          .max(40)
          .optional()
          .describe(
            'The limits to check against: "glazecalc" (the default here) or "hesselberth-roy" (Hesselberth & Roy, cone 6 and 10 only, no low-fire figures; the recipe page’s default).'
          ),
        language: languageArg
      }),
      annotations: READ_ONLY
    },
    async ({ lines, firing, limitSet, language }) => {
      const lang = languageOf(language);
      return guarded(() => ok(checksOf(resolveLines(lines), celsiusOf(firing), limitSet, lang)), lang);
    }
  );

  server.registerTool(
    'convert_cone_temperature',
    {
      title: 'Cones and temperatures',
      description:
        'Converts between a pyrometric cone and its temperature (Orton large cones at 60 °C an hour, cones 06 to 6; SK cones, JIS R 8101, 022 to 42), and between °C and °F. Give a cone, or a temperature to find the nearest cones.',
      inputSchema: z.object({
        cone: z.string().max(5).optional(),
        chart: z.enum(['orton', 'sk']).optional(),
        celsius: z.number().min(-50).max(2000).optional(),
        fahrenheit: z.number().min(-60).max(3600).optional()
      }),
      annotations: READ_ONLY
    },
    async ({ cone, chart, celsius, fahrenheit }) =>
      guarded(() => {
        if (cone) {
          const c = coneCelsius(cone, chart);
          return ok({ cone, chart: chart ?? 'orton', celsius: c, fahrenheit: Math.round(recipe.fahrenheit(c)) });
        }
        const c = celsius ?? (fahrenheit !== undefined ? recipe.celsius(fahrenheit) : undefined);
        if (c === undefined) throw new ToolProblem('Give a cone, or a temperature in celsius or fahrenheit.');
        const nearest = (list: ReadonlyArray<{ cone: string; celsius: number }>) =>
          [...list]
            .sort((a, b) => Math.abs(a.celsius - c) - Math.abs(b.celsius - c))
            .slice(0, 2)
            .map((entry) => ({ cone: entry.cone, celsius: entry.celsius }));
        return ok({
          celsius: rounded(c, 1),
          fahrenheit: rounded(recipe.fahrenheit(c), 1),
          nearestOrton: nearest(chemistry.CONES),
          nearestSk: nearest(cones.SK.cones),
          note: 'Cones measure heat work, not temperature alone: the figures are for the heating rate each chart states.'
        });
      })
  );

  server.registerTool(
    'suggest_substitutes',
    {
      title: 'Substitutes for old materials',
      description:
        'Finds the discontinued or scarce materials in a recipe and the modern ones that replace them, then suggests amounts that keep the unity formula as near as the materials allow, as the Glazecalc app does. Test any suggestion before using it.',
      inputSchema: z.object({
        lines: linesArg,
        region: regionArg,
        allowLead: z.boolean().optional().describe('Whether materials with lead may be suggested. Off by default.'),
        language: languageArg
      }),
      annotations: READ_ONLY
    },
    async ({ lines, region, allowLead, language }) => {
      const lang = languageOf(language);
      return guarded(() => {
        const resolved = resolveLines(lines);
        const options = { allowLead: allowLead ?? false };
        const plan = recipe.planSuggestion<MaterialRecord>(
          resolved,
          findMaterial,
          standardMaterials(),
          region ?? '',
          options
        );
        if (!plan.swaps.length) return ok({ swaps: [], note: 'Nothing in this recipe is discontinued or scarce.' });
        countFit(caller);
        // The best choice for each oxide left short, as the app offers first.
        const bringIn = plan.shortfalls
          .map((shortfall) => (shortfall.choices[0] ? findMaterial(shortfall.choices[0].name) : undefined))
          .filter((material): material is LibraryRecord => Boolean(material))
          // One material can be the best choice for two oxides: it comes in once.
          .filter((material, i, all) => all.findIndex((other) => other.name === material.name) === i);
        const suggestion = recipe.suggestAmounts<MaterialRecord>(
          resolved,
          findMaterial,
          bringIn,
          region ?? '',
          options
        );
        return ok({
          swaps: plan.swaps,
          shortfalls: plan.shortfalls.map((s) => ({
            oxide: s.oxide,
            was: rounded(s.was),
            now: rounded(s.now),
            choices: s.choices.slice(0, 3).map((c) => c.name)
          })),
          recipe: recipeOut(suggestion.materials),
          changes: suggestion.changes.map((change) => recipeText(change, lang)),
          unused: suggestion.unused,
          stillShort: suggestion.stillShort,
          report: reportOut(suggestion.report),
          cautions: suggestion.cautions.map((caution) => cautionOut(caution, lang))
        });
      }, lang);
    }
  );

  server.registerTool(
    'match_from_materials',
    {
      title: 'Remake a recipe from given materials',
      description:
        'Remakes a glaze recipe from only the materials listed in "have", keeping its unity formula as near as they allow, as Match with what I have does in the Glazecalc app. Test any suggestion before using it.',
      inputSchema: z.object({
        lines: linesArg,
        have: z
          .array(z.string().min(1).max(200))
          .min(1)
          .max(100)
          .describe('The library names of the materials on hand.'),
        mustUse: z
          .array(z.string().min(1).max(200))
          .max(20)
          .optional()
          .describe('Materials on hand that must stay in.'),
        language: languageArg
      }),
      annotations: READ_ONLY
    },
    async ({ lines, have, mustUse, language }) => {
      const lang = languageOf(language);
      return guarded(() => {
        const resolved = resolveLines(lines);
        const unknown = have.filter((name) => !findMaterial(name));
        if (unknown.length)
          throw new ToolProblem(`Not in the library: ${unknown.join(', ')}. Use search_materials to find the names.`);
        const must = new Set((mustUse ?? []).map((name) => findMaterial(name)?.name).filter(Boolean));
        const shelf: TryMaterial[] = have.map((name) => {
          const material = findMaterial(name)!;
          return { material, must: must.has(material.name) };
        });
        countFit(caller);
        const match = recipe.matchFromShelf(resolved, shelf);
        return ok(matchOut(match, lang));
      }, lang);
    }
  );
};

/** A match from the shelf, as the tools answer it. */
export const matchOut = (match: ReturnType<typeof recipe.matchFromShelf>, language: string) => ({
  recipe: recipeOut(match.materials),
  changes: match.changes.map((change) => recipeText(change, language)),
  report: reportOut(match.report),
  cautions: match.cautions.map((caution) => cautionOut(caution, language))
});
