// The consent API (docs/adr/0024; integrations plan item 34): how the person
// answers an app that asks to connect. The authorization server sends the
// browser here with a short interaction cookie (path /api/connect/<uid>); the
// consent page (the client's /connect/<uid>) asks these routes what to show,
// and sends the answer. Behind the web session only (app.ts mounts it after
// refuseAccessTokens): the person is whoever is signed in on the website, as
// for any other change, and there is no sign-in here and no lasting session
// of the authorization server's own.
//
//   GET  /api/connect/:uid   a browser opening the address: 303 to /connect/:uid.
//                            The page's own request (Accept: application/json):
//                            { uid, client: { name, source, host, selfDescribed },
//                              redirect: { host, loopback }, writeRequested, expiresAt }
//   POST /api/connect/:uid   { decision: 'allow' | 'deny', write?: boolean }:
//                            { redirectTo }, the address the page sends the browser to next
//
// Refused: 401 not-signed-in; 403 connect-trial (trials connect nothing) and
// connect-needs-confirmed-email (the notices go to that address); 404
// connect-not-found for an interaction that is unknown, ended, answered, or
// another browser's (no cookie). A connection may change records only when
// the app asked for data:write and the person ticked it: write is false
// unless sent as true. Every allow is a new connection, and the person's
// earlier connection to the same app ends (one per app).
import express, { type Request, type Response } from 'express';
import type { Interaction } from 'oidc-provider';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { say } from '../lib/messages.ts';
import type { Scope } from '../lib/scopes.ts';
import * as limits from '../lib/rate_limit.ts';
import AccessToken, { OAUTH_REFRESH_DAYS, OAUTH_WRITE_DAYS } from '../models/access_token.ts';
import { resourceUrl } from '../mcp/urls.ts';
import { keepRegisteredClient } from './adapter.ts';
import { cleanName, getProvider, hostOf, isCimdClient, isLoopback } from './provider.ts';
import { replaceEarlierGrants } from './revoke.ts';

/** An interaction's uid, as oidc-provider makes them (nanoid). */
const UID = /^[A-Za-z0-9_-]{16,64}$/;
const DAY = 24 * 60 * 60 * 1000;

const connectRouter = express.Router();
export default connectRouter;

connectRouter.use(limits.connect);

/** Whether the browser is opening the address itself (the authorization server's redirect), not the page asking. */
const opening = (req: Request): boolean =>
  req.get('sec-fetch-mode') === 'navigate' || req.accepts(['json', 'html']) === 'html';

const notFound = (res: Response) => res.status(404).json(say('connect-not-found'));

/** The interaction this browser holds for the uid, and its app; null (answered 404) otherwise. */
const load = async (req: Request, res: Response) => {
  const uid = String(req.params.uid);
  const provider = getProvider();
  let interaction: Interaction;
  try {
    interaction = await provider.interactionDetails(req, res);
  } catch {
    return null;
  }
  // The cookie names the interaction; the address must name the same one, unanswered.
  if (interaction.uid !== uid || interaction.result) return null;
  const clientId = interaction.params.client_id;
  const client = typeof clientId === 'string' ? await provider.Client.find(clientId).catch(() => undefined) : undefined;
  if (!client) return null;
  return { provider, interaction, client };
};

/** The person who may answer: signed in, an account (not a trial), with a confirmed email. */
const mayConnect = (req: Request, res: Response): boolean => {
  const user = userOf(req);
  if (user.guest) {
    res.status(403).json(say('connect-trial'));
    return false;
  }
  if (user.emailUnverified) {
    res.status(403).json(say('connect-needs-confirmed-email'));
    return false;
  }
  return true;
};

/** What the scope asked for: always data:read (the authorization server adds it), data:write only if asked. */
const writeRequested = (interaction: Interaction): boolean =>
  String(interaction.params.scope ?? '')
    .split(' ')
    .includes('data:write');

connectRouter.get('/:uid', async (req, res, next) => {
  if (!UID.test(String(req.params.uid))) return notFound(res);
  if (opening(req)) return res.redirect(303, '/connect/' + String(req.params.uid));
  return jwtAuth(req, res, next);
});

connectRouter.get('/:uid', async (req, res) => {
  if (!mayConnect(req, res)) return;
  const found = await load(req, res);
  if (!found) return void notFound(res);
  const { interaction, client } = found;
  const cimd = isCimdClient(client.clientId);
  const redirectUri = interaction.params.redirect_uri;
  res.json({
    uid: interaction.uid,
    client: {
      name: cleanName(client.clientName) ?? null,
      source: cimd ? 'cimd' : 'dcr',
      // A CIMD app is its address, so its host is checked; a DCR app's name is only what it says of itself.
      host: cimd ? (hostOf(client.clientId) ?? null) : null,
      selfDescribed: !cimd
    },
    redirect: {
      host: hostOf(redirectUri) ?? null,
      loopback: typeof redirectUri === 'string' && isLoopback(redirectUri)
    },
    writeRequested: writeRequested(interaction),
    expiresAt: new Date(interaction.exp * 1000).toISOString()
  });
});

connectRouter.post('/:uid', jwtAuth, express.json({ limit: '1kb' }), async (req, res) => {
  if (!UID.test(String(req.params.uid))) return notFound(res);
  if (!mayConnect(req, res)) return;
  const body = (req.body ?? {}) as { decision?: unknown; write?: unknown };
  if (
    (body.decision !== 'allow' && body.decision !== 'deny') ||
    (body.write !== undefined && typeof body.write !== 'boolean')
  ) {
    return res.status(400).json(say('connect-decision'));
  }
  const found = await load(req, res);
  if (!found) return notFound(res);
  const { provider, interaction, client } = found;
  if (body.decision === 'deny') {
    const redirectTo = await provider.interactionResult(
      req,
      res,
      { error: 'access_denied', error_description: 'The person did not allow the app to connect' },
      { mergeWithLastSubmission: false }
    );
    return res.json({ redirectTo });
  }

  const user = userOf(req);
  const accountId = String(user._id);
  // No lasting session in the authorization server: one left from an earlier
  // yes in this browser (perhaps another account's) is ended, so this answer
  // stands alone.
  if (interaction.session?.uid) {
    const session = await provider.Session.findByUid(interaction.session.uid);
    if (session) await session.destroy();
    delete interaction.session;
    await interaction.save(Math.max(1, interaction.exp - Math.floor(Date.now() / 1000)));
  }

  const write = body.write === true && writeRequested(interaction);
  const scopes: Scope[] = write ? ['data:read', 'data:write'] : ['data:read'];
  const now = new Date();
  const grant = new provider.Grant({ accountId, clientId: client.clientId });
  grant.addResourceScope(resourceUrl(), scopes.join(' '));
  if (!write && writeRequested(interaction)) grant.rejectResourceScope(resourceUrl(), 'data:write');
  const grantId = await grant.save();

  const cimd = isCimdClient(client.clientId);
  await replaceEarlierGrants(user._id, client.clientId, now);
  const redirectUri = interaction.params.redirect_uri;
  await AccessToken.create({
    kind: 'oauth',
    userId: user._id,
    name: cleanName(client.clientName) ?? hostOf(cimd ? client.clientId : redirectUri) ?? 'AI app',
    clientId: client.clientId,
    grantId,
    clientSource: cimd ? 'cimd' : 'dcr',
    ...(cimd && { clientHost: hostOf(client.clientId) }),
    ...(hostOf(redirectUri) && { redirectHost: hostOf(redirectUri) }),
    scopes,
    createdAt: now,
    // A connection that changes records ends OAUTH_WRITE_DAYS from now, for good; one that reads is renewed as it is used.
    expiresAt: new Date(now.getTime() + (write ? OAUTH_WRITE_DAYS : OAUTH_REFRESH_DAYS) * DAY)
  });
  if (!cimd) await keepRegisteredClient(client.clientId, now);

  const redirectTo = await provider.interactionResult(
    req,
    res,
    { login: { accountId, remember: false }, consent: { grantId } },
    { mergeWithLastSubmission: false }
  );
  return res.json({ redirectTo });
});
