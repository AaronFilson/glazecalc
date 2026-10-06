import type { NextFunction, Request, Response } from 'express';
import zeroBuffer from './zero_buffer.ts';

/** Reads HTTP Basic credentials (sign-in) into req.basicHTTP = { email, password }, or answers 401. */
export default function basicHTTP(req: Request, res: Response, next: NextFunction): void {
  const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const buf = Buffer.from(encoded, 'base64');
    const decoded = buf.toString();
    zeroBuffer(buf);
    // Only the first colon separates the email; passwords may contain colons.
    const colon = decoded.indexOf(':');
    const password = decoded.slice(colon + 1);
    if (colon > 0 && password.length) {
      req.basicHTTP = { email: decoded.slice(0, colon), password };
      return next();
    }
  }
  res.status(401).json({ msg: 'could not authenticate user' });
}
