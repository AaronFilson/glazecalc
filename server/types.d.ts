// What the server's middleware adds to Express requests.
import type { UserDocument } from './models/user.ts';

declare global {
  namespace Express {
    interface Request {
      /** The signed-in user, set by lib/jwt_auth.ts. */
      user?: UserDocument;
      /** HTTP Basic credentials, set by lib/basic_http.ts for sign-in. */
      basicHTTP?: { email: string; password: string };
    }
  }
}

export {};
