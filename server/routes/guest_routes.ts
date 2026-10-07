// Trying the app without an account ("Try it now").
//
//   POST /api/guest                          starts a trial: { guest, name, expiresAt }
//   POST /api/guest/claim  { email, password }  (signed in as the trial) turns it
//                                            into a real account, keeping its records
//
// Both sign the browser in with the session cookie (server/lib/session.ts).
//
// A trial is a real User with guest: true and an expiry, so every page and
// ownership check works unchanged. It gets a generated name ("speckled quiet
// kilns"), kept as its display name, and a placeholder email made from the name
// (speckled-quiet-kilns@guest.invalid), so email stays required and unique for
// every account. Its password is the hash of a random secret nobody knows, so
// the trial's token is the only way in. Expired trials are removed by
// server/lib/guest_sweeper.ts; server/lib/guest_limits.ts caps what they keep.
//
// GUEST_TRIAL=off turns trials off; GUEST_MAX_ACTIVE (500) caps how many run at once.
import crypto from 'node:crypto';
import express from 'express';
import * as email from '../lib/email.ts';
import { names } from '../lib/guest_names.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { isDuplicateKey } from '../lib/mongo_errors.ts';
import * as password from '../lib/password.ts';
import * as limits from '../lib/rate_limit.ts';
import * as session from '../lib/session.ts';
import User from '../models/user.ts';

const TRIAL_DAYS = 14;
// Plain names first; after that many clashes a number is added. With about
// 930,000 names and at most a few hundred trials, even one clash is rare.
const PLAIN_TRIES = 5;
const ALL_TRIES = 10;
const EXISTS = 'An account with that email already exists.';
const NOT_A_TRIAL = 'This account is not a trial.';

const maxActive = (): number => Number(process.env.GUEST_MAX_ACTIVE) || 500;

const guestRouter = express.Router();
export default guestRouter;

guestRouter.post('/', limits.guest, async (req, res) => {
  if (process.env.GUEST_TRIAL === 'off') return res.status(404).json({ msg: 'Not found' });
  const now = new Date();
  if ((await User.countDocuments({ guest: true, expiresAt: { $gt: now } })) >= maxActive()) {
    return res
      .status(503)
      .json({ msg: 'Too many people are trying Glazecalc right now. Please create a free account instead.' });
  }
  const unusable = await password.hash(crypto.randomBytes(32).toString('base64url'));
  const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  for (let attempt = 1; attempt <= ALL_TRIES; attempt++) {
    let { name, slug } = names.draw();
    if (attempt > PLAIN_TRIES) {
      const number = crypto.randomInt(2, 1000);
      name += ' ' + number;
      slug += '-' + number;
    }
    try {
      const user = await User.create({
        email: slug + '@' + email.GUEST_DOMAIN,
        displayname: name,
        password: unusable,
        guest: true,
        expiresAt
      });
      // The session lasts as long as the trial (an account's lasts 7 days).
      session.start(res, user, TRIAL_DAYS);
      return res.status(201).json({ guest: true, name, expiresAt });
    } catch (err) {
      // The unique email index rejects a name already in use; draw another.
      if (!isDuplicateKey(err)) throw err;
    }
  }
  return res.status(503).json({ msg: 'Could not start a trial just now. Please try again.' });
});

guestRouter.post('/claim', limits.signUp, jwtAuth, express.json(), async (req, res) => {
  const trial = userOf(req);
  if (!trial.guest) return res.status(403).json({ msg: NOT_A_TRIAL });
  const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
  const address = email.normalize(body.email);
  if (!email.isValid(address)) return res.status(400).json({ msg: 'Please enter an email', field: 'email' });
  const problem = password.problem(body.password);
  if (problem) return res.status(400).json({ msg: problem, field: 'password' });

  try {
    if (await User.exists({ email: address }).collation(email.collation)) {
      return res.status(400).json({ msg: EXISTS, field: 'email' });
    }
    const hash = await password.hash(body.password as string);
    // The trial's records are already its own, so keeping them is just turning
    // the trial into an account. The display name stays; the new token version
    // retires the trial's token.
    const user = await User.findOneAndUpdate(
      { _id: trial._id, guest: true },
      {
        $set: { email: address, password: hash },
        $unset: { guest: 1, expiresAt: 1, trialCounts: 1 },
        $inc: { tokenVersion: 1 }
      },
      { returnDocument: 'after' }
    );
    // Claimed or discarded by another request in the meantime.
    if (!user) return res.status(403).json({ msg: NOT_A_TRIAL });
    session.start(res, user);
    return res.status(200).json({ email: user.email });
  } catch (err) {
    // The unique index catches a sign-up for the same email racing this one.
    if (isDuplicateKey(err)) return res.status(400).json({ msg: EXISTS, field: 'email' });
    throw err;
  }
});
