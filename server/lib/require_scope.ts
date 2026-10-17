// The one way a route takes an access token (docs/integrations-plan.md,
// item 5): requireScope('recipes:read') lets in the web session, as jwtAuth
// does, and a token whose scopes allow that permission. A route that does not
// use it takes no token (jwtAuth refuses them): default deny.
import type { NextFunction, Request, Response } from 'express';
import jwtAuth from './jwt_auth.ts';
import { allows, isScope, scopeFor, type Permission } from './scopes.ts';
import { accessTokenIn, insufficientScope, invalidToken, verifyAccessToken } from './token_auth.ts';

export const requireScope =
  (permission: Permission) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = accessTokenIn(req);
    if (token === null) return jwtAuth(req, res, next);
    const found = await verifyAccessToken(token);
    if (!found) return invalidToken(res);
    if (!allows(found.token.scopes, permission)) return insufficientScope(res, scopeFor(permission));
    req.user = found.user;
    req.access = {
      via: found.token.kind === 'pat' ? 'pat' : 'oauth',
      tokenId: String(found.token._id),
      name: found.token.name,
      scopes: found.token.scopes.filter(isScope),
      permission
    };
    // Trials never hold a token, so the trial's smaller body limit does not apply here.
    next();
  };

export default requireScope;
