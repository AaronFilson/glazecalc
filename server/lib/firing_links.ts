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
//
// A link to a log in the Trash stays on the recipe, hidden (the pages show only
// logs that are there, and an assistant is given none of them), so putting the
// log back brings its links back; deleting the log for good takes its links off
// every recipe (pullFiringLinks). Only links to logs that are there count
// toward the limit.
import express, { type Request, type Response, type Router } from 'express';
import mongoose from 'mongoose';
import firingLib from '../../lib/cones/firing.js';
import type { Atmosphere, FiringBlock } from '../../lib/cones/firing.js';
import results from '../../lib/cones/results.js';
import Firing from '../models/firing.ts';
import Recipe, { FIRING_LINKS } from '../models/recipe.ts';
import { userOf } from './jwt_auth.ts';
import { say } from './messages.ts';
import { logActivity } from './record_history.ts';
import requireScope from './require_scope.ts';

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

/** Adds the link routes to the recipe routes. */
export function addFiringLinkRoutes(router: Router): void {
  const writing = requireScope('recipes:write');
  const jsonParser = express.json();
  const notFound = say('record-not-found', { label: 'recipe' });
  const valid = (req: Request, res: Response): boolean => {
    const ids = [req.params.id, ...(req.params.firing !== undefined ? [req.params.firing] : [])];
    if (ids.every((id) => mongoose.isValidObjectId(id))) return true;
    res.status(400).json(say('invalid-id'));
    return false;
  };
  const answer = async (req: Request, res: Response, ownedBy: string): Promise<void> => {
    const links = await linksOf(req.params.id as string, ownedBy);
    if (!links) {
      res.status(404).json(notFound);
      return;
    }
    await logActivity(req, 'change', 'recipes', { _id: req.params.id as string, firings: links });
    res.status(200).json({ firings: links });
  };

  router.post('/firings/:id', writing, jsonParser, async (req, res) => {
    if (!valid(req, res)) return;
    const ownedBy = userOf(req).id as string;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const firing = body.firing;
    const result = resultOf(body.result);
    if (typeof firing !== 'string' || !mongoose.isValidObjectId(firing) || result === null) {
      res.status(400).json(say('record-invalid', { label: 'recipe' }));
      return;
    }
    const log = await Firing.findOne({ _id: firing, ownedBy }, { fieldsIncluded: 1, rows: 1 }).lean();
    if (!log) {
      res.status(404).json(say('record-not-found', { label: 'firing' }));
      return;
    }
    const recipe = await Recipe.findOne({ _id: req.params.id, ownedBy }, { firings: 1, firedAt: 1 }).lean();
    if (!recipe) {
      res.status(404).json(notFound);
      return;
    }
    const links = ((recipe.firings ?? []) as Link[]).map(linkOut);
    if (!links.some((l) => l.firing === firing)) {
      // Links to logs in the Trash or gone do not count toward the limit.
      const live = await liveLinks(ownedBy, links);
      if (live.length >= FIRING_LINKS.most) {
        res.status(409).json(say('firing-links-full', { most: FIRING_LINKS.most }));
        return;
      }
      // Only when it is not linked yet, so two tabs linking it at once add it once.
      await Recipe.updateOne(
        {
          _id: req.params.id,
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
    await answer(req, res, ownedBy);
  });

  router.put('/firings/:id/:firing', writing, jsonParser, async (req, res) => {
    if (!valid(req, res)) return;
    const ownedBy = userOf(req).id as string;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const given = {
      // A result given as null clears it, as '' does.
      result: Object.hasOwn(body, 'result') ? (body.result === null ? '' : resultOf(body.result)) : undefined,
      cone: placeOf(body.cone, results.isAnyCone),
      atmosphere: placeOf(body.atmosphere, isAtmosphere)
    };
    if (Object.values(given).includes(null)) {
      res.status(400).json(say('record-invalid', { label: 'recipe' }));
      return;
    }
    const set: Record<string, string> = {};
    const unset: Record<string, ''> = {};
    for (const [field, value] of Object.entries(given)) {
      if (value === undefined) continue;
      if (value) set['firings.$.' + field] = value;
      else unset['firings.$.' + field] = '';
    }
    if (Object.keys(set).length || Object.keys(unset).length) {
      await Recipe.updateOne(
        { _id: req.params.id, ownedBy, 'firings.firing': req.params.firing },
        { ...(Object.keys(set).length && { $set: set }), ...(Object.keys(unset).length && { $unset: unset }) }
      );
    }
    await answer(req, res, ownedBy);
  });

  router.delete('/firings/:id/:firing', writing, async (req, res) => {
    if (!valid(req, res)) return;
    const ownedBy = userOf(req).id as string;
    await Recipe.updateOne({ _id: req.params.id, ownedBy }, { $pull: { firings: { firing: req.params.firing } } });
    await answer(req, res, ownedBy);
  });
}
