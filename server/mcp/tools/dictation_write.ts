// The MCP tools the studio notes skill saves with (skills/glazecalc-dictation;
// docs/adr/0027-dictation-skill.md), besides those in ./account_write.ts:
// create_firing_log, add_firing_rows and link_firing. A potter dictates a
// firing while it runs, then the test tile results once it is out, and their
// assistant saves them here.
//
// They are write tools like the others, and go through the same gate:
// account_write.ts adds this work to its own (makeWork), so each checks the
// token's permission and the account's limits on changes made with tokens
// first (mayChange), waits for the person's approval when the account asks for
// that (gated, docs/adr/0025-confirm-before-changes.md), keeps a changed log
// as it was (saveVersion) and writes the activity log. link_firing runs the
// recipe routes' own changes to a link (server/lib/firing_links.ts), so the
// REST routes and the MCP tool share one code path and one limit on links.
// None of them removes anything: unlinking stays on the website.
import * as z from 'zod';
import mongoose from 'mongoose';
import type { CallToolResult, InputRequiredResult, McpServer, ServerContext } from '@modelcontextprotocol/server';
import firingFields from '../../../lib/cones/firing-fields.js';
import firingLib from '../../../lib/cones/firing.js';
import results from '../../../lib/cones/results.js';
import { changeFiringLink, linkFiring, linkOut, type Link } from '../../lib/firing_links.ts';
import type { RecordModel } from '../../lib/guest_limits.ts';
import { fieldChanges, registerPreview, type BaseRef, type Summary } from '../../lib/pending_changes.ts';
import { logActivityBy, saveVersion, titleOf, type TokenActor } from '../../lib/record_history.ts';
import { named, type Reply } from '../../lib/rest_changes.ts';
import type { Permission, Scope } from '../../lib/scopes.ts';
import Firing from '../../models/firing.ts';
import Recipe, { FIRING_LINKS } from '../../models/recipe.ts';
import User from '../../models/user.ts';
import { guarded, ok, ToolProblem } from '../common.ts';

/** The most rows a firing log takes from these tools: a long firing read every five minutes. */
export const FIRING_ROWS_MOST = 500;
/** The most columns a new log has, and the longest cell. */
export const FIRING_COLUMNS_MOST = 20;
export const FIRING_CELL_LONGEST = 200;

/** What each new tool's description ends with: the skill's first rule, for an assistant that uses the tool alone. */
export const SAVE_ONLY_WHAT_WAS_SAID =
  'Save only what the person said and agreed to; never fill in an amount, temperature or analysis they did not give.';

const NEEDS = 'Needs an access token that can read and change your records.';
const ADDS = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
const REPLACES = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } as const;

const idArg = z.string().min(1).max(40);
const cellArg = z.string().max(FIRING_CELL_LONGEST);
const rowsArg = z
  .array(z.array(cellArg).max(FIRING_COLUMNS_MOST * 3))
  .max(FIRING_ROWS_MOST)
  .describe(
    'One row for each reading, one cell for each column, in column order, as the person said it ("9:40", "1850", "5 bending"); "" for a cell not said.'
  );
const dateArg = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (day) => {
      const time = Date.parse(day + 'T00:00:00Z');
      return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === day;
    },
    { message: 'Not a date.' }
  );

const firingLogInput = z.object({
  title: z.string().trim().min(1).max(200).describe('The log’s name, as the person gave it ("Glaze firing, cone 6").'),
  date: dateArg.optional().describe('The day it was fired, as 2026-10-21; today when left out.'),
  kiln: z.string().trim().max(100).optional().describe('The kiln, as the person names it.'),
  columns: z
    .array(z.enum(firingFields.FIRING_FIELDS as [string, ...string[]]))
    .min(1)
    .max(FIRING_COLUMNS_MOST)
    .describe(
      'The columns kept, by these names, as on the Firing page: Time, Temperature F or Temperature C (the scale said), Cone, Atmosphere, Ramp, Hold, Damper, Comments and the rest.'
    ),
  rows: rowsArg,
  notes: z.string().max(10000).optional().describe('Anything else said about the firing, in the person’s words.')
});
const firingRowsInput = z.object({
  id: idArg.describe('The firing log, from list_firings.'),
  rows: rowsArg
    .min(1)
    .describe('The new readings, in the log’s own columns (get_firing gives them), each row a cell for each column.')
});
const linkFiringInput = z.object({
  recipeId: idArg.describe('The recipe, from list_recipes.'),
  firingId: idArg.describe('The firing log it went through, from list_firings.'),
  result: z
    .string()
    .trim()
    .min(1)
    .max(FIRING_LINKS.result)
    .optional()
    .describe(
      `What came of it in that firing, in the person’s words (at most ${FIRING_LINKS.result} characters; put longer text in a notebook entry about the recipe).`
    ),
  cone: z
    .string()
    .trim()
    .max(8)
    .optional()
    .describe(
      'The cone it was fired to there, as the recipe page writes it ("6", "06", "5.5", SK "6a", or "1240" for °C), when it differs from what the log says.'
    ),
  atmosphere: z
    .enum(firingLib.ATMOSPHERES as unknown as ['oxidation', 'reduction', 'neutral'])
    .optional()
    .describe('oxidation, reduction or neutral, when the person says it.')
});

type FiringLogArgs = z.infer<typeof firingLogInput>;
type FiringRowsArgs = z.infer<typeof firingRowsInput>;
type LinkFiringArgs = z.infer<typeof linkFiringInput>;

/** What the work here needs from account_write.ts's makeWork: who it is, and its checks before a change. */
export interface DictationHelpers {
  userId: string;
  tokenId: string;
  scopes: readonly string[];
  actor: TokenActor;
  /** The token must allow the change and the account be within its limits on changes made with tokens. */
  mayChange: (permission: Permission) => Promise<void>;
  /** Room for one more record under the account's limit. */
  needRoom: (Model: RecordModel, label: string) => Promise<void>;
}

const today = (now = new Date()): string => now.toISOString().slice(0, 10);

/** Refuses rows that do not have one cell for each column. */
const checkRows = (rows: string[][], columns: readonly string[]): void => {
  const ragged = rows.findIndex((row) => row.length !== columns.length);
  if (ragged >= 0) {
    throw new ToolProblem(
      `Row ${ragged + 1} has ${rows[ragged]!.length} cells: each row needs one for each of the ${columns.length} columns (${columns.join(', ')}), in that order, with "" for a cell not said. Nothing was saved.`
    );
  }
};

const noFiring = (id: string) => `No firing log with id ${id} in your account.`;
const noRecipe = (id: string) => `No recipe with id ${id} in your account.`;
const mine = (id: string, userId: string) => (mongoose.isObjectIdOrHexString(id) ? { _id: id, ownedBy: userId } : null);

/** What a link route answered, as a refusal in words. */
const refusalOf = (reply: Reply): string => {
  const body = reply.body as { msg?: unknown } | null;
  return typeof body?.msg === 'string' ? body.msg + ' Nothing was changed.' : 'Nothing was changed.';
};

export const dictationWork = ({ userId, tokenId, scopes, actor, mayChange, needRoom }: DictationHelpers) => ({
  create_firing_log: async ({ title, date, kiln, columns, rows, notes }: FiringLogArgs) => {
    await mayChange('firing:write');
    const twice = columns.find((column, i) => columns.indexOf(column) !== i);
    if (twice) throw new ToolProblem(`The column ${twice} is given twice. Nothing was saved.`);
    checkRows(rows, columns);
    await needRoom(Firing, 'firing');
    // As the Firing page saves a log.
    const saved = await Firing.create({
      title,
      date: date ?? today(),
      ...(kiln && { kiln }),
      ...(notes && { notes: [notes] }),
      fieldsIncluded: columns,
      rows,
      ownedBy: userId
    });
    await logActivityBy(actor, userId, 'create', 'firing', saved.toObject());
    return ok({
      id: String(saved._id),
      title: saved.title,
      date: saved.date,
      columns,
      rows: rows.length,
      saved: true
    });
  },

  add_firing_rows: async ({ id, rows }: FiringRowsArgs) => {
    await mayChange('firing:write');
    const filter = mine(id, userId);
    const found = filter ? await Firing.findOne(filter).lean() : null;
    if (!filter || !found) throw new ToolProblem(noFiring(id));
    const columns = found.fieldsIncluded;
    checkRows(rows, columns);
    if (found.rows.length + rows.length > FIRING_ROWS_MOST) {
      throw new ToolProblem(
        `A firing log takes at most ${FIRING_ROWS_MOST} rows from an assistant, and this one has ${found.rows.length}. Nothing was changed: start a new log for the rest.`
      );
    }
    // Added in one step, only while its columns are those the rows were checked against and the log stays
    // within the limit, so the version kept is the log the rows were added to.
    const before = await Firing.findOneAndUpdate(
      { ...filter, fieldsIncluded: columns, [`rows.${FIRING_ROWS_MOST - rows.length}`]: { $exists: false } },
      { $push: { rows: { $each: rows } } },
      { returnDocument: 'before', lean: true }
    );
    if (!before) throw new ToolProblem('The log changed while the rows were added. Nothing was changed: try again.');
    await saveVersion('firing', before, actor.via, { tokenId });
    await logActivityBy(actor, userId, 'change', 'firing', before);
    return ok({
      id: String(before._id),
      title: before.title,
      added: rows.length,
      rows: before.rows.length + rows.length,
      undo: 'The log as it was is kept as an earlier version.'
    });
  },

  link_firing: async ({ recipeId, firingId, result, cone, atmosphere }: LinkFiringArgs) => {
    await mayChange('recipes:write');
    const recipeFilter = mine(recipeId, userId);
    const recipe = recipeFilter ? await Recipe.findOne(recipeFilter, { firings: 1 }).lean() : null;
    if (!recipe) throw new ToolProblem(noRecipe(recipeId));
    const firingFilter = mine(firingId, userId);
    if (!firingFilter || !(await Firing.exists(firingFilter))) throw new ToolProblem(noFiring(firingId));
    if (cone !== undefined && !results.isAnyCone(cone)) {
      throw new ToolProblem(
        `"${cone}" is not a cone as the recipe page writes one: "6", "06", "5.5", SK "6a", or a temperature in °C such as "1240". Nothing was changed.`
      );
    }
    const linked = ((recipe.firings ?? []) as Link[]).some((link) => link.firing === firingId);
    const place = {
      ...(linked && result !== undefined && { result }),
      ...(cone !== undefined && { cone }),
      ...(atmosphere !== undefined && { atmosphere })
    };
    if (linked && !Object.keys(place).length) {
      throw new ToolProblem(
        'That firing log is linked to the recipe already. Give a result, cone or atmosphere to set. Nothing was changed.'
      );
    }
    const user = await User.findById(userId);
    if (!user) throw new ToolProblem('Your account was not found.');
    // As the recipe routes run them for this token: the activity log names it.
    const who = {
      user,
      access: {
        via: actor.via,
        tokenId,
        name: actor.name,
        scopes: scopes as Scope[],
        permission: 'recipes:write' as const
      }
    };
    let reply: Reply | undefined;
    if (!linked) {
      reply = await linkFiring(who, { params: { id: recipeId }, body: { firing: firingId, result } });
      if (reply.status !== 200) throw new ToolProblem(refusalOf(reply));
    }
    if (Object.keys(place).length) {
      reply = await changeFiringLink(who, { params: { id: recipeId, firing: firingId }, body: place });
      if (reply.status !== 200) throw new ToolProblem(refusalOf(reply));
    }
    const links = ((reply!.body as { firings?: Link[] }).firings ?? []).map(linkOut);
    return ok({
      recipeId,
      firingId,
      linked: !linked,
      link: links.find((link) => link.firing === firingId) ?? { firing: firingId }
    });
  }
});

export type DictationTool = keyof ReturnType<typeof dictationWork>;

/** The tools here, each a change to records. */
export const DICTATION_TOOLS: readonly DictationTool[] = ['create_firing_log', 'add_firing_rows', 'link_firing'];

// What a waiting change sets, field by field, for its page (server/lib/pending_changes.ts detailsOf).
registerPreview('mcp', 'create_firing_log', (given) => {
  const args = given as Partial<FiringLogArgs>;
  return fieldChanges(
    {
      title: args.title,
      date: args.date ?? today(),
      kiln: args.kiln,
      fieldsIncluded: args.columns,
      rows: args.rows,
      notes: args.notes === undefined ? undefined : [args.notes]
    },
    null
  );
});
registerPreview('mcp', 'add_firing_rows', (given, current) => {
  const args = given as Partial<FiringRowsArgs>;
  const now = (current?.rows ?? []) as unknown[];
  return fieldChanges({ rows: [...now, ...(args.rows ?? [])] }, current ?? {});
});
registerPreview('mcp', 'link_firing', (given, current) => {
  const args = given as Partial<LinkFiringArgs>;
  const now = ((current?.firings ?? []) as Link[]).find((link) => link.firing === args.firingId);
  return fieldChanges(
    { firing: now ? undefined : args.firingId, result: args.result, cone: args.cone, atmosphere: args.atmosphere },
    now ? (now as unknown as Record<string, unknown>) : null
  );
});

/** A record's title, '' when it has none, or null when it is not the account's. */
const titleFor = async (Model: RecordModel, id: unknown, userId: string): Promise<string | null> => {
  if (typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id)) return null;
  const record = (await Model.findOne({ _id: id, ownedBy: userId }).lean()) as Record<string, unknown> | null;
  return record ? (titleOf(record) ?? '') : null;
};

/**
 * What a change here is, in the server's own words (codes the website has in
 * every language), and the record it makes it to; null when there is nothing
 * to ask about (the tool then refuses, as it would anyway).
 */
export const describeDictation = async (
  tool: DictationTool,
  args: Record<string, unknown>,
  userId: string
): Promise<{ summary: Summary; base?: BaseRef } | null> => {
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  switch (tool) {
    case 'create_firing_log':
      return { summary: { code: 'pending-create', params: named('firing', text(args.title)) } };
    case 'add_firing_rows': {
      const title = await titleFor(Firing, args.id, userId);
      if (title === null) return null;
      return {
        summary: { code: 'pending-change', params: { ...named('firing', title), fields: 'rows' } },
        base: { kind: 'record', area: 'firing', id: text(args.id) }
      };
    }
    case 'link_firing': {
      const recipeId = text(args.recipeId);
      const recipe = mongoose.isObjectIdOrHexString(recipeId)
        ? await Recipe.findOne({ _id: recipeId, ownedBy: userId }, { title: 1, firings: 1 }).lean()
        : null;
      const log = await titleFor(Firing, args.firingId, userId);
      if (!recipe || log === null) return null;
      const linked = ((recipe.firings ?? []) as Link[]).some((link) => link.firing === args.firingId);
      const fields = ['result', 'cone', 'atmosphere'].filter((field) => args[field] !== undefined);
      const params = { ...named('recipe', recipe.title), log, logNamed: log ? 'yes' : 'no' };
      const base: BaseRef = { kind: 'record', area: 'recipes', id: recipeId };
      if (!linked) return { summary: { code: 'pending-firing-link', params }, base };
      if (!fields.length) return null;
      return { summary: { code: 'pending-firing-change', params: { ...params, fields: fields.join(', ') } }, base };
    }
  }
};

/** account_write.ts's gate: the token's permission, then the person's approval when the account asks for it. */
type Gate = (
  tool: DictationTool,
  permission: Permission,
  args: Record<string, unknown>,
  ctx: ServerContext
) => Promise<CallToolResult | InputRequiredResult>;

/** Registers the tools here, each through the gate. */
export const registerDictationTools = (server: McpServer, gated: Gate): void => {
  server.registerTool(
    'create_firing_log',
    {
      title: 'Save a new firing log',
      description: `Saves a new firing log in your Glazecalc account (the Firing page): its title, the day, the kiln, the columns kept (time, temperature, cone, atmosphere, comments...) and a row for each reading, as the person dictated them. Add later readings with add_firing_rows. ${SAVE_ONLY_WHAT_WAS_SAID} ${NEEDS}`,
      inputSchema: firingLogInput,
      annotations: ADDS
    },
    async (args, ctx) => guarded(() => gated('create_firing_log', 'firing:write', args, ctx))
  );

  server.registerTool(
    'add_firing_rows',
    {
      title: 'Add readings to one of my firing logs',
      description: `Adds rows to the end of one of your firing logs (an id from list_firings), in the log's own columns (get_firing gives them): the readings dictated during a firing. The rows already there stay as they are, and the log as it was is kept as an earlier version. At most ${FIRING_ROWS_MOST} rows a log. ${SAVE_ONLY_WHAT_WAS_SAID} ${NEEDS}`,
      inputSchema: firingRowsInput,
      annotations: REPLACES
    },
    async (args, ctx) => guarded(() => gated('add_firing_rows', 'firing:write', args, ctx))
  );

  server.registerTool(
    'link_firing',
    {
      title: 'Save a test result for a recipe in a firing',
      description: `Links one of your recipes to a firing log it went through, as the recipe page does, and sets what came of it there: the result in the person's words (at most ${FIRING_LINKS.result} characters), and the cone and atmosphere when they differ from the log. Linked already, it changes only what is given. A recipe links to at most ${FIRING_LINKS.most} logs. Taking a link off is done on the website. ${SAVE_ONLY_WHAT_WAS_SAID} ${NEEDS}`,
      inputSchema: linkFiringInput,
      annotations: REPLACES
    },
    async (args, ctx) => guarded(() => gated('link_firing', 'recipes:write', args, ctx))
  );
};
