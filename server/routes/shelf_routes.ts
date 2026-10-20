// The materials on hand, for Match with what I have.
//
//   GET    /api/shelf             the materials the account (or trial) has on hand: { shelf: [key] }; a token
//                                  that can read the shelf (shelf:read) may too
//   PUT    /api/shelf             { shelf: [key] } in place of the list; the web session only
//   POST   /api/shelf/add         { key } or { name } (a material of the account or the library): one material
//                                  at the end of the list, once; { shelf, changed }. 409 when the shelf is full.
//   POST   /api/shelf/remove      { key } or { name }: one material off the list, the others in their order
//   POST   /api/shelf/undo        puts back the list the last change (PUT, add, remove, or an assistant's) replaced;
//                                  one step, then 409 until the next change. These three take the web session or
//                                  a token that can change the shelf (shelf:write): they count against the
//                                  account's limits on changes made with tokens, and a token's are written to the
//                                  activity log ('change' and 'undo' on 'shelf'). The list before the last change
//                                  is User.shelfPrevious (exported and deleted with the account).
//
// When the account asks to confirm changes made with tokens (docs/adr/0025-confirm-before-changes.md), a
// token's remove (a removal), or any of the three (every change), waits for the person's approval and is
// answered 202 (server/lib/rest_changes.ts); 'shelf.add', 'shelf.remove' and 'shelf.undo' run the same code.
import express, { type Request } from 'express';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { say } from '../lib/messages.ts';
import { logActivity } from '../lib/record_history.ts';
import requireScope from '../lib/require_scope.ts';
import { confirmFirst, inputOf, registerOp, send, type Op, type Reply, type Who } from '../lib/rest_changes.ts';
import * as shelves from '../lib/shelf.ts';
import { SHELF_KEY_LONGEST, SHELF_MOST } from '../models/user.ts';

const shelfRouter = express.Router();
export default shelfRouter;

// The materials on hand, for Match with what I have: library keys, as the
// client's libraryKey makes them. Like the preferences, a trial may keep one.
// At most SHELF_MOST keys of at most SHELF_KEY_LONGEST characters (server/models/user.ts).
const KEY_LONGEST = SHELF_KEY_LONGEST;

shelfRouter.get('/', requireScope('shelf:read'), (req, res) => {
  res.status(200).json({ shelf: userOf(req).shelf ?? [] });
});

// The website's: the whole list, in place of the one saved. Session only; a
// token changes one material at a time (below). The list it replaces is kept
// for one Undo (lib/shelf.ts).
shelfRouter.put('/', jwtAuth, express.json(), async (req, res) => {
  const shelf = ((req.body ?? {}) as { shelf?: unknown }).shelf;
  const keys = Array.isArray(shelf) ? [...new Set(shelf)] : null;
  if (
    !keys ||
    keys.length > SHELF_MOST ||
    keys.some((key) => typeof key !== 'string' || !key || key.length > KEY_LONGEST)
  ) {
    return res.status(400).json(say('shelf-invalid', { most: SHELF_MOST }));
  }
  await shelves.setShelf(String(userOf(req)._id), keys as string[]);
  return res.status(200).json({ shelf: keys });
});

/**
 * The keys a body names: { key } as it is, or { name }, a material of the
 * account or the library; or what to answer when it names neither or no such
 * material.
 */
const keysNamed = async (who: Who, body: unknown): Promise<{ name: string; keys: string[] } | Reply> => {
  const { key, name } = (body ?? {}) as { key?: unknown; name?: unknown };
  if (typeof key === 'string' && key && key.length <= KEY_LONGEST) return { name: key, keys: [key] };
  if (typeof name === 'string' && name.trim() && name.length <= KEY_LONGEST - 5) {
    const { keys } = await shelves.shelfKeys(String(who.user._id), [name]);
    if (keys[0]) return keys[0];
    return { status: 404, body: say('shelf-material-unknown') };
  }
  return { status: 400, body: say('missing-information') };
};

// One material at a time, for the web session or a token that can change the
// shelf (shelf:write); an account's limits on changes made with tokens apply.
// A token's change is written to the activity log, and the list it replaced is
// kept for one Undo.
const add: Op = async (who, { body }) => {
  const named = await keysNamed(who, body);
  if ('status' in named) return named;
  const done = await shelves.addKeys(String(who.user._id), [named.keys[0]!]);
  if (done === 'full') return { status: 409, body: say('shelf-full', { most: SHELF_MOST }) };
  if (done.changed) await logActivity(who, 'change', 'shelf', { name: named.name });
  return { status: 200, body: done };
};

const remove: Op = async (who, { body }) => {
  const named = await keysNamed(who, body);
  if ('status' in named) return named;
  const done = await shelves.removeKeys(String(who.user._id), named.keys);
  if (done.changed) await logActivity(who, 'change', 'shelf', { name: named.name });
  return { status: 200, body: done };
};

// Puts back the list the last change replaced; one step, then it is spent.
const undo: Op = async (who) => {
  const shelf = await shelves.undoShelf(String(who.user._id));
  if (!shelf) return { status: 409, body: say('shelf-nothing-to-undo') };
  await logActivity(who, 'undo', 'shelf', { name: 'Shelf' });
  return { status: 200, body: { shelf, changed: true } };
};

registerOp('shelf.add', add);
registerOp('shelf.remove', remove);
registerOp('shelf.undo', undo);

/** The material a body names, as the change's summary says it. */
const nameIn = (req: Request): string => {
  const { key, name } = (req.body ?? {}) as { key?: unknown; name?: unknown };
  return typeof name === 'string' ? name.trim() : typeof key === 'string' ? key : '';
};
const asking = {
  add: confirmFirst('shelf.add', {
    removal: false,
    describe: async (req) => ({ summary: { code: 'pending-shelf-add', params: { names: nameIn(req) } } })
  }),
  remove: confirmFirst('shelf.remove', {
    removal: true,
    describe: async (req) => ({ summary: { code: 'pending-shelf-remove', params: { names: nameIn(req) } } })
  }),
  // An undo must put back the shelf the person saw when they approved it.
  undo: confirmFirst('shelf.undo', {
    removal: false,
    describe: async () => ({ summary: { code: 'pending-shelf-undo', params: {} }, base: { kind: 'shelf' } })
  })
};
const whoIs = (req: Request): Who => ({ user: userOf(req), access: req.access });

shelfRouter.post('/add', requireScope('shelf:write'), express.json(), asking.add, async (req, res) => {
  send(res, await add(whoIs(req), inputOf(req)));
});

shelfRouter.post('/remove', requireScope('shelf:write'), express.json(), asking.remove, async (req, res) => {
  send(res, await remove(whoIs(req), inputOf(req)));
});

shelfRouter.post('/undo', requireScope('shelf:write'), asking.undo, async (req, res) => {
  send(res, await undo(whoIs(req), inputOf(req)));
});
