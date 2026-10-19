// The MCP tools that change a person's own records (docs/integrations-plan.md,
// item 37, and decision 10): create_recipe (the server works out its unity
// formula), update_recipe, add_notebook_entry, add_my_material,
// update_my_material, add_to_shelf, remove_from_shelf, undo_shelf_change and
// move_to_trash. They
// are offered with every working personal access token, so that an assistant
// holding a read-only one can say why nothing was changed; each refuses,
// changing nothing, unless the token's scopes allow its area's write
// permission (data:write, server/lib/scopes.ts).
//
// What the record routes do for a change made with a token, these do too
// (server/lib/record_routes.ts): every query is limited to the token's
// account; a new record needs room under the account's limit (makeRoom); a
// change keeps the record as it was (saveVersion), so the person can undo it
// on the website; each change is written to the activity log; and a removal
// moves the record to the Trash, never deletes it, and is refused when the
// Trash is full. Each change counts against the account's limits on changes
// made with tokens, in the same counts as the record routes
// (TOKEN_WRITE_LIMITS), and a removal against its token's limit on removals
// (TOKEN_DELETES_PER_HOUR), on top of the endpoint's request limits.
import * as z from 'zod';
import mongoose from 'mongoose';
import type { McpServer } from '@modelcontextprotocol/server';
import chemistry from '../../../lib/chemistry/index.js';
import type { MaterialRecord } from '../../../lib/recipe/index.js';
import { makeRoom, type RecordModel } from '../../lib/guest_limits.ts';
import { countTokenDelete, countTokenWrite, TOKEN_DELETES_PER_HOUR, TOKEN_WRITE_LIMITS } from '../../lib/rate_limit.ts';
import {
  logActivityBy,
  moveToTrash,
  saveVersion,
  titleOf,
  TRASH_FULL,
  type TokenActor
} from '../../lib/record_history.ts';
import { allows, type Area, type Permission } from '../../lib/scopes.ts';
import { stopSharing } from '../../lib/share_links.ts';
import Additive from '../../models/additive.ts';
import Firing from '../../models/firing.ts';
import Material from '../../models/material.ts';
import Note from '../../models/note.ts';
import Recipe from '../../models/recipe.ts';
import { TRASH_DAYS } from '../../models/trash.ts';
import { addKeys, removeKeys, shelfKeys, shelfOf, undoShelf } from '../../lib/shelf.ts';
import User, { SHELF_KEY_LONGEST, SHELF_MOST } from '../../models/user.ts';
import { WRITE_PAT_MOST_DAYS } from '../../models/access_token.ts';
import {
  type Caller,
  guarded,
  languageArg,
  languageOf,
  linesArg,
  ok,
  resolveLines,
  ToolProblem,
  type RecipeLine
} from '../common.ts';
import { findAdditive, findMaterial, libraryIdOf, nameKey } from '../library.ts';
import { chemistryText } from '../words.ts';
import { analysisOf } from './public.ts';

/** A tool that adds to the account and takes nothing away. */
const ADDS = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
/** A tool that replaces or removes something (kept as a version, or in the Trash). */
const REPLACES = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } as const;

/** What every tool here says when the token can only read. */
export const READ_ONLY_TOKEN =
  'Nothing was changed: this access token can only read your Glazecalc records. To let an assistant change them, ' +
  `make a token that can "Read and change" on your Glazecalc account page (it lasts at most ${WRITE_PAT_MOST_DAYS} days) ` +
  'and use it in place of this one.';
/** What they say once the account has made too many changes with tokens. */
export const TOO_MANY_CHANGES =
  `Nothing was changed: an account can make at most ${TOKEN_WRITE_LIMITS.minute} changes a minute and ` +
  `${TOKEN_WRITE_LIMITS.day} a day with access tokens. Please wait and try again; changes on the website still work.`;

const NEEDS = 'Needs an access token that can read and change your records.';
const idArg = z.string().min(1).max(40);
const titleArg = z.string().trim().min(1).max(200);
const notesArg = z.string().max(10000);
const bandArg = z
  .enum(['low', 'mid', 'high'])
  .describe(
    'The firing band its limits are checked in: low (cone 06-02), mid (cone 4-6) or high (cone 9-11), as the recipe page chooses it.'
  );
const analysisArg = z
  .record(z.string().min(1).max(20), z.number().min(0).max(100))
  .describe('Its oxides in weight percent, as on a data sheet: { "SiO2": 68.5, "Al2O3": 17.4, "K2O": 9.8 }.');
const colorantsArg = z
  .array(
    z.object({
      name: z
        .string()
        .min(1)
        .max(200)
        .describe(
          'The colorant or opacifier, by its name in your additives or the Glazecalc library ("Cobalt Carbonate").'
        ),
      amount: z.number().min(0).max(100000),
      unit: z
        .enum(['percent', 'parts', 'grams'])
        .optional()
        .describe('Percent of the base recipe (the default), parts, or grams.')
    })
  )
  .max(20)
  .describe(
    'Colorants and opacifiers added to the base, as the recipe page lists them; left out of the unity formula.'
  );

/** The kinds of record move_to_trash takes, by the name a tool gives them. */
const TRASHABLE: Record<string, { Model: RecordModel; area: Exclude<Area, 'trash' | 'shelf' | 'preferences'> }> = {
  recipe: { Model: Recipe, area: 'recipes' },
  material: { Model: Material, area: 'materials' },
  note: { Model: Note, area: 'notes' },
  firing: { Model: Firing, area: 'firing' }
};

/** What remove_from_shelf says about getting the shelf back. */
const UNDO_SHELF = 'The shelf as it was is kept: undo_shelf_change puts it back.';

/** The materials changed, as one activity title. */
const namesOf = (changed: Array<{ name: string }>): string => changed.map((k) => k.name).join(', ');

/** Today's date as the recipe page writes it: 2026-10-19. */
const today = (now = new Date()): string => now.toISOString().slice(0, 10);

const rounded = (value: number, places: number): number => Number(value.toFixed(places));

export const registerWriteTools = (server: McpServer, caller: Caller): void => {
  const userId = caller.userId;
  const tokenId = caller.tokenId;
  if (!userId || !tokenId) return;
  const scopes = caller.scopes ?? [];
  // Only personal tokens reach the tools (server/mcp/auth.ts).
  const actor: TokenActor = { via: 'pat', tokenId, name: caller.name ?? 'Access token' };

  /**
   * Before any change: the token must allow it, and the account be within its
   * limits on changes made with tokens; otherwise a ToolProblem, and nothing
   * is changed.
   */
  const mayChange = async (permission: Permission): Promise<void> => {
    if (!allows(scopes, permission)) throw new ToolProblem(READ_ONLY_TOKEN);
    if (!(await countTokenWrite(userId))) throw new ToolProblem(TOO_MANY_CHANGES);
  };

  /** Room for one more record under the account's limit, or a ToolProblem saying so. */
  const needRoom = async (Model: RecordModel, label: string): Promise<void> => {
    const user = await User.findById(userId, { guest: 1 });
    if (!user) throw new ToolProblem('Your account was not found.');
    const refusal = await makeRoom(user, Model, label);
    if (refusal) throw new ToolProblem(refusal.msg);
  };

  /** The account's own materials, by name, for recipe lines and the shelf: they come before the library's. */
  const ownMaterials = async () => {
    const own = await Material.find({ ownedBy: userId }).lean();
    const byName = new Map(own.map((m) => [nameKey(m.name), m]));
    return (name: string) => byName.get(nameKey(name));
  };

  /**
   * A recipe's lines as the recipe page saves them, each a copy of its material
   * with its amount (the account's own first, then the library's, with the id
   * the app keeps for it), and the unity formula worked out from them, as the
   * page saves it (computed) and as the tools answer it.
   */
  const recipeLines = async (lines: z.infer<typeof linesArg>, language: string) => {
    const own = await ownMaterials();
    const resolved = resolveLines(lines, (name) => own(name) as unknown as MaterialRecord | undefined);
    const materials = resolved.map((line: RecipeLine, i) => {
      const given = lines[i]!;
      if (given.analysis || own(given.material)) return line;
      const found = findMaterial(given.material);
      const id = found && libraryIdOf(found);
      return id ? { ...line, _id: id } : line;
    });
    // A recipe with no flux, or an oxide Glazecalc does not know, is refused here, as the page refuses to save it.
    const { result, out } = analysisOf(resolved, language);
    // Kept in a one-element array, as mongoose keeps the recipe page's.
    return { materials, computed: [{ ...result, uList: result.umf }], analysis: out };
  };

  /** Colorants as the recipe page saves them: a copy of each (yours first, then the library's), its amount and unit. */
  const colorantLines = async (colorants: z.infer<typeof colorantsArg>) => {
    const own = await Additive.find({ ownedBy: userId }).lean();
    const byName = new Map(own.map((a) => [nameKey(a.name), a]));
    const unknown: string[] = [];
    const lines = colorants.map(({ name, amount, unit }) => {
      const mine = byName.get(nameKey(name));
      const library = mine ? undefined : findAdditive(name);
      const record = mine ?? (library && { ...library, ...(libraryIdOf(library) && { _id: libraryIdOf(library) }) });
      if (!record) unknown.push(name);
      return { ...record, amount: String(amount), unit: unit ?? 'percent' };
    });
    if (unknown.length) {
      throw new ToolProblem(
        `Not in your additives or the Glazecalc library: ${unknown.join(', ')}. Use search_materials with includeColorants to find the name.`
      );
    }
    return lines;
  };

  server.registerTool(
    'create_recipe',
    {
      title: 'Save a new recipe',
      description: `Saves a new glaze recipe in your Glazecalc account, from its base materials and amounts (the library's names, or your own materials'), with optional colorants, notes, firing band and food-surface mark. Glazecalc works out its unity formula, as the recipe page does, and answers with it. Save only a recipe the person asked to save. ${NEEDS}`,
      inputSchema: z.object({
        title: titleArg.describe('The recipe’s name.'),
        lines: linesArg,
        colorants: colorantsArg.optional(),
        notes: notesArg.optional().describe('Notes kept with the recipe.'),
        firing: bandArg.optional(),
        foodSurface: z.boolean().optional().describe('Whether it is meant for a food surface (a liner).'),
        language: languageArg
      }),
      annotations: ADDS
    },
    async ({ title, lines, colorants, notes, firing, foodSurface, language }) => {
      const lang = languageOf(language);
      return guarded(async () => {
        await mayChange('recipes:write');
        const { materials, computed, analysis } = await recipeLines(lines, lang);
        const additives = colorants?.length ? await colorantLines(colorants) : [];
        await needRoom(Recipe, 'recipe');
        const saved = await Recipe.create({
          title,
          date: today(),
          ...(notes && { notes: [notes] }),
          materials,
          additives,
          computed,
          includeAdditives: false,
          ...(firing && { firing }),
          ...(foodSurface && { foodSurface: true }),
          ownedBy: userId
        });
        await logActivityBy(actor, userId, 'create', 'recipes', saved.toObject());
        return ok({ id: String(saved._id), title: saved.title, saved: true, analysis });
      }, lang);
    }
  );

  server.registerTool(
    'update_recipe',
    {
      title: 'Change one of my recipes',
      description: `Changes one of your saved recipes (an id from list_recipes): its title, its base materials and amounts (the unity formula is worked out again), its notes, firing band or food-surface mark. Only what is given changes. The recipe as it was is kept as an earlier version, so the person can undo the change on the website. ${NEEDS}`,
      inputSchema: z.object({
        id: idArg.describe('The recipe, from list_recipes.'),
        title: titleArg.optional(),
        lines: linesArg.optional().describe('All of its base materials, in place of the ones it has.'),
        notes: notesArg.optional().describe('Its notes, in place of the ones it has.'),
        firing: bandArg.optional(),
        foodSurface: z.boolean().optional(),
        language: languageArg
      }),
      annotations: REPLACES
    },
    async ({ id, title, lines, notes, firing, foodSurface, language }) => {
      const lang = languageOf(language);
      return guarded(async () => {
        await mayChange('recipes:write');
        const changes: Record<string, unknown> = {
          ...(title !== undefined && { title }),
          ...(notes !== undefined && { notes: [notes] }),
          ...(firing !== undefined && { firing }),
          ...(foodSurface !== undefined && { foodSurface })
        };
        let analysis: ReturnType<typeof analysisOf>['out'] | undefined;
        if (lines) {
          const worked = await recipeLines(lines, lang);
          changes.materials = worked.materials;
          changes.computed = worked.computed;
          analysis = worked.analysis;
        }
        if (!Object.keys(changes).length) throw new ToolProblem('Give at least one thing to change.');
        const mine = { _id: mongoose.isObjectIdOrHexString(id) ? id : null, ownedBy: userId };
        // A recipe that counts its colorants in its unity formula is worked out on the recipe page.
        const filter = lines ? { ...mine, includeAdditives: { $ne: true } } : mine;
        // The recipe as it was, found and changed in one step, so the version kept is the one changed.
        const before = mine._id
          ? await Recipe.findOneAndUpdate(
              filter,
              { $set: changes },
              { runValidators: true, returnDocument: 'before', lean: true }
            )
          : null;
        if (!before) {
          if (mine._id && lines && (await Recipe.exists(mine))) {
            throw new ToolProblem(
              'This recipe counts its colorants in its unity formula, so its materials can be changed only on the recipe page. Nothing was changed.'
            );
          }
          throw new ToolProblem(`No recipe with id ${id} in your account.`);
        }
        await saveVersion('recipes', before, 'pat');
        await logActivityBy(actor, userId, 'change', 'recipes', { ...before, ...changes });
        return ok({
          id: String(before._id),
          title: (changes.title as string | undefined) ?? before.title,
          changed: Object.keys(changes).filter((key) => key !== 'computed'),
          undo: 'The recipe as it was is kept as an earlier version: Undo on its page on the website puts it back.',
          ...(analysis && { analysis })
        });
      }, lang);
    }
  );

  server.registerTool(
    'add_notebook_entry',
    {
      title: 'Add to my notebook',
      description: `Adds an entry to your Glazecalc notebook (the Notebook page), with an optional title: a test result, an observation, a firing to try. ${NEEDS}`,
      inputSchema: z.object({
        content: z.string().trim().min(1).max(20000).describe('The entry.'),
        title: z.string().trim().max(200).optional()
      }),
      annotations: ADDS
    },
    async ({ content, title }) =>
      guarded(async () => {
        await mayChange('notes:write');
        await needRoom(Note, 'note');
        // As the Notebook page saves an entry: about nothing else.
        const saved = await Note.create({
          ...(title && { title }),
          content,
          relatedCollection: 'Notes',
          relatedId: 'general notes',
          ownedBy: userId
        });
        await logActivityBy(actor, userId, 'create', 'notes', saved.toObject());
        return ok({ id: String(saved._id), ...(saved.title && { title: saved.title }), saved: true });
      })
  );

  /** A material's oxides, LOI and weights as the Materials page saves them, from a weight-percent analysis. */
  const materialFields = (
    name: string,
    input: { fields: Array<{ name: string; amount: string | number }>; percentmole: string; loi?: number | null },
    molecularweight?: number | null
  ) => {
    const weights = chemistry.materialWeights({ name, ...input, molecularweight });
    return {
      percentmole: input.percentmole,
      loi: rounded(weights.loi, 2),
      molecularweight: rounded(weights.molecularWeight, 2),
      equivalent: rounded(weights.equivalent, 2),
      formulaweight: rounded(weights.firedWeight, 2),
      fields: input.fields.map((field) => ({
        name: field.name,
        amount: String(field.amount),
        amountUnity: rounded(weights.unity[field.name] ?? 0, 4)
      })),
      warningCodes: weights.warningCodes
    };
  };
  const warningOut = (warning: Parameters<typeof chemistryText>[0], language: string) => ({
    code: warning.code,
    text: chemistryText(warning, language)
  });
  const fieldsOf = (analysis: Record<string, number>) =>
    Object.entries(analysis).map(([name, amount]) => ({ name, amount }));

  /** Refuses a name another of the account's materials has: recipe lines find a material by its name. */
  const nameFree = async (name: string, except?: string): Promise<void> => {
    const same = (await Material.find({ ownedBy: userId }, { name: 1 }).lean()).find(
      (m) => nameKey(m.name) === nameKey(name) && String(m._id) !== except
    );
    if (same) {
      throw new ToolProblem(
        `You already have a material named ${same.name} (id ${String(same._id)}). Use update_my_material to change it, or choose another name.`
      );
    }
  };

  server.registerTool(
    'add_my_material',
    {
      title: 'Add one of my materials',
      description: `Saves a material of your own in your Glazecalc account (the Materials page) from its oxide analysis in weight percent, as on a data sheet, with its loss on ignition. Recipes can then use it by name. ${NEEDS}`,
      inputSchema: z.object({
        name: z.string().trim().min(1).max(100),
        analysis: analysisArg,
        loi: z.number().min(0).max(99.9).optional().describe('Its loss on ignition in percent.'),
        notes: z.string().max(2000).optional(),
        language: languageArg
      }),
      annotations: ADDS
    },
    async ({ name, analysis, loi, notes, language }) => {
      const lang = languageOf(language);
      return guarded(async () => {
        await mayChange('materials:write');
        if (!Object.keys(analysis).length) throw new ToolProblem(`The analysis of ${name} has no oxides.`);
        await nameFree(name);
        const { warningCodes, ...worked } = materialFields(name, {
          fields: fieldsOf(analysis),
          percentmole: 'percent',
          loi: loi ?? 0
        });
        await needRoom(Material, 'material');
        const saved = await Material.create({ name, ...worked, ...(notes && { notes: [notes] }), ownedBy: userId });
        await logActivityBy(actor, userId, 'create', 'materials', saved.toObject());
        return ok({
          id: String(saved._id),
          name: saved.name,
          saved: true,
          ...(warningCodes.length && { warnings: warningCodes.map((w) => warningOut(w, lang)) })
        });
      }, lang);
    }
  );

  server.registerTool(
    'update_my_material',
    {
      title: 'Change one of my materials',
      description: `Changes one of your own materials (an id from list_my_materials): its name, oxide analysis in weight percent, loss on ignition or notes. Only what is given changes. Recipes already saved keep their own copy of it. The material as it was is kept as an earlier version, so the person can undo the change on the website. ${NEEDS}`,
      inputSchema: z.object({
        id: idArg.describe('The material, from list_my_materials.'),
        name: z.string().trim().min(1).max(100).optional(),
        analysis: analysisArg.optional(),
        loi: z.number().min(0).max(99.9).optional(),
        notes: z.string().max(2000).optional(),
        language: languageArg
      }),
      annotations: REPLACES
    },
    async ({ id, name, analysis, loi, notes, language }) => {
      const lang = languageOf(language);
      return guarded(async () => {
        await mayChange('materials:write');
        if (name === undefined && analysis === undefined && loi === undefined && notes === undefined) {
          throw new ToolProblem('Give at least one thing to change.');
        }
        const mine = mongoose.isObjectIdOrHexString(id) ? { _id: id, ownedBy: userId } : null;
        const found = mine ? await Material.findOne(mine).lean() : null;
        if (!mine || !found) throw new ToolProblem(`No material with id ${id} in your account.`);
        if (analysis && !Object.keys(analysis).length) throw new ToolProblem('The analysis has no oxides.');
        if (name !== undefined) await nameFree(name, id);
        const changes: Record<string, unknown> = {
          ...(name !== undefined && { name }),
          ...(notes !== undefined && { notes: [notes] })
        };
        let warnings: Array<ReturnType<typeof warningOut>> = [];
        if (analysis || loi !== undefined) {
          const { warningCodes, ...worked } = materialFields(
            name ?? found.name,
            analysis
              ? { fields: fieldsOf(analysis), percentmole: 'percent', loi: loi ?? found.loi }
              : {
                  fields: found.fields as Array<{ name: string; amount: string | number }>,
                  percentmole: found.percentmole,
                  loi: loi ?? found.loi
                },
            analysis ? undefined : found.molecularweight
          );
          Object.assign(changes, worked);
          warnings = warningCodes.map((w) => warningOut(w, lang));
        }
        // Found and changed in one step, so the version kept is the one changed.
        const before = await Material.findOneAndUpdate(
          mine,
          { $set: changes },
          { runValidators: true, returnDocument: 'before', lean: true }
        );
        if (!before) throw new ToolProblem(`No material with id ${id} in your account.`);
        await saveVersion('materials', before, 'pat');
        await logActivityBy(actor, userId, 'change', 'materials', { ...before, ...changes });
        return ok({
          id: String(before._id),
          name: (changes.name as string | undefined) ?? before.name,
          changed: Object.keys(changes).filter((key) => ['name', 'notes', 'fields', 'loi'].includes(key)),
          undo: 'The material as it was is kept as an earlier version: Undo on the Materials page puts it back.',
          ...(warnings.length && { warnings })
        });
      }, lang);
    }
  );

  const namesArg = z
    .array(
      z
        .string()
        .min(1)
        .max(SHELF_KEY_LONGEST - 5)
    )
    .min(1)
    .max(50);

  server.registerTool(
    'add_to_shelf',
    {
      title: 'Add to the materials I have on hand',
      description: `Marks materials as on hand (the shelf that Match with what I have uses), by the library's names or your own materials'. The shelf as it was is kept: undo_shelf_change puts it back. ${NEEDS}`,
      inputSchema: z.object({ materials: namesArg.describe('The materials, by name.') }),
      annotations: ADDS
    },
    async ({ materials }) =>
      guarded(async () => {
        await mayChange('shelf:write');
        const { keys, unknown } = await shelfKeys(userId, materials);
        if (unknown.length) {
          throw new ToolProblem(
            `Not in your materials or the Glazecalc library: ${unknown.join(', ')}. Use search_materials to find the name. Nothing was changed.`
          );
        }
        // The first key of each is the one the app keeps (its library key, or your material's id).
        // Added only while the shelf stays within SHELF_MOST, in one step.
        const result = await addKeys(
          userId,
          keys.map((k) => k.keys[0]!)
        );
        if (result === 'full') {
          throw new ToolProblem(`The shelf can hold at most ${SHELF_MOST} materials. Nothing was changed.`);
        }
        if (result.changed) await logActivityBy(actor, userId, 'change', 'shelf', { name: namesOf(keys) });
        return ok({ added: keys.map((k) => k.name) });
      })
  );

  server.registerTool(
    'remove_from_shelf',
    {
      title: 'Remove from the materials I have on hand',
      description: `Takes materials off the shelf of materials on hand, by name. The materials themselves stay. The shelf as it was is kept: undo_shelf_change puts it back. ${NEEDS}`,
      inputSchema: z.object({ materials: namesArg.describe('The materials, by name.') }),
      annotations: REPLACES
    },
    async ({ materials }) =>
      guarded(async () => {
        await mayChange('shelf:write');
        const { keys, unknown } = await shelfKeys(userId, materials);
        const shelf = new Set(await shelfOf(userId));
        const removed = keys.filter((k) => k.keys.some((key) => shelf.has(key)));
        if (removed.length) {
          await removeKeys(
            userId,
            removed.flatMap((k) => k.keys)
          );
          await logActivityBy(actor, userId, 'change', 'shelf', { name: namesOf(removed) });
        }
        const notOnShelf = [...keys.filter((k) => !removed.includes(k)).map((k) => k.name), ...unknown];
        return ok({
          removed: removed.map((k) => k.name),
          ...(notOnShelf.length && { notOnShelf }),
          ...(removed.length && { undo: UNDO_SHELF })
        });
      })
  );

  server.registerTool(
    'undo_shelf_change',
    {
      title: 'Undo the last change to the materials I have on hand',
      description: `Puts back the shelf as it was before its last change (by the website, an access token or an assistant). One step back only: a second call finds nothing to undo until the shelf changes again. ${NEEDS}`,
      inputSchema: z.object({}),
      annotations: REPLACES
    },
    async () =>
      guarded(async () => {
        await mayChange('shelf:write');
        const shelf = await undoShelf(userId);
        if (!shelf) throw new ToolProblem('There is no change to the shelf to undo. Nothing was changed.');
        await logActivityBy(actor, userId, 'undo', 'shelf', { name: 'Shelf' });
        return ok({ restored: true, materialsOnShelf: shelf.length });
      })
  );

  server.registerTool(
    'move_to_trash',
    {
      title: 'Move one of my records to the Trash',
      description: `Moves one of your recipes, materials, notebook entries or firing logs to the Trash, as removing it on the website does. It can be put back from the Trash on the website for ${TRASH_DAYS} days; nothing is deleted for good. A token moves at most ${TOKEN_DELETES_PER_HOUR} an hour, and none while the Trash is full. Remove only what the person asked to remove. ${NEEDS}`,
      inputSchema: z.object({
        kind: z.enum(['recipe', 'material', 'note', 'firing']).describe('What it is: a note is a notebook entry.'),
        id: idArg.describe('Its id, from list_recipes, list_my_materials, list_notes or list_firings.')
      }),
      annotations: { ...REPLACES, idempotentHint: true }
    },
    async ({ kind, id }) =>
      guarded(async () => {
        const { Model, area } = TRASHABLE[kind]!;
        await mayChange(`${area}:write`);
        if (!(await countTokenDelete(tokenId))) {
          throw new ToolProblem(
            `Nothing was moved: this access token has moved ${TOKEN_DELETES_PER_HOUR} records to the Trash in the last hour, the most it may. Please try again later.`
          );
        }
        const user = mongoose.isObjectIdOrHexString(id) ? await User.findById(userId) : null;
        const trashed = user ? await moveToTrash(Model, area, user, id, 'pat') : null;
        if (!trashed)
          throw new ToolProblem(`No ${kind === 'note' ? 'notebook entry' : kind} with id ${id} in your account.`);
        if (trashed === TRASH_FULL) {
          throw new ToolProblem(
            'Nothing was moved: the Trash is full, so an access token cannot move anything more to it. The person can empty some of it on the website first.'
          );
        }
        // Its share link stops working, and stays stopped if it is put back (as record_routes' onTrash).
        if (kind === 'recipe') await stopSharing(id, userId);
        await logActivityBy(actor, userId, 'trash', area, trashed.record);
        const until = new Date(Date.now() + TRASH_DAYS * 24 * 60 * 60 * 1000);
        return ok({
          kind,
          id,
          ...(titleOf(trashed.record) && { title: titleOf(trashed.record) }),
          inTrashUntil: until.toISOString().slice(0, 10),
          undo: `It is in the Trash: the person can put it back from the Trash on the website for ${TRASH_DAYS} days.`
        });
      })
  );
};
