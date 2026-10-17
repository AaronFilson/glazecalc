// What the server's middleware adds to Express requests.
import type { Access, Verified } from './lib/token_auth.ts';
import type { Caller } from './mcp/common.ts';
import type { UserDocument } from './models/user.ts';

declare global {
  namespace Express {
    interface Request {
      /** The signed-in user, set by lib/jwt_auth.ts. */
      user?: UserDocument;
      /** How the user got in: the web session, or an access token (lib/require_scope.ts). */
      access?: Access;
      /** HTTP Basic credentials, set by lib/basic_http.ts for sign-in. */
      basicHTTP?: { email: string; password: string };
      /**
       * The account a pending sign-in belongs to, set by the second step once it has
       * loaded the pending record (server/lib/second_step.ts), for limits.secondStep.
       */
      mfaUserId?: string;
      /** The access token this request carries, checked once (lib/token_auth.ts checkAccessToken). */
      tokenCheck?: { token: string; found: Verified | null };
      /** Who is calling the MCP endpoint, for its limits (server/mcp/index.ts). */
      mcpCaller?: Caller;
    }
  }
}

export {};
