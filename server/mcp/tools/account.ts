// The MCP tools that read a person's own records (docs/integrations-plan.md,
// item 30), offered only to a request with a working personal access token
// whose scopes allow each (server/lib/scopes.ts; data:read allows them all).
// Every query is limited to the token's account, as the record routes are
// (server/lib/record_routes.ts), and nothing here changes anything: the tools
// that do are in ./account_write.ts. Records in the Trash are not in these collections, so
// they are never shown; nor are the notes about one, as the app shows a note
// about a record only on that record's page.
import * as z from 'zod';
import mongoose from 'mongoose';
import type { McpServer } from '@modelcontextprotocol/server';
import firingLib from '../../../lib/cones/firing.js';
import type { FiringBlock } from '../../../lib/cones/firing.js';
import results from '../../../lib/cones/results.js';
import recipe from '../../../lib/recipe/index.js';
import type { MaterialRecord, TryMaterial } from '../../../lib/recipe/index.js';
import { liveLinks, type Link } from '../../lib/firing_links.ts';
import { allows, type Permission } from '../../lib/scopes.ts';
import Firing from '../../models/firing.ts';
import Material from '../../models/material.ts';
import Note from '../../models/note.ts';
import Recipe from '../../models/recipe.ts';
import Trash from '../../models/trash.ts';
import User from '../../models/user.ts';
import {
  type Caller,
  countFit,
  firingArg,
  celsiusOf,
  guarded,
  languageArg,
  languageOf,
  linesArg,
  ok,
  resolveLines,
  ToolProblem,
  type RecipeLine
} from '../common.ts';
import { findById, findMaterial, nameKey, oxidesOf } from '../library.ts';
import { confirmSettingOf } from '../../lib/pending_changes.ts';
import { settingsOf } from '../settings.ts';
import { analysisOf, checksOf, coneFitOut, firingBlockOf, matchOut } from './public.ts';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const pageArgs = {
  limit: z.number().int().min(1).max(100).optional().describe('How many to return, 25 by default.'),
  offset: z.number().int().min(0).max(100000).optional().describe('How many to skip, for the next page.')
};
const idArg = z.string().min(1).max(40).describe('The id from a list.');

/**
 * A temperature within each firing band a recipe can be saved for, to check
 * it as that band: Orton cone 04, 6 and 10 on the 60 °C/h chart (ORTON_60 in
 * lib/cones/firing.js; the bands are in lib/recipe/limits.js).
 */
const BAND_CELSIUS = { low: 1060, mid: 1222, high: 1305 } as const;
type FiringBand = keyof typeof BAND_CELSIUS;

/** A recipe's firing block as an assistant is given it, or undefined when it states none. */
const firingOut = (block: unknown) => {
  const clean = firingLib.cleanFiring(block as FiringBlock | undefined);
  if (!clean) return undefined;
  const tested = firingLib.testedCones(clean);
  return { ...clean, ...(tested.length && { tested }), bands: firingLib.firingBands(clean) };
};

const coneFilterArgs = {
  cone: z
    .string()
    .max(6)
    .optional()
    .describe(
      'Only recipes whose stated firing includes this cone ("6", "06", "5.5", SK "6a"), or for scale "temperature" this °C. A range matches any cone inside it; recipes tested at it come first. Recipes stated in another scale match approximately: Orton and SK by the Kyoto institute’s same-kiln table (SK 7 to 14 against Orton 4 to 12; other cones match their own scale only), a temperature when the cone bends within 15 °C of it (Orton at 60 °C an hour).'
    ),
  scale: z
    .enum(['orton', 'sk', 'temperature'])
    .optional()
    .describe('The scale the cone is in: Orton (the default), SK (JIS R 8101) or a temperature in °C.'),
  atmosphere: z
    .enum(['oxidation', 'reduction', 'neutral'])
    .optional()
    .describe('Only recipes stated for this atmosphere.'),
  process: z
    .enum(['wood', 'soda', 'salt', 'raku', 'pit'])
    .optional()
    .describe('Only recipes stated for this firing process.')
};

/** A pattern matching text that contains the query, in any case; special characters taken literally. */
const containing = (query: string): RegExp => new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const textOf = (value: unknown): string | undefined =>
  Array.isArray(value)
    ? value.filter((v) => typeof v === 'string').join('\n')
    : typeof value === 'string'
      ? value
      : undefined;

/** One of the account's records of a kind by id, or a ToolProblem. */
const ownRecord = async <T>(
  Model: mongoose.Model<T>,
  id: string,
  userId: string,
  what: string
): Promise<mongoose.HydratedDocument<T>> => {
  const found = mongoose.isObjectIdOrHexString(id) ? await Model.findOne({ _id: id, ownedBy: userId }) : null;
  if (!found) throw new ToolProblem(`No ${what} with id ${id} in your account.`);
  return found as mongoose.HydratedDocument<T>;
};

/** A saved recipe's lines as the recipe tools read them: its own copies of its materials. */
const savedLines = (materials: unknown[]): RecipeLine[] =>
  materials
    .filter(
      (m): m is MaterialRecord & { amount?: string } => Boolean(m) && typeof m === 'object' && 'name' in (m as object)
    )
    .map((m) => ({ ...m, amount: String(m.amount ?? '') }));

export const registerAccountTools = (server: McpServer, caller: Caller): void => {
  const userId = caller.userId;
  if (!userId) return;
  const scopes = caller.scopes ?? [];
  const may = (permission: Permission) => allows(scopes, permission);

  /** The materials on the account's shelf, as the recipe tools read them; keys no longer found are left out. */
  const shelfOf = async (): Promise<{ materials: MaterialRecord[]; missing: number }> => {
    const user = await User.findById(userId, { shelf: 1 });
    const keys = user?.shelf ?? [];
    const ownIds = keys.filter((key) => mongoose.isObjectIdOrHexString(key) && !findById(key));
    const own = ownIds.length ? await Material.find({ _id: { $in: ownIds }, ownedBy: userId }).lean() : [];
    const ownById = new Map(own.map((m) => [String(m._id), m as unknown as MaterialRecord]));
    const materials: MaterialRecord[] = [];
    let missing = 0;
    for (const key of keys) {
      const found = key.startsWith('name:') ? findMaterial(key.slice(5)) : (findById(key) ?? ownById.get(key));
      if (found) materials.push(found);
      else missing++;
    }
    return { materials, missing };
  };

  /** The account's own material of this name, for a recipe line, before the library's. */
  const ownMaterials = async (): Promise<(name: string) => MaterialRecord | undefined> => {
    const own = await Material.find({ ownedBy: userId }).lean();
    const byName = new Map(own.map((m) => [nameKey(m.name), m as unknown as MaterialRecord]));
    return (name: string) => byName.get(nameKey(name));
  };

  if (may('recipes:read')) {
    server.registerTool(
      'list_recipes',
      {
        title: 'List my recipes',
        description:
          'Lists the glaze recipes saved in your Glazecalc account, newest first, optionally only those whose title or a material matches a search, or whose stated firing includes a cone or names an atmosphere or process ("which of my glazes fire at cone 10 reduction?"). Each lists its stated firing; a recipe with none has not stated one.',
        inputSchema: z.object({ search: z.string().max(100).optional(), ...coneFilterArgs, ...pageArgs }),
        annotations: READ_ONLY
      },
      async ({ search, cone, scale, atmosphere, process, limit, offset }) =>
        guarded(async () => {
          const filter: Record<string, unknown> = { ownedBy: userId };
          if (search) filter.$or = [{ title: containing(search) }, { 'materials.name': containing(search) }];
          if (atmosphere) filter['firedAt.atmospheres'] = atmosphere;
          if (process) filter['firedAt.processes'] = process;
          const coneScale = scale ?? 'orton';
          if (cone !== undefined && !firingLib.isCone(coneScale, cone)) {
            throw new ToolProblem(
              `"${cone}" is not a cone of the ${coneScale} scale. Orton cones run 022 … 01, then 1 … 42 (half cones as "5.5"); SK cones as printed ("6a", "8"); a temperature in whole °C.`
            );
          }
          const projection = { title: 1, date: 1, materials: 1, firedAt: 1 };
          let found;
          let total;
          if (cone === undefined) {
            total = await Recipe.countDocuments(filter);
            found = await Recipe.find(filter, projection)
              .sort({ _id: -1 })
              .skip(offset ?? 0)
              .limit(limit ?? 25)
              .lean();
          } else {
            // A range matches any cone inside it, so the cone is matched here, in any scale (matchesCone:
            // measured equivalents across Orton and SK, within 15 °C for a temperature); those tested at it
            // come first.
            const all = (await Recipe.find(filter, projection).sort({ _id: -1 }).lean()).filter((r) =>
              firingLib.matchesCone(r.firedAt as FiringBlock, coneScale, cone)
            );
            const untested = (r: (typeof all)[number]) =>
              firingLib.testedCones(r.firedAt as FiringBlock).includes(cone) ? 0 : 1;
            all.sort((a, b) => untested(a) - untested(b));
            total = all.length;
            found = all.slice(offset ?? 0, (offset ?? 0) + (limit ?? 25));
          }
          return ok({
            total,
            recipes: found.map((r) => {
              const firedAt = firingOut(r.firedAt);
              return {
                id: String(r._id),
                title: r.title,
                ...(r.date && { date: r.date }),
                ...(firedAt && { firedAt }),
                materials: (r.materials as Array<{ name?: string }>).map((m) => m?.name).filter(Boolean)
              };
            })
          });
        })
    );

    server.registerTool(
      'get_recipe',
      {
        title: 'Get one of my recipes',
        description:
          "One recipe from your account: its materials and amounts, colorants, notes, its stated firing (firedAt: the cone scale, the low and optional high cone of the claimed range, the cones actually tested, the atmospheres and processes, and for a temperature the rate and hold; each cone exactly as the potter gave it), whether it is for a food surface, the firing logs it went through with a result note each and, where known, the cone and atmosphere each was fired at, the potter’s summary of how it came out at each cone and atmosphere (coneResults; one outside the stated firing is kept), the firing band and target specific gravity saved with it, and its unity formula worked out afresh. It is checked against the limit set chosen in your settings: for the firing given here, or else the band chosen on the recipe, or else the bands its stated firing falls in (a range across two bands is checked at each). coneFit says, for the same firing, whether the chemistry looks like that firing's, as the recipe page's limits panel does: by Katz's boron rule and Hesselberth & Roy's silica and alumina whatever limit set is chosen, a note (verdict 'cooler' or 'hotter') only when boron and silica or alumina agree on another band, 'closer' when a range across bands looks nearer one end, 'fits' when nothing points away (not a pass), 'skipped' where the published figures do not reach. Cone 6 against cone 10 is told apart only roughly (strength 'soft'). A guide, not a test.",
        inputSchema: z.object({ id: idArg, firing: firingArg, language: languageArg }),
        annotations: READ_ONLY
      },
      async ({ id, firing, language }) => {
        const lang = languageOf(language);
        return guarded(async () => {
          const found = await ownRecord(Recipe, id, userId, 'recipe');
          const lines = savedLines(found.materials as unknown[]);
          let analysis: Record<string, unknown> | null = null;
          let checks: Record<string, unknown> | null = null;
          const band = Object.hasOwn(BAND_CELSIUS, found.firing ?? '') ? (found.firing as FiringBand) : undefined;
          const firedAt = firingOut(found.firedAt);
          const links = await liveLinks(userId, found.firings as Link[]);
          const coneResults = results.cleanConeResults(found.coneResults ?? []) ?? [];
          // The band chosen on the recipe wins; else the bands its stated firing falls in, coolest first.
          const bands: FiringBand[] = band ? [band] : (firedAt?.bands ?? []);
          let alsoChecks: Record<string, unknown> | undefined;
          let coneFit: ReturnType<typeof coneFitOut> = null;
          try {
            analysis = analysisOf(lines, lang).out;
            // The firing asked about, else the band chosen on the recipe, else the stated firing, as the page has it.
            const against = firing ? firingBlockOf(firing) : (band ?? firedAt ?? null);
            coneFit = coneFitOut(
              recipe.coneFit(analysis.unityFormula as Record<string, number>, against, {
                processes: firedAt?.processes ?? [],
                materials: lines.map((line) => line.name)
              }),
              lang
            );
            if (firing || bands.length) {
              const setting = await settingsOf(userId);
              // The recipe page's check: the account's limit set, for the firing asked about or the one saved.
              checks = checksOf(lines, firing ? celsiusOf(firing) : BAND_CELSIUS[bands[0]!], setting('limitSet'), lang);
              if (!firing) {
                delete checks.celsius;
                checks.firingFrom = band ? 'recipe' : 'firedAt';
                // A range across bands is checked at each, as the recipe page shows them side by side.
                if (bands.length > 1) {
                  alsoChecks = Object.fromEntries(
                    bands.slice(1).map((b) => {
                      const more = checksOf(lines, BAND_CELSIUS[b], setting('limitSet'), lang);
                      delete more.celsius;
                      return [b, more];
                    })
                  );
                }
              }
            }
          } catch (err) {
            if (err instanceof ToolProblem) throw err;
            analysis = null;
          }
          return ok({
            id: String(found._id),
            title: found.title,
            ...(found.date && { date: found.date }),
            ...(textOf(found.notes) && { notes: textOf(found.notes) }),
            ...(band && { firing: band }),
            ...(firedAt && { firedAt }),
            ...(found.foodSurface && { foodSurface: true }),
            // Only links to firing logs that are there: never one in the Trash or deleted.
            ...(links.length && {
              firings: links.map((link) => ({
                firingId: link.firing,
                ...(link.result && { result: link.result }),
                ...(link.cone && { cone: link.cone }),
                ...(link.atmosphere && { atmosphere: link.atmosphere })
              }))
            }),
            ...(coneResults.length && { coneResults }),
            ...(typeof found.sgTarget === 'number' && { sgTarget: found.sgTarget }),
            materials: lines.map((line) => ({ material: line.name, amount: recipe.amountOf(line.amount) })),
            colorants: ((found.additives ?? []) as Array<{ name?: string; amount?: string; unit?: string }>)
              .filter((a) => a && a.name)
              .map((a) => ({ name: a.name, amount: recipe.amountOf(a.amount), unit: a.unit ?? 'percent' })),
            ...(found.includeAdditives && { colorantsInUnityFormula: true }),
            analysis,
            ...(checks && { checks }),
            ...(alsoChecks && { checksAtOtherBands: alsoChecks }),
            ...(coneFit && { coneFit })
          });
        }, lang);
      }
    );
  }

  if (may('materials:read')) {
    server.registerTool(
      'list_my_materials',
      {
        title: 'List my materials',
        description:
          'Lists the materials you have saved in your own Glazecalc account (not the shared library), with their oxides.',
        inputSchema: z.object({ search: z.string().max(100).optional(), ...pageArgs }),
        annotations: READ_ONLY
      },
      async ({ search, limit, offset }) =>
        guarded(async () => {
          const filter: Record<string, unknown> = { ownedBy: userId };
          if (search) filter.name = containing(search);
          const total = await Material.countDocuments(filter);
          const found = await Material.find(filter)
            .sort({ name: 1, _id: 1 })
            .skip(offset ?? 0)
            .limit(limit ?? 25)
            .lean();
          return ok({
            total,
            materials: found.map((m) => ({
              id: String(m._id),
              name: m.name,
              oxides: oxidesOf(m as unknown as MaterialRecord),
              oxidesAre: m.percentmole === 'molecular' ? 'moles in the formula' : 'weight percent',
              loi: m.loi
            }))
          });
        })
    );
  }

  if (may('shelf:read')) {
    server.registerTool(
      'get_shelf',
      {
        title: 'Materials I have on hand',
        description: 'The materials you marked as on hand in Glazecalc (the shelf that Match with what I have uses).',
        inputSchema: z.object({}),
        annotations: READ_ONLY
      },
      async () =>
        guarded(async () => {
          const { materials, missing } = await shelfOf();
          return ok({ materials: materials.map((m) => m.name), ...(missing && { notFound: missing }) });
        })
    );

    if (may('recipes:read') && may('materials:read')) {
      server.registerTool(
        'match_with_what_i_have',
        {
          title: 'Remake a recipe from what I have',
          description:
            'Remakes one of your recipes, or a recipe you give, from only the materials on your shelf, keeping its unity formula as near as they allow (Match with what I have). Test any suggestion before using it.',
          inputSchema: z.object({
            recipeId: z.string().max(40).optional().describe('One of your recipes, from list_recipes.'),
            lines: linesArg.optional().describe('Or a recipe given line by line.'),
            language: languageArg
          }),
          annotations: READ_ONLY
        },
        async ({ recipeId, lines, language }) => {
          const lang = languageOf(language);
          return guarded(async () => {
            let resolved: RecipeLine[];
            if (recipeId)
              resolved = savedLines((await ownRecord(Recipe, recipeId, userId, 'recipe')).materials as unknown[]);
            else if (lines) resolved = resolveLines(lines, await ownMaterials());
            else throw new ToolProblem('Give a recipeId or the lines of a recipe.');
            const { materials } = await shelfOf();
            const shelf: TryMaterial[] = materials.map((material) => ({ material, must: false }));
            countFit(caller);
            return ok(matchOut(recipe.matchFromShelf(resolved, shelf), lang));
          }, lang);
        }
      );
    }
  }

  if (may('firing:read')) {
    server.registerTool(
      'list_firings',
      {
        title: 'List my firing logs',
        description: 'Lists the firing logs saved in your Glazecalc account, newest first.',
        inputSchema: z.object({ search: z.string().max(100).optional(), ...pageArgs }),
        annotations: READ_ONLY
      },
      async ({ search, limit, offset }) =>
        guarded(async () => {
          const filter: Record<string, unknown> = { ownedBy: userId };
          if (search) filter.$or = [{ title: containing(search) }, { kiln: containing(search) }];
          const total = await Firing.countDocuments(filter);
          const found = await Firing.find(filter, { title: 1, date: 1, kiln: 1, rows: 1 })
            .sort({ _id: -1 })
            .skip(offset ?? 0)
            .limit(limit ?? 25)
            .lean();
          return ok({
            total,
            firings: found.map((f) => ({
              id: String(f._id),
              title: f.title,
              ...(f.date && { date: f.date }),
              ...(f.kiln && { kiln: f.kiln }),
              rows: f.rows.length
            }))
          });
        })
    );

    server.registerTool(
      'get_firing',
      {
        title: 'Get one of my firing logs',
        description:
          'One firing log from your account: its columns (time, temperature, cone...) and rows, and its notes.',
        inputSchema: z.object({ id: idArg }),
        annotations: READ_ONLY
      },
      async ({ id }) =>
        guarded(async () => {
          const f = await ownRecord(Firing, id, userId, 'firing log');
          return ok({
            id: String(f._id),
            title: f.title,
            ...(f.date && { date: f.date }),
            ...(f.kiln && { kiln: f.kiln }),
            ...(textOf(f.notes) && { notes: textOf(f.notes) }),
            columns: f.fieldsIncluded,
            rows: f.rows
          });
        })
    );
  }

  if (may('notes:read')) {
    server.registerTool(
      'list_notes',
      {
        title: 'List my notebook',
        description:
          'The notes in your Glazecalc notebook, newest first, optionally only those about one record (a recipe, material or firing log id).',
        inputSchema: z.object({
          search: z.string().max(100).optional(),
          about: z.string().max(40).optional().describe('Only the notes about this record id.'),
          ...pageArgs
        }),
        annotations: READ_ONLY
      },
      async ({ search, about, limit, offset }) =>
        guarded(async () => {
          // Not the notes about a record in the Trash: they come back with it.
          const trashed = (
            await Trash.find({ ownedBy: userId, recordId: { $ne: null }, fromCollection: { $ne: 'notes' } })
              .select({ recordId: 1 })
              .lean()
          ).map((entry) => String(entry.recordId));
          const filter: Record<string, unknown> = { ownedBy: userId, relatedId: { $nin: trashed } };
          if (about) filter.$and = [{ relatedId: about }];
          if (search) filter.$or = [{ title: containing(search) }, { content: containing(search) }];
          const total = await Note.countDocuments(filter);
          const found = await Note.find(filter)
            .sort({ _id: -1 })
            .skip(offset ?? 0)
            .limit(limit ?? 25)
            .lean();
          return ok({
            total,
            notes: found.map((n) => ({
              id: String(n._id),
              ...(n.title && { title: n.title }),
              content: n.content,
              about: { kind: n.relatedCollection, id: n.relatedId }
            }))
          });
        })
    );
  }

  if (may('preferences:read')) {
    server.registerTool(
      'get_my_settings',
      {
        title: 'My settings',
        description:
          'Your Glazecalc settings that matter when talking about glazes: region, temperature scale, cones, language, weight unit, whether lead may be suggested, the limit set recipes are checked against, the currency your prices are in (never the prices), and whether changes made by assistants wait for your approval on the website (confirmChanges: off, removals or all; it can be changed only there).',
        inputSchema: z.object({}),
        annotations: READ_ONLY
      },
      async () =>
        guarded(async () => {
          const pick = await settingsOf(userId);
          return ok({
            region: pick('region'),
            temperature: pick('temperature'),
            cones: pick('cones'),
            language: pick('language'),
            weightUnit: pick('weightUnit'),
            lead: pick('lead'),
            limitSet: pick('limitSet'),
            // '' follows the region (lib/regions currencyFor).
            currency: pick('currency'),
            // Read only: set on Connected apps with the web session (docs/adr/0025). Failing closed, as the tools do.
            confirmChanges: await confirmSettingOf(userId)
          });
        })
    );
  }
};
