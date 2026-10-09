// The session cookie goes with every request a browser makes to /api, so a
// request that changes something must come from the app's own pages, or another
// site could make a signed-in visitor's browser send it (cross-site request
// forgery). Browsers say where a request comes from in Sec-Fetch-Site, and older
// ones in Origin. Scripts and tests send neither; they use a Bearer token, which
// another site cannot make a browser send.
import type { NextFunction, Request, Response } from 'express';
import { say } from './messages.ts';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

const sameHost = (origin: string, req: Request): boolean => {
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
};

export default function sameOrigin(req: Request, res: Response, next: NextFunction): void {
  if (SAFE.has(req.method)) return next();
  const site = req.headers['sec-fetch-site'];
  const origin = req.headers.origin;
  // 'none' is a request the user started themselves, such as from the address bar.
  const fromElsewhere = site ? site !== 'same-origin' && site !== 'none' : Boolean(origin) && !sameHost(origin!, req);
  if (fromElsewhere) {
    res.status(403).json(say('other-site'));
    return;
  }
  next();
}
