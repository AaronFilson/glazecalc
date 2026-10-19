// Who is calling the MCP endpoint (docs/integrations-plan.md, item 29), decided
// before the SDK sees the request. With no Authorization header, anyone: the
// public tools, limited per address. With one, it must be a working personal
// access token (glazecalc_pat_...), or the request is answered 401 here, with
// the RFC 6750 and RFC 9728 headers that point a client at the resource's
// metadata. The session's sign-in token is never accepted (it is not an access
// token, so it fails as any other), and the session cookie is never read: a
// browser riding on someone's session gets the public tools at most. Every
// request is checked afresh, so a token revoked or expired stops at once,
// changes included. Only personal tokens: no OAuth client reaches the tools,
// to read or to write, until the authorization server (Phase 4) is built.
import type { NextFunction, Request, Response } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import { allows, isScope } from '../lib/scopes.ts';
import * as site from '../lib/site.ts';
import { accessTokenIn, checkAccessToken, touchToken } from '../lib/token_auth.ts';

/** The endpoint's address, as its metadata names it (RFC 9728 resource). */
export const resourceUrl = (): string => site.siteUrl() + '/mcp';
/** Where its Protected Resource Metadata is (RFC 9728, section 3). */
export const metadataUrl = (): string => site.siteUrl() + '/.well-known/oauth-protected-resource/mcp';

/** The Protected Resource Metadata. No authorization server yet: tokens are made on the account page. */
export const resourceMetadata = () => ({
  resource: resourceUrl(),
  bearer_methods_supported: ['header'],
  scopes_supported: ['data:read', 'data:write'],
  resource_name: 'Glazecalc',
  resource_documentation: site.siteUrl() + '/assistants'
});

/** A JSON-RPC error body, as MCP clients read refusals. */
export const rpcError = (code: number, message: string) => ({ jsonrpc: '2.0', error: { code, message }, id: null });

const challenge = (error: string, description: string): string =>
  `Bearer realm="glazecalc", error="${error}", error_description="${description}", resource_metadata="${metadataUrl()}"`;

/** 401 for an Authorization header that is not a working access token. */
const refuse = (res: Response, error = 'invalid_token'): void => {
  res
    .status(401)
    .set('WWW-Authenticate', challenge(error, 'The access token is not valid, has expired or was revoked'))
    .json(
      rpcError(
        -32001,
        'The access token is not valid, has expired or was revoked. Make a new one on your Glazecalc account page.'
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
  if (token === null) return refuse(res, /^Bearer /i.test(header) ? 'invalid_token' : 'invalid_request');
  const found = await checkAccessToken(req, token);
  // Only personal tokens until the authorization server (Phase 4) gives out OAuth ones.
  if (!found || found.token.kind !== 'pat') return refuse(res);
  if (!allows(found.token.scopes, 'recipes:read')) {
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
    tokenId: String(found.token._id),
    via: found.token.kind,
    name: found.token.name,
    scopes: found.token.scopes.filter(isScope)
  };
  next();
};
