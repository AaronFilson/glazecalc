// Who is calling the MCP endpoint (docs/integrations-plan.md, item 29), decided
// before the SDK sees the request. With no Authorization header, anyone: the
// public tools, limited per address. With one, it must be a working personal
// access token (glazecalc_pat_...) or an OAuth access token from Glazecalc's
// authorization server (server/oauth/, docs/adr/0024), whose audience is
// this endpoint and whose connection still works; otherwise the request is
// answered 401 here, with the RFC 6750 and RFC 9728 headers that point a
// client at the resource's metadata, and from there at the authorization
// server. The session's sign-in token is never accepted (it is not an access
// token, so it fails as any other), and the session cookie is never read: a
// browser riding on someone's session gets the public tools at most. Every
// request is checked afresh, so a token or connection revoked or expired
// stops at once, changes included.
//
// An app connected with OAuth that may only read, calling a tool that
// changes records, is answered 403 insufficient_scope with
// scope="data:read data:write" (stepUp): the MCP way to ask the app to come
// back through the consent page for more. A personal token that may only
// read gets the tool's own refusal in words instead (tools/account_write.ts):
// a person makes a new token on the website, not through a consent page.
import type { NextFunction, Request, Response } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import { allows } from '../lib/scopes.ts';
import * as site from '../lib/site.ts';
import { accessTokenIn, checkAccessToken, touchToken } from '../lib/token_auth.ts';
import { ACCOUNT_TOOLS } from './tools/account.ts';
import { WRITE_TOOLS } from './tools/account_write.ts';
import { challenge, issuerUrl, metadataUrl, resourceUrl, signInChallenge, writeChallenge } from './urls.ts';

export { challenge, metadataUrl, resourceUrl, signInChallenge, writeChallenge };

/**
 * The Protected Resource Metadata (RFC 9728). Its scopes are data:read only:
 * a client asks for every scope listed when a challenge names none, and
 * changing records is asked for by stepping up, never at the first connection.
 */
export const resourceMetadata = () => ({
  resource: resourceUrl(),
  authorization_servers: [issuerUrl()],
  bearer_methods_supported: ['header'],
  scopes_supported: ['data:read'],
  resource_name: 'Glazecalc',
  resource_documentation: site.siteUrl() + '/assistants'
});

/** A JSON-RPC error body, as MCP clients read refusals. */
export const rpcError = (code: number, message: string) => ({ jsonrpc: '2.0', error: { code, message }, id: null });

/**
 * 401 for an Authorization header that is not a working access token, with
 * the challenge that sends an app to refresh or sign in again; also once an
 * address is over its limit on such tokens (index.ts, limits.badTokenLimit).
 */
export const refuseToken = (res: Response, error = 'invalid_token'): void => {
  res
    .status(401)
    .set('WWW-Authenticate', challenge(error, 'The access token is not valid, has expired or was revoked'))
    .json(
      rpcError(
        -32001,
        'The access token is not valid, has expired or was revoked. Connect the app again, or make a new token on your Glazecalc account page.'
      )
    );
};

/** Sets req.mcpCaller, or answers 401. */
export const mcpAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header) {
    req.mcpCaller = { key: 'ip:' + ipKeyGenerator(req.ip ?? 'unknown') };
    return next();
  }
  const token = accessTokenIn(req);
  // Not Bearer, or a bearer that is no access token (a session's sign-in token above all).
  if (token === null) return refuseToken(res, /^Bearer /i.test(header) ? 'invalid_token' : 'invalid_request');
  const found = await checkAccessToken(req, token);
  if (!found) return refuseToken(res);
  if (!allows(found.scopes, 'recipes:read')) {
    res
      .status(403)
      .set(
        'WWW-Authenticate',
        challenge('insufficient_scope', 'The access token does not allow this') + ', scope="data:read"'
      )
      .json(rpcError(-32001, 'The access token does not allow reading your records.'));
    return;
  }
  await touchToken(found.token);
  const userId = String(found.user._id);
  req.mcpCaller = {
    key: 'user:' + userId,
    userId,
    // A connected app's is its connection's row, so its limits and its activity are the connection's.
    tokenId: String(found.token._id),
    name: found.token.name,
    scopes: found.scopes,
    via: found.via,
    ...(found.via === 'oauth' && found.token.clientId && { clientId: found.token.clientId })
  };
  next();
};

/**
 * After the body is read: a call with no token to a tool that reads or changes
 * the person's own records is answered 401, with the challenge that sends the
 * app to sign in (scope data:read, and data:write too for a tool that changes
 * records), and the SDK never sees the call. Claude starts sign-in only on an
 * HTTP 401, never on a tool's error; ChatGPT takes either. The tools are
 * listed without a token (server.ts), so an app knows to ask (lazy
 * authentication, docs/adr/0024).
 */
export const signIn = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as { method?: unknown; params?: { name?: unknown } } | undefined;
  const name = body?.method === 'tools/call' ? body.params?.name : undefined;
  if (!req.mcpCaller?.userId && typeof name === 'string' && (ACCOUNT_TOOLS.has(name) || WRITE_TOOLS.has(name))) {
    res
      .status(401)
      .set('WWW-Authenticate', signInChallenge(WRITE_TOOLS.has(name)))
      .json(
        rpcError(
          -32001,
          'Sign in to Glazecalc to use this tool: it reads or changes your own records. Connect the app to your Glazecalc account, or use a personal access token.'
        )
      );
    return;
  }
  next();
};

/**
 * After the body is read: an app connected with OAuth that may only read,
 * calling a tool that changes records, is answered 403 insufficient_scope,
 * asking for data:read and data:write together (MCP's step-up), and the SDK
 * never sees the call.
 */
export const stepUp = (req: Request, res: Response, next: NextFunction): void => {
  const caller = req.mcpCaller;
  const body = req.body as { method?: unknown; params?: { name?: unknown } } | undefined;
  if (
    caller?.via === 'oauth' &&
    !(caller.scopes ?? []).includes('data:write') &&
    body?.method === 'tools/call' &&
    typeof body.params?.name === 'string' &&
    WRITE_TOOLS.has(body.params.name)
  ) {
    res
      .status(403)
      .set('WWW-Authenticate', writeChallenge())
      .json(
        rpcError(
          -32001,
          'Nothing was changed: this app may only read your Glazecalc records. Connect it again and allow it to change them.'
        )
      );
    return;
  }
  next();
};
