// The signed-in account.
//
//   GET    /api/verify            who the session belongs to
//   GET    /api/preferences       the account's (or trial's) choices: { weightUnit, gramPrecision, theme, palette, lead,
//                                  region, format, decimalMark, temperature, cones, language,
//                                  density, englishTerms, notice }
//   PUT    /api/preferences       any of them (models/user.ts PREFERENCES lists what each may be)
//   GET    /api/shelf             the materials the account (or trial) has on hand: { shelf: [key] }
//   PUT    /api/shelf             { shelf: [key] } in place of the list
//   PUT    /api/usersettings/:id  { displayname, settings }; the email changes by a link (routes/email_routes.ts)
//   DELETE /api/deleteuser/:id    { password } removes the account and everything in it
import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { deleteAccount } from '../lib/account_data.ts';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { tokenOf, userOf } from '../lib/jwt_auth.ts';
import * as password from '../lib/password.ts';
import * as limits from '../lib/rate_limit.ts';
import * as session from '../lib/session.ts';
import User, { PREFERENCES, type Preferences } from '../models/user.ts';
import { say } from '../lib/messages.ts';

const userRouter = express.Router();
export default userRouter;

const tokenFilter = (req: Request, res: Response, next: NextFunction) => {
  if (!tokenOf(req)) {
    return res.status(200).json(say('no-token'));
  }
  return next();
};

userRouter.get('/verify', tokenFilter, jwtAuth, (req, res) => {
  const user = userOf(req);
  // A trial's placeholder email stays on the server; the app shows its name.
  const identity = { ...say('verified'), id: user.id as string, name: user.displayname };
  res
    .status(200)
    .json(
      user.guest
        ? { ...identity, guest: true, expiresAt: user.expiresAt }
        : { ...identity, email: user.email, ...(user.emailUnverified && { unverified: true }) }
    );
});

// Choices about how the app shows things. Unlike the account's details below,
// a trial may set them too, and they need no password.
const PREFERENCE_NAMES = Object.keys(PREFERENCES) as Array<keyof Preferences>;

/** Every preference: the one chosen, or the default. */
const preferencesOf = (saved: Partial<Preferences> = {}): Preferences =>
  Object.fromEntries(PREFERENCE_NAMES.map((name) => [name, saved[name] ?? PREFERENCES[name][0]])) as Preferences;

userRouter.get('/preferences', jwtAuth, (req, res) => {
  res.status(200).json(preferencesOf(userOf(req).preferences));
});

// Changes the preferences sent, leaving the others as they are.
userRouter.put('/preferences', jwtAuth, express.json(), async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const changing = PREFERENCE_NAMES.filter((name) => body[name] !== undefined);
  if (!changing.length) return res.status(400).json(say('nothing-to-change'));
  const refused = changing.find((name) => !(PREFERENCES[name] as readonly unknown[]).includes(body[name]));
  if (refused)
    return res
      .status(400)
      .json(
        say(`${refused}-choices`, refused === 'palette' ? { palettes: PREFERENCES.palette.join(', ') } : undefined)
      );
  const changes = Object.fromEntries(changing.map((name) => ['preferences.' + name, body[name]]));
  const user = await User.findByIdAndUpdate(
    userOf(req)._id,
    { $set: changes },
    { returnDocument: 'after', projection: { preferences: 1 } }
  );
  return res.status(200).json(preferencesOf(user?.preferences));
});

// The materials on hand, for Match with what I have: library keys, as the
// client's libraryKey makes them. Like the preferences, a trial may keep one.
const SHELF_MOST = 500;
const KEY_LONGEST = 200;

userRouter.get('/shelf', jwtAuth, (req, res) => {
  res.status(200).json({ shelf: userOf(req).shelf ?? [] });
});

userRouter.put('/shelf', jwtAuth, express.json(), async (req, res) => {
  const shelf = ((req.body ?? {}) as { shelf?: unknown }).shelf;
  const keys = Array.isArray(shelf) ? [...new Set(shelf)] : null;
  if (
    !keys ||
    keys.length > SHELF_MOST ||
    keys.some((key) => typeof key !== 'string' || !key || key.length > KEY_LONGEST)
  ) {
    return res.status(400).json(say('shelf-invalid', { most: SHELF_MOST }));
  }
  await User.updateOne({ _id: userOf(req)._id }, { $set: { shelf: keys } });
  return res.status(200).json({ shelf: keys });
});

// Users may only change or delete their own account; admins may act on any.
// The id is written in lower case from here on, as the user's own id and the
// records' owners are: an id in capitals is the same account.
const selfOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json(say('invalid-id'));
  req.params.id = String(req.params.id).toLowerCase();
  const user = userOf(req);
  if (req.params.id === String(user._id) || user.role === 'admin') return next();
  return res.status(403).json(say('not-allowed'));
};

// Fields a user may set on their own account. Role and password are not
// changeable here, and neither is the email: an address changes only when the
// link sent to the new one is opened (routes/email_routes.ts), for admins too.
const SETTABLE_FIELDS = ['displayname', 'settings'];

// Deleting your own account needs your current password (body.password), so a
// stolen sign-in token alone cannot remove it. Admins acting on another account are exempt.
const ownPasswordConfirmed = async (req: Request): Promise<boolean> => {
  const signedIn = userOf(req);
  if (req.params.id !== String(signedIn._id)) return true;
  // A trial has no password; its token alone can discard it.
  if (signedIn.guest) return true;
  const user = await User.findById(signedIn._id);
  return password.matches(((req.body ?? {}) as { password?: unknown }).password, user?.password);
};
// 400 rather than 401: the sign-in is fine, and a 401 would sign the user out.

// Trials change nothing here; they create an account (POST /api/guest/claim).
userRouter.put(
  '/usersettings/:id',
  jwtAuth,
  notGuest,
  selfOrAdmin,
  limits.passwordCheck,
  express.json(),
  async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const changes = Object.fromEntries(
      SETTABLE_FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
    );
    if (!Object.keys(changes).length) return res.status(400).json(say('nothing-to-update'));

    const result = await User.updateOne({ _id: req.params.id }, { $set: changes });
    if (!result.matchedCount) return res.status(404).json(say('no-user'));
    return res.status(200).json(say('user-updated'));
  }
);

userRouter.delete('/deleteuser/:id', jwtAuth, selfOrAdmin, limits.passwordCheck, express.json(), async (req, res) => {
  if (!(await ownPasswordConfirmed(req)))
    return res.status(400).json(say('current-password-needed', undefined, { field: 'password' }));
  const id = req.params.id as string;
  if (!(await deleteAccount(id))) return res.status(404).json(say('no-user'));
  if (id === String(userOf(req)._id)) session.end(res);
  return res.status(200).json(say('user-deleted'));
});
