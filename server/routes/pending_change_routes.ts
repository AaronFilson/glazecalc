// Changes waiting for the person's approval (docs/adr/0025-confirm-before-changes.md;
// server/lib/pending_changes.ts).
//
//   GET  /api/pending-changes/:id              with the web session: the change, as its page
//                                              (/confirm/:id) shows it, if it is the account's;
//                                              with the token that asked: { status, msg, outcome? },
//                                              what came of it once decided (then it is forgotten)
//   POST /api/pending-changes/:id/approve      the person approves it: it is made, once
//   POST /api/pending-changes/:id/decline      the person says no: nothing is changed
//   POST /api/pending-changes/approve-all?tokenId=<id>
//                                              approves everything one app or token is waiting on
//
// Approving and declining take the web session only: a token is refused (403)
// before anything is read, so an app, or an assistant led astray by what it
// read, can never approve its own change; it can only ask what came of it.
// Another account's change, or one past its time, is 404, the same as an id
// that never was. No re-entering the password: being signed in as the account
// is enough (owner decision, 2026-10-19). The page's own requests come from
// the site (sameOrigin, server/app.ts), so another site cannot approve one
// through a signed-in browser either.
import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { say, type MessageCode } from '../lib/messages.ts';
import {
  approve,
  approveAll,
  decline,
  findForUser,
  outcomeForToken,
  waitingFrom,
  type Outcome
} from '../lib/pending_changes.ts';
import { accessTokenIn, checkAccessToken, invalidToken } from '../lib/token_auth.ts';
import AccessToken from '../models/access_token.ts';

const pendingChangeRouter = express.Router();
export default pendingChangeRouter;

const NOT_FOUND = say('pending-not-found');

/** The message for what came of a change. */
const codeFor = (outcome: Outcome): MessageCode => {
  switch (outcome.status) {
    case 'pending':
    case 'running':
      return 'pending-waiting';
    case 'done':
      return 'pending-made';
    case 'declined':
      return 'pending-declined';
    case 'conflict':
      return 'pending-conflict';
    default: {
      const code = (outcome.reply as { code?: unknown } | undefined)?.code;
      return code === 'pending-token-gone' ? code : 'pending-failed';
    }
  }
};

/**
 * Why a change that was approved was not made, as the tool or route said it:
 * a route's message, or a tool's refusal. Nothing for one that was made.
 */
const reasonOf = (outcome: Outcome): string | undefined => {
  if (outcome.status !== 'failed') return undefined;
  const reply = outcome.reply as { body?: { msg?: unknown }; content?: Array<{ text?: unknown }> } | undefined;
  const text = reply?.body?.msg ?? reply?.content?.[0]?.text;
  return typeof text === 'string' ? text.slice(0, 500) : undefined;
};

/** The token that asked: what came of its change. */
const forToken = async (req: Request, res: Response, token: string): Promise<void> => {
  const found = await checkAccessToken(req, token);
  if (!found) return invalidToken(res);
  const outcome = await outcomeForToken(req.params.id, String(found.token._id));
  if (!outcome) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.status(200).json({
    ...say(codeFor(outcome)),
    status: outcome.status,
    ...(outcome.reply !== undefined && outcome.reply !== null && { outcome: outcome.reply }),
    expiresAt: outcome.expiresAt
  });
};

pendingChangeRouter.get('/:id', async (req, res, next) => {
  const token = accessTokenIn(req);
  if (token !== null) return forToken(req, res, token);
  return jwtAuth(req, res, next);
});

// The web session: the change as its page shows it. Never its arguments.
pendingChangeRouter.get('/:id', notGuest, async (req, res) => {
  const user = userOf(req);
  const change = await findForUser(req.params.id, user._id);
  if (!change) return res.status(404).json(NOT_FOUND);
  const waiting = change.status === 'pending' ? await waitingFrom(user._id, change.tokenId) : 0;
  return res.status(200).json({
    id: change._id,
    status: change.status,
    summary: say(change.summary.code as MessageCode, change.summary.params),
    removal: change.removal,
    client: change.client,
    via: change.via,
    tokenId: String(change.tokenId),
    createdAt: change.createdAt,
    expiresAt: change.expiresAt,
    // Others from the same app, for "Approve all from this app".
    othersWaiting: Math.max(0, waiting - 1)
  });
});

pendingChangeRouter.post('/approve-all', jwtAuth, notGuest, async (req, res) => {
  const tokenId = req.query.tokenId;
  if (typeof tokenId !== 'string' || !mongoose.isObjectIdOrHexString(tokenId)) {
    return res.status(400).json(say('invalid-id'));
  }
  const user = userOf(req);
  if (!(await AccessToken.exists({ _id: tokenId, userId: user._id }))) return res.status(404).json(NOT_FOUND);
  const { made, notMade } = await approveAll(user._id, tokenId);
  return res.status(200).json({ ...say('pending-approved-all', { made, notMade }), made, notMade });
});

pendingChangeRouter.post('/:id/approve', jwtAuth, notGuest, async (req, res) => {
  const outcome = await approve(String(req.params.id), userOf(req)._id);
  if (!outcome) return res.status(404).json(NOT_FOUND);
  const reason = reasonOf(outcome);
  return res.status(200).json({ ...say(codeFor(outcome)), status: outcome.status, ...(reason && { reason }) });
});

pendingChangeRouter.post('/:id/decline', jwtAuth, notGuest, async (req, res) => {
  if (!(await decline(String(req.params.id), { userId: userOf(req)._id }))) return res.status(404).json(NOT_FOUND);
  return res.status(200).json({ ...say('pending-declined'), status: 'declined' });
});
