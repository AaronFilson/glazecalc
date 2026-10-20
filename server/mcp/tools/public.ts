// The MCP tools anyone may use, with no account (docs/integrations-plan.md,
// Phase 2, item 20): the library, a recipe's unity formula, the limit checks
// (with the chemistry against the firing, docs/adr/0022), substitutions for old
// materials, a match from given materials, and cones.
// Each runs the same code as the app (lib/chemistry, lib/recipe) and answers
// with structured data, sentences in the caller's language, and the same as
// JSON text. Nothing a caller sends is stored.
import * as z from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import chemistry from '../../../lib/chemistry/index.js';
import cones from '../../../lib/cones/index.js';
import firingLib from '../../../lib/cones/firing.js';
import type { Band, FiringBlock } from '../../../lib/cones/firing.js';
import recipe from '../../../lib/recipe/index.js';
import type { ConeFit, MaterialRecord, TryMaterial } from '../../../lib/recipe/index.js';
import {
  type Caller,
  cautionOut,
  coneOf,
  countFit,
  firingArg,
  type Firing,
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
import {
  findAdditive,
  findMaterial,
  oxidesOf,
  searchLibrary,
  standardMaterials,
  type LibraryRecord
} from '../library.ts';
import { chemistryText, recipeText } from '../words.ts';
import { allows } from '../../lib/scopes.ts';
import { settingsOf } from '../settings.ts';

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

/** A firing asked about as a firing block, for the cone check: a cone of its chart, or a temperature. */
export const firingBlockOf = (firing: Firing): FiringBlock | null => firingOf(firing).block;

/**
 * What the tools say when the limits are not checked because the firing is
 * past every set's figures (the 'top' band: cone 12 up, about 1320 °C).
 */
export const TOP_NOTE =
  'No limit set has figures for a firing from cone 12 up (about 1320 °C): the published glaze limits Glazecalc found (Hesselberth & Roy, the UK traditional limits, Green & Cooper) stop at cone 10, and Glazecalc reads them no further than cone 11. So only the checks that do not depend on the firing are made here; test tiles decide.';

/**
 * Whether the chemistry fits the firing (lib/recipe/cone-fit.js), as the tools answer it: the
 * verdict and its figures as data, what the recipe page says in the language, and the sources.
 */
export const coneFitOut = (fit: ConeFit | null, language: string) =>
  fit && {
    verdict: fit.verdict,
    looksLike: fit.looksLike,
    ...(fit.closerTo && { closerTo: fit.closerTo }),
    strength: fit.strength,
    ...(fit.skipped && { skipped: fit.skipped }),
    against: fit.stated,
    signals: fit.signals.map((signal) => ({
      oxide: signal.key,
      value: rounded(signal.value, 2),
      figure: rounded(signal.figure, 2),
      side: signal.side,
      band: signal.band,
      source: signal.source
    })),
    text: fit.sentences.map((sentence) => recipeText(sentence, language)).join(' '),
    sources: fit.sources.map((source) => ({ title: source.title, url: source.url }))
  };

/** The limit set a caller chose, or the app's own. */
const limitSetOf = (id: string | undefined) => {
  const set = recipe.LIMIT_SETS[id ?? 'glazecalc'];
  if (!set) throw new ToolProblem(`No limit set ${id}. Choose one of: ${Object.keys(recipe.LIMIT_SETS).join(', ')}.`);
  return set;
};

/**
 * The cautions for a recipe against a limit set: what the app shows beside a
 * recipe. The firing is a temperature, or a cone's band (and its temperature
 * where Glazecalc has one), as firingOf reads it; the band wins.
 */
export const checksOf = (
  lines: RecipeLine[],
  firing: { celsius?: number; band?: Band },
  limitSetId: string | undefined,
  language: string
) => {
  const set = limitSetOf(limitSetId);
  const { celsius } = firing;
  const band = firing.band !== undefined ? recipe.bandIn(set, firing.band) : recipe.bandOf(set, celsius);
  const { result, out } = analysisOf(lines, language);
  const checkLines = lines.map((line) => ({ material: line, amount: line.amount }));
  const cautions = [
    ...recipe.pastLimits({
      lines: checkLines,
      unity: result.umf,
      celsius,
      band: firing.band,
      expansion: { was: null, now: result.expansion },
      limitSet: set
    }),
    ...recipe.sizeNotes(checkLines, band === 'low')
  ];
  return {
    limitSet: { id: set.id, name: set.name, source: set.source },
    band: band ?? null,
    bandUsed: band ?? set.whenUnknown,
    ...(celsius !== undefined && { celsius }),
    ...(band === 'top' && { limitsNote: TOP_NOTE }),
    unityFormula: out.unityFormula,
    cautions: cautions.map((caution) => cautionOut(caution, language))
  };
};

/** What the cone answers say of every figure. */
const CONES_NOTE =
  'Cones measure heat work, not temperature alone: the figures are for the heating rate each chart states. Set a witness cone.';
const SK_BASIS = `the nominal figure of ${cones.SK.standard}, the standard's reference temperature, not a measured bend`;

/**
 * A cone and its temperature, as convert_cone_temperature answers: for Orton,
 * Glazecalc's figure (Orton's older chart, ORTON.chart; null from cone 16 up,
 * where no chart we found has one) and Orton's own current figures beside it
 * where it publishes them; for SK, the JIS nominal figure.
 */
export const coneAnswer = (cone: string, chart: 'orton' | 'sk') => {
  if (chart === 'sk') {
    const found = cones.SK.cones.find((c) => c.cone === cone)!;
    return {
      cone,
      chart,
      celsius: found.celsius,
      fahrenheit: Math.round(recipe.fahrenheit(found.celsius)),
      basis: SK_BASIS,
      note: cones.SK.note
    };
  }
  const at = firingLib.approxCelsius('orton', cone);
  const published = cones.ORTON.published.cones.find((c) => c.cone === cone);
  return {
    cone,
    chart,
    celsius: at?.celsius ?? null,
    fahrenheit: at ? Math.round(recipe.fahrenheit(at.celsius)) : null,
    basis: at
      ? cones.ORTON.chart.basis + (cone.endsWith('.5') ? ', a half cone put halfway between its neighbours' : '')
      : null,
    ...(published && {
      ortonCurrent: {
        ratesAre: '°C an hour over the last 100 °C of the firing',
        selfSupporting: published.selfSupporting,
        ...(published.large && { large: published.large }),
        ...(published.largeDiffers && { largeDiffers: true }),
        source: cones.ORTON.published.source
      }
    }),
    note: at
      ? CONES_NOTE
      : `Orton makes cone ${firingLib.coneLabel(cone)} but publishes no temperature for it, and no Orton chart we found has one; Glazecalc's chart stops at cone 15. Set witness cones, or give the temperature you fire to.`
  };
};

/** A suggested recipe's materials, as names and amounts. */
const recipeOut = (materials: MaterialRecord[]) =>
  materials.map((material) => ({ material: material.name, amount: Number(material.amount ?? 0) }));

type Report = ReturnType<typeof recipe.explain>;

/** More than this above the best the materials could do, and the match could come nearer (as the app says it). */
const COULD_BE_NEARER = 0.5;

/** How near the fit tries to bring each oxide (lib/chemistry/fit.js), as the closeness sentences say it. */
const NEAR = '0.02, or 5% of a large amount such as silica (0.06 for soda and potash apart)';

/** Formulas as a list: "Na2O, K2O and B2O3". */
const listed = (names: string[]): string =>
  names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : (names[0] ?? '');
const isAre = (names: string[]): string => (names.length === 1 ? 'is' : 'are');

/**
 * How near a match or suggestion comes, said plainly enough to judge it by:
 * each oxide of the new unity formula against the old (lib/chemistry/
 * closeness.js), a verdict, and a sentence (in English, as the tools' notes
 * are). Shown only the solver's score, an assistant could not tell a near
 * match from a poor one.
 */
const closenessOut = (report: Report) => {
  const found = report.closeness;
  if (!found) return undefined;
  const named = (verdict: string) => found.oxides.filter((o) => o.verdict === verdict).map((o) => o.oxide);
  const [off, far] = [named('off'), named('far')];
  const said = [
    found.verdict === 'close'
      ? `Close: every oxide of the new unity formula is within ${NEAR} of the old recipe's.`
      : found.verdict === 'fair'
        ? `Fair: near the old recipe's unity formula, but ${listed(off)} ${isAre(off)} off by more than ${NEAR}, though by less than three times that.`
        : `Poor: ${listed(far)} ${isAre(far)} off by more than three times ${NEAR}, so expect a different glaze.` +
          (off.length ? ` ${listed(off)} ${isAre(off)} off by less.` : ''),
    report.unreachable.length ? `Nothing given supplies ${listed(report.unreachable)}.` : '',
    report.miss - report.best < COULD_BE_NEARER
      ? 'These materials cannot come much nearer.'
      : 'These materials could come nearer: see couldHelp and capped.'
  ];
  return {
    verdict: found.verdict,
    summary: said.filter(Boolean).join(' '),
    oxides: found.oxides.map((o) => ({
      oxide: o.oxide,
      old: rounded(o.was),
      new: rounded(o.now),
      difference: rounded(o.difference),
      ...(o.was > 0 && { percent: Math.round((100 * o.difference) / o.was) }),
      verdict: o.verdict
    }))
  };
};

/** What each material in a match or suggestion does, and how near it comes. */
const reportOut = (report: Report, language: string) => ({
  closeness: closenessOut(report),
  uses: report.uses.map((use) => ({
    material: use.name,
    amount: rounded(use.amount.value, use.amount.places),
    supplies: use.supplies.map((s) => ({ oxide: s.oxide, share: rounded(s.share, 2) })),
    needed: use.needed
  })),
  couldHelp: report.couldHelp.map((c) => ({ material: c.name, helps: rounded(c.helps, 3) })),
  // Caps that cost match, as percents of the batch: allowMore lifts one.
  capped: report.capped.map((c) => ({
    materials: c.members,
    most: rounded(c.most, 1),
    wouldBe: rounded(c.wouldBe, 1),
    ...(c.why && { why: recipeText(c.why, language) })
  })),
  unreachable: report.unreachable,
  miss: rounded(report.miss, 4),
  best: rounded(report.best, 4)
});

/** Library names to lift a cap from, as the library has them; a ToolProblem names any not in it. */
const allowedMore = (names: string[] | undefined): string[] => {
  const unknown = (names ?? []).filter((name) => !findMaterial(name));
  if (unknown.length)
    throw new ToolProblem(`Not in the library: ${unknown.join(', ')}. Use search_materials to find the names.`);
  return (names ?? []).map((name) => findMaterial(name)!.name);
};

/** Materials whose suggested cap to lift. */
export const allowMoreArg = z
  .array(z.string().min(1).max(200))
  .max(20)
  .optional()
  .describe(
    "Materials whose suggested cap to lift, as report.capped names them: raw clay is held to 20% of the batch (or the recipe's own share) where that costs the match little."
  );

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
        "Checks a glaze recipe for what is past a recommended limit for its firing (too much boron or alkali, too little alumina, too little or too much clay, rising expansion...) and says what the fired glaze will likely do, as the Glazecalc app does. A cone is checked in the band the recipe page gives it (low cone 06-02, mid 1-7, high 8-11); from cone 12 up (band 'top') no published limits reach, so the band's limits are not checked and limitsNote says so. With a firing, coneFit says whether the chemistry looks like that firing's, by Katz's boron rule and Hesselberth & Roy's silica and alumina whatever limit set is chosen: verdict 'cooler' or 'hotter' only when boron and silica or alumina agree on another band; 'fits' (nothing points away, not a pass); 'skipped' where the published figures do not reach (lead, lithium, much soda and potash or zinc, raku, cones 01 to 3, cooler than cone 06 or hotter than cone 10...). Cone 6 against cone 10 is told apart only roughly (strength 'soft'). These are cautions and guides from published figures, not a test and not a guarantee of food safety.",
      inputSchema: z.object({
        lines: linesArg,
        firing: firingArg,
        limitSet: z
          .string()
          .max(40)
          .optional()
          .describe(
            'The limits to check against: "glazecalc" or "hesselberth-roy" (Hesselberth & Roy, cone 6 and 10 only, no low-fire figures). Neither has figures from cone 12 up. Left out: the limit set saved in the account’s settings when the token may read preferences (the recipe page’s own, "hesselberth-roy" until changed), else "glazecalc".'
          ),
        language: languageArg
      }),
      annotations: READ_ONLY
    },
    async ({ lines, firing, limitSet, language }) => {
      const lang = languageOf(language);
      return guarded(async () => {
        const resolved = resolveLines(lines);
        // An account's own limit set, when it may be read and none was asked for.
        const own =
          !limitSet && caller.userId && allows(caller.scopes ?? [], 'preferences:read')
            ? (await settingsOf(caller.userId))('limitSet')
            : undefined;
        const at = firingOf(firing);
        const checks = checksOf(resolved, at, limitSet ?? own, lang);
        const fit = coneFitOut(
          recipe.coneFit(checks.unityFormula, at.block, { materials: resolved.map((line) => line.name) }),
          lang
        );
        return ok({ ...checks, ...(fit && { coneFit: fit }) });
      }, lang);
    }
  );

  server.registerTool(
    'convert_cone_temperature',
    {
      title: 'Cones and temperatures',
      description:
        "Converts between a pyrometric cone and its temperature, and between °C and °F. Orton cones run 022 to 42: Glazecalc's figure, from 022 to 15, is Orton's older chart for large cones at 150 °C an hour, and Orton's current figures (self-supporting cones at 15, 60 and 150 °C an hour, large cones at 60 and 150, cone 022 to 14) come beside it; Orton publishes no figure above cone 14, so cones from 16 up have none. SK cones (JIS R 8101, SK 022 to SK 20) by the standard's nominal figures. Give a cone, or a temperature to find the nearest cones.",
      inputSchema: z.object({
        cone: z.string().max(10).optional(),
        chart: z.enum(['orton', 'sk']).optional(),
        celsius: z.number().min(-50).max(2000).optional(),
        fahrenheit: z.number().min(-60).max(3600).optional()
      }),
      annotations: READ_ONLY
    },
    async ({ cone, chart, celsius, fahrenheit }) =>
      guarded(() => {
        if (cone) return ok(coneAnswer(coneOf(cone, chart ?? 'orton'), chart ?? 'orton'));
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
          nearestOrton: nearest(cones.ORTON.chart.cones),
          ortonBasis: cones.ORTON.chart.basis,
          nearestSk: nearest(cones.SK.cones),
          skBasis: SK_BASIS,
          note: CONES_NOTE
        });
      })
  );

  server.registerTool(
    'suggest_substitutes',
    {
      title: 'Substitutes for old materials',
      description:
        'Finds the discontinued or scarce materials in a recipe and the modern ones that replace them, then suggests amounts that keep the unity formula as near as the materials allow, as the Glazecalc app does. report.closeness says how near the new unity formula comes to the old, oxide by oxide, as match_from_materials does. Test any suggestion before using it.',
      inputSchema: z.object({
        lines: linesArg,
        region: regionArg,
        allowLead: z.boolean().optional().describe('Whether materials with lead may be suggested. Off by default.'),
        allowMore: allowMoreArg,
        language: languageArg
      }),
      annotations: READ_ONLY
    },
    async ({ lines, region, allowLead, allowMore, language }) => {
      const lang = languageOf(language);
      return guarded(() => {
        const resolved = resolveLines(lines);
        const uncapped = allowedMore(allowMore);
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
        const suggestion = recipe.suggestAmounts<MaterialRecord>(resolved, findMaterial, bringIn, region ?? '', {
          ...options,
          uncapped
        });
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
          report: reportOut(suggestion.report, lang),
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
        'Remakes a glaze recipe from only the materials listed in "have", keeping its unity formula as near as they allow, as Match with what I have does in the Glazecalc app. ' +
        "report.closeness says how near the new unity formula comes to the old, oxide by oxide: close (within 0.02, or 5% of a large amount such as silica's), off, or far (more than three times that), with a verdict (close, fair or poor) and a summary. " +
        "report.miss and report.best are the solver's own scores, for comparing runs. Raw clay is held to 20% of the batch where that costs the match little (report.capped and allowMore say more). " +
        'Test any suggestion before using it.',
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
        allowMore: allowMoreArg,
        language: languageArg
      }),
      annotations: READ_ONLY
    },
    async ({ lines, have, mustUse, allowMore, language }) => {
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
        const uncapped = allowedMore(allowMore);
        countFit(caller);
        const match = recipe.matchFromShelf(resolved, shelf, { uncapped });
        return ok(matchOut(match, lang));
      }, lang);
    }
  );
};

/** A match from the shelf, as the tools answer it. */
export const matchOut = (match: ReturnType<typeof recipe.matchFromShelf>, language: string) => ({
  recipe: recipeOut(match.materials),
  changes: match.changes.map((change) => recipeText(change, language)),
  report: reportOut(match.report, language),
  cautions: match.cautions.map((caution) => cautionOut(caution, language))
});
