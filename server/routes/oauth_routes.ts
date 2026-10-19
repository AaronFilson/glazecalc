// Signing in with Google, GitHub or Microsoft, and linking them to an account
// (docs/adr/0015-provider-sign-in.md, docs/adr/0023-microsoft-sign-in.md; the
// provider side is server/lib/oauth.ts).
//
//   GET    /api/auth/providers          { providers: ['google', 'github', 'microsoft'] }: those that are on
//   GET    /api/auth/:provider/start    ?next=/de/recipe&keep=1: sets the provider cookie and
//                                      sends the browser to the provider (303)
//   GET    /api/auth/:provider/callback the provider sends the browser back here; 303 to
//                                      <lang>/signin?provider=<id>, or <lang>/account?provider=<id>
//                                      when linking
//   POST   /api/auth/finish             the page finishes what the callback found:
//                                      { email, kept, next } signed in;
//                                      { code: 'second-step', methods, pending, expiresAt, email, next,
//                                        passkeyOptions? } as GET /api/signin answers;
//                                      { code: 'provider-linked' };
//                                      { code: 'provider-reauthed', reauth, expiresAt, provider } after a
//                                        reauth: `reauth` confirms one change in place of a password;
//                                      or 409 'provider-sign-in-to-link'
//   GET    /api/auth/methods            (signed in) { enabled, passwordless, linked: [{ provider, linkedAt, lastUsedAt }] }
//   POST   /api/auth/:provider/link     (signed in) IdentityProof (lib/mfa.d.ts) and next: { location }
//                                      for the browser to go to; the cookie is set
//   POST   /api/auth/:provider/reauth   (signed in, no password of its own) next: { location } for a
//                                      fresh sign-in with this linked provider, to confirm a change
//   DELETE /api/auth/:provider          (signed in) IdentityProof: unlinks it, and signs out the
//                                      account's other sessions (this one is renewed); a link
//                                      through finish does the same
//
// How an account is found (decision 8 of docs/integrations-plan.md, and the
// research's linking rules):
//   - by the provider and its subject only, never by email;
//   - no account has it: a new one is made, only from an email the provider has
//     verified, with a random password nobody knows (passwordless);
//   - an account already has that email: nothing is linked silently. The person
//     signs in to that account once, the usual way (password and second step,
//     or a passkey), and the same browser then finishes the link; and only to an
//     account whose own email is confirmed. That closes "pre-hijacking": someone
//     who made an account with another person's address cannot have that
//     person's Google or GitHub joined to it (Microsoft never links by email);
//   - from the account page, after the password (and a second step when two-step
//     sign-in is on), any provider account not linked elsewhere; one per provider.
// Microsoft's email is never trusted (oauth.trustsEmail, "nOAuth"): it makes a
// new account whose email is unconfirmed until the confirmation email's link
// is opened, and an email another account has is refused, never linked: the
// person signs in to that account and links Microsoft from the account page.
// An account with two-step sign-in still takes its second step after a provider
// (docs/adr/0014-two-step-sign-in.md): finish answers as the password step does.
// Linking and unlinking send a notice to a confirmed address.
//
// An account made with a provider has no password of its own. It confirms a
// change (its email, deleting it, two-step sign-in, linking or unlinking) with
// a fresh sign-in with one of its providers instead (integrations-plan item
// 13): the reauth route starts one bound to the account and its session; the
// callback accepts only a provider account linked to it; finish, for the same
// account still signed in as it was, in the same sign-in session, gives a grant
// (server/lib/change_grant.ts, purpose 'provider-reauth') good for one change
// within GRANT_MINUTES of the provider's answer, from that session only, which factors.confirmIdentity takes in place of the
// password. A second step still follows when two-step sign-in is on.
import express, { type Request, type Response } from 'express';
import type { Types } from 'mongoose';
import languages from '../../lib/regions/languages.js';
import { mergeTrial } from '../lib/account_data.ts';
import * as accountMail from '../lib/account_mail.ts';
import * as email from '../lib/email.ts';
import * as emailLinks from '../lib/email_links.ts';
import { notGuest } from '../lib/guest_limits.ts';
import * as changeGrant from '../lib/change_grant.ts';
import jwtAuth, { currentUser, keepsSignIn, sessionKeyOf, userOf } from '../lib/jwt_auth.ts';
import * as log from '../lib/log.ts';
import { MESSAGES, say, type MessageCode } from '../lib/messages.ts';
import { isDuplicateKey } from '../lib/mongo_errors.ts';
import * as oauth from '../lib/oauth.ts';
import { isPage } from '../lib/pages.ts';
import * as password from '../lib/password.ts';
import * as limits from '../lib/rate_limit.ts';
import * as secondStep from '../lib/second_step.ts';
import * as session from '../lib/session.ts';
import OAuthLogin, { OAUTH_LOGIN_MINUTES, type OAuthLoginFields } from '../models/oauth_login.ts';
import User, { factorMethods, mfaOn, type UserDocument } from '../models/user.ts';

const oauthRouter = express.Router();
export default oauthRouter;

/** Pages that make no sense to come back to once signed in: those go to the home page. */
const NOT_AFTER = ['/', '/signin', '/signup', '/forgot', '/reset', '/confirm-email'];

/**
 * The page to go to once signed in, with its language (/de/recipe): one of the
 * app's own pages (isPage), never another site; /home when it is none.
 */
export const nextPage = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > 200 || !value.startsWith('/') || /^[/\\]{2}/.test(value)) {
    return '/home';
  }
  const path = value.split(/[?#]/)[0]!;
  if (!isPage(path)) return '/home';
  const prefix = languages.languagePrefix(languages.languageOfPath(path));
  return NOT_AFTER.includes(languages.pagePath(path)) ? prefix + '/home' : path;
};

/** The same page in the same language: /de/recipe and '/account' give /de/account. */
const inLanguageOf = (next: string, page: string): string =>
  languages.languagePrefix(languages.languageOfPath(next)) + page;

const providerParams = (provider: string) => ({ provider });
const uidOf = (provider: string, subject: string): string => provider + ':' + subject;

/** Starts a provider sign-in: the record, the cookie, and the provider's address to send the browser to. */
const begin = async (
  res: Response,
  provider: oauth.ProviderId,
  fields: Pick<
    OAuthLoginFields,
    'next' | 'keep' | 'trialId' | 'linkUserId' | 'linkTokenVersion' | 'reauth' | 'sessionHash'
  >
): Promise<string> => {
  const key = oauth.randomValue();
  const started = { state: oauth.randomValue(), nonce: oauth.randomValue(), verifier: oauth.randomValue() };
  const login = await OAuthLogin.create({
    keyHash: oauth.sha256(key),
    provider,
    ...started,
    ...fields,
    expiresAt: new Date(Date.now() + OAUTH_LOGIN_MINUTES * 60 * 1000)
  });
  session.startOAuth(res, key, OAUTH_LOGIN_MINUTES);
  return oauth.authorizeUrl(provider, { ...started, ...(fields.reauth && { freshSince: login.createdAt }) });
};

/** The provider named in the address, when it is on here; otherwise the reply has been sent. */
const providerOn = (req: Request, res: Response): oauth.ProviderId | null => {
  const provider = req.params.provider;
  if (oauth.isProvider(provider) && oauth.credentials(provider)) return provider;
  res.status(404).json(say('provider-off'));
  return null;
};

oauthRouter.get('/providers', (req, res) => {
  res.status(200).json({ providers: oauth.enabled() });
});

oauthRouter.get('/methods', jwtAuth, notGuest, (req, res) => {
  const user = userOf(req);
  res.status(200).json({
    enabled: oauth.enabled(),
    passwordless: user.passwordless === true,
    linked: (user.identities ?? []).map(({ provider, linkedAt, lastUsedAt }) => ({ provider, linkedAt, lastUsedAt }))
  });
});

// The provider button is a plain link to here (no provider script on the page).
// A trial on this browser is noted, to come along into the account.
oauthRouter.get('/:provider/start', limits.oauth, async (req, res) => {
  const provider = providerOn(req, res);
  if (!provider) return undefined;
  const trial = await currentUser(req);
  const location = await begin(res, provider, {
    next: nextPage(req.query.next),
    keep: req.query.keep === '1',
    ...(trial?.guest && { trialId: trial._id })
  });
  return res.redirect(303, location);
});

/** What the provider's answer comes to, written on the record for finish. */
const resolve = async (
  provider: oauth.ProviderId,
  login: OAuthLoginFields,
  query: Request['query']
): Promise<Partial<OAuthLoginFields>> => {
  const error = (code: MessageCode): Partial<OAuthLoginFields> => ({ outcome: 'error', error: code });
  if (typeof query.error === 'string')
    return error(query.error === 'access_denied' ? 'provider-cancelled' : 'provider-failed');
  const code = typeof query.code === 'string' ? query.code : '';
  if (!code || code.length > 2048) return error('provider-failed');
  let identity: oauth.ProviderIdentity;
  try {
    identity = await oauth.identify(provider, code, {
      state: '',
      nonce: login.nonce!,
      verifier: login.verifier!,
      ...(login.reauth && login.createdAt && { freshSince: new Date(login.createdAt) })
    });
  } catch (err) {
    // What failed, never who: the details name no person.
    log.warn('A provider sign-in did not work', {
      code: err instanceof oauth.ProviderError ? 'OAUTH_FAILED' : log.codeOf(err),
      provider,
      detail: err instanceof Error ? err.message : undefined
    });
    return error(err instanceof oauth.ProviderError ? err.code : 'provider-failed');
  }
  const { subject } = identity;
  const owner = await User.findOne({ 'identities.uid': uidOf(provider, subject) }, { _id: 1, guest: 1 });
  if (login.linkUserId && login.reauth) {
    // Only a provider account linked to the account that asked confirms anything for it.
    return owner?._id.equals(login.linkUserId)
      ? { outcome: 'reauth', subject, confirmedAt: new Date() }
      : error('provider-reauth-other');
  }
  if (login.linkUserId) {
    if (owner && !owner._id.equals(login.linkUserId)) return error('provider-linked-elsewhere');
    return { outcome: 'link', subject };
  }
  if (owner && !owner.guest) return { outcome: 'signin', userId: owner._id, subject };
  const address = identity.email;
  if (!oauth.trustsEmail(provider)) {
    // Microsoft: the email finds nothing and links nothing (ADR 23). A new
    // account starts with it unconfirmed; one another account has is refused.
    if (!address || !email.isValid(address)) return error('provider-email-missing');
    if (await User.exists({ email: address }).collation(email.collation)) return error('provider-email-in-use');
    return { outcome: 'create', subject, email: address };
  }
  // A new account, or a link to one, only from an email the provider vouches for.
  if (!address || !identity.emailVerified || !email.isValid(address)) return error('provider-email-unverified');
  if (await User.exists({ email: address }).collation(email.collation)) {
    return { outcome: 'link-needed', subject, email: address };
  }
  return { outcome: 'create', subject, email: address };
};

// The record is taken once, by the cookie and the state together: a callback
// another site sends the browser to, with its own code and state, finds
// nothing (login CSRF), and a code is never swapped twice. Such a callback
// never clears the cookie of a sign-in the browser has under way.
oauthRouter.get('/:provider/callback', limits.oauth, async (req, res) => {
  const provider = providerOn(req, res);
  if (!provider) return undefined;
  const key = session.oauthIn(req);
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const login =
    key && state
      ? await OAuthLogin.findOneAndUpdate(
          {
            keyHash: oauth.sha256(key),
            provider,
            state,
            outcome: { $exists: false },
            expiresAt: { $gt: new Date() }
          },
          { $unset: { state: 1, nonce: 1, verifier: 1 } },
          { returnDocument: 'before' }
        ).lean()
      : null;
  if (!login) {
    // Another site may send the browser here with a made-up state while a
    // sign-in of this browser's own is under way or waiting to be finished:
    // that one is left alone, cookie and all, and the page is not asked to
    // finish anything.
    if (key && (await OAuthLogin.exists({ keyHash: oauth.sha256(key), expiresAt: { $gt: new Date() } }))) {
      return res.redirect(303, '/signin');
    }
    // Otherwise the page asks finish, which says it took too long.
    session.endOAuth(res);
    return res.redirect(303, '/signin?provider=' + provider);
  }
  const outcome = await resolve(provider, login, req.query);
  await OAuthLogin.updateOne({ _id: login._id }, { $set: outcome });
  const page = inLanguageOf(login.next, login.linkUserId ? '/account' : '/signin');
  return res.redirect(303, page + '?provider=' + provider);
});

/** Starts the session, a trial on this browser coming along, as a password sign-in does. */
const signedIn = async (
  res: Response,
  user: UserDocument,
  trialId: Types.ObjectId | undefined,
  keep: boolean,
  next: string
) => {
  // Only while it is still a trial: it may have been claimed or swept since.
  const trial = trialId ? await User.exists({ _id: trialId, guest: true }) : null;
  const { records: kept, pricesSkipped } = trial
    ? await mergeTrial(trial._id, user._id)
    : { records: 0, pricesSkipped: 0 };
  session.start(res, user, 7, keep);
  return res.status(200).json(
    say('signed-in', undefined, {
      email: user.email,
      kept,
      next,
      ...(pricesSkipped && { pricesSkipped }),
      ...(user.emailUnverified && { unverified: true })
    })
  );
};

/**
 * Links a provider account to this account: at most one per provider, and
 * never one linked elsewhere. Like every change to how the account signs in
 * (ADR 14), it raises the account's tokenVersion, so its other sessions end;
 * the reply renews this browser's (`renewed`).
 */
const link = async (
  user: UserDocument,
  provider: string,
  subject: string
): Promise<{ status: 200 | 409; code: MessageCode; renewed?: UserDocument }> => {
  const uid = uidOf(provider, subject);
  let renewed: UserDocument | null;
  try {
    renewed = await User.findOneAndUpdate(
      { _id: user._id, 'identities.provider': { $ne: provider } },
      { $push: { identities: { provider, subject, uid, linkedAt: new Date() } }, $inc: { tokenVersion: 1 } },
      { returnDocument: 'after' }
    );
    if (!renewed) {
      return (await User.exists({ _id: user._id, 'identities.uid': uid }))
        ? { status: 200, code: 'provider-linked' }
        : { status: 409, code: 'provider-already-linked' };
    }
  } catch (err) {
    // The unique index: linked to another account since the callback looked.
    if (isDuplicateKey(err)) return { status: 409, code: 'provider-linked-elsewhere' };
    throw err;
  }
  accountMail.noticeProvider(user, 'linked', provider);
  return { status: 200, code: 'provider-linked', renewed };
};

/**
 * Whether the request comes from the sign-in session that started a link or
 * a reauth from the account page (the same token, jwt_auth.ts sessionKeyOf):
 * not merely the same account, and not after the session was renewed.
 */
const sameSession = (req: Request, login: OAuthLoginFields): boolean =>
  Boolean(login.sessionHash) && login.sessionHash === sessionKeyOf(req);

const knownCode = (code: string | undefined): MessageCode =>
  code && code in MESSAGES ? (code as MessageCode) : 'provider-failed';

oauthRouter.post('/finish', limits.oauth, async (req, res) => {
  const key = session.oauthIn(req);
  const found = key
    ? await OAuthLogin.findOne({
        keyHash: oauth.sha256(key),
        outcome: { $exists: true },
        expiresAt: { $gt: new Date() }
      }).lean()
    : null;
  if (!found) {
    session.endOAuth(res);
    return res.status(400).json(say('provider-expired'));
  }
  const provider = found.provider;
  const params = providerParams(provider);
  // An account has the email: it waits, cookie and all, for the person to sign in to it.
  if (found.outcome === 'link-needed') {
    const me = await currentUser(req);
    if (!me || me.guest) return res.status(409).json(say('provider-sign-in-to-link', params, { provider }));
  }
  // Taken once from here, whatever it comes to.
  const login = await OAuthLogin.findOneAndDelete({ _id: found._id }).lean();
  session.endOAuth(res);
  if (!login) return res.status(400).json(say('provider-expired'));
  const next = languages.pagePath(login.next);

  switch (login.outcome) {
    case 'signin': {
      const uid = uidOf(provider, login.subject ?? '');
      const user = await User.findOne({ _id: login.userId, 'identities.uid': uid });
      if (!user || user.guest) return res.status(400).json(say('provider-expired'));
      await User.updateOne(
        { _id: user._id, 'identities.uid': uid },
        { $set: { 'identities.$.lastUsedAt': new Date() } }
      );
      if (!mfaOn(user)) return signedIn(res, user, login.trialId, login.keep, next);
      // The second step, as after a password (server/routes/auth_routes.ts).
      const methods = factorMethods(user);
      const passkeyOptions = methods.passkey
        ? await secondStep.checks.authenticationOptions(user.mfa!.passkeys, 'preferred')
        : undefined;
      const { token, expiresAt } = await secondStep.begin(user, {
        keep: login.keep,
        ...(login.trialId && { trialId: login.trialId }),
        ...(passkeyOptions && { passkeyChallenge: passkeyOptions.challenge })
      });
      return res.status(200).json(
        say('second-step', undefined, {
          methods,
          pending: token,
          expiresAt: expiresAt.toISOString(),
          email: user.email,
          next,
          ...(passkeyOptions && { passkeyOptions })
        })
      );
    }
    case 'create': {
      const now = new Date();
      const subject = login.subject!;
      // An email the provider does not vouch for (Microsoft's) is confirmed as a sign-up's is.
      const unconfirmed = oauth.isProvider(provider) && !oauth.trustsEmail(provider);
      let user: UserDocument;
      try {
        user = await User.create({
          email: login.email,
          // Like a trial's: a password nobody knows, until one is set by the reset email.
          password: await password.hash(oauth.randomValue()),
          passwordless: true,
          ...(unconfirmed && { emailUnverified: true }),
          identities: [{ provider, subject, uid: uidOf(provider, subject), linkedAt: now, lastUsedAt: now }]
        });
      } catch (err) {
        // The email or the provider account was taken since the callback: trying again sorts it out.
        if (isDuplicateKey(err)) return res.status(409).json(say('provider-expired'));
        throw err;
      }
      if (unconfirmed) emailLinks.sendVerification(user);
      return signedIn(res, user, login.trialId, login.keep, next);
    }
    case 'link-needed':
    case 'link': {
      const me = await currentUser(req);
      if (!me || me.guest) return res.status(400).json(say('provider-expired'));
      if (login.outcome === 'link') {
        // The account that asked, still signed in as it was.
        if (
          !login.linkUserId ||
          !me._id.equals(login.linkUserId) ||
          (me.tokenVersion || 0) !== login.linkTokenVersion ||
          !sameSession(req, login)
        ) {
          return res.status(400).json(say('provider-expired'));
        }
      } else if (email.normalize(me.email) !== login.email) {
        return res.status(400).json(say('provider-other-account', params));
      }
      if (me.emailUnverified) return res.status(400).json(say('provider-verify-first', params));
      const linked = await link(me, provider, login.subject!);
      if (linked.renewed) session.start(res, linked.renewed, 7, keepsSignIn(req));
      return res.status(linked.status).json(say(linked.code, params, { provider }));
    }
    case 'reauth': {
      // The account that asked, still signed in as it was, still with that
      // provider and still without a password, within the grant's minutes.
      const me = await currentUser(req);
      const confirmedAt = login.confirmedAt ? new Date(login.confirmedAt) : null;
      if (
        !me ||
        me.guest ||
        !login.linkUserId ||
        !me._id.equals(login.linkUserId) ||
        (me.tokenVersion || 0) !== login.linkTokenVersion ||
        !sameSession(req, login) ||
        !confirmedAt ||
        Date.now() - confirmedAt.getTime() > changeGrant.GRANT_MINUTES * 60 * 1000
      ) {
        return res.status(400).json(say('provider-expired'));
      }
      const uid = uidOf(provider, login.subject ?? '');
      const user = await User.findOneAndUpdate(
        { _id: me._id, 'identities.uid': uid, passwordless: true },
        { $set: { 'identities.$.lastUsedAt': new Date() } },
        { returnDocument: 'after' }
      );
      if (!user) return res.status(400).json(say('provider-expired'));
      // Bound to this sign-in session: only its requests can spend it.
      const { grant, expiresAt } = await changeGrant.issue(user, 'provider-reauth', confirmedAt, login.sessionHash);
      return res
        .status(200)
        .json(say('provider-reauthed', params, { provider, reauth: grant, expiresAt: expiresAt.toISOString() }));
    }
    default:
      return res.status(400).json(say(knownCode(login.error), params));
  }
});

/**
 * Microsoft's publisher domain file (/.well-known/microsoft-identity-association.json),
 * which shows Microsoft that this site's domain belongs to the app registration
 * (https://learn.microsoft.com/en-us/entra/identity-platform/howto-configure-publisher-domain):
 * written from MICROSOFT_CLIENT_ID, so each copy of the site names its own
 * app, and nothing but a client id (public: every sign-in sends it) is shown.
 * Not found while Microsoft is off.
 */
export const microsoftAssociation = (req: Request, res: Response): void => {
  const microsoft = oauth.credentials('microsoft');
  if (!microsoft) {
    res.status(404).json(say('not-found'));
    return;
  }
  res.status(200).json({ associatedApplications: [{ applicationId: microsoft.id }] });
};

/** Whether unlinking `provider` would leave an account with no password no way in. */

const lastWayIn = (user: UserDocument, provider: string): boolean =>
  user.passwordless === true && !(user.identities ?? []).some((identity) => identity.provider !== provider);

// A fresh sign-in with a provider linked to this account, which has no
// password of its own, to confirm a change in place of one (ADR 15). The page
// goes to `location`; the provider sends the browser back to the account page,
// which finishes it and holds the grant for the change.
oauthRouter.post('/:provider/reauth', jwtAuth, notGuest, limits.oauth, express.json(), async (req, res) => {
  const provider = providerOn(req, res);
  if (!provider) return undefined;
  const me = userOf(req);
  if (!me.passwordless) return res.status(400).json(say('provider-reauth-password'));
  if (!me.identities?.some((identity) => identity.provider === provider)) {
    return res.status(404).json(say('provider-not-linked', providerParams(provider)));
  }
  const body = (req.body ?? {}) as { next?: unknown };
  const location = await begin(res, provider, {
    next: inLanguageOf(nextPage(body.next), '/account'),
    keep: false,
    linkUserId: me._id,
    linkTokenVersion: me.tokenVersion || 0,
    reauth: true,
    sessionHash: sessionKeyOf(req)!
  });
  return res.status(200).json({ location });
});

// Linking from the account page confirms it is the owner first, as every change
// to how the account signs in does (decision 6 of docs/mfa-plan.md): the
// password (a fresh provider sign-in for an account without one), and with
// two-step sign-in on, a second step.
oauthRouter.post('/:provider/link', jwtAuth, notGuest, limits.passwordCheck, express.json(), async (req, res) => {
  const provider = providerOn(req, res);
  if (!provider) return undefined;
  const me = userOf(req);
  if (me.emailUnverified) return res.status(400).json(say('provider-verify-first', providerParams(provider)));
  if (me.identities?.some((identity) => identity.provider === provider)) {
    return res.status(409).json(say('provider-already-linked', providerParams(provider)));
  }
  const body = (req.body ?? {}) as { next?: unknown };
  const check = await secondStep.confirmChange(req, body);
  if (!check.ok) {
    return res.status(check.status).json(say(check.code, check.params, check.field ? { field: check.field } : {}));
  }
  const location = await begin(res, provider, {
    next: inLanguageOf(nextPage(body.next), '/account'),
    keep: false,
    linkUserId: check.user._id,
    linkTokenVersion: check.user.tokenVersion || 0,
    sessionHash: sessionKeyOf(req)!
  });
  return res.status(200).json({ location });
});

oauthRouter.delete('/:provider', jwtAuth, notGuest, limits.passwordCheck, express.json(), async (req, res) => {
  const provider = req.params.provider;
  const params = providerParams(String(provider));
  // A provider turned off here can still be unlinked.
  if (!oauth.isProvider(provider)) return res.status(404).json(say('provider-off'));
  const me = userOf(req);
  if (!me.identities?.some((identity) => identity.provider === provider)) {
    return res.status(404).json(say('provider-not-linked', params));
  }
  // Never the last way in: an account made with a provider sets a password or links another first.
  if (lastWayIn(me, provider)) return res.status(400).json(say('provider-last-method'));
  const check = await secondStep.confirmChange(req, req.body ?? {});
  if (!check.ok) {
    return res.status(check.status).json(say(check.code, check.params, check.field ? { field: check.field } : {}));
  }
  // The account's other sessions end with it (whoever unlinked may be undoing
  // someone else's link); this browser's is renewed. Linking does the same.
  const user = await User.findOneAndUpdate(
    { _id: me._id, 'identities.provider': provider },
    { $pull: { identities: { provider } }, $inc: { tokenVersion: 1 } },
    { returnDocument: 'after' }
  );
  if (!user) return res.status(404).json(say('provider-not-linked', params));
  session.start(res, user, 7, keepsSignIn(req));
  accountMail.noticeProvider(check.user, 'unlinked', provider);
  return res.status(200).json(say('provider-unlinked', params));
});
