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
import express, { type Request, type Response } from 'express';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { say } from '../lib/messages.ts';
import { logActivity } from '../lib/record_history.ts';
import requireScope from '../lib/require_scope.ts';
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
 * account or the library. Sends the answer and resolves with null when it
 * names neither or no such material.
 */
const keysNamed = async (req: Request, res: Response): Promise<{ name: string; keys: string[] } | null> => {
  const { key, name } = (req.body ?? {}) as { key?: unknown; name?: unknown };
  if (typeof key === 'string' && key && key.length <= KEY_LONGEST) return { name: key, keys: [key] };
  if (typeof name === 'string' && name.trim() && name.length <= KEY_LONGEST - 5) {
    const { keys } = await shelves.shelfKeys(String(userOf(req)._id), [name]);
    if (keys[0]) return keys[0];
    res.status(404).json(say('shelf-material-unknown'));
    return null;
  }
  res.status(400).json(say('missing-information'));
  return null;
};

// One material at a time, for the web session or a token that can change the
// shelf (shelf:write); an account's limits on changes made with tokens apply.
// A token's change is written to the activity log, and the list it replaced is
// kept for one Undo.
shelfRouter.post('/add', requireScope('shelf:write'), express.json(), async (req, res) => {
  const named = await keysNamed(req, res);
  if (!named) return;
  const done = await shelves.addKeys(String(userOf(req)._id), [named.keys[0]!]);
  if (done === 'full') return res.status(409).json(say('shelf-full', { most: SHELF_MOST }));
  if (done.changed) await logActivity(req, 'change', 'shelf', { name: named.name });
  return res.status(200).json(done);
});

shelfRouter.post('/remove', requireScope('shelf:write'), express.json(), async (req, res) => {
  const named = await keysNamed(req, res);
  if (!named) return;
  const done = await shelves.removeKeys(String(userOf(req)._id), named.keys);
  if (done.changed) await logActivity(req, 'change', 'shelf', { name: named.name });
  return res.status(200).json(done);
});

// Puts back the list the last change replaced; one step, then it is spent.
shelfRouter.post('/undo', requireScope('shelf:write'), async (req, res) => {
  const shelf = await shelves.undoShelf(String(userOf(req)._id));
  if (!shelf) return res.status(409).json(say('shelf-nothing-to-undo'));
  await logActivity(req, 'undo', 'shelf', { name: 'Shelf' });
  return res.status(200).json({ shelf, changed: true });
});
