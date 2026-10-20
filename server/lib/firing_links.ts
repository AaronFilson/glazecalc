// A recipe's links to the firing logs it went through (docs/adr/0021-recipe-firing.md).
// The links are kept on the recipe; these are the routes that change one link at
// a time, so the recipe page and the firing log page, open in two tabs, never
// overwrite each other's links by sending a whole list:
//
//   POST   /api/recipe/firings/:id           { firing, result? } links a firing log; nothing
//                                            changes when it is linked already. 404 when the
//                                            recipe or the log is not the user's; 409 when the
//                                            recipe has FIRING_LINKS.most links to logs there now.
//                                            The link's cone and atmosphere are read from the log
//                                            when it says clearly (lib/cones/results.js, linkPlace)
//   PUT    /api/recipe/firings/:id/:firing   { result?, cone?, atmosphere? } sets what is given of
//                                            the link's result note, cone and atmosphere ('' or
//                                            null clears one); what is not given stays
//   DELETE /api/recipe/firings/:id/:firing   takes the link off
//
// Each answers with the recipe's links as they are now: { firings: [...] }.
// With an access token, each waits for the person's approval when the account
// asks to confirm changes (docs/adr/0025-confirm-before-changes.md): taking a
// link off is a removal, linking and changing one are changes.
//
// A link to a log in the Trash stays on the recipe, hidden (the pages show only
// logs that are there, and an assistant is given none of them), so putting the
// log back brings its links back; deleting the log for good takes its links off
// every recipe (pullFiringLinks). Only links to logs that are there count
// toward the limit.
import express, { type Request, type Router } from 'express';
import mongoose from 'mongoose';
import firingLib from '../../lib/cones/firing.js';
import type { Atmosphere, FiringBlock } from '../../lib/cones/firing.js';
import results from '../../lib/cones/results.js';
import Firing from '../models/firing.ts';
import Recipe, { FIRING_LINKS } from '../models/recipe.ts';
import { userOf } from './jwt_auth.ts';
import { say } from './messages.ts';
import { fieldChanges, registerPreview } from './pending_changes.ts';
import { logActivity, titleOf } from './record_history.ts';
import requireScope from './require_scope.ts';
import {
  confirmFirst,
  inputOf,
  named,
  registerOp,
  send,
  type Describe,
  type Op,
  type OpInput,
  type Reply,
  type Who
} from './rest_changes.ts';

export interface Link {
  firing: string;
  result?: string;
  /** The cone it was fired to, as the firing block writes it, and the atmosphere: the result cards'. */
  cone?: string;
  atmosphere?: Atmosphere;
}

/** The ids of the firing logs an account has now (not those in the Trash or gone). */
export async function liveFiringIds(ownedBy: string, ids?: string[]): Promise<Set<string>> {
  const filter: Record<string, unknown> = { ownedBy };
  if (ids) filter._id = { $in: ids.filter((id) => mongoose.isValidObjectId(id)) };
  const found = await Firing.find(filter, { _id: 1 }).lean();
  return new Set(found.map((f) => String(f._id)));
}

/** A recipe's links to firing logs that are there now: what is shown and given to an assistant. */
export async function liveLinks(ownedBy: string, links: Link[] | undefined): Promise<Link[]> {
  if (!links?.length) return [];
  const live = await liveFiringIds(
    ownedBy,
    links.map((l) => l.firing)
  );
  return links.filter((link) => live.has(link.firing));
}

/** Takes the links to firing logs deleted for good off every recipe of the account. */
export async function pullFiringLinks(ownedBy: string, firingIds: string[]): Promise<void> {
  if (!firingIds.length) return;
  await Recipe.updateMany(
    { ownedBy, 'firings.firing': { $in: firingIds } },
    { $pull: { firings: { firing: { $in: firingIds } } } }
  );
}

/** A link as it is answered and logged: only the fields it has. */
export const linkOut = ({ firing, result, cone, atmosphere }: Link): Link => ({
  firing,
  ...(result && { result }),
  ...(cone && { cone }),
  ...(atmosphere && { atmosphere })
});

const linksOf = async (id: string, ownedBy: string): Promise<Link[] | null> => {
  const recipe = await Recipe.findOne({ _id: id, ownedBy }, { firings: 1 }).lean();
  return recipe ? ((recipe.firings ?? []) as Link[]).map(linkOut) : null;
};

const resultOf = (value: unknown): string | null | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > FIRING_LINKS.result ? null : text;
};

/** A cone or atmosphere given for a link: undefined when not given, '' to clear it, null when it is not one. */
const placeOf = (value: unknown, valid: (text: string) => boolean): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return '';
  return typeof value === 'string' && valid(value) ? value : null;
};
const isAtmosphere = (text: string): boolean => (firingLib.ATMOSPHERES as readonly string[]).includes(text);

const notFound = say('record-not-found', { label: 'recipe' });
const INVALID_ID: Reply = { status: 400, body: say('invalid-id') };
const INVALID: Reply = { status: 400, body: say('record-invalid', { label: 'recipe' }) };

/** The recipe's and the log's ids in the path, if each is one. */
const validIds = ({ params }: OpInput): boolean =>
  [params.id, ...(params.firing !== undefined ? [params.firing] : [])].every((id) => mongoose.isValidObjectId(id));

/** The recipe's links as they are now, written to the activity log for a token: what each route answers. */
const answer = async (who: Who, recipeId: string): Promise<Reply> => {
  const links = await linksOf(recipeId, String(who.user._id));
  if (!links) return { status: 404, body: notFound };
  await logActivity(who, 'change', 'recipes', { _id: recipeId, firings: links });
  return { status: 200, body: { firings: links } };
};

/** A link's result note, cone and atmosphere as given ('' or null clears one), or null when one is not valid. */
const givenPlace = (body: Record<string, unknown>) => {
  const given = {
    // A result given as null clears it, as '' does.
    result: Object.hasOwn(body, 'result') ? (body.result === null ? '' : resultOf(body.result)) : undefined,
    cone: placeOf(body.cone, results.isAnyCone),
    atmosphere: placeOf(body.atmosphere, isAtmosphere)
  };
  return Object.values(given).includes(null) ? null : given;
};

const link: Op = async (who, input) => {
  if (!validIds(input)) return INVALID_ID;
  const ownedBy = String(who.user._id);
  const recipeId = input.params.id!;
  const body = (input.body ?? {}) as Record<string, unknown>;
  const firing = body.firing;
  const result = resultOf(body.result);
  if (typeof firing !== 'string' || !mongoose.isValidObjectId(firing) || result === null) return INVALID;
  const log = await Firing.findOne({ _id: firing, ownedBy }, { fieldsIncluded: 1, rows: 1 }).lean();
  if (!log) return { status: 404, body: say('record-not-found', { label: 'firing' }) };
  const recipe = await Recipe.findOne({ _id: recipeId, ownedBy }, { firings: 1, firedAt: 1 }).lean();
  if (!recipe) return { status: 404, body: notFound };
  const links = ((recipe.firings ?? []) as Link[]).map(linkOut);
  if (!links.some((l) => l.firing === firing)) {
    // Links to logs in the Trash or gone do not count toward the limit.
    const live = await liveLinks(ownedBy, links);
    if (live.length >= FIRING_LINKS.most) {
      return { status: 409, body: say('firing-links-full', { most: FIRING_LINKS.most }) };
    }
    // Only when it is not linked yet, so two tabs linking it at once add it once.
    await Recipe.updateOne(
      {
        _id: recipeId,
        ownedBy,
        'firings.firing': { $ne: firing },
        [`firings.${FIRING_LINKS.stored - 1}`]: { $exists: false }
      },
      {
        $push: {
          firings: {
            firing,
            ...(result && { result }),
            ...results.linkPlace(
              log as { fieldsIncluded?: string[]; rows?: unknown[][] },
              firingLib.cleanFiring(recipe.firedAt as FiringBlock | undefined)
            )
          }
        }
      }
    );
  }
  return answer(who, recipeId);
};

const change: Op = async (who, input) => {
  if (!validIds(input)) return INVALID_ID;
  const given = givenPlace((input.body ?? {}) as Record<string, unknown>);
  if (!given) return INVALID;
  const set: Record<string, string> = {};
  const unset: Record<string, ''> = {};
  for (const [field, value] of Object.entries(given)) {
    if (value === undefined) continue;
    if (value) set['firings.$.' + field] = value;
    else unset['firings.$.' + field] = '';
  }
  if (Object.keys(set).length || Object.keys(unset).length) {
    await Recipe.updateOne(
      { _id: input.params.id, ownedBy: String(who.user._id), 'firings.firing': input.params.firing },
      { ...(Object.keys(set).length && { $set: set }), ...(Object.keys(unset).length && { $unset: unset }) }
    );
  }
  return answer(who, input.params.id!);
};

const unlink: Op = async (who, input) => {
  if (!validIds(input)) return INVALID_ID;
  await Recipe.updateOne(
    { _id: input.params.id, ownedBy: String(who.user._id) },
    { $pull: { firings: { firing: input.params.firing } } }
  );
  return answer(who, input.params.id!);
};

// Each is an Op (server/lib/rest_changes.ts), so a change that waited for the person runs the same code.
registerOp('recipes.firing-link', link);
registerOp('recipes.firing-change', change);
registerOp('recipes.firing-unlink', unlink);

/** The recipe a link change is made to, with its title and the log's, or null when there is no such recipe of the account's. */
const about =
  (
    code: string,
    firingOf: (req: Request) => unknown,
    extra: (req: Request) => Record<string, string> = () => ({})
  ): Describe =>
  async (req, who) => {
    if (!validIds(inputOf(req))) return null;
    const ownedBy = String(who.user._id);
    const recipe = await Recipe.findOne({ _id: req.params.id, ownedBy }, { title: 1 }).lean();
    if (!recipe) return null;
    const firingId = firingOf(req);
    const log =
      typeof firingId === 'string' && mongoose.isValidObjectId(firingId)
        ? await Firing.findOne({ _id: firingId, ownedBy }, { title: 1 }).lean()
        : null;
    const logTitle = log ? (titleOf(log as Record<string, unknown>) ?? '') : '';
    return {
      summary: {
        code,
        params: { ...named('recipe', recipe.title), log: logTitle, logNamed: logTitle ? 'yes' : 'no', ...extra(req) }
      },
      base: { kind: 'record', area: 'recipes', id: String(req.params.id) }
    };
  };
const bodyOf = (req: Request) => (req.body ?? {}) as Record<string, unknown>;

// What a waiting change to a link sets, for its page: the link's fields as they are now and would be.
registerPreview('rest', 'recipes.firing-change', (args, current) => {
  const { params, body } = args as OpInput;
  const given = givenPlace((body ?? {}) as Record<string, unknown>);
  if (!given) return [];
  const now = ((current?.firings ?? []) as Link[]).find((l) => l.firing === params.firing);
  return fieldChanges(given, (now ?? {}) as Record<string, unknown>);
});
registerPreview('rest', 'recipes.firing-link', (args) => {
  const result = resultOf((((args as OpInput).body ?? {}) as Record<string, unknown>).result);
  return result ? fieldChanges({ result }, null) : [];
});

/** Adds the link routes to the recipe routes, each asking the person first when the account wants that (docs/adr/0025). */
export function addFiringLinkRoutes(router: Router): void {
  const writing = requireScope('recipes:write');
  const jsonParser = express.json();
  const whoIs = (req: Request): Who => ({ user: userOf(req), access: req.access });
  const asking = {
    link: confirmFirst('recipes.firing-link', {
      removal: false,
      describe: about('pending-firing-link', (req) => bodyOf(req).firing)
    }),
    change: confirmFirst('recipes.firing-change', {
      removal: false,
      describe: about(
        'pending-firing-change',
        (req) => req.params.firing,
        (req) => ({
          fields: ['result', 'cone', 'atmosphere'].filter((field) => Object.hasOwn(bodyOf(req), field)).join(', ')
        })
      )
    }),
    // Taking a link off is a removal.
    unlink: confirmFirst('recipes.firing-unlink', {
      removal: true,
      describe: about('pending-firing-unlink', (req) => req.params.firing)
    })
  };

  router.post('/firings/:id', writing, jsonParser, asking.link, async (req, res) => {
    send(res, await link(whoIs(req), inputOf(req)));
  });

  router.put('/firings/:id/:firing', writing, jsonParser, asking.change, async (req, res) => {
    send(res, await change(whoIs(req), inputOf(req)));
  });

  router.delete('/firings/:id/:firing', writing, asking.unlink, async (req, res) => {
    send(res, await unlink(whoIs(req), inputOf(req)));
  });
}
