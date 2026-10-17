// The MCP tools that read a person's own records (docs/integrations-plan.md,
// item 30), offered only to a request with a working personal access token
// whose scopes allow each (server/lib/scopes.ts; data:read allows them all).
// Every query is limited to the token's account, as the record routes are
// (server/lib/record_routes.ts), and nothing here changes anything: writing
// waits for Phase 4. Records in the Trash are not in these collections, so
// they are never shown.
import * as z from 'zod';
import mongoose from 'mongoose';
import type { McpServer } from '@modelcontextprotocol/server';
import recipe from '../../../lib/recipe/index.js';
import type { MaterialRecord, TryMaterial } from '../../../lib/recipe/index.js';
import { allows, type Permission } from '../../lib/scopes.ts';
import Firing from '../../models/firing.ts';
import Material from '../../models/material.ts';
import Note from '../../models/note.ts';
import Recipe from '../../models/recipe.ts';
import User, { PREFERENCES } from '../../models/user.ts';
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
import { analysisOf, checksOf, matchOut } from './public.ts';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const pageArgs = {
  limit: z.number().int().min(1).max(100).optional().describe('How many to return, 25 by default.'),
  offset: z.number().int().min(0).max(100000).optional().describe('How many to skip, for the next page.')
};
const idArg = z.string().min(1).max(40).describe('The id from a list.');

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
          'Lists the glaze recipes saved in your Glazecalc account, newest first, optionally only those whose title or a material matches a search.',
        inputSchema: z.object({ search: z.string().max(100).optional(), ...pageArgs }),
        annotations: READ_ONLY
      },
      async ({ search, limit, offset }) => {
        const filter: Record<string, unknown> = { ownedBy: userId };
        if (search) filter.$or = [{ title: containing(search) }, { 'materials.name': containing(search) }];
        const total = await Recipe.countDocuments(filter);
        const found = await Recipe.find(filter, { title: 1, date: 1, materials: 1 })
          .sort({ _id: -1 })
          .skip(offset ?? 0)
          .limit(limit ?? 25)
          .lean();
        return ok({
          total,
          recipes: found.map((r) => ({
            id: String(r._id),
            title: r.title,
            ...(r.date && { date: r.date }),
            materials: (r.materials as Array<{ name?: string }>).map((m) => m?.name).filter(Boolean)
          }))
        });
      }
    );

    server.registerTool(
      'get_recipe',
      {
        title: 'Get one of my recipes',
        description:
          'One recipe from your account: its materials and amounts, colorants, notes, and its unity formula worked out afresh. Give a firing to have it checked against the limits too.',
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
          try {
            analysis = analysisOf(lines, lang).out;
            if (firing) checks = checksOf(lines, celsiusOf(firing), undefined, lang);
          } catch (err) {
            if (err instanceof ToolProblem) throw err;
            analysis = null;
          }
          return ok({
            id: String(found._id),
            title: found.title,
            ...(found.date && { date: found.date }),
            ...(textOf(found.notes) && { notes: textOf(found.notes) }),
            materials: lines.map((line) => ({ material: line.name, amount: recipe.amountOf(line.amount) })),
            colorants: ((found.additives ?? []) as Array<{ name?: string; amount?: string; unit?: string }>)
              .filter((a) => a && a.name)
              .map((a) => ({ name: a.name, amount: recipe.amountOf(a.amount), unit: a.unit ?? 'percent' })),
            ...(found.includeAdditives && { colorantsInUnityFormula: true }),
            analysis,
            ...(checks && { checks })
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
      async ({ search, limit, offset }) => {
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
      }
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
      async () => {
        const { materials, missing } = await shelfOf();
        return ok({ materials: materials.map((m) => m.name), ...(missing && { notFound: missing }) });
      }
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
      async ({ search, limit, offset }) => {
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
      }
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
      async ({ search, about, limit, offset }) => {
        const filter: Record<string, unknown> = { ownedBy: userId };
        if (about) filter.relatedId = about;
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
      }
    );
  }

  if (may('preferences:read')) {
    server.registerTool(
      'get_my_settings',
      {
        title: 'My settings',
        description:
          'Your Glazecalc settings that matter when talking about glazes: region, temperature scale, cones, language, weight unit and whether lead may be suggested.',
        inputSchema: z.object({}),
        annotations: READ_ONLY
      },
      async () => {
        const user = await User.findById(userId, { preferences: 1 });
        const saved = (user?.preferences ?? {}) as Record<string, unknown>;
        const pick = (name: keyof typeof PREFERENCES) => saved[name] ?? PREFERENCES[name][0];
        return ok({
          region: pick('region'),
          temperature: pick('temperature'),
          cones: pick('cones'),
          language: pick('language'),
          weightUnit: pick('weightUnit'),
          lead: pick('lead')
        });
      }
    );
  }
};
