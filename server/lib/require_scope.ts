// The one way a route takes an access token (docs/integrations-plan.md,
// item 5): requireScope('recipes:read') lets in the web session, as jwtAuth
// does, and a token whose scopes allow that permission. A route that does not
// use it takes no token (jwtAuth refuses them): default deny. A permission
// that writes (recipes:write) also counts against the account's limits on
// changes made with tokens (TOKEN_WRITE_LIMITS).
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwtAuth from './jwt_auth.ts';
import { tokenDay, tokenMinute, tokenWriteDay, tokenWriteMinute } from './rate_limit.ts';
import { allows, isScope, scopeFor, type Permission } from './scopes.ts';
import { accessTokenIn, checkAccessToken, insufficientScope, invalidToken, touchToken } from './token_auth.ts';

export const requireScope =
  (permission: Permission) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = accessTokenIn(req);
    if (token === null) return jwtAuth(req, res, next);
    const found = await checkAccessToken(req, token);
    if (!found) return invalidToken(res);
    if (!allows(found.token.scopes, permission)) return insufficientScope(res, scopeFor(permission));
    await touchToken(found.token);
    req.user = found.user;
    req.access = {
      via: found.token.kind === 'pat' ? 'pat' : 'oauth',
      tokenId: String(found.token._id),
      name: found.token.name,
      scopes: found.token.scopes.filter(isScope),
      permission
    };
    // Trials never hold a token, so the trial's smaller body limit does not apply here.
    // Then the token requests' limits, per account (server/lib/rate_limit.ts), and for a change the
    // limits on changes too.
    const limits: RequestHandler[] = permission.endsWith(':write')
      ? [tokenMinute, tokenDay, tokenWriteMinute, tokenWriteDay]
      : [tokenMinute, tokenDay];
    const run = (i: number) => (error?: unknown) => {
      if (error) return next(error);
      if (i === limits.length) return next();
      void limits[i]!(req, res, run(i + 1));
    };
    run(0)();
  };

export default requireScope;
