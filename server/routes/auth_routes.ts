// Creating an account, signing in and out. Signing in sets the session cookie
// (server/lib/session.ts).
//
//   POST /api/signup   { email, password }            { email }
//   GET  /api/signin   Authorization: Basic email:pw  { email, kept }
//
// Sign-up and sign-in last until the browser closes, unless the request has the
// header X-Keep-Signed-In: 1 (server/lib/session.ts).
//   POST /api/signout
//   POST /api/signout-everywhere   (signed in) signs out every device
//
// A 400 about one of the fields sent names it, so the app can mark that field:
// { msg, field: 'email' }. The same goes for the password and account routes.
import express from 'express';
import { mergeTrial } from '../lib/account_data.ts';
import * as emailLinks from '../lib/email_links.ts';
import { notGuest } from '../lib/guest_limits.ts';
import basicHTTP from '../lib/basic_http.ts';
import * as email from '../lib/email.ts';
import jwtAuth, { currentUser, userOf } from '../lib/jwt_auth.ts';
import { isDuplicateKey } from '../lib/mongo_errors.ts';
import * as password from '../lib/password.ts';
import * as limits from '../lib/rate_limit.ts';
import * as session from '../lib/session.ts';
import User from '../models/user.ts';
import { say } from '../lib/messages.ts';

const authRouter = express.Router();
export default authRouter;

// The same answer for an unknown email and a wrong password, so sign-in does
// not tell anyone which emails have accounts.

authRouter.post('/signup', limits.signUp, express.json(), async (req, res) => {
  const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
  const address = email.normalize(body.email);
  if (!email.isValid(address)) return res.status(400).json(say('email-required', undefined, { field: 'email' }));
  const problem = password.problem(body.password);
  if (problem) return res.status(400).json(say(problem, undefined, { field: 'password' }));

  if (await User.exists({ email: address }).collation(email.collation)) {
    return res.status(400).json(say('account-exists', undefined, { field: 'email' }));
  }
  try {
    // Unverified until the emailed link is opened (server/routes/email_routes.ts).
    const user = await User.create({
      email: address,
      password: await password.hash(body.password as string),
      emailUnverified: true
    });
    session.start(res, user, 7, session.wantsKept(req));
    res.status(200).json({ email: user.email });
    emailLinks.sendVerification(user);
    return undefined;
  } catch (err) {
    // The unique index catches two sign-ups for one email racing each other.
    if (isDuplicateKey(err)) return res.status(400).json(say('account-exists', undefined, { field: 'email' }));
    throw err;
  }
});

authRouter.get('/signin', limits.signIn, basicHTTP, async (req, res) => {
  const credentials = req.basicHTTP!;
  const user = await User.findOne({ email: email.normalize(credentials.email) }).collation(email.collation);
  // Trials have no password of their own; their token is the only way in. Checking
  // against a stand-in hash takes as long, so timing does not show which emails exist.
  const ok =
    user && !user.guest
      ? await password.matches(credentials.password, user.password)
      : await password.matchesNothing(credentials.password);
  if (!ok || !user) return res.status(401).json(say('sign-in-failed'));

  // A trial on this browser comes along: what was made in it moves into the account.
  const trial = await currentUser(req);
  const kept = trial?.guest ? await mergeTrial(trial._id, user._id) : 0;
  session.start(res, user, 7, session.wantsKept(req));
  return res.status(200).json(say('signed-in', undefined, { email: user.email, kept }));
});

authRouter.post('/signout', (req, res) => {
  session.end(res);
  res.status(200).json(say('signed-out'));
});

// Raising the token version retires every token made so far, on every device,
// this browser's included.
authRouter.post('/signout-everywhere', jwtAuth, notGuest, async (req, res) => {
  await User.updateOne({ _id: userOf(req)._id }, { $inc: { tokenVersion: 1 } });
  session.end(res);
  res.status(200).json(say('signed-out-everywhere'));
});
