// The signed-in account.
//
//   GET    /api/verify            who the session belongs to
//   PUT    /api/usersettings/:id  { displayname, email, settings, password }
//   DELETE /api/deleteuser/:id    { password } removes the account and everything in it
import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { deleteAccount } from '../lib/account_data.ts';
import * as email from '../lib/email.ts';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { tokenOf, userOf } from '../lib/jwt_auth.ts';
import { isDuplicateKey } from '../lib/mongo_errors.ts';
import * as password from '../lib/password.ts';
import * as limits from '../lib/rate_limit.ts';
import * as session from '../lib/session.ts';
import User from '../models/user.ts';

const userRouter = express.Router();
export default userRouter;

const tokenFilter = (req: Request, res: Response, next: NextFunction) => {
  if (!tokenOf(req)) {
    return res.status(200).json({ msg: 'No token yet, so there is no email to find. Goodbye.' });
  }
  return next();
};

userRouter.get('/verify', tokenFilter, jwtAuth, (req, res) => {
  const user = userOf(req);
  // A trial's placeholder email stays on the server; the app shows its name.
  const identity = { msg: 'User verified', id: user.id as string, name: user.displayname };
  res
    .status(200)
    .json(user.guest ? { ...identity, guest: true, expiresAt: user.expiresAt } : { ...identity, email: user.email });
});

// Users may only change or delete their own account; admins may act on any.
const selfOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ msg: 'Invalid id' });
  const user = userOf(req);
  if (req.params.id === String(user._id) || user.role === 'admin') return next();
  return res.status(403).json({ msg: 'Not allowed to change another user' });
};

// Fields a user may set on their own account. Role and password are not
// changeable here.
const SETTABLE_FIELDS = ['displayname', 'email', 'settings'];

// Changing your own email or deleting your own account needs your current
// password (body.password), so a stolen sign-in token alone cannot take the
// account over or remove it. Admins acting on another account are exempt.
const ownPasswordConfirmed = async (req: Request): Promise<boolean> => {
  const signedIn = userOf(req);
  if (req.params.id !== String(signedIn._id)) return true;
  // A trial has no password; its token alone can discard it.
  if (signedIn.guest) return true;
  const user = await User.findById(signedIn._id);
  return password.matches(((req.body ?? {}) as { password?: unknown }).password, user?.password);
};
// 400 rather than 401: the sign-in is fine, and a 401 would sign the user out.
const WRONG_PASSWORD = 'Please enter your current password.';
const EMAIL_IN_USE = 'That email is already in use';

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
    if (!Object.keys(changes).length) return res.status(400).json({ msg: 'Nothing to update' });

    if (changes.email !== undefined) {
      changes.email = email.normalize(changes.email);
      if (!email.isValid(changes.email)) return res.status(400).json({ msg: 'Please enter an email' });
      if (!(await ownPasswordConfirmed(req))) return res.status(400).json({ msg: WRONG_PASSWORD });
      const other = await User.exists({ email: changes.email, _id: { $ne: req.params.id } }).collation(email.collation);
      if (other) return res.status(400).json({ msg: EMAIL_IN_USE });
    }

    try {
      const result = await User.updateOne({ _id: req.params.id }, { $set: changes });
      if (!result.matchedCount) return res.status(404).json({ msg: 'No user with that id' });
      return res.status(200).json({ msg: 'User updated' });
    } catch (err) {
      // The unique index catches two accounts racing for the same email.
      if (isDuplicateKey(err)) return res.status(400).json({ msg: EMAIL_IN_USE });
      throw err;
    }
  }
);

userRouter.delete('/deleteuser/:id', jwtAuth, selfOrAdmin, limits.passwordCheck, express.json(), async (req, res) => {
  if (!(await ownPasswordConfirmed(req))) return res.status(400).json({ msg: WRONG_PASSWORD });
  const id = req.params.id as string;
  if (!(await deleteAccount(id))) return res.status(404).json({ msg: 'No user with that id' });
  if (id === String(userOf(req)._id)) session.end(res);
  return res.status(200).json({ msg: 'User deleted' });
});
